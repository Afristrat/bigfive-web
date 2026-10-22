// Fusion pure de la sauvegarde du serveur et des réponses du tampon local.
// Aucun import serveur : ce module est utilisable depuis un composant client.

/**
 * Union des deux ensembles de réponses (identifiant de question vers valeur) :
 * la reprise du serveur prime sur une question commune, une réponse locale
 * absente du serveur est ajoutée. Aucune entrée n'est modifiée.
 */
export function fusionnerReprise(
  serveur: Readonly<Record<string, number>>,
  local: Readonly<Record<string, number>>
): Record<string, number> {
  // La propagation crée des propriétés propres : une clé « __proto__ » reste une donnée.
  return { ...local, ...serveur };
}
