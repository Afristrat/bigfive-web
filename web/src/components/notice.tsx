import clsx from 'clsx';
import { ReactNode } from 'react';
import styles from '@/components/formulaires.module.css';

const tons = {
  info: 'bg-creux text-encre',
  succes: 'bg-creux text-encre',
  avis: 'bg-avis-doux text-avis',
  erreur: 'bg-erreur-doux text-erreur'
} as const;

interface NoticeProps {
  ton: keyof typeof tons;
  titre?: string;
  children: ReactNode;
  className?: string;
}

/** Coche tracée des messages de succès (décorative). */
export function Coche() {
  return (
    <svg
      aria-hidden='true'
      viewBox='0 0 20 20'
      width={20}
      height={20}
      className='mt-0.5 shrink-0 text-accent'
    >
      <path
        d='M4 10.5l4 4 8-9'
        pathLength={1}
        fill='none'
        stroke='currentColor'
        strokeWidth={2}
        strokeLinecap='round'
        strokeLinejoin='round'
        className={styles.coche}
      />
    </svg>
  );
}

// Le message entre en descendant vers sa place ; un refus se secoue
// brièvement, un succès trace sa coche.
export function Notice({ ton, titre, children, className }: NoticeProps) {
  return (
    <div
      role={ton === 'erreur' ? 'alert' : 'status'}
      className={clsx(
        'rounded-controle p-4 text-petit',
        tons[ton],
        ton === 'erreur' ? styles.secousse : styles.message,
        className
      )}
    >
      {titre && <p className='mb-1 font-semibold'>{titre}</p>}
      <div className='flex items-start gap-3'>
        {ton === 'succes' && <Coche />}
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 [&_p]:text-encre'>
          {children}
        </div>
      </div>
    </div>
  );
}
