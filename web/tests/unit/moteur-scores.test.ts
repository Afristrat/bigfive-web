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

// Vecteur fixe : les totaux par facette sont écrits à la main (profil fictif
// KB de docs/design/profils-fictifs/profils.json, moyennes de facette x 4).
// Les réponses sont fabriquées ici à partir de ces totaux : aucune table du
// moteur n'intervient dans l'attendu.
const TOTAUX_KB: Record<DomainCode, readonly number[]> = {
  N: [8, 9, 7, 8, 10, 7],
  E: [14, 12, 15, 14, 12, 13],
  O: [10, 9, 11, 9, 8, 12],
  A: [14, 11, 14, 13, 13, 14],
  C: [17, 18, 18, 17, 16, 16]
};
const TOTAUX_DOMAINE_KB: Record<DomainCode, number> = {
  N: 49,
  E: 80,
  O: 59,
  A: 79,
  C: 102
};
// 49 / 24, 80 / 24, 59 / 24, 79 / 24, 102 / 24 arrondis à six décimales, à la main.
const MOYENNES_DOMAINE_KB: Record<DomainCode, number> = {
  N: 2.041667,
  E: 3.333333,
  O: 2.458333,
  A: 3.291667,
  C: 4.25
};

// Répartit un total (4 à 20) sur les quatre questions d'une facette.
const repartir = (total: number): number[] => {
  const base = Math.floor(total / 4);
  const reste = total % 4;
  return [0, 1, 2, 3].map((i) => (i < reste ? base + 1 : base));
};

const vecteurKB = (): Record<string, number> => {
  const reponses: Record<string, number> = {};
  for (const d of DOMAINES) {
    FACETTES.forEach((f, i) => {
      const questions = items.filter(
        (q) => q.domain === d && String(q.facet) === f
      );
      expect(questions).toHaveLength(4);
      const parts = repartir(TOTAUX_KB[d][i]);
      questions.forEach((q, k) => {
        reponses[q.id] = parts[k];
      });
    });
  }
  return reponses;
};

describe('calculerScores : vecteur fixe de 120 réponses, totaux écrits à la main', () => {
  it('fabrique bien 120 réponses de 1 à 5', () => {
    const reponses = vecteurKB();
    expect(Object.keys(reponses)).toHaveLength(120);
    expect(
      Object.values(reponses).every(
        (v) => Number.isInteger(v) && v >= 1 && v <= 5
      )
    ).toBe(true);
  });

  it('donne le total et la moyenne attendus pour chacune des 30 facettes', () => {
    const scores = calculerScores(vecteurKB(), 900);
    for (const d of DOMAINES) {
      FACETTES.forEach((f, i) => {
        const attendu = TOTAUX_KB[d][i];
        expect(scores[d].facettes[f], `${d}${f}`).toEqual({
          score: attendu,
          count: 4,
          moyenne: attendu / 4
        });
      });
    }
  });

  it('donne le total et la moyenne attendus pour chacun des 5 domaines', () => {
    const scores = calculerScores(vecteurKB(), 900);
    for (const d of DOMAINES) {
      expect(scores[d].score, d).toBe(TOTAUX_DOMAINE_KB[d]);
      expect(scores[d].count, d).toBe(24);
      expect(scores[d].moyenne, d).toBe(MOYENNES_DOMAINE_KB[d]);
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

  it.each([0.5, 5.5, 0, -3, 99])(
    'refuse une moyenne de facette hors de 1 à 5 (%s)',
    (moyenne) => {
      const objet = copie() as {
        N: { facettes: Record<string, { moyenne: number }> };
      };
      objet.N.facettes['1'].moyenne = moyenne;
      expect(lireScores(objet)).toBeNull();
    }
  );

  it('refuse une moyenne de domaine hors de 1 à 5', () => {
    const objet = copie() as { E: { moyenne: number } };
    objet.E.moyenne = 6;
    expect(lireScores(objet)).toBeNull();
  });

  it('accepte les bornes 1 et 5', () => {
    const bas = calculerScores(uniformes(1), null);
    const haut = calculerScores(uniformes(5), null);
    expect(lireScores(JSON.parse(JSON.stringify(bas)))).toEqual(bas);
    expect(lireScores(JSON.parse(JSON.stringify(haut)))).toEqual(haut);
  });
});
