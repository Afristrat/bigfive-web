import { describe, expect, it } from 'vitest';
import {
  niveau,
  ecart,
  profilDepuisScores,
  comparerBinome,
  SEUILS_DEFAUT,
  VERSION_MOTEUR,
  type DomainCode,
  type FacetIndex,
  type Niveau,
  type ScoreFacette,
  type ScoresTenga
} from '@/lib/moteur';

const DOMAINES: readonly DomainCode[] = ['N', 'E', 'O', 'A', 'C'];
const INDEX: readonly FacetIndex[] = [1, 2, 3, 4, 5, 6];

// Construit des scores à partir de moyennes de facette (4 questions par facette).
const scoresDepuis = (
  facette: (d: DomainCode, f: FacetIndex) => number
): ScoresTenga => {
  const domaines = Object.fromEntries(
    DOMAINES.map((d) => {
      const facettes = Object.fromEntries(
        INDEX.map((f): [string, ScoreFacette] => [
          String(f),
          { score: facette(d, f) * 4, count: 4, moyenne: facette(d, f) }
        ])
      );
      const somme = INDEX.reduce((a, f) => a + facette(d, f) * 4, 0);
      return [d, { score: somme, count: 24, moyenne: somme / 24, facettes }];
    })
  );
  return {
    format: 'tenga-scores-1',
    meta: { duree_secondes: null },
    ...domaines
  } as ScoresTenga;
};

describe('niveau', () => {
  it.each<[number, Niveau]>([
    [1, 'bas'],
    [1.99, 'bas'],
    [2.0, 'plutot_bas'],
    [2.59, 'plutot_bas'],
    [2.6, 'milieu'],
    [3.39, 'milieu'],
    [3.4, 'plutot_haut'],
    [3.99, 'plutot_haut'],
    [4.0, 'haut'],
    [5, 'haut']
  ])('classe %s en %s', (moyenne, attendu) => {
    expect(niveau(moyenne)).toBe(attendu);
  });

  it('arrondit à six décimales avant de comparer aux seuils', () => {
    expect(niveau(2.6 - 1e-9)).toBe('milieu');
    expect(niveau(3.4 - 1e-9)).toBe('plutot_haut');
    expect(niveau(2.0000004)).toBe('plutot_bas');
    expect(niveau(1.999994)).toBe('bas');
  });

  it('accepte des seuils explicites', () => {
    const s = { bas: 1.5, plutot_bas: 2, milieu: 4, plutot_haut: 4.5 };
    expect(niveau(1.5, s)).toBe('plutot_bas');
    expect(niveau(4.5, s)).toBe('haut');
  });
});

describe('ecart', () => {
  it('classe aux bornes : 0,5 proche, 1,0 notable', () => {
    expect(ecart(0)).toBe('proche');
    expect(ecart(0.5)).toBe('proche');
    expect(ecart(0.51)).toBe('intermediaire');
    expect(ecart(0.99)).toBe('intermediaire');
    expect(ecart(1.0)).toBe('notable');
    expect(ecart(4)).toBe('notable');
  });

  it('ignore le signe', () => {
    expect(ecart(-0.5)).toBe('proche');
    expect(ecart(-1.0)).toBe('notable');
    expect(ecart(-0.75)).toBe('intermediaire');
  });

  it('résiste au flottant piégeux 83/24 - 71/24', () => {
    const delta = 83 / 24 - 71 / 24;
    expect(ecart(delta)).toBe('proche');
    expect(ecart(-delta)).toBe('proche');
  });
});

describe('constantes', () => {
  it('portent la version du moteur et le seuil de tension', () => {
    expect(VERSION_MOTEUR).toBe('m-1.0');
    expect(SEUILS_DEFAUT.tension.ecart_min).toBe(1.5);
  });
});

