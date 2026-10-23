import type { ReactElement } from 'react';

type ScoreValueProps = {
  /** Valeur finale déjà formatée : c'est celle que sert la page, sans JavaScript. */
  valeur: string;
  /** Cible numérique du compteur animé (lue par ResultMotion). */
  compte: number;
  /** Plafond déjà formaté, par exemple « 120 ». */
  max: string;
  /** Phrase complète pour les lecteurs d'écran, par exemple « Score 72 sur 120 ». */
  spoken: string;
};

// Valeur « 72 / 120 » : la version visible est masquée aux lecteurs d'écran, qui
// reçoivent la phrase complète. Le nombre reste lu de gauche à droite, même en
// arabe ; le compteur monte de 0 à `compte` à l'entrée dans l'écran.
export function ScoreValue({
  valeur,
  compte,
  max,
  spoken
}: ScoreValueProps): ReactElement {
  return (
    <span className='whitespace-nowrap text-end'>
      <span className='sr-only'>{spoken}</span>
      <span aria-hidden='true' dir='ltr' className='inline-block'>
        <span
          className='chiffres text-titre-3 font-semibold text-encre'
          data-compte={compte}
        >
          {valeur}
        </span>{' '}
        <span className='text-petit text-texte-3'>/ {max}</span>
      </span>
    </span>
  );
}
