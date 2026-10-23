import type { ReactElement } from 'react';
import { ArrowRightIcon } from '@/components/icons';
import { Link } from '@/navigation';

// Lien de retour des pages de résultat : la flèche pointe vers le bord de début
// de ligne (à gauche en français, à droite en arabe). Cible tactile de 44 px.
export function LienRetour({
  href,
  children
}: {
  href: string;
  children: string;
}): ReactElement {
  return (
    <Link
      href={href}
      className='inline-flex min-h-11 items-center gap-2 text-petit font-medium text-texte-2 transition-colors duration-normale ease-tenga hover:text-encre print:hidden'
    >
      <ArrowRightIcon size={16} className='rotate-180' />
      {children}
    </Link>
  );
}
