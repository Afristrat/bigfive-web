'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

// Garde-fou : si la revalidation n'est jamais observée, l'attente s'arrête.
const ATTENTE_MAX_MS = 5_000;

export type Signal = {
  message: string;
  /** Titre du bloc jugé et de son voisin, relevés à l'envoi. */
  titreId: string;
  suivantId: string | null;
  /** Suivre le focus : seulement après un verdict enregistré. */
  suivre: boolean;
  /** Jeton de rendu de la page relevé à l'envoi du verdict. */
  jetonAvant: string;
};

type Contexte = {
  signaler: (signal: Signal) => void;
  /** Jeton du dernier rendu serveur de la page (change à chaque revalidation). */
  jeton: () => string;
};
const AnnoncesContexte = createContext<Contexte | null>(null);
const sansFournisseur: Contexte = {
  signaler: () => undefined,
  jeton: () => ''
};

/** Signaler une annonce (et suivre le focus) ; sans fournisseur, rien. */
export const useAnnoncesRelecture = (): Contexte =>
  useContext(AnnoncesContexte) ?? sansFournisseur;

const suivreFocus = (signal: Signal, jeton: () => string): void => {
  const debut = performance.now();
  const present = (id: string): boolean => document.getElementById(id) !== null;
  const etape = (): void => {
    const actif = document.activeElement;
    const cible = cibleApresVerdict({
      titreId: signal.titreId,
      suivantId: signal.suivantId,
      repliId: REPLI_FOCUS_ID,
      present,
      focusLibre: actif === null || actif === document.body,
      revalide: jeton() !== signal.jetonAvant
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

export function AnnoncesRelecture({
  rendu,
  children
}: {
  /** Jeton propre à chaque rendu serveur de la page. */
  rendu: string;
  children: ReactNode;
}) {
  const [annonce, setAnnonce] = useState<{ texte: string; n: number } | null>(
    null
  );
  const renduCourant = useRef(rendu);
  useEffect(() => {
    renduCourant.current = rendu;
  }, [rendu]);
  const jeton = useCallback((): string => renduCourant.current, []);
  const signaler = useCallback(
    (signal: Signal): void => {
      // Clé changeante : le même message, répété, est annoncé de nouveau.
      setAnnonce((avant) => ({
        texte: signal.message,
        n: (avant?.n ?? 0) + 1
      }));
      if (signal.suivre) suivreFocus(signal, jeton);
    },
    [jeton]
  );
  const valeur = useMemo(() => ({ signaler, jeton }), [signaler, jeton]);
  return (
    <AnnoncesContexte.Provider value={valeur}>
      {children}
      <LiveMessage id={ANNONCES_ID} ton='info' visuallyHidden>
        {annonce ? <p key={annonce.n}>{annonce.texte}</p> : null}
      </LiveMessage>
    </AnnoncesContexte.Provider>
  );
}
