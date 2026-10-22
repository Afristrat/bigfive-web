import type { ReactElement } from 'react';
import type { Niveau } from '@/lib/moteur';

type LevelBadgeProps = {
  niveau: Niveau;
  /** Niveau en toutes lettres, déjà traduit (espace « niveaux »). */
  label: string;
};

// Niveau de lecture en toutes lettres : le sens ne dépend jamais de la couleur.
export function LevelBadge({ niveau, label }: LevelBadgeProps): ReactElement {
  return (
    <span
      data-niveau={niveau}
      className='inline-flex items-center rounded-full bg-accent-doux px-3 py-0.5 text-legende font-semibold text-accent'
    >
      {label}
    </span>
  );
}
