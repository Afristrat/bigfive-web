'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode
} from 'react';
import { LiveMessage, type MessageTon } from '@/components/live-message';

type Announcement = { text: string; ton: MessageTon; serial: number };
type Announce = (text: string, ton: MessageTon) => void;

const AnnounceContext = createContext<Announce | null>(null);

/**
 * Région d'annonce PERSISTANTE de la liste des campagnes. « Ouvrir » et
 * « Clôturer » re-rendent la page (`revalidatePath`) : le message ne peut pas
 * vivre dans un bloc éphémère. La région reste montée ; les lignes y écrivent
 * par `useAnnounce`. Elle n'est lue que par les lecteurs d'écran : le message
 * visible est affiché dans la ligne concernée.
 */
export function CampaignAnnouncer({ children }: { children: ReactNode }) {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const announce = useCallback<Announce>((text, ton) => {
    // `serial` change à chaque annonce : le contenu est remonté et un refus
    // identique au précédent est lu de nouveau.
    setAnnouncement((previous) => ({
      text,
      ton,
      serial: (previous?.serial ?? 0) + 1
    }));
  }, []);
  return (
    <AnnounceContext.Provider value={announce}>
      <LiveMessage ton={announcement?.ton ?? 'info'} visuallyHidden>
        {announcement ? (
          <span key={announcement.serial}>{announcement.text}</span>
        ) : null}
      </LiveMessage>
      {children}
    </AnnounceContext.Provider>
  );
}

export function useAnnounce(): Announce {
  const announce = useContext(AnnounceContext);
  // Hors de l'annonceur, une confirmation se perdrait sans bruit.
  if (!announce) {
    throw new Error('useAnnounce doit être utilisé dans un CampaignAnnouncer');
  }
  return announce;
}
