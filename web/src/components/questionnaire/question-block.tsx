'use client';

import { Ref } from 'react';
import { RadioGroup, Radio } from '@nextui-org/radio';
import { type Question } from '@bigfive-org/questions';

interface QuestionBlockProps {
  question: Question;
  number: number;
  value: string | undefined;
  onChange: (value: string) => void;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function QuestionBlock({
  question,
  number,
  value,
  onChange,
  headingRef
}: QuestionBlockProps) {
  const headingId = 'q-' + question.id;
  return (
    <section className='scroll-mt-36 animate-apparaitre border-b border-trait py-8 last:border-b-0'>
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className='text-[1.25rem] text-encre focus:outline-none md:text-question'
      >
        <span className='me-2 text-texte-3 chiffres'>{number}.</span>
        {question.text}
      </h2>
      {/* Le titre nomme le groupe : équivalent du couple fieldset et legend. */}
      <RadioGroup
        aria-labelledby={headingId}
        value={value}
        onValueChange={onChange}
        classNames={{ base: 'mt-5', wrapper: 'gap-2' }}
      >
        {question.choices.map((choice) => (
          <Radio
            key={choice.score}
            value={choice.score.toString()}
            classNames={{
              base: 'm-0 flex w-full max-w-[44rem] min-h-12 items-center gap-3 rounded-controle border border-trait bg-surface px-4 py-3 transition-colors duration-courte hover:bg-creux data-[selected=true]:border-accent data-[selected=true]:bg-accent-doux data-[focus-visible=true]:outline data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-accent',
              wrapper:
                'border-[1.5px] border-trait-fort group-data-[selected=true]:border-accent',
              control: 'bg-accent',
              label:
                'text-corps font-medium text-encre group-data-[selected=true]:font-semibold'
            }}
          >
            {choice.text}
          </Radio>
        ))}
      </RadioGroup>
    </section>
  );
}
