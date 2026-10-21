'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { basePath } from '@/config/site';
import { inviteMany, type InviteOutcome } from '@/lib/invitation-delivery';
import { parseInviteList } from '@/lib/invite-list';
import { localeOf } from '@/lib/locale-field';
import { toMailLocale } from '@/lib/login-mail';
import { sendMail } from '@/lib/mailer';
import { getLocalizedItems } from '@/lib/question-overrides';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { localizedPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { requireViewer } from '@/lib/session';
import { isMailSinkActive, isMailSinkAllowed } from '@/lib/startup-check';
import { reasonOf } from '@/lib/start-session';
import { serviceClient, userClient } from '@/lib/supabase/server';
import { canManageCampaigns } from '@/lib/access-rules';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import { inviteParticipantsSchema } from '@/schemas/campaigns';

/** Une adresse du lot qui n'a pas reçu son invitation. */
export type InviteFailure = {
  email: string;
  outcome: Exclude<InviteOutcome, 'sent'>;
};

/**
 * `done` : le lot a été traité, en entier (`aborted: null`) ou en partie.
 * `total` = adresses DISTINCTES soumises (après retrait des doublons) ; `sent` = invitations parties ; `failures` =
 * seulement les lignes en échec (jamais une adresse envoyée avec succès).
 * Les adresses ni envoyées ni en échec (`total - sent - failures.length`) n'ont
 * pas été traitées : le lot s'est arrêté (`aborted` non nul).
 */
export type InviteState =
  | { status: 'idle' }
  | {
      status: 'invalid';
      reason: 'empty' | 'too_many' | 'address' | 'message';
      rejected: readonly string[];
    }
  | { status: 'forbidden' }
  | { status: 'closed' }
  | { status: 'rate_limited' }
  | { status: 'error' }
  | {
      status: 'done';
      sent: number;
      total: number;
      failures: readonly InviteFailure[];
      aborted: 'error' | 'forbidden' | 'closed' | null;
    };

const campaignRows = z.array(
  z.object({
    id: z.string().uuid(),
    titre: z.string(),
    langue: z.string(),
    statut: z.enum(['brouillon', 'ouverte', 'close']),
    organization_id: z.string().uuid()
  })
);
const issuedRows = z
  .array(
    z.object({
      invitation: z.string().uuid(),
      // La forme du jeton est contrôlée par ligne dans `inviteMany` (isLoginToken) :
      // un jeton mal formé ne doit refuser que sa ligne, pas tout le lot.
      jeton: z.string(),
      expire: z.string()
    })
  )
  .length(1);

// États rendus par app.consommer_plafond_invitation (migration 0014). Toute
// autre valeur fait lever le schéma : la couche invitations la traite en refus.
const ceilingState = z.enum([
  'accepte',
  'refuse_organisation',
  'refuse_destinataire'
]);

const pause = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const invalidReason = (error: z.ZodError): 'message' | 'address' | null => {
  const fields = error.issues.map((issue) => issue.path[0]);
  if (fields.includes('message')) return 'message';
  if (fields.includes('adresses')) return 'address';
  return null;
};

/**
 * Invitation d'un lot de participants à une campagne ouverte. Ordre : personne
 * connectée, saisie validée, liste d'adresses lue, CAMPAGNE LUE, DROIT DE
 * GÉRER LES CAMPAGNES DE SON ORGANISATION (avant tout plafond : un consultant
 * ne doit pas consommer ceux du responsable), campagne ouverte (la base lève
 * 55000 pour deux causes que la passerelle ne distingue pas), configuration
 * d'envoi présente (avant la première RPC), puis `inviteMany` (la RPC d'abord,
 * l'e-mail seulement après son succès). La base reste l'autorité finale.
 */
export async function inviteParticipants(
  _previous: InviteState,
  formData: FormData
): Promise<InviteState> {
  const locale = localeOf(formData.get('locale'));
  const slug = parseOrgSlug(formData.get('slug'));
  const viewer = await requireViewer(
    locale,
    slug ? `/o/${slug}` : '/mon-compte'
  );

  const parsed = inviteParticipantsSchema.safeParse({
    campagne: formData.get('campagne'),
    slug: formData.get('slug'),
    adresses: formData.get('adresses'),
    langue: formData.get('langue'),
    message: formData.get('message') ?? undefined
  });
  if (!parsed.success) {
    const reason = invalidReason(parsed.error);
    return reason
      ? { status: 'invalid', reason, rejected: [] }
      : { status: 'error' };
  }
  const input = parsed.data;

  const list = parseInviteList(input.adresses);
  if (!list.ok) {
    return { status: 'invalid', reason: list.reason, rejected: list.rejected };
  }

  const ip = await getClientIp();
  const mailLocale = toMailLocale(input.langue);
  try {
    const client = userClient(viewer.accessToken);
    const campaign = (
      await client.select(
        'campaigns',
        `id=eq.${input.campagne}&select=id,titre,langue,statut,organization_id`,
        campaignRows
      )
    )[0];
    if (!campaign) return { status: 'forbidden' };
    const page = await loadOrgPage(viewer, input.slug);
    if (
      !page ||
      page.org.id !== campaign.organization_id ||
      !canManageCampaigns({
        isTengaAdmin: page.isAdmin,
        roleInOrganization: page.role
      })
    ) {
      return { status: 'forbidden' };
    }
    if (campaign.statut !== 'ouverte') return { status: 'closed' };
    // Clé d'envoi (l'expéditeur a une valeur par défaut) : sans elle, aucune
    // invitation ne doit être créée. Le réceptacle de test n'en a pas besoin.
    // Réceptacle actif hors préproduction : `sendMail` le refuserait ligne par ligne.
    const mailConfigured = isMailSinkActive(process.env)
      ? isMailSinkAllowed(process.env)
      : Boolean(process.env.RESEND_API_KEY);
    if (!mailConfigured) {
      console.warn(
        JSON.stringify({
          event: 'invitation.action_failed',
          reason: 'MailConfigError'
        })
      );
      return { status: 'error' };
    }
    const organization = page.org;
    const service = serviceClient();

    const batch = await inviteMany(
      {
        invite: async ({ campagne, email, prenom, message, langue }) => {
          const [row] = await client.rpc(
            'inviter',
            {
              p_campagne: campagne,
              p_email: email,
              p_prenom: prenom,
              p_message: message,
              p_langue: langue
            },
            issuedRows
          );
          // `length(1)` garantit la ligne ; la garde sert au compilateur.
          if (!row) throw new Error('Réponse vide de la fonction inviter');
          return { jeton: row.jeton, expire: row.expire };
        },
        // Fonction réservée à service_role : appelée par le client de service
        // (jamais par la personne connectée), avec un condensat de l'adresse.
        consumeCeilings: async (request) =>
          (await service.rpc(
            'consommer_plafond_invitation',
            {
              p_organisation: request.organisation,
              p_empreinte_destinataire: request.recipientDigest,
              p_max_organisation: request.maxOrganisation,
              p_max_destinataire: request.maxRecipient,
              p_fenetre_secondes: request.windowSeconds
            },
            ceilingState
          )) === 'accepte'
            ? 'accepted'
            : 'refused',
        send: (mail) => sendMail(mail),
        limiter: sharedLimiter,
        siteUrl: process.env.SITE_URL || basePath,
        pause,
        reportError: (error) =>
          logSecurityEvent('invitation.delivery_failed', {
            ip,
            reason: error instanceof Error ? error.message : 'unknown'
          })
      },
      {
        userId: viewer.id,
        organisationId: organization.id,
        campagneId: campaign.id,
        campagneTitre: campaign.titre,
        organisation: organization.nom,
        locale: mailLocale,
        message: input.message ?? null,
        total: getLocalizedItems(mailLocale).length,
        contactEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ''
      },
      list.invitees
    );

    const { results } = batch;
    const failures = results.flatMap(({ email, outcome }) =>
      outcome === 'sent' ? [] : [{ email, outcome }]
    );
    const sent = results.length - failures.length;
    // Une invitation est créée dès que la RPC réussit, que l'e-mail parte ou non.
    if (
      results.some(
        ({ outcome }) => outcome === 'sent' || outcome === 'mail_failed'
      )
    ) {
      // Les e-mails sont partis : un échec du rafraîchissement ne doit pas
      // effacer le résultat partiel.
      try {
        revalidatePath(localizedPath(locale, `/o/${input.slug}`));
      } catch (revalidateError) {
        console.warn(
          JSON.stringify({
            event: 'invitation.revalidate_failed',
            reason: reasonOf(revalidateError)
          })
        );
      }
    }

    if (batch.aborted && results.length === 0) {
      return batch.aborted === 'forbidden'
        ? { status: 'forbidden' }
        : batch.aborted === 'conflict'
          ? { status: 'closed' }
          : { status: 'error' };
    }
    if (
      !batch.aborted &&
      results.length > 0 &&
      results.every(({ outcome }) => outcome === 'rate_limited')
    ) {
      logSecurityEvent('invitation.rate_limited', { ip, scope: 'invite' });
      return { status: 'rate_limited' };
    }
    if (failures.some(({ outcome }) => outcome === 'rate_limited')) {
      logSecurityEvent('invitation.rate_limited', { ip, scope: 'invite' });
    }
    return {
      status: 'done',
      sent,
      total: list.invitees.length,
      failures,
      aborted: batch.aborted === 'conflict' ? 'closed' : batch.aborted ?? null
    };
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'invitation.action_failed',
        reason: reasonOf(error)
      })
    );
    return { status: 'error' };
  }
}
