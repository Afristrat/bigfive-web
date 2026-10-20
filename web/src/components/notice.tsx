import clsx from 'clsx';
import { ReactNode } from 'react';

const tons = {
  info: 'bg-creux text-encre',
  avis: 'bg-avis-doux text-avis',
  erreur: 'bg-erreur-doux text-erreur'
} as const;

interface NoticeProps {
  ton: keyof typeof tons;
  titre?: string;
  children: ReactNode;
  className?: string;
}

export function Notice({ ton, titre, children, className }: NoticeProps) {
  return (
    <div
      role={ton === 'erreur' ? 'alert' : 'status'}
      className={clsx('rounded-controle p-4 text-petit', tons[ton], className)}
    >
      {titre && <p className='mb-1 font-semibold'>{titre}</p>}
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 [&_p]:text-encre'>
        {children}
      </div>
    </div>
  );
}
