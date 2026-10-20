// Formats des éléments de connexion, partagés par les formulaires, les actions
// et la livraison de l'e-mail. Ils reproduisent les contrôles de la base
// (migration 0002 : jeton de 43 caractères, code de 6 chiffres).

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CODE_PATTERN = /^[0-9]{6}$/;

export const isLoginToken = (value: unknown): value is string =>
  typeof value === 'string' && TOKEN_PATTERN.test(value);

/** Retire les espaces que l'on met naturellement dans « 123 456 ». */
export const normalizeLoginCode = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/g, '') : '';

export const isLoginCode = (value: unknown): value is string =>
  typeof value === 'string' && CODE_PATTERN.test(value);

/** Durée de validité d'un lien et d'un code (constante de la migration 0002). */
export const LOGIN_VALIDITY_MINUTES = 15;
