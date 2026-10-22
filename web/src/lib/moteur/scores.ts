import { z } from 'zod';
import calculateScore from '@bigfive-org/score';
import { getItems } from '@bigfive-org/questions';
import { arrondir6 } from './niveaux';
import type {
  DomainCode,
  FacetIndex,
  ScoreFacette,
  ScoresTenga
} from './types';

// Identifiants communs à toutes les langues : domaine et facette sont lus ici, jamais au client.
const ITEMS = new Map(getItems('en').map((item) => [item.id, item]));
const NB_QUESTIONS = ITEMS.size;

const avecMoyenne = (s: { score: number; count: number }): ScoreFacette => ({
  score: s.score,
  count: s.count,
  moyenne: arrondir6(s.score / s.count)
});

function calculer(
  reponses: ReadonlyMap<string, number>,
  dureeSecondes: number | null
): ScoresTenga {
  if (
    dureeSecondes !== null &&
    (!Number.isFinite(dureeSecondes) || dureeSecondes < 0)
  ) {
    throw new Error('Durée invalide : un nombre positif ou nul est attendu');
  }
  for (const [id, valeur] of reponses) {
    if (!ITEMS.has(id)) throw new Error(`Question inconnue : ${id}`);
    if (!Number.isInteger(valeur) || valeur < 1 || valeur > 5) {
      throw new Error(`Réponse hors de 1 à 5 pour la question ${id}`);
    }
  }
  if (reponses.size !== NB_QUESTIONS) {
    throw new Error(
      `${NB_QUESTIONS} réponses attendues, ${reponses.size} reçues`
    );
  }

  // Le paquet fait la somme ; son champ `result` à trois niveaux est ignoré.
  const brut = calculateScore({
    answers: [...reponses].flatMap(([id, score]) => {
      const item = ITEMS.get(id);
      return item
        ? [{ domain: item.domain, facet: String(item.facet), score }]
        : [];
    })
  });

  const lireDomaine = (d: DomainCode): ScoresTenga[DomainCode] => {
    const domaine = brut[d];
    const facette = (f: FacetIndex): ScoreFacette =>
      avecMoyenne(domaine.facet[`${f}`]);
    const facettes = {
      '1': facette(1),
      '2': facette(2),
      '3': facette(3),
      '4': facette(4),
      '5': facette(5),
      '6': facette(6)
    };
    return { ...avecMoyenne(domaine), facettes };
  };

  return {
    format: 'tenga-scores-1',
    meta: { duree_secondes: dureeSecondes },
    N: lireDomaine('N'),
    E: lireDomaine('E'),
    O: lireDomaine('O'),
    A: lireDomaine('A'),
    C: lireDomaine('C')
  };
}

export function calculerScores(
  reponses: Readonly<Record<string, number>>,
  dureeSecondes: number | null
): ScoresTenga {
  return calculer(new Map(Object.entries(reponses)), dureeSecondes);
}

// Anciens résultats MongoDB : réponses `{ id, score }` déjà orientées, durée inconnue.
export function scoresDepuisReponsesMongo(
  answers: readonly { id: string; score: number }[]
): ScoresTenga {
  return calculer(new Map(answers.map((a) => [a.id, a.score])), null);
}

// La moyenne d'un score lu en base reste sur l'échelle de réponse (1 à 5) : une
// valeur hors échelle fausserait niveaux et positions sans lever d'erreur.
const facetteSchema = z.object({
  score: z.number().finite(),
  count: z.number().int().positive(),
  moyenne: z.number().finite().min(1).max(5)
});

const domaineSchema = facetteSchema.extend({
  facettes: z.object({
    '1': facetteSchema,
    '2': facetteSchema,
    '3': facetteSchema,
    '4': facetteSchema,
    '5': facetteSchema,
    '6': facetteSchema
  })
});

const scoresSchema = z.object({
  format: z.literal('tenga-scores-1'),
  meta: z
    .object({ duree_secondes: z.number().finite().nonnegative().nullable() })
    .default({ duree_secondes: null }),
  N: domaineSchema,
  E: domaineSchema,
  O: domaineSchema,
  A: domaineSchema,
  C: domaineSchema
});

export function lireScores(json: unknown): ScoresTenga | null {
  const lu = scoresSchema.safeParse(json);
  return lu.success ? lu.data : null;
}
