import type { ReactElement, ReactNode } from 'react';
import { formatNombre } from '@/lib/format';

// Titre de section des écrans de pilotage : numéro d'ordre discret (décoratif)
// puis l'intitulé, comme les sections de la page « À propos ».
export function TitreSection({
  id,
  numero,
  locale,
  focalisable = false,
  children
}: {
  id: string;
  numero: number;
  locale: string;
  /** Le titre reçoit le focus après une action qui retire une ligne. */
  focalisable?: boolean;
  children: ReactNode;
}): ReactElement {
  return (
    <h2
      id={id}
      tabIndex={focalisable ? -1 : undefined}
      className='flex items-baseline gap-4 text-titre-section text-encre'
    >
      <span
        aria-hidden='true'
        className='chiffres font-display text-petit font-medium text-texte-3'
      >
        {formatNombre(numero, locale).padStart(2, '0')}
      </span>
      <span>{children}</span>
    </h2>
  );
}
