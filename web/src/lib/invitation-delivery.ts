import { createHash } from 'node:crypto';
import type { InviteeLine } from '@/lib/invite-list';
import { buildInvitationMail, invitationUrl } from '@/lib/invitation-mail';
import {
  INVITATION_CEILING_WINDOW_SECONDS,
  INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED,
  INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED,
  invitationLimits
} from '@/lib/invitation-limits';
import { isLoginToken } from '@/lib/login-format';
import type { MailLocale } from '@/lib/login-mail';
import { canonicalAddress } from '@/lib/mailer';
import type { RateLimiter } from '@/lib/sliding-window';
import { sqlOutcome } from '@/lib/sql-errors';

export type InviteOutcome =
  | 'sent'
  | 'mail_failed'
  | 'skipped_recent'
  | 'refused'
  | 'rate_limited';

/** Ce que la base renvoie pour une invitation créée (ou renouvelée). */
export type IssuedInvitation = { jeton: string; expire: string };

/**
 * Condensat de l'adresse canonique transmis à la base pour le plafond
 * quotidien par destinataire : la base ne reçoit jamais l'adresse dans cet
 * appel et la rechiffre avec une clé qu'elle seule détient avant de stocker.
 */
export const recipientDigest = (canonical: string): string =>
  createHash('sha256')
    .update(`tenga:plafond-invitation:destinataire:v1:${canonical}`)
    .digest('hex');

/** Paramètres de app.consommer_plafond_invitation (migration 0014). */
export type CeilingRequest = {
  organisation: string;
  recipientDigest: string;
  maxOrganisation: number;
  maxRecipient: number;
  windowSeconds: number;
};

export type InviteDeps = {
  /** Appelle la RPC `inviter` ; lève une `GatewayError` si la base refuse. */
  invite: (input: {
    campagne: string;
    email: string;
    prenom: string | null;
    message: string | null;
    langue: MailLocale;
  }) => Promise<IssuedInvitation>;
  send: (mail: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<boolean>;
  /**
   * Vérifie ET consomme, en une opération atomique de la base, les plafonds
   * journaliers par organisation et par destinataire. `refused` : plafond
   * atteint, rien n'est consommé. Lève si la base échoue ou répond hors
   * contrat : l'appelant traite alors l'adresse comme refusée (refus sûr).
   */
  consumeCeilings: (input: CeilingRequest) => Promise<'accepted' | 'refused'>;
  limiter: RateLimiter;
  siteUrl: string;
  /** Attente entre deux envois (débit du fournisseur d'e-mail). */
  pause: (ms: number) => Promise<void>;
  /** Journal d'exploitation : reçoit une erreur sans adresse ni jeton. */
  reportError: (error: InvitationMailError) => void;
};

export type InviteContext = {
  /** Utilisateur appelant : sujet du plafond par utilisateur. */
  userId: string;
  /** Organisation de la campagne : sujet du plafond quotidien tenu en base. */
  organisationId: string;
  campagneId: string;
  campagneTitre: string;
  organisation: string;
  locale: MailLocale;
  message: string | null;
  /** Nombre de questions du questionnaire. */
  total: number;
  contactEmail: string;
};

export type InviteBatchResult = {
  /** `error` : erreur inattendue de la base, les résultats déjà acquis restent. */
  aborted: 'forbidden' | 'conflict' | 'error' | null;
  results: { email: string; outcome: InviteOutcome }[];
};

/** Échec d'envoi rapporté au journal : jamais d'adresse ni de jeton dans le texte. */
export class InvitationMailError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InvitationMailError';
  }
}

export const SEND_PAUSE_MS = 500;

// Nom de l'erreur et code HTTP éventuel, rien d'autre : le message d'origine
// peut contenir l'adresse du destinataire.
const describeFailure = (error: unknown, what = 'envoi échoué'): string => {
  if (!(error instanceof Error)) return what;
  const status = 'status' in error ? error.status : undefined;
  return typeof status === 'number'
    ? `${what} (${error.name}, HTTP ${status})`
    : `${what} (${error.name})`;
};

/**
 * Invite une liste d'adresses, une à la fois (jamais en parallèle). Pour
 * chaque adresse : plafonds par couple (campagne, adresse canonique) pour la
 * rafale d'une minute (`skipped_recent`, sans appel à la base) et pour l'heure
 * (`rate_limited`), puis plafond par utilisateur ; puis les plafonds
 * journaliers tenus en base (organisation et destinataire, une seule opération
 * atomique ; refus sûr si la base échoue) ; puis la RPC ; l'e-mail ne part
 * JAMAIS avant son succès, et seulement si le jeton a la forme attendue.
 * 42501 et 55000 interrompent le lot ; 22023 et 23514 refusent l'adresse
 * seule. Toute autre erreur de la base (réseau, introuvable) interrompt le lot
 * (`aborted: 'error'`) en gardant les résultats déjà obtenus.
 */
