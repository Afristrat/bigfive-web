import type { ReactElement, ReactNode } from 'react';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import styles from './result-motion.module.css';

type ResultHeaderProps = {
  /** Surtitre réglé du filet safran (date de passation, organisation), ou null. */
  surtitre: string | null;
  titre: string;
  /**
   * Titre saisi par une personne (nom de campagne) : il monte d'un seul bloc,
   * sans découpe en mots, pour garder l'ordre d'un texte latin en arabe.
   */
  titreSaisi?: boolean;
  /** Ligne sous le titre (organisation, campagne), ou null. */
  sousTitre?: string | null;
  chapo?: string | null;
  /** Mention complémentaire sous le chapeau, ou null. */
  note?: string | null;
  /** Lien de retour, posé au-dessus du surtitre. */
  retour?: ReactNode;
  /** Actions sous le chapeau (rapport, impression). */
  actions?: ReactNode;
};

// Ouverture des pages de résultat, sur la grammaire de l'accueil : un surtitre
// réglé d'un filet safran, un titre qui monte mot à mot derrière ses masques,
// puis le chapeau qui se pose. Aucune interaction : lisible sans JavaScript et
// sous « réduire les animations » (tout est posé d'emblée).
export function ResultHeader({
  surtitre,
  titre,
  titreSaisi = false,
  sousTitre = null,
  chapo = null,
  note = null,
  retour,
  actions
}: ResultHeaderProps): ReactElement {
  return (
    <header className='pb-4'>
      {retour}
      {surtitre && (
        <p
          className={`${retour ? 'mt-8' : ''} flex items-center gap-3 text-petit font-medium text-texte-2 ${styles.surtitre}`}
        >
          <span
            aria-hidden='true'
            className={`block h-px w-10 flex-none bg-safran ${styles.filet}`}
          />
          {surtitre}
        </p>
      )}
      <h1 className='mt-5 max-w-[16em] text-geant text-encre'>
        {titreSaisi ? (
          <span className='mot'>
            <span style={{ ['--i' as string]: 1 }}>{titre}</span>
          </span>
        ) : (
          <MotsCinetiques texte={titre} depart={1} />
        )}
      </h1>
      {sousTitre && (
        <p className={`mt-4 text-chapo text-texte-2 ${styles.chapo}`}>
          {sousTitre}
        </p>
      )}
      {chapo && (
        <p
          className={`mt-8 colonne-lecture text-chapo text-texte-2 ${styles.chapo}`}
        >
          {chapo}
        </p>
      )}
      {note && (
        <p
          className={`mt-4 colonne-lecture border-s-2 border-safran ps-4 text-petit text-texte-2 ${styles.chapo}`}
        >
          {note}
        </p>
      )}
      {actions && (
        <div
          className={`mt-8 flex flex-wrap items-center gap-3 print:hidden ${styles.chapo}`}
        >
          {actions}
        </div>
      )}
    </header>
  );
}
