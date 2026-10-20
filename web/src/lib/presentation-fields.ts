import { z } from 'zod';

// Champs et validation de la demande de présentation. Aucun accès serveur ici :
// le même schéma sert au formulaire (navigateur) et à l'action serveur, qui
// reste seule juge. Les erreurs sont des codes stables, traduits par l'appelant.

export const ORGANISATION_SIZES = [
  'lt50',
  'from50to250',
  'from250to1000',
  'gt1000'
] as const;
export const OBJECTIVES = ['teamwork', 'change', 'leaders', 'other'] as const;
export const EXCHANGE_LOCALES = ['fr', 'ar', 'en'] as const;

export type OrganisationSize = (typeof ORGANISATION_SIZES)[number];
export type Objective = (typeof OBJECTIVES)[number];
export type ExchangeLocale = (typeof EXCHANGE_LOCALES)[number];

export const MESSAGE_MAX = 1000;
const NAME_MAX = 120;
const ORGANISATION_MAX = 160;
const ROLE_MAX = 120;
const EMAIL_MAX = 200;

/** Durée minimale de remplissage : en dessous, la demande vient d'un robot. */
export const MIN_FILL_MS = 3000;

export const FIELD_NAMES = [
  'name',
  'organisation',
  'role',
  'email',
  'size',
  'objective',
  'exchangeLocale',
  'message',
  'consent'
] as const;
export type FieldName = (typeof FIELD_NAMES)[number];

export type ErrorCode =
  | 'required'
  | 'tooLong'
  | 'email'
  | 'choice'
  | 'consent'
  | 'characters';
export type FieldErrors = Partial<Record<FieldName, ErrorCode>>;

const TAB = 9;
const LINE_FEED = 10;
const CARRIAGE_RETURN = 13;

/** Vrai si le texte contient un caractère de contrôle (octet nul compris). */
export const hasControlCharacter = (
  value: string,
  allowed: readonly number[] = []
): boolean => {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if ((code < 32 && !allowed.includes(code)) || code === 127) return true;
  }
  return false;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const line = (max: number) =>
  z.preprocess(
    asText,
    z
      .string()
      .trim()
      .min(1, 'required')
      .max(max, 'tooLong')
      .refine((value) => !hasControlCharacter(value), 'characters')
  );

// Les navigateurs envoient les retours à la ligne d'un champ multiligne en CRLF
// alors que la limite de 1000 caractères les compte pour un : normalisation
// avant tout décompte.
const message = z.preprocess(
  (value) => asText(value).replace(/\r\n?/g, '\n'),
  z
    .string()
    .trim()
    .max(MESSAGE_MAX, 'tooLong')
    .refine(
      (value) => !hasControlCharacter(value, [TAB, LINE_FEED, CARRIAGE_RETURN]),
      'characters'
    )
);

const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z.preprocess(
    asText,
    z.enum(values, { errorMap: () => ({ message: 'choice' }) })
  );

export const presentationSchema = z.object({
  name: line(NAME_MAX),
  organisation: line(ORGANISATION_MAX),
  role: line(ROLE_MAX),
  email: z.preprocess(
    (value) => asText(value).trim().toLowerCase(),
    z
      .string()
      .min(1, 'required')
      .max(EMAIL_MAX, 'tooLong')
      .email('email')
      .refine((value) => !hasControlCharacter(value), 'characters')
  ),
  size: choice(ORGANISATION_SIZES),
  objective: choice(OBJECTIVES),
  exchangeLocale: choice(EXCHANGE_LOCALES),
  message,
  consent: z.preprocess(
    (value) => value === 'on' || value === 'true' || value === true,
    z.literal(true, { errorMap: () => ({ message: 'consent' }) })
  )
});

export type PresentationInput = z.infer<typeof presentationSchema>;

const ERROR_CODES: readonly ErrorCode[] = [
  'required',
  'tooLong',
  'email',
  'choice',
  'consent',
  'characters'
];
const isErrorCode = (value: string): value is ErrorCode =>
  ERROR_CODES.some((code) => code === value);

export type FieldsResult =
  | { ok: true; data: PresentationInput }
  | { ok: false; fields: FieldErrors };

/** Valide les champs bruts ; renvoie un code d'erreur par champ en erreur. */
export function validateFields(raw: Record<string, unknown>): FieldsResult {
  const parsed = presentationSchema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fields: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const name = issue.path[0];
    const known = FIELD_NAMES.find((candidate) => candidate === name);
    if (known && !fields[known]) {
      fields[known] = isErrorCode(issue.message) ? issue.message : 'required';
    }
  }
  return { ok: false, fields };
}

/** Premier champ en erreur dans l'ordre du formulaire. */
export const firstInvalidField = (fields: FieldErrors): FieldName | undefined =>
  FIELD_NAMES.find((name) => fields[name] !== undefined);

/** Champs lus dans un FormData, sans le piège à robots ni la durée. */
export function readFields(formData: FormData): Record<string, unknown> {
  return Object.fromEntries(
    FIELD_NAMES.map((name) => [name, formData.get(name)])
  );
}
