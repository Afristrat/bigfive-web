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
  const part = progressPercent(current, total) / 100;
  return (
    <div data-question={current}>
      <div className='flex flex-wrap justify-between gap-x-3 text-petit font-medium text-encre chiffres'>
        <p id='progression-test'>{label}</p>
        <p className='text-texte-3'>{noTimeLimit}</p>
      </div>
      {/* Gabarit maison plutôt que la barre NextUI, qui se remplit à l'envers
          en arabe : le trait part du bord de début de ligne dans les deux sens
          d'écriture, et avance par transform (aucun recalcul de mise en page). */}
      <div
        role='progressbar'
        aria-label={barLabel}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current}
        aria-valuetext={label}
        className='regle-piste mt-2 h-1 w-full overflow-hidden rounded-petit bg-creux'
      >
        <div
          className='regle-trait h-full w-full origin-left bg-accent transition-transform duration-longue ease-tenga motion-reduce:transition-none rtl:origin-right'
          style={{ transform: `scaleX(${part.toFixed(4)})` }}
        />
      </div>
    </div>
  );
}
