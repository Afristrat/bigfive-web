import { z } from 'zod';
import { getInfo, getItems } from '@bigfive-org/questions';

// Bornes de taille : toute entrée de server action est validée ici avant
// d'atteindre la base.

// Les identifiants des questions sont identiques dans toutes les langues.
const questionIds = new Set(getItems('en').map((item) => item.id));
const questionLanguages = new Set(getInfo().languages.map((l) => l.id));

export const testSchema = z.object({
  testId: z.literal('b5-120'),
  lang: z
    .string()
    .refine((lang) => questionLanguages.has(lang), 'Unknown language'),
  invalid: z.boolean(),
  answers: z
    .array(
      z.object({
        id: z.string().refine((id) => questionIds.has(id), 'Unknown question'),
        score: z.number().int().min(1).max(5),
        domain: z.enum(['O', 'C', 'E', 'A', 'N']),
        facet: z.number().int().min(1).max(6)
      })
    )
    .length(questionIds.size)
    .refine(
      (answers) => new Set(answers.map((a) => a.id)).size === answers.length,
      'Duplicate answers'
    ),
  timeElapsed: z.number().int().min(0).max(31_536_000),
  // Le client envoie un objet Date ; la valeur n'est pas conservée, le serveur
  // horodate lui-même l'enregistrement.
  dateStamp: z.date()
});

export const testId = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hexadecimal ID')
    .min(24)
    .max(24)
});

const email = z.string().trim().toLowerCase().email().max(200);

const locale = z.string().regex(/^[a-z]{2}(-[a-z]+)?$/);

export const loginRequestSchema = z.object({
  email,
  locale,
  next: z.string().max(500).optional()
});

export const loginCodeSchema = z.object({
  email,
  code: z.string().regex(/^[0-9]{6}$/),
  locale
});

export const profileSchema = z.object({
  nom: z.string().trim().max(120),
  langue: z.enum(['fr', 'ar', 'en'])
});

export const organizationSchema = z.object({
  nom: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/)
    .refine((slug) => !slug.includes('--'))
});

export const roleAssignmentSchema = z.object({
  email,
  organisation: z.string().uuid(),
  role: z.enum(['responsable', 'consultant', 'participant']),
  langue: z.enum(['fr', 'ar', 'en'])
});
