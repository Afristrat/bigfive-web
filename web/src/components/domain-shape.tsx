// Formes des cinq domaines (direction B2) : un domaine se distingue par sa
// forme, son numéro et son libellé, jamais par sa seule couleur.
//
//   N Névrosisme      cercle     01      E Extraversion  carré     02
//   O Ouverture       triangle   03      A Agréabilité   losange   04
//   C Conscienciosité hexagone   05
//
// Exports :
// - domainShapes : forme de chaque domaine ;
// - domainNumber(code) : « 01 » à « 05 », dans l'ordre N, E, O, A, C ;
// - shapePath(forme, cx, cy, r) : tracé SVG (attribut d) centré en (cx, cy), où
//   r est le rayon du cercle ; les autres formes sont calibrées pour avoir la
//   même masse visuelle. Sert aux marqueurs du radar ;
// - <DomainShape domain size className /> : pictogramme décoratif, masqué des
//   technologies d'assistance, qui prend la couleur du texte courant. Le nom du
//   domaine doit toujours être écrit à côté.
import { ReactElement } from 'react';
import clsx from 'clsx';
import { DomainCode, domainCodes } from '@/lib/domain-labels';

export type ShapeName =
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'hexagon';

export const domainShapes: Record<DomainCode, ShapeName> = {
  N: 'circle',
  E: 'square',
  O: 'triangle',
  A: 'diamond',
  C: 'hexagon'
};

export const domainNumber = (code: DomainCode): string =>
  String(domainCodes.indexOf(code) + 1).padStart(2, '0');

const n = (valeur: number): string => valeur.toFixed(2);

const polygone = (points: readonly (readonly [number, number])[]): string =>
  `${points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${n(x)},${n(y)}`)
    .join(' ')} Z`;

export function shapePath(
  shape: ShapeName,
  cx: number,
  cy: number,
  r: number
): string {
  switch (shape) {
    case 'circle':
      return `M${n(cx - r)},${n(cy)} a${n(r)},${n(r)} 0 1,0 ${n(2 * r)},0 a${n(r)},${n(r)} 0 1,0 ${n(-2 * r)},0 Z`;
    case 'square': {
      const c = 0.889 * r;
      return polygone([
        [cx - c, cy - c],
        [cx + c, cy - c],
        [cx + c, cy + c],
        [cx - c, cy + c]
      ]);
    }
    case 'triangle':
      return polygone([
        [cx, cy - 1.067 * r],
        [cx + 0.978 * r, cy + 0.756 * r],
        [cx - 0.978 * r, cy + 0.756 * r]
      ]);
    case 'diamond': {
      const c = 1.156 * r;
      return polygone([
        [cx, cy - c],
        [cx + c, cy],
        [cx, cy + c],
        [cx - c, cy]
      ]);
    }
    case 'hexagon': {
      const c = 1.022 * r;
      const h = c * 0.866;
      return polygone([
        [cx + c, cy],
        [cx + c / 2, cy + h],
        [cx - c / 2, cy + h],
        [cx - c, cy],
        [cx - c / 2, cy - h],
        [cx + c / 2, cy - h]
      ]);
    }
  }
}

interface DomainShapeProps {
  domain: DomainCode;
  size?: number;
  className?: string;
}

export function DomainShape({
  domain,
  size = 22,
  className
}: DomainShapeProps): ReactElement {
  const shape = domainShapes[domain];
  return (
    <svg
      viewBox='-10 -10 20 20'
      width={size}
      height={size}
      aria-hidden='true'
      focusable='false'
      className={clsx('flex-none', className)}
    >
      <path
        d={shapePath(shape, 0, 0, 6.8)}
        fill='currentColor'
        stroke={shape === 'circle' ? undefined : 'currentColor'}
        strokeWidth={shape === 'circle' ? undefined : 1.5}
        strokeLinejoin='round'
      />
    </svg>
  );
}
