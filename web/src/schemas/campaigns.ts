import { z } from 'zod';
import {
  CAMPAIGN_TITLE_MAX,
  INVITATION_MESSAGE_MAX,
  INVITE_ADDRESS_MAX,
  INVITE_LIST_MAX_CHARS,
  hasLinkOrInvisible,
  invitationLocales
} from '@/lib/access-rules';

// Import direct (pas via `schemas/index.ts`, qui charge le catalogue des
// questions). Tout slug ou uuid inséré dans une requête `select` passe par ici :
// `makeSelect` concatène la chaîne brute.

const email = z.string().trim().toLowerCase().email().max(INVITE_ADDRESS_MAX);
const langue = z.enum(invitationLocales);
const uuid = z.string().uuid();

// Même forme que `organizationSchema` (schemas/index.ts).
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/)
  .refine((value) => !value.includes('--'));

const NO_CONTROL = /^\P{Cc}*$/u;
// Refusés dans un message libre : contrôles (sauf le saut de ligne). Liens,
// adresses et invisibles (dont bidi) : `hasLinkOrInvisible`.
const CONTROL_EXCEPT_NEWLINE = /(?!\n)\p{Cc}/u;

// Un <textarea> envoie ses sauts de ligne en CRLF via FormData : on les ramène à
// LF avant toute validation (le plafond se compte donc après normalisation, comme
// la base).
const normalizeNewlines = (value: unknown): unknown =>
  typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : value;

export const campaignCreateSchema = z.object({
  organisation: uuid,
  slug,
  titre: z
    .string()
    .trim()
    .min(1)
    .max(CAMPAIGN_TITLE_MAX)
    .regex(NO_CONTROL)
    .refine((value) => !hasLinkOrInvisible(value)),
  langue
});

export const campaignIdSchema = z.object({ campagne: uuid, slug });

export const campaignCloseSchema = z.object({
  campagne: uuid,
  slug,
  confirmer: z.literal('oui')
});

export const inviteParticipantsSchema = z.object({
  campagne: uuid,
  slug,
  adresses: z.string().max(INVITE_LIST_MAX_CHARS),
  langue,
  message: z.preprocess(
    normalizeNewlines,
    z
      .string()
      .trim()
      .max(INVITATION_MESSAGE_MAX)
      .refine(
        (value) =>
          !CONTROL_EXCEPT_NEWLINE.test(value) && !hasLinkOrInvisible(value)
      )
      .optional()
      .transform((value) => (value ? value : undefined))
  )
});

export const memberInviteSchema = z
  .object({
    organisation: uuid,
    slug,
    email,
    emailConfirmation: email,
    role: z.enum(['responsable', 'consultant']),
    langue
  })
  .refine((value) => value.email === value.emailConfirmation, {
    path: ['emailConfirmation']
  });
