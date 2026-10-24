/**
 * Appelle une action serveur depuis le navigateur sans jamais lever. Un rejet
 * (coupure réseau, action introuvable après un déploiement) remonterait sinon
 * à la frontière d'erreur de la page et effacerait toute saisie en cours :
 * il devient le statut de repli, que l'écran affiche comme les autres.
 */
export async function appelSansRejet<T>(
  appel: () => Promise<T>,
  // Le type vient de l'action seule : le repli s'y conforme.
  repli: NoInfer<T>
): Promise<T> {
  try {
    return await appel();
  } catch {
    return repli;
  }
}
