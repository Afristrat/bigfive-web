'use client';

import { Button } from '@nextui-org/button';
import { ArrowRightIcon } from '@/components/icons';

export type SurveyNavLabels = {
  prev: string;
  next: string;
  submit: string;
  saving: string;
  nextHelp: string; // aide sous le bouton quand aucune réponse n'est donnée
};

interface SurveyNavProps {
  onPrev: () => void;
  onNext: () => void;
  onSubmit: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  isLast: boolean;
  isLoading: boolean;
  labels: SurveyNavLabels;
}

const baseStyle =
  'h-auto min-h-[52px] min-w-[140px] rounded-controle px-[26px] py-2 text-base font-bold rtl:font-semibold';

const disabledStyle =
  'data-[disabled=true]:bg-creux data-[disabled=true]:text-texte-3 data-[disabled=true]:opacity-100';

// Suivant reste atteignable au clavier et annoncé « indisponible » plutôt que
// retiré de l'ordre de tabulation : aria-disabled et non disabled.
const ariaDisabledStyle =
  'aria-disabled:cursor-not-allowed aria-disabled:bg-creux aria-disabled:text-texte-3 aria-disabled:!opacity-100 aria-disabled:data-[hover=true]:bg-creux';

export function SurveyNav({
  onPrev,
  onNext,
  onSubmit,
  prevDisabled,
  nextDisabled,
  isLast,
  isLoading,
  labels
}: SurveyNavProps) {
  const showHelp = nextDisabled && !isLoading;
  return (
    <>
      <div className='mt-7 flex justify-between gap-3'>
        <Button
          variant='bordered'
          isDisabled={prevDisabled}
          onPress={onPrev}
          startContent={<ArrowRightIcon className='rotate-180' />}
          className={`${baseStyle} border-trait-fort text-encre data-[hover=true]:bg-creux ${disabledStyle}`}
        >
          {labels.prev}
        </Button>
        <Button
          color='primary'
          aria-disabled={nextDisabled || undefined}
          aria-describedby={showHelp ? 'aide-suivant' : undefined}
          isLoading={isLoading}
          onPress={nextDisabled ? undefined : isLast ? onSubmit : onNext}
          endContent={isLoading ? undefined : <ArrowRightIcon />}
          className={`${baseStyle} data-[pressed=true]:translate-y-px motion-reduce:transition-none ${disabledStyle} ${ariaDisabledStyle}`}
        >
          {isLoading ? labels.saving : isLast ? labels.submit : labels.next}
        </Button>
      </div>
      {showHelp && (
        <p id='aide-suivant' className='mt-3 text-end text-petit text-texte-2'>
          {labels.nextHelp}
        </p>
      )}
      {/* Annonce de l'enregistrement aux lecteurs d'écran. */}
      <div role='status' className='sr-only'>
        {isLoading ? labels.saving : ''}
      </div>
    </>
  );
}
