import {
  DOMAINES,
  FACETTES,
  comparerBinome,
  ecart,
  profilDepuisScores,
  type ClasseEcart,
  type DomainCode,
  type FacetteCode,
  type Niveau,
  type ProfilCalcule,
  type ScoresTenga
} from '@/lib/moteur';
import { arrondir4, arrondir6 } from '@/lib/moteur/niveaux';
import { FACETTE_RETIREE } from '@/lib/rapports/individuel';

// Construction du rapport de binôme (bases-rapports-individuel-et-binome.md,
// § 6) : fonction pure de deux jeux de scores déjà consentis par les deux
// personnes (le consentement et la lecture sont vérifiés par la base). Aucun
// accès aux données, aucun texte fixe, aucune génération par modèle de langue.
//
// Aucun score de compatibilité : aucune étude lue ne le fonde. Le rapport ne
// donne que des écarts, classés en trois classes par la convention du moteur, et
// deux points d'attention documentés.
//
// Le domaine Ouverture est ABSENT de tout ce que ce rapport montre, pour les
// deux personnes. Raison : la facette O6 porte sur des opinions (donnée
// sensible) et se déduit du total du domaine O moins les cinq autres facettes.
// Retirer la seule facette ne suffirait donc pas ; le total du domaine O et son
// niveau sont écartés eux aussi. Défaut non validé par Amine (plan de
// branchement, § 6, question 5, et angle mort signalé par l'étape C2a).
// Les facettes O1 à O5 restent comparées : sans le total, elles ne livrent pas O6.

export type DomaineCompare = Exclude<DomainCode, 'O'>;

export type EntreeBinome = {
  /** Personne qui regarde (ou première personne, pour le consultant). */
  a: ScoresTenga;
  b: ScoresTenga;
};

export type LigneDomaine = {
  code: DomaineCompare;
  /** Somme des vingt-quatre réponses du domaine, de 24 à 120. */
  scoreA: number;
  scoreB: number;
  niveauA: Niveau;
  niveauB: Niveau;
  /** Écart des moyennes, sur l'échelle de réponse de 1 à 5 (quatre décimales). */
  ecart: number;
  classe: ClasseEcart;
};

export type LigneFacette = {
  code: FacetteCode;
  /** Somme des quatre réponses de la facette, de 4 à 20. */
  scoreA: number;
  scoreB: number;
  niveauA: Niveau;
  niveauB: Niveau;
  ecart: number;
  classe: ClasseEcart;
};

/** Points d'attention documentés (dossier de preuves, fiches P11 et P12). */
export type PointAttention = 'conscienciosite' | 'agreabilite';

export type RapportBinome = {
  versionMoteur: ProfilCalcule['versionMoteur'];
  /** Quatre domaines : le domaine Ouverture n'est pas comparé. */
  domaines: LigneDomaine[];
  /** Vingt-neuf facettes (O6 retirée), de l'écart le plus grand au plus petit. */
  facettes: LigneFacette[];
  /** Toutes les différences notables, telles que les rend le moteur. */
  notables: LigneFacette[];
  /** Domaines dont l'écart est proche. */
  rapproche: DomaineCompare[];
  /** Domaines dont l'écart est intermédiaire ou notable. */
  distingue: DomaineCompare[];
  /** Les trois différences notables les plus grandes, à explorer en priorité. */
  conversation: FacetteCode[];
  attention: PointAttention[];
};

const CONVERSATION_MAX = 3;
const NIVEAUX_BAS: readonly Niveau[] = ['bas', 'plutot_bas'];

export function construireRapportBinome(entree: EntreeBinome): RapportBinome {
  const pa = profilDepuisScores(entree.a);
  const pb = profilDepuisScores(entree.b);
  const ecarts = comparerBinome(pa, pb);

  const domaines = ecarts.domaines.flatMap((d): LigneDomaine[] =>
    d.d === 'O'
      ? []
      : [
          {
            code: d.d,
            scoreA: pa.domaines[d.d].score,
            scoreB: pb.domaines[d.d].score,
            niveauA: pa.domaines[d.d].niveau,
            niveauB: pb.domaines[d.d].niveau,
            ecart: d.ecart,
            classe: d.classe
          }
        ]
  );

  // Tri sur l'écart arrondi à six décimales, comme le moteur : à égalité, l'ordre
  // des facettes (N1 à C6) décide, sans bruit de flottant (tri stable).
  const facettes = FACETTES.filter((k) => k !== FACETTE_RETIREE)
    .map((k) => {
      const delta = arrondir6(
        Math.abs(pa.facettes[k].moyenne - pb.facettes[k].moyenne)
      );
      const ligne: LigneFacette = {
        code: k,
        scoreA: pa.facettes[k].score,
        scoreB: pb.facettes[k].score,
        niveauA: pa.facettes[k].niveau,
        niveauB: pb.facettes[k].niveau,
        ecart: arrondir4(delta),
        classe: ecart(delta)
      };
      return { ligne, delta };
    })
    .sort((x, y) => y.delta - x.delta)
    .map(({ ligne }) => ligne);

  // Les différences notables viennent du moteur, non d'un second calcul.
  const notables = ecarts.facettesNotables.flatMap((n): LigneFacette[] => {
    const ligne = facettes.find((f) => f.code === n.k);
    return ligne ? [ligne] : [];
  });

  const attention: PointAttention[] = [];
  if (domaines.find((d) => d.code === 'C')?.classe === 'notable') {
    attention.push('conscienciosite');
  }
  if (
    NIVEAUX_BAS.includes(pa.domaines.A.niveau) ||
    NIVEAUX_BAS.includes(pb.domaines.A.niveau)
  ) {
    attention.push('agreabilite');
  }

  return {
    versionMoteur: pa.versionMoteur,
    domaines,
    facettes,
    notables,
    rapproche: domaines.filter((d) => d.classe === 'proche').map((d) => d.code),
    distingue: domaines.filter((d) => d.classe !== 'proche').map((d) => d.code),
    conversation: notables.slice(0, CONVERSATION_MAX).map((n) => n.code),
    attention
  };
}

// Les domaines comparés, dans l'ordre fixe du moteur (le radar en dépend).
export const DOMAINES_COMPARES: readonly DomaineCompare[] = DOMAINES.flatMap(
  (d): DomaineCompare[] => (d === 'O' ? [] : [d])
);
