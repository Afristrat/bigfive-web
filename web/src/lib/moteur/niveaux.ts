import { SEUILS_DEFAUT } from './seuils';
import type { ClasseEcart, Niveau, Seuils } from './types';

// Arrondi à 6 décimales avant toute comparaison à un seuil : 83/24 - 71/24 ne doit
// pas passer sous 0,5 par erreur de flottant.
export const arrondir6 = (x: number): number => Math.round(x * 1e6) / 1e6;

// Arrondi d'affichage des écarts (4 décimales), comme le moteur du rapport.
export const arrondir4 = (x: number): number => Number(arrondir6(x).toFixed(4));

export function niveau(
  moyenne: number,
  s: Seuils['niveaux'] = SEUILS_DEFAUT.niveaux
): Niveau {
  const m = arrondir6(moyenne);
  if (m < s.bas) return 'bas';
  if (m < s.plutot_bas) return 'plutot_bas';
  if (m < s.milieu) return 'milieu';
  if (m < s.plutot_haut) return 'plutot_haut';
  return 'haut';
}

export function ecart(
  delta: number,
  s: Seuils['ecarts'] = SEUILS_DEFAUT.ecarts
): ClasseEcart {
  const a = arrondir6(Math.abs(delta));
  if (a <= s.proche) return 'proche';
  if (a >= s.notable) return 'notable';
  return 'intermediaire';
}
