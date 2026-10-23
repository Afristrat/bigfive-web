'use client';

import { Ref } from 'react';
import clsx from 'clsx';
import { type Question } from '@bigfive-org/questions';
import { formatNombre } from '@/lib/format';
import styles from './flow.module.css';

interface QuestionBlockProps {
  question: Question;
  number: number;
  statementLabel: string; // « Affirmation {number} »
  prompt: string;
  locale: string;
  value: string | undefined;
  onChange: (value: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
  sens?: 'avant' | 'arriere'; // sens de la dernière navigation
}

// Retour tactile bref au choix d'une réponse, sur écran tactile seulement et
// si le navigateur le permet (aucun effet ailleurs, aucune erreur).
function tapoter() {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (!matchMedia('(pointer: coarse)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(8);
  } catch {
    // Vibration refusée par le navigateur : le retour visuel suffit.
  }
}

export function QuestionBlock({
  question,
  number,
  statementLabel,
  prompt,
  locale,
  value,
  onChange,
  headingRef,
  sens = 'avant'
}: QuestionBlockProps) {
  const headingId = 'q-' + question.id;
  return (
    <section
      className={clsx(styles.question, sens === 'arriere' && styles.arriere)}
    >
      <p className='chiffres text-petit font-medium text-texte-3'>
        {statementLabel.replace('{number}', formatNombre(number, locale))}
      </p>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className={clsx(
          styles.enonce,
          'mt-2 max-w-[30em] text-question text-encre focus:outline-none'
        )}
      >
        {question.text}
      </h2>
      <p className='mb-5 mt-2 text-petit text-texte-2'>{prompt}</p>
      {/* Cinq lignes pleine largeur (direction § 8.6) : boutons radio natifs,
          les flèches du clavier changent le choix ; le choix coché porte une
          pastille pleine, un contour et une graisse plus forte, pas la couleur
          seule. Le chiffre en fin de ligne rappelle la touche 1 à 5. Chaque
          ligne mesure au moins 48 px de haut. */}
      <div
        role='radiogroup'
        aria-labelledby={headingId}
        className='grid max-w-[44rem] gap-2'
      >
        {question.choices.map((choice, index) => {
          const id = `${headingId}-${choice.score}`;
          const selected = value === choice.score.toString();
          return (
            <div
              key={choice.score}
              className={clsx(styles.ligne, 'group relative')}
              style={{ ['--rang' as string]: index }}
            >
              <input
                type='radio'
                id={id}
                name={headingId}
                value={choice.score}
                checked={selected}
                onChange={() => {
                  tapoter();
                  onChange(choice.score.toString());
                }}
                className='peer absolute inset-0 z-[2] m-0 h-full w-full cursor-pointer opacity-0'
              />
              <label
                htmlFor={id}
                className={clsx(
                  styles.choix,
                  selected && styles.coche,
                  'flex min-h-12 items-center gap-3 rounded-controle border bg-surface px-4 py-2.5 text-corps leading-snug text-encre peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-anneau peer-active:scale-[0.985] motion-reduce:peer-active:scale-100',
                  selected
                    ? 'border-accent font-semibold shadow-[inset_0_0_0_0.5px_rgb(var(--c-accent))]'
                    : 'border-trait font-medium group-hover:border-trait-fort'
                )}
              >
                <span
                  aria-hidden='true'
                  className={clsx(
                    styles.pastille,
                    'grid size-5 flex-none place-items-center rounded-full border-[1.5px] transition-colors duration-courte ease-tenga',
                    selected
                      ? 'border-accent bg-accent'
                      : 'border-trait-fort bg-surface'
                  )}
                >
                  <span
                    className={clsx(
                      'size-2 rounded-full bg-sur-accent transition-[opacity,transform] duration-courte ease-tenga',
                      selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    )}
                  />
                </span>
                <span className='flex-1'>{choice.text}</span>
                <span
                  aria-hidden='true'
                  className={clsx(
                    'chiffres grid size-7 flex-none place-items-center rounded-full text-legende font-medium transition-colors duration-courte ease-tenga',
                    selected ? 'bg-accent text-sur-accent' : 'text-texte-3'
                  )}
                >
                  {formatNombre(index + 1, locale)}
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
