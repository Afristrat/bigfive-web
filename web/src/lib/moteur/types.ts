export type DomainCode = 'N' | 'E' | 'O' | 'A' | 'C';
export type FacetIndex = 1 | 2 | 3 | 4 | 5 | 6;
export type FacetteCode = `${DomainCode}${FacetIndex}`;
export type Niveau = 'bas' | 'plutot_bas' | 'milieu' | 'plutot_haut' | 'haut';
export type ClasseEcart = 'proche' | 'intermediaire' | 'notable';

export type ScoreFacette = { score: number; count: number; moyenne: number };
export type ScoreDomaine = ScoreFacette & {
  facettes: Record<`${FacetIndex}`, ScoreFacette>;
};
export type ScoresTenga = {
  format: 'tenga-scores-1';
  meta: { duree_secondes: number | null };
} & Record<DomainCode, ScoreDomaine>;

export type Seuils = {
  niveaux: {
    bas: number;
    plutot_bas: number;
    milieu: number;
    plutot_haut: number;
  };
  ecarts: { proche: number; notable: number };
  tension: { ecart_min: number };
};

export type Tension = {
  id: `${FacetteCode}-${FacetteCode}`;
  domaine: DomainCode;
  facettes: [FacetteCode, FacetteCode];
  ecart: number;
};

export type ProfilCalcule = {
  versionMoteur: 'm-1.0';
  domaines: Record<
    DomainCode,
    { score: number; moyenne: number; position: number; niveau: Niveau }
  >;
  facettes: Record<
    FacetteCode,
    {
      score: number;
      moyenne: number;
      position: number;
      niveau: Niveau;
      blocId: `${FacetteCode}/${Niveau}`;
    }
  >;
  tensions: Tension[];
};

export type EcartsBinome = {
  domaines: { d: DomainCode; ecart: number; classe: ClasseEcart }[];
  facettesNotables: {
    k: FacetteCode;
    ecart: number;
    niveauA: Niveau;
    niveauB: Niveau;
  }[];
};

export const DOMAINES: readonly DomainCode[] = ['N', 'E', 'O', 'A', 'C'];
export const INDEX_FACETTES: readonly FacetIndex[] = [1, 2, 3, 4, 5, 6];
export const FACETTES: readonly FacetteCode[] = DOMAINES.flatMap((d) =>
  INDEX_FACETTES.map((f): FacetteCode => `${d}${f}`)
);
