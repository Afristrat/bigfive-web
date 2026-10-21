import type { Limit } from '@/lib/sliding-window';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Plafonds des invitations (plan des invitations, risques 2 et 6). Les plafonds
// par adresse comptent l'adresse canonique et la campagne : un double clic ou
// une soumission répétée n'envoie pas deux e-mails. Les consultations et
// acceptations de lien sont bornées par IP (la base ne voit pas l'IP) ; ces
// plafonds restent hauts car une entreprise sort souvent par une IP partagée.
export const invitationLimits = {
  perUserHour: { max: 100, windowMs: HOUR_MS },
  perAddressBurst: { max: 1, windowMs: MINUTE_MS },
  perAddressHour: { max: 3, windowMs: HOUR_MS },
  memberPerUserHour: { max: 20, windowMs: HOUR_MS },
  acceptPerIp: { max: 120, windowMs: HOUR_MS },
  viewPerIp: { max: 600, windowMs: HOUR_MS }
} as const satisfies Record<string, Limit>;

// Plafonds JOURNALIERS, tenus en base (migration 0014, fonction
// app.consommer_plafond_invitation) : ils survivent au redémarrage et valent
// pour tous les réplicas. Les limiteurs en mémoire ci-dessus ne gardent que les
// rafales (minute, heure). Les valeurs sont transmises en paramètres à la
// fonction : elles se règlent ici, sans migration.
//
// DÉFAUTS NON VALIDÉS par Amine (propositions du 20/10) :
//  - 300 invitations par jour et par organisation ;
//  - 5 e-mails par jour et par adresse destinataire canonique, toutes
//    campagnes et toutes organisations confondues.
export const INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED = 300;
export const INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED = 5;
// Fenêtre glissante de 24 heures. La base conserve les compteurs 48 heures :
// une fenêtre plus longue serait tronquée par la purge (la fonction la refuse).
export const INVITATION_CEILING_WINDOW_SECONDS = DAY_MS / 1000;
