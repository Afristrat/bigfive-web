import type { ReactElement } from 'react';
import clsx from 'clsx';
import type { Niveau } from '@/lib/moteur';

type LevelBadgeProps = {
  niveau: Niveau;
  /** Niveau en toutes lettres, déjà traduit (espace « niveaux »). */
  label: string;
  /** « fort » : libellé en encre (en-tête de domaine) ; « discret » par défaut. */
  ton?: 'fort' | 'discret';
};

const NIVEAUX: readonly Niveau[] = [
  'bas',
  'plutot_bas',
  'milieu',
  'plutot_haut',
  'haut'
];

// Niveau de lecture : un curseur sur une échelle à cinq crans, puis le niveau en
// toutes lettres. Le cran posé est le seul plus haut et le seul en safran : le
// sens ne dépend jamais de la couleur, et le mot est toujours écrit. L'échelle
// part du bord de début de ligne (de droite à gauche en arabe).
export function LevelBadge({
  niveau,
  label,
  ton = 'discret'
}: LevelBadgeProps): ReactElement {
  const rang = NIVEAUX.indexOf(niveau);
  return (
    <span
      data-niveau={niveau}
      className={clsx(
        'inline-flex items-center gap-2.5 whitespace-nowrap text-petit font-medium',
        ton === 'fort' ? 'text-encre' : 'text-texte-2'
      )}
    >
      <span
        aria-hidden='true'
        className='niveau-crans flex items-end gap-[3px]'
      >
        {NIVEAUX.map((cran, index) => (
          <span
            key={cran}
            className={clsx(
              'block w-[3px] rounded-full',
              index === rang ? 'h-4 bg-safran' : 'h-2 bg-grille'
            )}
          />
        ))}
      </span>
      <span data-niveau-libelle=''>{label}</span>
    </span>
  );
}
