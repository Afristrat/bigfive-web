'use client';

import { Ref } from 'react';
import { type Question } from '@bigfive-org/questions';
import { formatNombre } from '@/lib/format';

interface QuestionBlockProps {
  question: Question;
  number: number;
  statementLabel: string; // « Affirmation {number} »
  prompt: string;
  locale: string;
  value: string | undefined;
  onChange: (value: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function QuestionBlock({
  question,
  number,
  statementLabel,
  prompt,
  locale,
  value,
  onChange,
  headingRef
}: QuestionBlockProps) {
  const headingId = 'q-' + question.id;
  return (
    <section className='animate-apparaitre motion-reduce:animate-none'>
      <p className='chiffres text-petit font-medium text-texte-3'>
        {statementLabel.replace('{number}', formatNombre(number, locale))}
      </p>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className='mt-2 max-w-[30em] text-question text-encre focus:outline-none'
      >
        {question.text}
      </h2>
      <p className='mb-5 mt-2 text-petit text-texte-2'>{prompt}</p>
      {/* Cinq lignes pleine largeur (direction § 8.6) : boutons radio natifs,
          les flèches du clavier changent le choix ; le choix coché porte une
          pastille pleine, un contour et une graisse plus forte, pas la couleur
          seule. Le chiffre en fin de ligne rappelle la touche 1 à 5. */}
      <div
        role='radiogroup'
        aria-labelledby={headingId}
        className='grid max-w-[44rem] gap-2'
      >
        {question.choices.map((choice, index) => {
          const id = `${headingId}-${choice.score}`;
          const selected = value === choice.score.toString();
          return (
            <div key={choice.score} className='group relative'>
              <input
                type='radio'
                id={id}
                name={headingId}
                value={choice.score}
                checked={selected}
                onChange={() => onChange(choice.score.toString())}
                className='peer absolute inset-0 z-[2] m-0 h-full w-full cursor-pointer opacity-0'
              />
              <label
                htmlFor={id}
                className={`flex min-h-12 items-center gap-3 rounded-controle border px-4 py-2.5 text-corps leading-snug text-encre transition-[background-color,border-color,transform] duration-courte ease-tenga peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-anneau peer-active:scale-[0.99] motion-reduce:transition-none motion-reduce:peer-active:scale-100 ${
                  selected
                    ? 'border-accent bg-accent-doux font-semibold shadow-[inset_0_0_0_0.5px_rgb(var(--c-accent))]'
                    : 'border-trait bg-surface font-medium group-hover:border-trait-fort group-hover:bg-creux'
                }`}
              >
                <span
                  aria-hidden='true'
                  className={`grid size-5 flex-none place-items-center rounded-full border-[1.5px] transition-colors duration-courte ease-tenga ${
                    selected
                      ? 'border-accent bg-accent'
                      : 'border-trait-fort bg-surface'
                  }`}
                >
                  <span
                    className={`size-2 rounded-full bg-sur-accent transition-[opacity,transform] duration-courte ease-tenga ${
                      selected ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                  />
                </span>
                <span className='flex-1'>{choice.text}</span>
                <span
                  aria-hidden='true'
                  className='chiffres text-legende font-medium text-texte-3'
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
