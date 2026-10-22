import { COMMON_PASSWORDS_RAW } from '@/data/mots-de-passe-courants';

// Politique du mot de passe d'un administrateur Tenga (décisions d'Amine du
// 21/10/2026) : 12 caractères au moins, aucune règle de composition, refus des
// mots de passe courants par une liste locale (aucun service externe).
export const PASSWORD_MIN_LENGTH = 12;
// bcrypt, utilisé par GoTrue, ne lit que 72 octets : au-delà GoTrue refuse.
export const PASSWORD_MAX_BYTES = 72;

export type PasswordProblem =
  | 'too_short'
  | 'too_long'
  | 'common'
  | 'repetitive'
  | 'contains_email';

let common: ReadonlySet<string> | undefined;
const commonPasswords = (): ReadonlySet<string> =>
  (common ??= new Set(COMMON_PASSWORDS_RAW.split('\n')));

const alphanumeric = (value: string): string =>
  value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

/** Premier défaut du mot de passe, ou null s'il est accepté. */
export function passwordProblem(
  password: string,
  email: string
): PasswordProblem | null {
  if ([...password].length < PASSWORD_MIN_LENGTH) return 'too_short';
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'too_long';
  }
  const lower = password.toLowerCase();
  if (/^(.)\1*$/u.test(password)) return 'repetitive';
  if (commonPasswords().has(lower)) return 'common';
  const compact = alphanumeric(password);
  if (compact.length >= PASSWORD_MIN_LENGTH) {
    for (const entry of commonPasswords()) {
      if (alphanumeric(entry) === compact) return 'common';
    }
  }
  const address = email.trim().toLowerCase();
  const local = address.split('@')[0] ?? '';
  if (
    (address !== '' && lower.includes(address)) ||
    (local.length >= 4 && compact.includes(alphanumeric(local)))
  ) {
    return 'contains_email';
  }
  return null;
}
