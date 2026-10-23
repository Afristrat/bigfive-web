import { CSSProperties, ReactElement } from 'react';
import clsx from 'clsx';
import { domainShapes, shapePath } from '@/components/domain-shape';
import { AXES, polygone, sommet } from '@/components/home/pentagone';
import { domainCodes } from '@/lib/domain-labels';

const CENTRE = 120;
const RAYON = 84;
const DESSIN_DEBUT = 450; // ms, aligné sur .pentagone-contour (cadre.css)
const DESSIN_DUREE = 1500;

const indices = Array.from({ length: AXES }, (_, i) => i);
const point = (i: number, ratio = 1): string =>
  sommet(i, ratio, CENTRE, RAYON)
    .map((v) => v.toFixed(2))
    .join(',');

// Pentagone tracé, décoratif : grille, axes, puis contour safran dessiné
// jusqu'à `part` (1 : refermé ; moins : chemin interrompu, pour la 404 et
// l'erreur). Les sommets atteints s'allument au passage du tracé, les autres
// restent en attente. `formes` pose la forme de chaque domaine au bout de son
// axe. Composant sans état, animé en CSS seul au chargement.
export function PentagoneTrace({
  part = 1,
  formes = false,
  className
}: {
  part?: number;
  formes?: boolean;
  className?: string;
}): ReactElement {
  const contour = `M${[...indices, 0].map((i) => point(i)).join(' L')}`;
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 240 240'
      className={clsx('block h-auto w-full overflow-visible', className)}
      style={{ ['--part' as string]: part } as CSSProperties}
    >
      {[0.36, 0.68, 1].map((ratio) => (
        <polygon
          key={ratio}
          points={polygone(Array(AXES).fill(ratio), CENTRE, RAYON)}
          className='pentagone-grille'
        />
      ))}
      {indices.map((i) => (
        <line
          key={i}
          x1={CENTRE}
          y1={CENTRE}
          x2={sommet(i, 1, CENTRE, RAYON)[0].toFixed(2)}
          y2={sommet(i, 1, CENTRE, RAYON)[1].toFixed(2)}
          pathLength={1}
          className='pentagone-axe axe-trace'
          style={{ ['--i' as string]: i } as CSSProperties}
        />
      ))}
      <path d={contour} pathLength={1} className='pentagone-contour' />
      {indices.map((i) => {
        const atteint = i / AXES <= part;
        const [x, y] = sommet(i, 1, CENTRE, RAYON);
        return (
          <circle
            key={i}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r={atteint ? 5.5 : 6}
            className={atteint ? 'pentagone-sommet' : 'pentagone-attente'}
            style={
              atteint
                ? {
                    animationDelay: `${Math.round(
                      DESSIN_DEBUT + (i / AXES / part) * DESSIN_DUREE * 0.85
                    )}ms`
                  }
                : undefined
            }
          />
        );
      })}
      {formes &&
        domainCodes.map((code, i) => {
          const [x, y] = sommet(i, 1.24, CENTRE, RAYON);
          return (
            <path
              key={code}
              d={shapePath(domainShapes[code], x, y, 6.5)}
              className='pentagone-forme fondu-tard'
              style={{ ['--i' as string]: i } as CSSProperties}
            />
          );
        })}
    </svg>
  );
}