describe('profilDepuisScores', () => {
  it('calcule niveau, position et blocId pour un profil uniforme à 3', () => {
    const p = profilDepuisScores(scoresDepuis(() => 3));
    expect(p.versionMoteur).toBe('m-1.0');
    expect(p.domaines.N).toEqual({
      score: 72,
      moyenne: 3,
      position: 50,
      niveau: 'milieu'
    });
    expect(p.facettes.E4).toEqual({
      score: 12,
      moyenne: 3,
      position: 50,
      niveau: 'milieu',
      blocId: 'E4/milieu'
    });
    expect(p.tensions).toEqual([]);
  });

  it('place 1 à 0 et 5 à 100', () => {
    const bas = profilDepuisScores(scoresDepuis(() => 1));
    const haut = profilDepuisScores(scoresDepuis(() => 5));
    expect(bas.facettes.N1.position).toBe(0);
    expect(haut.facettes.C6.position).toBe(100);
    expect(bas.facettes.N1.niveau).toBe('bas');
    expect(haut.domaines.A.niveau).toBe('haut');
  });

  it('retient une tension à 1,5 exactement et pas à 1,25', () => {
    const avec = profilDepuisScores(
      scoresDepuis((d, f) => (d === 'O' && f === 1 ? 4.5 : 3))
    );
    expect(avec.tensions.map((t) => t.id)).toEqual([
      'O1-O2',
      'O1-O3',
      'O1-O4',
      'O1-O5',
      'O1-O6'
    ]);
    expect(avec.tensions[0]).toEqual({
      id: 'O1-O2',
      domaine: 'O',
      facettes: ['O1', 'O2'],
      ecart: 1.5
    });
    const sans = profilDepuisScores(
      scoresDepuis((d, f) => (d === 'O' && f === 1 ? 4.25 : 3))
    );
    expect(sans.tensions).toEqual([]);
  });

  it('ne croise jamais deux domaines dans une tension', () => {
    const p = profilDepuisScores(scoresDepuis((d) => (d === 'N' ? 1 : 5)));
    expect(p.tensions).toEqual([]);
  });
});

describe('comparerBinome', () => {
  it('classe les écarts de domaine et liste les facettes notables par écart décroissant', () => {
    const a = profilDepuisScores(scoresDepuis(() => 3));
    const b = profilDepuisScores(
      scoresDepuis((d, f) =>
        d === 'E' && f === 2 ? 4.5 : d === 'E' && f === 3 ? 4 : 3
      )
    );
    const e = comparerBinome(a, b);
    expect(e.domaines.map((x) => x.d)).toEqual(['N', 'E', 'O', 'A', 'C']);
    expect(e.domaines.find((x) => x.d === 'E')?.classe).toBe('proche');
    expect(e.domaines.find((x) => x.d === 'N')).toEqual({
      d: 'N',
      ecart: 0,
      classe: 'proche'
    });
    expect(e.facettesNotables).toEqual([
      { k: 'E2', ecart: 1.5, niveauA: 'milieu', niveauB: 'haut' },
      { k: 'E3', ecart: 1, niveauA: 'milieu', niveauB: 'haut' }
    ]);
  });

  it('est symétrique sur les écarts de domaine', () => {
    const a = profilDepuisScores(scoresDepuis((d) => (d === 'C' ? 4 : 2)));
    const b = profilDepuisScores(scoresDepuis(() => 3));
    expect(comparerBinome(a, b).domaines).toEqual(
      comparerBinome(b, a).domaines
    );
    expect(comparerBinome(a, b).domaines.find((x) => x.d === 'C')?.classe).toBe(
      'notable'
    );
  });

  it('classe des sommes de 83 et 71 sur 24 questions comme proches', () => {
    const construire = (somme: number): ScoresTenga => {
      const s = scoresDepuis(() => 3);
      s.N = {
        ...s.N,
        score: somme,
        moyenne: Math.round((somme / 24) * 1e6) / 1e6
      };
      return s;
    };
    const e = comparerBinome(
      profilDepuisScores(construire(83)),
      profilDepuisScores(construire(71))
    );
    expect(e.domaines.find((x) => x.d === 'N')?.classe).toBe('proche');
  });
});
