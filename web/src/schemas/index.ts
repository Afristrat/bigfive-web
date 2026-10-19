import { z } from 'zod';

// Bornes de taille : toute entrée de server action est validée ici avant
// d'atteindre la base.
export const MAX_ANSWERS = 300;

export const testSchema = z.object({
  testId: z.string().min(1).max(50),
  lang: z.string().min(1).max(10),
  invalid: z.boolean(),
  answers: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        score: z.number().int().min(1).max(5),
        domain: z.enum(['O', 'C', 'E', 'A', 'N']),
        facet: z.number().int().min(1).max(6)
      })
    )
    .min(1)
    .max(MAX_ANSWERS),
  timeElapsed: z.number().int().min(0).max(31_536_000),
  // Le client envoie un objet Date (sérialisé tel quel par les server actions).
  dateStamp: z.date()
});

export const testId = z.object({
  id: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hexadecimal ID')
    .min(24)
    .max(24)
});

const email = z.string().email().max(200);

// Le client ne fournit que le destinataire et l'identifiant du résultat :
// sujet et corps sont construits côté serveur.
export const sendEmailSchema = z.object({
  to: email,
  resultId: testId.shape.id
});

export const feedbackSchema = z.object({
  name: z.string().min(1).max(100),
  email,
  message: z.string().min(1).max(2000)
});

const translatorSchema = z.object({
  name: z.string().min(1).max(100),
  email,
  notes: z.string().max(2000)
});

export const resultTranslationSchema = translatorSchema.extend({
  results: z
    .array(
      z.object({
        title: z.string().max(200),
        shortDescription: z.string().max(500),
        description: z.string().max(5000),
        results: z.array(z.object({ text: z.string().max(5000) })).max(10),
        facets: z
          .array(
            z.object({
              title: z.string().max(200),
              text: z.string().max(5000)
            })
          )
          .max(10)
      })
    )
    .max(10)
});

export const surveyTranslationSchema = translatorSchema.extend({
  choices: z.record(z.string().min(1).max(500)),
  questions: z.record(z.string().min(1).max(500))
});
