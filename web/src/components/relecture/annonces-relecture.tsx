'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { LiveMessage } from '@/components/live-message';
import {
  ANNONCES_ID,
  cibleApresVerdict,
  REPLI_FOCUS_ID
} from '@/lib/relecture-focus';

// Annonces de l'atelier de relecture : UNE région vivante persistante au
// niveau de la page (montée vide dès le premier rendu), qui survit à la
// disparition d'un bloc sorti de la sélection par un verdict. Après un tel
// verdict, le focus est porté sur le titre du bloc voisin (sinon sur le
// décompte de la sélection), jamais repris si la personne l'a déjà placé
// ailleurs.

// Délai d'attente du nouvel affichage après le verdict (revalidation).
const ATTENTE_MAX_MS = 5_000;

export type Signal = {
  message: string;
  /** Titre du bloc jugé et de son voisin, relevés à l'envoi. */
  titreId: string;
  suivantId: string | null;
  /** Suivre le focus : seulement après un verdict enregistré. */
  suivre: boolean;
};

type Contexte = { signaler: (signal: Signal) => void };
const AnnoncesContexte = createContext<Contexte | null>(null);

/** Signaler une annonce (et suivre le focus) ; sans fournisseur, rien. */
export const useAnnoncesRelecture = (): Contexte['signaler'] =>
  useContext(AnnoncesContexte)?.signaler ?? (() => undefined);

const suivreFocus = (signal: Signal): void => {
  const debut = performance.now();
  const present = (id: string): boolean => document.getElementById(id) !== null;
  const etape = (): void => {
    const actif = document.activeElement;
    const titre = document.getElementById(signal.titreId);
    const focusLibre =
      actif === null ||
      actif === document.body ||
      (titre?.closest('[data-bloc]')?.contains(actif) ?? false);
    const cible = cibleApresVerdict({
      titreId: signal.titreId,
      suivantId: signal.suivantId,
      repliId: REPLI_FOCUS_ID,
      present,
      focusLibre
    });
    if (cible === 'attendre') {
      if (performance.now() - debut < ATTENTE_MAX_MS) {
        requestAnimationFrame(etape);
      }
      return;
    }
    if (cible !== null) document.getElementById(cible)?.focus();
  };
  requestAnimationFrame(etape);
};

export function AnnoncesRelecture({ children }: { children: ReactNode }) {
  const [annonce, setAnnonce] = useState<{ texte: string; n: number } | null>(
    null
  );
  const signaler = useCallback((signal: Signal): void => {
    // Clé changeante : le même message, répété, est annoncé de nouveau.
    setAnnonce((avant) => ({ texte: signal.message, n: (avant?.n ?? 0) + 1 }));
    if (signal.suivre) suivreFocus(signal);
  }, []);
  const valeur = useMemo(() => ({ signaler }), [signaler]);
  return (
    <AnnoncesContexte.Provider value={valeur}>
      {children}
      <LiveMessage id={ANNONCES_ID} ton='info' visuallyHidden>
        {annonce ? <p key={annonce.n}>{annonce.texte}</p> : null}
      </LiveMessage>
    </AnnoncesContexte.Provider>
  );
}
