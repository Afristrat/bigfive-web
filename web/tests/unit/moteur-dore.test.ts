import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  comparerBinome,
  profilDepuisScores,
  SEUILS_DEFAUT,
  type DomainCode,
  type FacetIndex,
  type FacetteCode,
  type Niveau,
  type ScoreFacette,
  type ScoresTenga
} from '@/lib/moteur';

const lireJson = <T>(relatif: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../../../docs/design/${relatif}`, import.meta.url)
      ),
      'utf8'
    )
  ) as T;

type ProfilFictif = {
  code: string;
  domaine: Record<DomainCode, number>;
  facette: Record<FacetteCode, number>;
};
type Faits = {
  personnes: Record<
    string,
    {
      domaines: Record<
        DomainCode,
        { score: number; moy: number; niveau: Niveau }
      >;
      facettes: Record<
        FacetteCode,
        { moy: number; niveau: Niveau; bloc_id: string }
      >;
      tensions: {
        id: string;
        domaine: DomainCode;
        facettes: [string, string];
        ecart: number;
      }[];
    }
  >;
  relations: {
    id: string;
    a: string;
    b: string;
    domaines: { d: DomainCode; ecart: number; classe: string }[];
    facettes_notables: {
      k: FacetteCode;
      ecart: number;
      niveau_a: Niveau;
      niveau_b: Niveau;
    }[];
  }[];
};
type Regles = {
  seuils: {
    niveaux: Record<string, number>;
    ecarts: Record<string, number>;
    tension: Record<string, number>;
    contribution: Record<string, number>;
  };
};

const DOMAINES: readonly DomainCode[] = ['N', 'E', 'O', 'A', 'C'];
const INDEX: readonly FacetIndex[] = [1, 2, 3, 4, 5, 6];
const CODES = ['AM', 'KB', 'SR', 'HT'] as const;

// Équivalent ScoresTenga d'un profil de moyennes : 4 questions par facette, 24 par domaine.
const scoresDepuisProfil = (p: ProfilFictif): ScoresTenga => {
  const domaines = Object.fromEntries(
    DOMAINES.map((d) => {
      const facettes = Object.fromEntries(
        INDEX.map((f): [string, ScoreFacette] => {
          const moyenne = p.facette[`${d}${f}`];
          return [String(f), { score: moyenne * 4, count: 4, moyenne }];
        })
      );
      const moyenne = Math.round((p.domaine[d] / 24) * 1e6) / 1e6;
      return [d, { score: p.domaine[d], count: 24, moyenne, facettes }];
    })
  );
  return {
    format: 'tenga-scores-1',
    meta: { duree_secondes: null },
    ...domaines
  } as ScoresTenga;
};

const profils = lireJson<ProfilFictif[]>('profils-fictifs/profils.json');
const faits = lireJson<Faits>('rapport-cabinet/sortie/faits.json');

const motif = (t: {
  id: string;
  domaine: string;
  facettes: readonly string[];
  ecart: number;
}) => ({
  id: t.id,
  domaine: t.domaine,
  facettes: [...t.facettes],
  ecart: t.ecart
});

describe('test doré : moteur TypeScript contre moteur du rapport cabinet', () => {
  it.each(CODES)('%s : niveaux, blocs et tensions identiques', (code) => {
    const source = profils.find((p) => p.code === code);
    if (!source) throw new Error(`profil ${code} absent`);
    const attendu = faits.personnes[code];
    const calcule = profilDepuisScores(scoresDepuisProfil(source));

    for (const d of DOMAINES) {
      expect(calcule.domaines[d].niveau).toBe(attendu.domaines[d].niveau);
      expect(calcule.domaines[d].score).toBe(attendu.domaines[d].score);
    }
    const codes = Object.keys(attendu.facettes) as FacetteCode[];
    expect(codes).toHaveLength(30);
    for (const k of codes) {
      expect(calcule.facettes[k].niveau).toBe(attendu.facettes[k].niveau);
      expect(calcule.facettes[k].blocId).toBe(attendu.facettes[k].bloc_id);
    }
    expect(calcule.tensions.map(motif)).toEqual(attendu.tensions.map(motif));
  });

  it('couvre au moins une tension sur les quatre profils', () => {
    const total = CODES.reduce(
      (n, c) => n + faits.personnes[c].tensions.length,
      0
    );
    expect(total).toBeGreaterThan(0);
  });
});

describe('seuils par défaut', () => {
  it('sont égaux à ceux de regles.json', () => {
    const { seuils } = lireJson<Regles>('rapport-cabinet/moteur/regles.json');
    expect(SEUILS_DEFAUT.niveaux).toEqual(seuils.niveaux);
    expect(SEUILS_DEFAUT.ecarts).toEqual(seuils.ecarts);
    expect(SEUILS_DEFAUT.tension).toEqual(seuils.tension);
    expect(SEUILS_DEFAUT.contribution).toEqual(seuils.contribution);
  });
});

describe('position sur l’échelle, contre les moyennes de profils.json', () => {
  // La position est propre à l'application (le moteur du rapport n'en a pas) :
  // elle est recalculée ici, sans le code du moteur, par (moyenne - 1) x 25.
  it.each(CODES)('%s : 30 facettes et 5 domaines', (code) => {
    const source = profils.find((p) => p.code === code);
    if (!source) throw new Error(`profil ${code} absent`);
    const calcule = profilDepuisScores(scoresDepuisProfil(source));
    for (const k of Object.keys(source.facette) as FacetteCode[]) {
      expect(calcule.facettes[k].position, k).toBeCloseTo(
        (source.facette[k] - 1) * 25,
        6
      );
    }
    for (const d of DOMAINES) {
      expect(calcule.domaines[d].position, d).toBeCloseTo(
        (source.domaine[d] / 24 - 1) * 25,
        4
      );
    }
  });

  it('valeurs écrites à la main pour KB : 18,75 ; 25 ; 37,5 ; 68,75 ; 87,5', () => {
    const source = profils.find((p) => p.code === 'KB');
    if (!source) throw new Error('profil KB absent');
    const { facettes, domaines } = profilDepuisScores(
      scoresDepuisProfil(source)
    );
    // N3 : total 7, moyenne 1,75. N1 : total 8, moyenne 2. N5 : total 10,
    // moyenne 2,5. E3 : total 15, moyenne 3,75. C2 : total 18, moyenne 4,5.
    expect(facettes.N3.position).toBe(18.75);
    expect(facettes.N1.position).toBe(25);
    expect(facettes.N5.position).toBe(37.5);
    expect(facettes.E3.position).toBe(68.75);
    expect(facettes.C2.position).toBe(87.5);
    // C : 102 / 24 = 4,25, soit 81,25.
    expect(domaines.C.position).toBe(81.25);
  });
});

describe('comparerBinome contre les relations de faits.json', () => {
  const parCode = (code: string): ProfilFictif => {
    const source = profils.find((p) => p.code === code);
    if (!source) throw new Error(`profil ${code} absent`);
    return source;
  };

  it('couvre les six paires des quatre profils', () => {
    expect(faits.relations.map((r) => r.id)).toEqual([
      'AM-KB',
      'AM-SR',
      'AM-HT',
      'KB-SR',
      'KB-HT',
      'SR-HT'
    ]);
  });

  it.each(['AM-KB', 'AM-SR', 'AM-HT', 'KB-SR', 'KB-HT', 'SR-HT'])(
    '%s : écarts de domaine, classes et facettes notables identiques',
    (id) => {
      const relation = faits.relations.find((r) => r.id === id);
      if (!relation) throw new Error(`relation ${id} absente`);
      const e = comparerBinome(
        profilDepuisScores(scoresDepuisProfil(parCode(relation.a))),
        profilDepuisScores(scoresDepuisProfil(parCode(relation.b)))
      );
      expect(e.domaines).toEqual(
        relation.domaines.map((x) => ({
          d: x.d,
          ecart: x.ecart,
          classe: x.classe
        }))
      );
      expect(e.facettesNotables).toEqual(
        relation.facettes_notables.map((x) => ({
          k: x.k,
          ecart: x.ecart,
          niveauA: x.niveau_a,
          niveauB: x.niveau_b
        }))
      );
    }
  );
});
