import { describe, expect, it } from 'vitest';
import calculateScore from '@bigfive-org/score';
import { getItems } from '@bigfive-org/questions';
import {
  calculerScores,
  lireScores,
  scoresDepuisReponsesMongo,
  niveau,
  CALCUL_VERSION,
  type DomainCode
} from '@/lib/moteur';

const items = getItems('en');
const DOMAINES: readonly DomainCode[] = ['N', 'E', 'O', 'A', 'C'];
const FACETTES = ['1', '2', '3', '4', '5', '6'] as const;

const uniformes = (valeur: number): Record<string, number> =>
  Object.fromEntries(items.map((item) => [item.id, valeur]));

// Générateur pseudo-aléatoire à graine fixe (mulberry32) : jeux reproductibles.
const graine = (seed: number): (() => number) => {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const aleatoires = (seed: number): Record<string, number> => {
  const alea = graine(seed);
  return Object.fromEntries(
    items.map((item) => [item.id, 1 + Math.floor(alea() * 5)])
  );
};

describe('calculerScores', () => {
  it('donne 72, 24 et 3 par domaine pour 120 réponses à 3, niveau milieu', () => {
    const scores = calculerScores(uniformes(3), 600);
    expect(scores.format).toBe('tenga-scores-1');
    expect(scores.meta.duree_secondes).toBe(600);
    for (const d of DOMAINES) {
      expect(scores[d].score).toBe(72);
      expect(scores[d].count).toBe(24);
      expect(scores[d].moyenne).toBe(3);
      expect(niveau(scores[d].moyenne)).toBe('milieu');
      for (const f of FACETTES) {
        expect(scores[d].facettes[f]).toEqual({
          score: 12,
          count: 4,
          moyenne: 3
        });
      }
    }
  });

  it('accepte une durée nulle', () => {
    expect(calculerScores(uniformes(3), null).meta.duree_secondes).toBeNull();
  });

  it('arrondit la moyenne à six décimales', () => {
    const reponses = uniformes(3);
    const premiere = items.find((i) => i.domain === 'N');
    if (!premiere) throw new Error('aucune question N');
    reponses[premiere.id] = 4;
    // 73 / 24 = 3,0416666... arrondi à 3,041667
    expect(calculerScores(reponses, null).N.moyenne).toBe(3.041667);
  });

  it('lève sur un identifiant inconnu', () => {
    const reponses = uniformes(3);
    reponses['inconnu'] = 3;
    expect(() => calculerScores(reponses, null)).toThrow();
  });

  it.each([0, 6, 2.5, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'lève sur la valeur %s',
    (valeur) => {
      const reponses = uniformes(3);
      reponses[items[7].id] = valeur;
      expect(() => calculerScores(reponses, null)).toThrow();
    }
  );

  it('lève sur moins de 120 réponses', () => {
    const reponses = uniformes(3);
    delete reponses[items[0].id];
    expect(() => calculerScores(reponses, null)).toThrow();
    expect(() => calculerScores({}, null)).toThrow();
  });

  it('lève sur une durée négative ou non finie', () => {
    expect(() => calculerScores(uniformes(3), -1)).toThrow();
    expect(() => calculerScores(uniformes(3), Number.NaN)).toThrow();
  });

  it('expose la version de calcul', () => {
    expect(CALCUL_VERSION).toBe('tenga-somme-1');
  });

  it('égale score et count de @bigfive-org/score sur 50 jeux à graine fixe', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const reponses = aleatoires(seed);
      const reference = calculateScore({
        answers: items.map((item) => ({
          domain: item.domain,
          facet: String(item.facet),
          score: reponses[item.id]
        }))
      });
      const scores = calculerScores(reponses, null);
      for (const d of DOMAINES) {
        expect(scores[d].score).toBe(reference[d].score);
        expect(scores[d].count).toBe(reference[d].count);
        for (const f of FACETTES) {
          expect(scores[d].facettes[f].score).toBe(reference[d].facet[f].score);
          expect(scores[d].facettes[f].count).toBe(reference[d].facet[f].count);
        }
      }
    }
  });
});

describe('scoresDepuisReponsesMongo', () => {
  it('donne les mêmes scores que calculerScores, durée nulle', () => {
    const reponses = aleatoires(7);
    const mongo = items.map((item) => ({
      id: item.id,
      score: reponses[item.id]
    }));
    expect(scoresDepuisReponsesMongo(mongo)).toEqual(
      calculerScores(reponses, null)
    );
  });

  it('lève sur une réponse incomplète ou inconnue', () => {
    expect(() =>
      scoresDepuisReponsesMongo([{ id: items[0].id, score: 3 }])
    ).toThrow();
    const mongo = items.map((item) => ({ id: item.id, score: 3 }));
    mongo[0] = { id: 'inconnu', score: 3 };
    expect(() => scoresDepuisReponsesMongo(mongo)).toThrow();
  });
});

describe('lireScores', () => {
  const valide = (): ReturnType<typeof calculerScores> =>
    calculerScores(uniformes(3), 42);
  const copie = (): Record<string, unknown> =>
    JSON.parse(JSON.stringify(valide())) as Record<string, unknown>;

  it('relit un objet produit par calculerScores, y compris après JSON', () => {
    expect(lireScores(valide())).toEqual(valide());
    expect(lireScores(copie())).toEqual(valide());
  });

  it.each([null, undefined, 3, 'texte', []])('refuse %j', (valeur) => {
    expect(lireScores(valeur)).toBeNull();
  });

  it('refuse un objet sans format ou au format inconnu', () => {
    const sans = copie();
    delete sans.format;
    expect(lireScores(sans)).toBeNull();
    expect(lireScores({ ...copie(), format: 'tenga-scores-2' })).toBeNull();
  });

  it('refuse un domaine manquant', () => {
    for (const d of DOMAINES) {
      const objet = copie();
      delete objet[d];
      expect(lireScores(objet)).toBeNull();
    }
  });

  it('refuse une facette manquante ou mal formée', () => {
    const objet = copie() as { O: { facettes: Record<string, unknown> } };
    delete objet.O.facettes['4'];
    expect(lireScores(objet)).toBeNull();
    const autre = copie() as { C: { facettes: Record<string, unknown> } };
    autre.C.facettes['2'] = { score: 'douze', count: 4, moyenne: 3 };
    expect(lireScores(autre)).toBeNull();
  });
});
