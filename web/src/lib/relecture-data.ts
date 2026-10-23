import 'server-only';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import {
  appliquerEtatRelecture,
  type LigneEtatRelecture
} from '@/lib/bibliotheque';
import { chargerEtatRelecture } from '@/lib/relecture-etat';
import type {
  EvenementRelecture,
  LigneFrequence
} from '@/lib/relecture-atelier';
import { isTengaAdmin, requireViewer, type Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Lectures de l'atelier de relecture (migration 0022) avec la SESSION de la
// personne : la base décide qui est relecteur (super administrateur ou
// relecteur désigné) et ce que l'historique lui montre. Seule exception, l'état
// servi (dernier verdict de chaque texte, sans identité), lu par le serveur
// comme pour l'affichage des blocs aux personnes. Journal d'exploitation : code
// HTTP seul, jamais d'adresse ni de texte.

const avertir = (event: string, error: unknown): void => {
  console.warn(
    JSON.stringify({
      event,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
};

/** La personne connectée est-elle relectrice ? (app.suis_relecteur) */
export async function suisRelecteur(viewer: Viewer): Promise<boolean> {
  try {
    return await userClient(viewer.accessToken).rpc(
      'suis_relecteur',
      {},
      z.boolean()
    );
  } catch (error) {
    if (error instanceof GatewayError && error.status < 500) return false;
    throw error;
  }
}

/** Page de l'atelier : 404 pour quiconque n'est pas relecteur. */
export async function requireRelecteur(
  locale: string,
  path: string
): Promise<Viewer> {
  const viewer = await requireViewer(locale, path);
  if (!(await suisRelecteur(viewer))) notFound();
  return viewer;
}

/** Super administrateur : seul à gérer les relecteurs désignés. */
export const estAdministrateur = (viewer: Viewer): Promise<boolean> =>
  isTengaAdmin(viewer);

const historiqueRows = z.array(
  z.object({
    relecture_id: z.string().uuid(),
    bloc: z.string(),
    empreinte: z.string(),
    verdict: z.enum(['relu', 'a_corriger']),
    commentaire: z.string().nullable(),
    relecteur_nom: z.string().nullable(),
    relecteur_adresse: z.string().nullable(),
    est_moi: z.boolean(),
    cree_le: z.string()
  })
);

/**
 * Historique des verdicts visible par la personne, du plus récent au plus
 * ancien (lecture journalisée, filtrée par la base : tout pour un super
 * administrateur, ses seuls verdicts sans identité pour un relecteur désigné).
 * null en cas d'échec : l'atelier le dit et n'offre aucun verdict, plutôt
 * qu'un état faux.
 */
export async function loadHistorique(
  viewer: Viewer
): Promise<EvenementRelecture[] | null> {
  try {
    const rows = await userClient(viewer.accessToken).rpc(
      'historique_relecture',
      {},
      historiqueRows
    );
    return rows.map((r) => ({
      id: r.relecture_id,
      bloc: r.bloc,
      empreinte: r.empreinte,
      verdict: r.verdict,
      commentaire: r.commentaire,
      relecteurNom: r.relecteur_nom,
      relecteurAdresse: r.relecteur_adresse,
      estMoi: r.est_moi,
      creeLe: r.cree_le
    }));
  } catch (error) {
    avertir('relecture.historique_failed', error);
    return null;
  }
}

/**
 * État servi (app.etat_relecture_blocs) : statut de chaque bloc, le même que
 * celui qui décide de l'affichage aux personnes, qui est mis à jour au passage.
 * null en cas d'échec (même conduite que pour l'historique).
 */
export async function loadEtat(): Promise<LigneEtatRelecture[] | null> {
  try {
    const lignes = await chargerEtatRelecture();
    appliquerEtatRelecture(lignes);
    return lignes;
  } catch (error) {
    avertir('relecture.etat_failed', error);
    return null;
  }
}

const frequenceRows = z.array(
  z.object({
    facette: z.string(),
    score: z.coerce.number(),
    effectif: z.number().int().nonnegative()
  })
);

/**
 * Histogramme des scores de facette ; vide sous le seuil d'anonymat (la base
 * décide) ou en cas d'échec : le tri retombe alors sur les profils fictifs.
 */
export async function loadFrequences(
  viewer: Viewer
): Promise<LigneFrequence[]> {
  try {
    return await userClient(viewer.accessToken).rpc(
      'frequence_facettes',
      {},
      frequenceRows
    );
  } catch (error) {
    avertir('relecture.frequence_failed', error);
    return [];
  }
}

const relecteurRows = z.array(
  z.object({
    user_id: z.string().uuid(),
    // Un compte GoTrue peut n'avoir aucune adresse : la ligne reste listée.
    adresse: z.string().nullable(),
    ajoute_le: z.string()
  })
);

export type RelecteurDesigne = {
  userId: string;
  adresse: string | null;
  ajouteLe: string;
};

/** Relecteurs désignés (super administrateur, lecture journalisée) ; null en cas d'échec. */
export async function loadRelecteurs(
  viewer: Viewer
): Promise<RelecteurDesigne[] | null> {
  try {
    const rows = await userClient(viewer.accessToken).rpc(
      'lister_relecteurs',
      {},
      relecteurRows
    );
    return rows.map((r) => ({
      userId: r.user_id,
      adresse: r.adresse,
      ajouteLe: r.ajoute_le
    }));
  } catch (error) {
    avertir('relecture.relecteurs_failed', error);
    return null;
  }
}
