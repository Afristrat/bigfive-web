'use client';

import clsx from 'clsx';
import { DomainShape } from '@/components/domain-shape';
import { type DomainCode } from '@/lib/domain-labels';
import { type DomainProgress } from '@/lib/questionnaire-keys';
import styles from './flow.module.css';

interface ProgressHeaderProps {
  total: number;
  current: number;
  label: string; // « Question 4 sur 120 », déjà traduit
  noTimeLimit: string;
  barLabel: string;
  parFacteur: readonly DomainProgress[]; // réponses données par facteur
  facteurCourant?: string; // facteur de l'affirmation affichée
  palier: number; // quart du parcours franchi (0 à 4)
}

const part = (fait: number, total: number) =>
  total > 0 ? Math.min(1, Math.max(0, fait / total)) : 0;

// Petit radar d'avancement : un rayon par facteur, qui s'allonge avec le
// nombre de réponses données à ce facteur. Il ne lit jamais les scores et ne
// préfigure donc aucun résultat. Décoratif : la barre porte l'information.
function RadarAvancement({
  parFacteur,
  palier
}: {
  parFacteur: readonly DomainProgress[];
  palier: number;
}) {
  const c = 24;
  const r = 20;
  const angle = (index: number) =>
    ((-90 + (360 / parFacteur.length) * index) * Math.PI) / 180;
  const bout = (index: number, f: number) =>
    `${(c + f * r * Math.cos(angle(index))).toFixed(1)},${(c + f * r * Math.sin(angle(index))).toFixed(1)}`;
  const contour = parFacteur.map((_, index) => bout(index, 1)).join(' ');
  const forme = parFacteur
    .map((item, index) =>
      bout(index, 0.12 + 0.88 * part(item.fait, item.total))
    )
    .join(' ');
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 48 48'
      width='48'
      height='48'
      className='flex-none overflow-visible'
    >
      <polygon
        points={contour}
        fill='none'
        stroke='rgb(var(--c-grille))'
        strokeWidth='1'
      />
      {parFacteur.map((item, index) => (
        <line
          key={item.code}
          x1={c}
          y1={c}
          x2={(c + r * Math.cos(angle(index))).toFixed(1)}
          y2={(c + r * Math.sin(angle(index))).toFixed(1)}
          stroke='rgb(var(--c-trait))'
          strokeWidth='1'
        />
      ))}
      <polygon
        key={palier}
        className={palier > 0 ? styles.palier : undefined}
        points={forme}
        fill='rgb(var(--c-accent) / 0.18)'
        stroke='rgb(var(--c-accent))'
        strokeWidth='1.5'
        strokeLinejoin='round'
      />
    </svg>
  );
}

export function ProgressHeader({
  total,
  current,
  label,
  noTimeLimit,
  barLabel,
  parFacteur,
  facteurCourant,
  palier
}: ProgressHeaderProps) {
  return (
    <div data-question={current} className='flex items-center gap-4'>
      <RadarAvancement parFacteur={parFacteur} palier={palier} />
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap justify-between gap-x-3 text-petit font-medium text-encre chiffres'>
          <p id='progression-test'>{label}</p>
          <p className='text-texte-3'>{noTimeLimit}</p>
        </div>
        {/* Cinq pistes, une par facteur, dans l'ordre N, E, O, A, C : chacune se
            remplit avec les réponses données à son facteur. Elles partent du
            bord de début de ligne dans les deux sens d'écriture et avancent par
            transform (aucun recalcul de mise en page). */}
        <div
          role='progressbar'
          aria-label={barLabel}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={current}
          aria-valuetext={label}
          className='mt-2 grid grid-cols-5 gap-1.5'
        >
          {parFacteur.map((item) => {
            const courant = item.code === facteurCourant;
            return (
              <span key={item.code} className='flex flex-col gap-1.5'>
                <span
                  aria-hidden='true'
                  className={clsx(
                    styles.piste,
                    'regle-piste block rounded-petit bg-creux',
                    courant ? 'h-1.5' : 'h-1'
                  )}
                >
                  <span
                    className={clsx(
                      styles.remplissage,
                      'regle-trait block rounded-petit bg-accent'
                    )}
                    style={{
                      transform: `scaleX(${part(item.fait, item.total).toFixed(4)})`
                    }}
                  />
                </span>
                <span
                  aria-hidden='true'
                  className={clsx(
                    'transition-colors duration-normale ease-tenga max-[380px]:hidden',
                    courant ? 'text-accent' : 'text-texte-3'
                  )}
                >
                  <DomainShape domain={item.code as DomainCode} size={12} />
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
