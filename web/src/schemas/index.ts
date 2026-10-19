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

const email = z.string().email().max(200);

// Le client ne fournit que le destinataire et l'identifiant du résultat :
// sujet et corps sont construits côté serveur.
export const sendEmailSchema = z.object({
  to: email,
  resultId: testId.shape.id
});
