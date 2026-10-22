import clsx from 'clsx';
import { ReactNode } from 'react';
import styles from '@/components/formulaires.module.css';

// Mêmes teintes que `Notice`, sans son rôle : ici le rôle est porté par le
// conteneur persistant, pas par la boîte qui apparaît.
const tons = {
  info: 'bg-creux text-encre',
  avis: 'bg-avis-doux text-avis',
  erreur: 'bg-erreur-doux text-erreur'
} as const;

export type MessageTon = keyof typeof tons;

/**
 * Boîte de message, sans rôle (à poser dans une région vivante ou aria-hidden).
 * Elle entre en descendant vers sa place ; un refus se secoue brièvement.
 */
export function MessageBox({
  ton,
  children,
  className
}: {
  ton: MessageTon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-controle p-4 text-petit [overflow-wrap:anywhere]',
        tons[ton],
        ton === 'erreur' ? styles.secousse : styles.message,
        className
      )}
    >
      <div className='flex flex-wrap items-center gap-x-3 gap-y-2 [&_p]:text-encre'>
        {children}
      </div>
    </div>
  );
}

/**
 * Région vivante PERSISTANTE : le conteneur `role="status"` est monté vide dès
 * le premier rendu et reçoit ensuite le message. Un `role="status"` monté avec
 * son contenu est annoncé de façon peu fiable par les lecteurs d'écran. Sans
 * message, seul le conteneur vide reste dans la page.
 */
export function LiveMessage({
  ton,
  id,
  children,
  className,
  visuallyHidden = false
}: {
  ton: MessageTon;
  id?: string;
  children?: ReactNode;
  className?: string;
  /** Annonce sans affichage (le message visible est ailleurs). */
  visuallyHidden?: boolean;
}) {
  return (
    <div
      id={id}
      role='status'
      aria-atomic='true'
      className={clsx(visuallyHidden && 'sr-only', className)}
    >
      {children ? <MessageBox ton={ton}>{children}</MessageBox> : null}
    </div>
  );
}
