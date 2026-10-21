import { createHmac, randomBytes } from 'node:crypto';

// Journal d'exploitation de la connexion : ni adresse e-mail ni jeton, jamais.
// L'IP n'y figure que sous forme d'un HMAC tronqué dont la clé est tirée au
// démarrage du processus : une attaque reste visible (même étiquette) sans que
// l'étiquette permette de remonter à l'adresse, et sans se recouper d'un
// redémarrage à l'autre.
const salt = randomBytes(32);

export const ipTag = (ip: string): string =>
  createHmac('sha256', salt).update(ip).digest('hex').slice(0, 12);

export type SecurityEvent =
  | 'login.rate_limited'
  | 'login.code_rate_limited'
  | 'login.code_failed'
  | 'login.link_failed'
  | 'login.delivery_failed'
  | 'invitation.rate_limited'
  | 'invitation.delivery_failed'
  | 'invitation.accept_failed'
  | 'invitation.accept_rate_limited'
  | 'member.notice_failed'
  | 'admin.grant_rate_limited'
  | 'admin.role_rate_limited'
  | 'admin.grant_notice_failed';

/** Les champs sont typés étroitement pour qu'aucune donnée personnelle n'y entre. */
export function logSecurityEvent(
  event: SecurityEvent,
  fields: { ip: string; scope?: string; reason?: string }
): void {
  console.warn(
    JSON.stringify({
      event,
      ip: ipTag(fields.ip),
      ...(fields.scope ? { scope: fields.scope } : {}),
      ...(fields.reason ? { reason: fields.reason } : {})
    })
  );
}
