import { ReactElement } from 'react';
import clsx from 'clsx';

const contour = '12,2 21.5,8.9 17.9,20 6.1,20 2.5,8.9';

// Marque pentagonale : contour neutre, contour safran tracé par-dessus, cœur
// en encre. « defilement » : le contour se referme au fil du défilement de la
// page (en-tête) ; « revele » : il se dessine une fois à l'entrée dans l'écran
// (pied de page, sous un parent [data-reveal='trace']).
export function Marque({
  trace,
  className
}: {
  trace: 'defilement' | 'revele';
  className?: string;
}): ReactElement {
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 24 24'
      className={clsx('flex-none overflow-visible', className)}
    >
      <polygon
        points={contour}
        className='fill-none stroke-trait'
        strokeWidth='2'
        strokeLinejoin='round'
      />
      <polygon
        points={contour}
        pathLength={1}
        className={clsx(
          'fill-none stroke-safran',
          trace === 'defilement' ? 'marque-trace' : 'trace-svg'
        )}
        strokeWidth='2.25'
        strokeLinejoin='round'
      />
      <polygon
        points='12,8.2 16,10.6 14.4,15.6 9.4,15.2 8.3,11'
        className='marque-coeur fill-encre'
      />
    </svg>
  );
}
