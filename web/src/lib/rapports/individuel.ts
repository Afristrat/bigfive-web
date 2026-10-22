import {
  BIBLIOTHEQUE,
  avertissementFacette,
  blocFacette,
  type Audience,
  type EtatBloc
} from '@/lib/bibliotheque';
import {
  DOMAINES,
  FACETTES,
  SEUILS_DEFAUT,
  INDEX_FACETTES,
  profilDepuisScores,
  type DomainCode,
  type FacetteCode,
  type Niveau,
  type ProfilCalcule,
  type ScoresTenga,
  type Tension
} from '@/lib/moteur';

// Construction du rapport individuel (bases-rapports-individuel-et-binome.md,
// § 5) : fonction pure des scores, de la langue et de l'audience. Aucun accès
// aux données, aucun texte fixe (ceux-ci vivent dans le catalogue « rapport »),
// aucune génération par modèle de langue. Les textes d'interprétation viennent
// de la bibliothèque, par l'identifiant de bloc que calcule le moteur.

/**
 * Facette dont la restitution à un tiers est écartée : ses affirmations portent
 * sur des opinions politiques et morales, donnée sensible (avertissement de la
 * bibliothèque). Absente de toute vue autre que celle de la personne.
 * Défaut non validé par Amine (plan de branchement, § 6, question 5).
 */
export const FACETTE_RETIREE: FacetteCode = 'O6';

const ENTRETIEN_MAX = 3;
const EXTREMES: readonly Niveau[] = ['bas', 'haut'];

export type EntreeRapport = {
  scores: ScoresTenga;
  locale: string;
  audience: Audience;
  /** Remplace la variable d'exploitation de la garde de relecture (aperçu interne). */
  afficherNonRelus?: boolean;
};

export type FacetteRapport = {
  code: FacetteCode;
  /** Somme des quatre réponses de la facette, de 4 à 20. */
  score: number;
  niveau: Niveau;
  blocId: `${FacetteCode}/${Niveau}`;
  etat: EtatBloc;
  avertissement: string | null;
};

export type DomaineRapport = {
  code: DomainCode;
  /** Somme des vingt-quatre réponses du domaine, de 24 à 120. */
  score: number;
  niveau: Niveau;
  facettes: FacetteRapport[];
};

export type LigneCarte = { code: FacetteCode; niveau: Niveau; score: number };
export type PointSaillant = { code: FacetteCode; niveau: Niveau };
export type QuestionEntretien = {
  code: FacetteCode;
  blocId: `${FacetteCode}/${Niveau}`;
  question: string;
};

export type RapportIndividuel = {
  versionMoteur: ProfilCalcule['versionMoteur'];
  versionBibliotheque: string;
  audience: Audience;
  locale: string;
  domaines: DomaineRapport[];
  /**
   * Règle CONTRIB-1 : au plus `contribution.n_max` facettes, de niveau « bas » ou
   * « haut » seulement, les plus éloignées du milieu de l'échelle d'abord.
   */
  ressort: PointSaillant[];
  carte: LigneCarte[];
  tensions: Tension[];
  /** Questions ouvertes tirées des blocs, pour l'entretien de restitution. */
  entretien: QuestionEntretien[];
  /** Vrai quand une facette est écartée de cette vue. */
  facetteRetiree: boolean;
  /** Identifiants des blocs cités, un par facette montrée. */
  blocIds: string[];
  /**
   * La durée seule : le schéma garantit déjà 120 réponses, un compteur n'apprendrait rien.
   * `null` quand elle est inconnue (absente, ou nulle après une reprise).
   */
  fiabilite: { dureeSecondes: number | null };
};

const facettesDe = (domaine: DomainCode): FacetteCode[] =>
  INDEX_FACETTES.map((f): FacetteCode => `${domaine}${f}`);

export function construireRapportIndividuel(
  entree: EntreeRapport
): RapportIndividuel {
  const { scores, locale, audience, afficherNonRelus } = entree;
  const profil = profilDepuisScores(scores);
  const retire = audience !== 'personne';
  const visible = (code: FacetteCode): boolean =>
    !(retire && code === FACETTE_RETIREE);
  const codes = FACETTES.filter(visible);

  const facette = (code: FacetteCode): FacetteRapport => {
    const f = profil.facettes[code];
    return {
      code,
      score: f.score,
      niveau: f.niveau,
      blocId: f.blocId,
      // Aucun accord grammatical tant que la décision D8 est ouverte : forme 'n'.
      etat: blocFacette(f.blocId, locale, audience, 'n', { afficherNonRelus }),
      avertissement: avertissementFacette(code, locale)
    };
  };

  const domaines = DOMAINES.map(
    (code): DomaineRapport => ({
      code,
      score: profil.domaines[code].score,
      niveau: profil.domaines[code].niveau,
      facettes: facettesDe(code).filter(visible).map(facette)
    })
  );

  const tensions = profil.tensions.filter((t) => t.facettes.every(visible));

  // Tri stable : à distance égale, l'ordre fixe des domaines puis des facettes.
  const ressort = codes
    .filter((code) => EXTREMES.includes(profil.facettes[code].niveau))
    .map((code) => ({
      code,
      niveau: profil.facettes[code].niveau,
      distance: Math.abs(profil.facettes[code].position - 50)
    }))
    .sort((a, b) => b.distance - a.distance)
    .slice(0, SEUILS_DEFAUT.contribution.n_max)
    .map(({ code, niveau }): PointSaillant => ({ code, niveau }));

  // Les facettes des tensions d'abord (la plus forte en tête), puis celles qui ressortent.
  const candidats = [
    ...[...tensions]
      .sort((a, b) => b.ecart - a.ecart)
      .flatMap((t) => t.facettes),
    ...ressort.map((r) => r.code)
  ].filter((code, rang, tous) => tous.indexOf(code) === rang);
  const entretien: QuestionEntretien[] = [];
  for (const code of candidats) {
    if (entretien.length === ENTRETIEN_MAX) break;
    const blocId = profil.facettes[code].blocId;
    const etat = blocFacette(blocId, locale, audience, 'n', {
      afficherNonRelus
    });
    if (etat.etat === 'affiche') {
      entretien.push({ code, blocId, question: etat.bloc.question });
    }
  }

  return {
    versionMoteur: profil.versionMoteur,
    versionBibliotheque: BIBLIOTHEQUE.version,
    audience,
    locale,
    domaines,
    ressort,
    carte: codes.map((code) => ({
      code,
      niveau: profil.facettes[code].niveau,
      score: profil.facettes[code].score
    })),
    tensions,
    entretien,
    facetteRetiree: retire,
    blocIds: codes.map((code) => profil.facettes[code].blocId),
    fiabilite: {
      // Une durée nulle ou négative n'est pas une mesure (passation reprise).
      dureeSecondes:
        scores.meta.duree_secondes !== null && scores.meta.duree_secondes > 0
          ? scores.meta.duree_secondes
          : null
    }
  };
}
