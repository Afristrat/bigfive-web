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
      <p className='text-[0.875rem] font-extrabold uppercase tracking-[0.08em] text-accent rtl:tracking-normal'>
        {statementLabel.replace('{number}', formatNombre(number, locale))}
      </p>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className='mb-2 mt-2.5 text-[clamp(1.5rem,4.2vw,2.5rem)] font-extrabold leading-[1.15] tracking-[-0.03em] text-encre focus:outline-none rtl:font-bold rtl:leading-[1.4] rtl:tracking-normal'
      >
        {question.text}
      </h2>
      <p className='mb-6 text-texte-2'>{prompt}</p>
      {/* Boutons radio natifs : les flèches du clavier changent le choix, la
          sélection porte une coche et une bordure épaisse, pas la couleur seule. */}
      <div
        role='radiogroup'
        aria-labelledby={headingId}
        className='grid grid-cols-1 gap-3 sm:grid-cols-5'
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
                className={`relative flex min-h-16 flex-row items-center gap-4 rounded-[20px] border-2 px-[18px] py-3 text-[1.03rem] font-bold leading-[1.3] text-encre transition-[background-color,border-color,transform] duration-normale peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-anneau peer-active:scale-[0.985] motion-reduce:transition-none motion-reduce:peer-active:scale-100 sm:min-h-[148px] sm:flex-col sm:justify-center sm:gap-3.5 sm:px-2.5 sm:pb-[18px] sm:pt-[26px] sm:text-center ${
                  selected
                    ? 'border-accent bg-accent-doux shadow-[inset_0_0_0_1.5px_rgb(var(--c-accent))]'
                    : 'border-trait-fort bg-surface group-hover:bg-creux'
                }`}
              >
                <span
                  aria-hidden='true'
                  className={`grid h-[30px] w-[30px] flex-none place-items-center rounded-full border-2 ${
                    selected
                      ? 'border-accent bg-accent text-sur-accent'
                      : 'border-trait-fort bg-surface text-transparent'
                  }`}
                >
                  <svg
                    viewBox='0 0 24 24'
                    width='18'
                    height='18'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='3.4'
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <path d='M5 12.5l4.5 4.5L19 7.5' />
                  </svg>
                </span>
                <span>{choice.text}</span>
                <span
                  aria-hidden='true'
                  className='order-3 ms-auto text-[0.8125rem] font-bold text-texte-2 chiffres sm:absolute sm:start-3.5 sm:top-2.5 sm:order-none sm:m-0'
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