export async function inviteMany(
  deps: InviteDeps,
  ctx: InviteContext,
  list: readonly InviteeLine[]
): Promise<InviteBatchResult> {
  const results: InviteBatchResult['results'] = [];
  let aborted: InviteBatchResult['aborted'] = null;
  let alreadySent = false;
  const outcome = (email: string, value: InviteOutcome): void => {
    results.push({ email, outcome: value });
  };

  for (const line of list) {
    const { email } = line;
    // Sujet par couple (campagne, adresse), SANS l'utilisateur : deux
    // gestionnaires de la même campagne ne doivent pas envoyer deux fois le même
    // e-mail. L'appelant est déjà autorisé à gérer la campagne (I5), donc seuls
    // ses gestionnaires touchent ce compteur.
    const subject = `${ctx.campagneId}:${canonicalAddress(email)}`;

    if (
      deps.limiter.isLimited(
        'invitationBurst',
        invitationLimits.perAddressBurst,
        subject
      )
    ) {
      outcome(email, 'skipped_recent');
      continue;
    }
    if (
      deps.limiter.isLimited(
        'invitationPerAddress',
        invitationLimits.perAddressHour,
        subject
      )
    ) {
      outcome(email, 'rate_limited');
      continue;
    }
    // Testé en dernier : une adresse sautée ci-dessus ne coûte rien au quota
    // horaire de l'utilisateur (un double clic ne le consomme pas deux fois).
    if (
      deps.limiter.isLimited(
        'invitationPerUser',
        invitationLimits.perUserHour,
        ctx.userId
      )
    ) {
      outcome(email, 'rate_limited');
      continue;
    }

    // Plafonds JOURNALIERS en base (T19, valeurs NON VALIDÉES par Amine), après
    // tous les limiteurs en mémoire : une adresse sautée plus haut ne consomme
    // rien en base. Toute défaillance de la base est un refus : aucun e-mail ne
    // part sans compteur consommé, et le lot s'arrête.
    let ceiling: 'accepted' | 'refused';
    try {
      ceiling = await deps.consumeCeilings({
        organisation: ctx.organisationId,
        recipientDigest: recipientDigest(canonicalAddress(email)),
        maxOrganisation: INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED,
        maxRecipient: INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED,
        windowSeconds: INVITATION_CEILING_WINDOW_SECONDS
      });
    } catch (error) {
      deps.reportError(
        new InvitationMailError(describeFailure(error, 'plafond en base'))
      );
      aborted = 'error';
      break;
    }
    // Seul « accepted » laisse passer : toute autre valeur est un refus.
    if (ceiling !== 'accepted') {
      outcome(email, 'rate_limited');
      continue;
    }

    let issued: IssuedInvitation;
    try {
      issued = await deps.invite({
        campagne: ctx.campagneId,
        email,
        prenom: line.prenom,
        message: ctx.message,
        langue: ctx.locale
      });
    } catch (error) {
      const kind = sqlOutcome(error);
      if (kind === 'forbidden' || kind === 'conflict') {
        aborted = kind;
        break;
      }
      if (kind === 'invalid') {
        outcome(email, 'refused');
        continue;
      }
      // Erreur inattendue : le lot s'arrête, les résultats déjà acquis restent.
      deps.reportError(
        new InvitationMailError(describeFailure(error, 'lot interrompu'))
      );
      aborted = 'error';
      break;
    }

    if (!isLoginToken(issued.jeton)) {
      outcome(email, 'refused');
      continue;
    }

    const mail = buildInvitationMail({
      locale: ctx.locale,
      url: invitationUrl(deps.siteUrl, ctx.locale, issued.jeton),
      organisation: ctx.organisation,
      campagne: ctx.campagneTitre,
      groupe: null,
      firstName: line.prenom,
      message: ctx.message,
      total: ctx.total,
      expire: issued.expire,
      contactEmail: ctx.contactEmail
    });

    if (alreadySent) await deps.pause(SEND_PAUSE_MS);
    alreadySent = true;
    try {
      if (await deps.send({ to: email, ...mail })) {
        outcome(email, 'sent');
      } else {
        deps.reportError(
          new InvitationMailError('envoi refusé par le fournisseur')
        );
        outcome(email, 'mail_failed');
      }
    } catch (error) {
      deps.reportError(new InvitationMailError(describeFailure(error)));
      outcome(email, 'mail_failed');
    }
  }
  return { aborted, results };
}
