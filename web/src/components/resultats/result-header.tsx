import type { ReactElement } from 'react';
import { title } from '@/components/primitives';
import styles from './result-motion.module.css';

type ResultHeaderProps = {
  titre: string;
  /** Date de passation déjà rédigée (« Passé le … »), ou null. */
  date: string | null;
  chapo: string;
  /** Mention complémentaire sous le chapeau, ou null. */
  note: string | null;
};

// En-tête animé du résultat : le titre se révèle par un masque, puis la date et
// le chapeau se posent. Aucune interaction : lisible sans JavaScript.
export function ResultHeader({
  titre,
  date,
  chapo,
  note
}: ResultHeaderProps): ReactElement {
  return (
    <header>
      <h1 className={`${title()} ${styles.titre}`}>{titre}</h1>
      {date && (
        <p className={`mt-2 text-petit text-texte-3 ${styles['sous-titre']}`}>
          {date}
        </p>
      )}
      <p
        className={`mt-6 colonne-lecture text-chapo text-texte-2 ${styles.chapo}`}
      >
        {chapo}
      </p>
      {note && (
        <p className='mt-3 colonne-lecture text-petit text-texte-2'>{note}</p>
      )}
    </header>
  );
}
