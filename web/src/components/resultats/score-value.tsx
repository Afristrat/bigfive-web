import type { ReactElement } from 'react';
import clsx from 'clsx';

type ScoreValueProps = {
  /** Valeur finale déjà formatée : c'est celle que sert la page, sans JavaScript. */
  valeur: string;
  /** Cible numérique du compteur animé (lue par ResultMotion). */
  compte: number;
  /** Plafond déjà formaté, par exemple « 120 ». */
  max: string;
  /** Phrase complète pour les lecteurs d'écran, par exemple « Score 72 sur 120 ». */
  spoken: string;
  /** « grand » : chiffre de titrage, comme la fiche chiffrée de l'accueil. */
  taille?: 'grand' | 'moyen' | 'courant';
};

const TAILLES = {
  grand:
    'font-display text-[clamp(2.25rem,1.7rem+2vw,3.25rem)] leading-none tracking-[-0.04em]',
  moyen:
    'font-display text-[clamp(1.5rem,1.3rem+0.8vw,1.875rem)] leading-none tracking-[-0.03em]',
  courant: 'text-titre-3'
} as const;

// Valeur « 72 / 120 » : la version visible est masquée aux lecteurs d'écran, qui
// reçoivent la phrase complète. Le nombre reste lu de gauche à droite, même en
// arabe ; le compteur monte de 0 à `compte` à l'entrée dans l'écran.
export function ScoreValue({
  valeur,
  compte,
  max,
  spoken,
  taille = 'courant'
}: ScoreValueProps): ReactElement {
  return (
    <span className='whitespace-nowrap text-end'>
      <span className='sr-only'>{spoken}</span>
      <span aria-hidden='true' dir='ltr' className='inline-block'>
        <span
          className={clsx('chiffres font-semibold text-encre', TAILLES[taille])}
          data-compte={compte}
        >
          {valeur}
        </span>{' '}
        <span className='text-petit font-medium text-texte-3'>/ {max}</span>
      </span>
    </span>
  );
}
