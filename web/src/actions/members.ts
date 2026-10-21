'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { basePath } from '@/config/site';
import { memberInviteRoles } from '@/lib/access-rules';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import { connexionUrl, buildMemberNoticeMail } from '@/lib/invitation-mail';
import { invitationLimits } from '@/lib/invitation-limits';
import { localeOf } from '@/lib/locale-field';
import { toMailLocale } from '@/lib/login-mail';
import { sendMail } from '@/lib/mailer';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { localizedPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { requireViewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import { reasonOf } from '@/lib/start-session';
import { serviceClient, userClient } from '@/lib/supabase/server';
import {
  discardCreatedAccount,
  findOrCreateUser,
  isDefiniteRefusal
} from '@/lib/user-accounts';
import { memberInviteSchema } from '@/schemas/campaigns';

export type MemberState = {
  status:
    | 'idle'
    | 'invited'
    | 'invited_mail_failed'
    | 'invalid'
    | 'forbidden'
    | 'rate_limited'
    | 'error';
};

/**
 * Donne l'accès d'un responsable ou d'un consultant à une organisation. Il n'y
 * a ni jeton ni acceptation : le rôle est attribué tout de suite, puis un
 * e-mail d'information part (texte identique que le compte existe ou non).
 * Ordre : saisie validée, plafond, PRÉ-CONTRÔLE du droit (aucun compte n'est
 * cherché ni créé pour un rôle que la personne ne peut pas donner), compte,
 * RPC `attribuer_role` (la base reste l'autorité), et l'e-mail SEULEMENT après
 * le succès de la RPC. Inviter un membre existant CHANGE son rôle. Décision I2 :
 * seul l'administrateur Tenga donne ces deux rôles ; un responsable est refusé
 * (`forbidden`) avant tout effet, quoi que dise le formulaire.
 */
export async function inviteMember(
  _previous: MemberState,
  formData: FormData
): Promise<MemberState> {
  const locale = localeOf(formData.get('locale'));
  const slug = parseOrgSlug(formData.get('slug'));
  const viewer = await requireViewer(
    locale,
    slug ? `/o/${slug}` : '/mon-compte'
  );

  const parsed = memberInviteSchema.safeParse({
    organisation: formData.get('organisation'),
    slug: formData.get('slug'),
    email: formData.get('email'),
    emailConfirmation: formData.get('emailConfirmation'),
    role: formData.get('role'),
    langue: formData.get('langue')
  });
  if (!parsed.success) return { status: 'invalid' };
  const input = parsed.data;

  const ip = await getClientIp();
  if (
    sharedLimiter.isLimited(
      'memberInvitePerUser',
      invitationLimits.memberPerUserHour,
      viewer.id
    )
  ) {
    logSecurityEvent('invitation.rate_limited', { ip, scope: 'member' });
    return { status: 'rate_limited' };
  }

  try {
    const page = await loadOrgPage(viewer, input.slug);
    if (
      !page ||
      page.org.id !== input.organisation ||
      !memberInviteRoles({
        isTengaAdmin: page.isAdmin,
        roleInOrganization: page.role
      }).includes(input.role)
    ) {
      return { status: 'forbidden' };
    }

    const service = serviceClient();
    const account = await findOrCreateUser(service, input.email, input.langue);

    try {
      await userClient(viewer.accessToken).rpc(
        'attribuer_role',
        {
          p_utilisateur: account.id,
          p_organisation: page.org.id,
          p_role: input.role
        },
        z.unknown()
      );
    } catch (error) {
      // Compte créé par CET appel et resté sans rôle après un refus définitif :
      // pas d'orphelin. Sur panne, la RPC a pu aboutir : le compte est gardé.
      if (account.created && isDefiniteRefusal(error)) {
        await discardCreatedAccount(service, account.id);
      }
      if (sqlOutcome(error) === 'forbidden') return { status: 'forbidden' };
      throw error;
    }

    // Le rôle est attribué : l'e-mail n'est qu'une information. Son échec
    // n'annule rien, mais se dit à la personne qui invite.
    const mailLocale = toMailLocale(input.langue);
    let notified = false;
    let failure = 'refused';
    try {
      notified = await sendMail({
        to: input.email,
        ...buildMemberNoticeMail({
          locale: mailLocale,
          url: connexionUrl(process.env.SITE_URL || basePath, mailLocale),
          organisation: page.org.nom,
          role: input.role,
          contactEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? ''
        })
      });
    } catch (error) {
      failure = reasonOf(error);
    }
    if (!notified) {
      logSecurityEvent('member.notice_failed', { ip, reason: failure });
    }

    revalidatePath(localizedPath(locale, `/o/${input.slug}`));
    return { status: notified ? 'invited' : 'invited_mail_failed' };
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'member.action_failed',
        reason: reasonOf(error)
      })
    );
    return { status: 'error' };
  }
}
