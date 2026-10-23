// Focus après un verdict dans l'atelier de relecture : quand le verdict fait
// sortir le bloc de la sélection (filtre « à relire », par exemple), son
// formulaire disparaît avec lui et le focus retombe sur la page. On le porte
// alors sur le titre du bloc voisin, sinon sur le décompte de la sélection,
// sans jamais reprendre un focus que la personne a déjà placé ailleurs.
// Fonctions pures, utilisables côté client et testées seules.

/** Région vivante de la page et repli du focus (décompte de la sélection). */
export const ANNONCES_ID = 'annonces-relecture';
export const REPLI_FOCUS_ID = 'selection-relecture';

/** Titre du bloc suivant dans l'ordre affiché, sinon du précédent, sinon null. */
export function voisinDuBloc(
  ordre: readonly string[],
  titreId: string
): string | null {
  const i = ordre.indexOf(titreId);
  if (i === -1) return null;
  return ordre[i + 1] ?? ordre[i - 1] ?? null;
}

/**
 * Cible du focus après un verdict : « attendre » tant que la page n'a pas été
 * revalidée et que le bloc est encore affiché ; null dès que la revalidation
 * est observée avec le bloc toujours là (le focus reste en place) ;
 * l'identifiant à focaliser une fois le bloc disparu.
 */
export function cibleApresVerdict(entree: {
  titreId: string;
  suivantId: string | null;
  repliId: string;
  present: (id: string) => boolean;
  /** Le focus est perdu : sur le document, ou nulle part. */
  focusLibre: boolean;
  /** Le rendu de la page a changé depuis l'envoi du verdict. */
  revalide: boolean;
}): string | null | 'attendre' {
  if (entree.present(entree.titreId)) {
    return entree.revalide ? null : 'attendre';
  }
  if (!entree.focusLibre) return null;
  if (entree.suivantId !== null && entree.present(entree.suivantId)) {
    return entree.suivantId;
  }
  return entree.present(entree.repliId) ? entree.repliId : null;
}
