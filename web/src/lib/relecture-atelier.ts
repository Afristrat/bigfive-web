import 'server-only';
import {
  PROFILS_APERCU,
  scoresApercu,
  type ProfilApercu
} from '@/lib/apercu-resultats';
import type { BlocBibliotheque } from '@/lib/bibliotheque';
import { FACETTES, niveau, profilDepuisScores } from '@/lib/moteur';

// Atelier de relecture (/admin/relecture) : assemble les 150 blocs de la
// bibliothèque, l'historique des verdicts (app.historique_relecture), la
// fréquence observée (app.frequence_facettes) et les profils fictifs de
// l'aperçu. Aucun accès à la base ici : fonctions pures, testées seules.

export type EvenementRelecture = {
  id: string;
  bloc: string;
  empreinte: string;
  verdict: 'relu' | 'a_corriger';
  commentaire: string | null;
  relecteurNom: string | null;
  /** null quand le compte du relecteur a été effacé. */
  relecteurAdresse: string | null;
  estMoi: boolean;
  creeLe: string;
};

/** Une ligne de l'histogramme : score d'une facette (sur 4 réponses), effectif. */
export type LigneFrequence = {
  facette: string;
  score: number;
  effectif: number;
};

export const STATUTS_ATELIER = ['a_relire', 'a_corriger', 'relu'] as const;
export type StatutAtelier = (typeof STATUTS_ATELIER)[number];
export type FiltreStatut = StatutAtelier | 'tous';
export const TRIS_ATELIER = ['frequence', 'catalogue'] as const;
export type TriAtelier = (typeof TRIS_ATELIER)[number];
export type FiltresAtelier = { statut: FiltreStatut; tri: TriAtelier };

export type BlocAtelier = {
  bloc: BlocBibliotheque;
  statut: StatutAtelier;
  /** Des verdicts existent, mais aucun sur le texte servi aujourd'hui. */
  texteModifie: boolean;
  /** Dernier verdict sur le texte servi. */
  dernier: EvenementRelecture | null;
  /** Tous les verdicts du bloc, du plus récent au plus ancien. */
  historique: EvenementRelecture[];
  /** Résultats dont la facette tombe à ce niveau ; null si inconnu. */
  effectif: number | null;
  profils: ProfilApercu[];
  /** Rang dans l'ordre de la bibliothèque. */
  rang: number;
};

const CHEMIN = '/admin/relecture';
const REPONSES_PAR_FACETTE = 4;
const facettesConnues: ReadonlySet<string> = new Set(FACETTES);

/** Effectif par bloc ; null quand l'histogramme est vide (sous le seuil). */
export function effectifsParBloc(
  lignes: readonly LigneFrequence[]
): Map<string, number> | null {
  if (lignes.length === 0) return null;
  const effectifs = new Map<string, number>();
  for (const { facette, score, effectif } of lignes) {
    if (!facettesConnues.has(facette)) continue;
    const id = `${facette}/${niveau(score / REPONSES_PAR_FACETTE)}`;
    effectifs.set(id, (effectifs.get(id) ?? 0) + effectif);
  }
  return effectifs;
}

/** Pour chaque bloc, les profils fictifs de l'aperçu qui l'affichent. */
export function profilsParBloc(): Map<string, ProfilApercu[]> {
  const parBloc = new Map<string, ProfilApercu[]>();
  for (const code of PROFILS_APERCU) {
    const profil = profilDepuisScores(scoresApercu(code));
    for (const f of Object.values(profil.facettes)) {
      parBloc.set(f.blocId, [...(parBloc.get(f.blocId) ?? []), code]);
    }
  }
  return parBloc;
}

const plusRecentDabord = (
  a: EvenementRelecture,
  b: EvenementRelecture
): number => Date.parse(b.creeLe) - Date.parse(a.creeLe);

export function assemblerAtelier(
  blocs: readonly BlocBibliotheque[],
  evenements: readonly EvenementRelecture[],
  frequences: readonly LigneFrequence[]
): BlocAtelier[] {
  const effectifs = effectifsParBloc(frequences);
  const profils = profilsParBloc();
  const parBloc = new Map<string, EvenementRelecture[]>();
  // Tri stable : à date égale, l'ordre reçu (le plus récent d'abord) tient.
  for (const e of [...evenements].sort(plusRecentDabord)) {
    parBloc.set(e.bloc, [...(parBloc.get(e.bloc) ?? []), e]);
  }
  return blocs.map((bloc, rang) => {
    const historique = parBloc.get(bloc.id) ?? [];
    const dernier =
      historique.find((e) => e.empreinte === bloc.empreinte) ?? null;
    const statut: StatutAtelier = dernier
      ? dernier.verdict === 'relu'
        ? 'relu'
        : 'a_corriger'
      : bloc.reluDansLeFichier
        ? 'relu'
        : 'a_relire';
    return {
      bloc,
      statut,
      texteModifie: dernier === null && historique.length > 0,
      dernier,
      historique,
      effectif: effectifs === null ? null : effectifs.get(bloc.id) ?? 0,
      profils: profils.get(bloc.id) ?? [],
      rang
    };
  });
}

export function compterStatuts(
  blocs: readonly BlocAtelier[]
): Record<StatutAtelier, number> {
  const compte: Record<StatutAtelier, number> = {
    a_relire: 0,
    a_corriger: 0,
    relu: 0
  };
  for (const b of blocs) compte[b.statut] += 1;
  return compte;
}

type Recherche = Record<string, string | string[] | undefined>;

const estStatut = (v: unknown): v is FiltreStatut =>
  v === 'tous' || STATUTS_ATELIER.some((s) => s === v);
const estTri = (v: unknown): v is TriAtelier =>
  TRIS_ATELIER.some((t) => t === v);

/** Réglages d'URL ; toute valeur inconnue ou multiple retombe sur le défaut. */
export function lireFiltresAtelier(recherche: Recherche): FiltresAtelier {
  const { statut, tri } = recherche;
  return {
    statut: estStatut(statut) ? statut : 'a_relire',
    tri: estTri(tri) ? tri : 'frequence'
  };
}

/** Lien vers l'atelier ; les valeurs par défaut ne s'écrivent pas. */
export function lienAtelier(filtres: FiltresAtelier): string {
  const params = new URLSearchParams();
  if (filtres.statut !== 'a_relire') params.set('statut', filtres.statut);
  if (filtres.tri !== 'frequence') params.set('tri', filtres.tri);
  const requete = params.toString();
  return requete ? `${CHEMIN}?${requete}` : CHEMIN;
}

/**
 * Blocs du filtre, triés. Par fréquence : effectif observé, puis nombre de
 * profils fictifs qui affichent le bloc, puis ordre de la bibliothèque.
 */
export function selectionner(
  blocs: readonly BlocAtelier[],
  filtres: FiltresAtelier
): BlocAtelier[] {
  const retenus = blocs.filter(
    (b) => filtres.statut === 'tous' || b.statut === filtres.statut
  );
  if (filtres.tri === 'catalogue') {
    return retenus.sort((a, b) => a.rang - b.rang);
  }
  return retenus.sort(
    (a, b) =>
      (b.effectif ?? 0) - (a.effectif ?? 0) ||
      b.profils.length - a.profils.length ||
      a.rang - b.rang
  );
}
