import type { ReponseBinome } from '@/actions/binome';

// Suite d'une réponse à une proposition de binôme. Un retrait ou un refus ferme
// le rapport : rafraîchir la page du rapport donnerait un 404. La personne
// revient donc à la liste de ses binômes, qui confirme ce qui vient d'être fait
// (paramètre « decision », lu par lireDecision). Fonctions pures, sans accès
// aux données.

export type ActionBinome = 'accepter' | 'refuser' | 'retirer';
export type Decision = 'retrait' | 'refus';

const LISTE = '/mes-resultats/binomes';

/** Où aller après la réponse du serveur : une adresse, un rafraîchissement, ou rien. */
export function apresReponse(
  action: ActionBinome,
  statut: ReponseBinome['status']
): { aller: string } | 'rafraichir' | null {
  switch (statut) {
    case 'retire':
      return {
        aller: `${LISTE}?decision=${action === 'refuser' ? 'refus' : 'retrait'}`
      };
    case 'closed':
    case 'notfound':
      return { aller: LISTE };
    case 'en_attente':
    case 'actif':
      return 'rafraichir';
    default:
      return null;
  }
}

/** Paramètre « decision » de la liste : seules deux valeurs ont un sens. */
export function lireDecision(valeur: unknown): Decision | null {
  return valeur === 'retrait' || valeur === 'refus' ? valeur : null;
}
