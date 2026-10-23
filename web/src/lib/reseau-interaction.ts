import { formatNombre, remplir } from '@/lib/format';
import {
  SUCCES_RESEAU,
  type EtatMoi,
  type ResultatReseau
} from '@/lib/reseau-releve';

// Logique d'interaction de l'écran du relevé, sans DOM ni React : quel panneau
// est ouvert, où va le focus après chaque geste, quand remonter le formulaire
// d'accords, quand confirmer un refus, quel message dire. Le composant applique
// ces décisions ; elles sont testées ici par transitions.

/** Panneaux repliables : confirmations (retrait, opposition, refus de répondre) et modification des accords. */
export type Panneau = 'retrait' | 'opposition' | 'refus' | 'accords';

export type CibleFocus =
  /** Bouton de confirmation du panneau qui vient de s'ouvrir. */
  | { cible: 'confirmation'; panneau: Panneau }
  /** Premier champ du formulaire qui vient de s'ouvrir. */
  | { cible: 'premierChamp'; panneau: Panneau }
  /** Déclencheur du panneau qui vient de se fermer (pour « refus » : la case « répondre »). */
  | { cible: 'declencheur'; panneau: Panneau }
  /** Titre de l'étape, après un enregistrement réussi. */
  | { cible: 'titre' };

export type EtatInteraction = {
  panneau: Panneau | null;
  /** Focus à poser au prochain rendu, puis consommé. */
  focus: CibleFocus | null;
};

export type EvenementInteraction =
  | { type: 'ouvrir'; panneau: Panneau }
  | { type: 'fermer' }
  | { type: 'succes' }
  | { type: 'focusApplique' }
  /** La case « répondre » est cochée de nouveau : plus rien à confirmer. */
  | { type: 'repondreRecoche' };

export const INTERACTION_INITIALE: EtatInteraction = {
  panneau: null,
  focus: null
};

export function reduireInteraction(
  etat: EtatInteraction,
  evenement: EvenementInteraction
): EtatInteraction {
  switch (evenement.type) {
    case 'ouvrir':
      // Le déclencheur d'un panneau ouvert le referme (bascule).
      if (etat.panneau === evenement.panneau) {
        return {
          panneau: null,
          focus: { cible: 'declencheur', panneau: evenement.panneau }
        };
      }
      return {
        panneau: evenement.panneau,
        focus: {
          cible:
            evenement.panneau === 'accords' ? 'premierChamp' : 'confirmation',
          panneau: evenement.panneau
        }
      };
    case 'fermer':
      if (etat.panneau === null) return etat;
      return {
        // La confirmation du refus vit dans le formulaire d'accords : l'annuler
        // y ramène, sans le fermer.
        panneau: etat.panneau === 'refus' ? 'accords' : null,
        focus: { cible: 'declencheur', panneau: etat.panneau }
      };
    case 'succes':
      // Si l'étape change, le titre est celui de la nouvelle étape.
      return { panneau: null, focus: { cible: 'titre' } };
    case 'focusApplique':
      return etat.focus === null ? etat : { ...etat, focus: null };
    case 'repondreRecoche':
      // La confirmation du refus se referme ; le focus reste sur la case.
      return etat.panneau === 'refus'
        ? { panneau: 'accords', focus: null }
        : etat;
  }
}

/**
 * Clé du formulaire d'accords, dérivée des deux dates : quand un accord change
 * (retrait, nouvel accord), le formulaire est remonté et ses cases repartent de
 * l'état enregistré.
 */
export const cleAccords = (moi: EtatMoi | null): string =>
  `${moi?.accordRepondreLe ?? 'non'}|${moi?.accordCarteLe ?? 'non'}`;

/** Retirer l'accord de répondre supprime les réponses : on le fait confirmer. */
export const doitConfirmerRefus = (
  repondreAccorde: boolean,
  repondre: boolean
): boolean => repondreAccorde && !repondre;

export type LibellesMessage = {
  working: string;
  /** Gabarit : {nombre}. */
  manque: string;
  messages: Record<ResultatReseau['status'] | 'informeSansReponse', string>;
};

export type EntreeMessage = {
  pending: boolean;
  /** La personne a tenté d'enregistrer une liste incomplète. */
  incomplet: boolean;
  /** Questions sans réponse, recalculées à chaque rendu. */
  restantes: number;
  statut: ResultatReseau['status'] | null;
  campagneOuverte: boolean;
  locale: string;
};

export type MessageReseau = {
  texte: string;
  ton: 'info' | 'erreur';
  /** Vrai quand il faut proposer le lien de reconnexion. */
  reconnexion: boolean;
};

/** Message de la région vivante, ou null quand il n'y a rien à dire. */
export function messageReseau(
  entree: EntreeMessage,
  libelles: LibellesMessage
): MessageReseau | null {
  if (entree.pending) {
    return { texte: libelles.working, ton: 'info', reconnexion: false };
  }
  if (entree.incomplet && entree.restantes > 0) {
    return {
      texte: remplir(libelles.manque, {
        nombre: formatNombre(entree.restantes, entree.locale)
      }),
      ton: 'erreur',
      reconnexion: false
    };
  }
  const { statut } = entree;
  if (statut === null) return null;
  const texte =
    statut === 'informe' && !entree.campagneOuverte
      ? libelles.messages.informeSansReponse
      : libelles.messages[statut];
  return {
    texte,
    ton:
      SUCCES_RESEAU.includes(statut) || statut === 'apercu' ? 'info' : 'erreur',
    reconnexion: statut === 'reconnexion'
  };
}
