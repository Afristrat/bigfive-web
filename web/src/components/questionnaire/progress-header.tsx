'use client';

import { progressPercent } from '@/lib/questionnaire-keys';

interface ProgressHeaderProps {
  total: number;
  current: number;
  label: string; // « Question 4 sur 120 », déjà traduit
  noTimeLimit: string;
  barLabel: string;
}

export function ProgressHeader({
  total,
  current,
  label,
  noTimeLimit,
  barLabel
}: ProgressHeaderProps) {
  return (
    <div data-question={current}>
      <div className='flex flex-wrap justify-between gap-x-3 font-bold text-encre chiffres'>
        <p id='progression-test'>{label}</p>
        <p className='font-semibold text-texte-2'>{noTimeLimit}</p>
      </div>
      {/* Gabarit maison plutôt que la barre NextUI, qui se remplit à l'envers
          en arabe : la largeur part du bord de début de ligne, dans les deux
          sens d'écriture. */}
      <div
        role='progressbar'
        aria-label={barLabel}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={label}
        className='mt-2.5 h-3 w-full overflow-hidden rounded-full bg-piste'
      >
        <div
          className='h-full rounded-full bg-accent transition-[width] duration-500 ease-tenga motion-reduce:transition-none'
          style={{ width: `${progressPercent(current, total).toFixed(2)}%` }}
        />
      </div>
    </div>
  );
}
