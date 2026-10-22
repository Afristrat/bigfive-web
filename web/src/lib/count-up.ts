// Compteur des scores de la page de résultat : valeur affichée à l'instant t
// d'une montée de 0 à la cible, sur une courbe de décélération (départ vif,
// arrivée douce), arrondie à l'entier. Pure, pour être testée sans navigateur.

/** Décélération cubique : 1 − (1 − p)³, bornée à [0, 1]. */
export function decelere(progression: number): number {
  const p = Math.min(1, Math.max(0, progression));
  return 1 - Math.pow(1 - p, 3);
}

/** Entier affiché après `ecoule` ms d'une montée de `duree` ms vers `cible`. */
export function valeurMontee(
  cible: number,
  ecoule: number,
  duree: number
): number {
  if (!(duree > 0) || ecoule >= duree) return cible;
  return Math.round(cible * decelere(ecoule / duree));
}
