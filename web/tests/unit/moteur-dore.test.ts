import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
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
};
type Regles = {
  seuils: {
    niveaux: Record<string, number>;
    ecarts: Record<string, number>;
    tension: Record<string, number>;
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
  });
});
