import clsx from 'clsx';
import type { CSSProperties, ReactElement } from 'react';
import styles from '@/components/formulaires.module.css';
import { AXES, polygone, sommet } from '@/components/home/pentagone';

// Forme intérieure fixe, purement décorative : elle n'est le profil de personne.
const FORME = [0.62, 0.48, 0.7, 0.44, 0.56] as const;

/** Première lettre affichable d'un texte (graphème entier, accents compris). */
export const initiale = (texte: string, locale: string): string => {
  const propre = texte.trim();
  if (!propre) return '';
  const [premier] = new Intl.Segmenter(locale, { granularity: 'grapheme' })
    .segment(propre)
    [Symbol.iterator]();
  return premier ? premier.segment.toLocaleUpperCase(locale) : '';
};

/**
 * Sceau de la marque : pentagone tracé à l'encre safran, cinq axes, une forme
 * qui s'ouvre au ressort et une initiale au centre. Décoratif (aria-hidden) :
 * le nom qu'il résume est écrit en clair à côté.
 */
export function Sceau({
  lettre,
  className
}: {
  lettre: string;
  className?: string;
}): ReactElement {
  const c = 50;
  const r = 44;
  const axes = Array.from({ length: AXES }, (_, i) => sommet(i, 1, c, r));
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      viewBox='0 0 100 100'
      className={clsx(styles.sceau, className)}
    >
      <polygon
        points={polygone(FORME, c, r)}
        className={clsx(styles.sceauForme, 'fill-safran/15')}
      />
      {axes.map(([x, y], i) => (
        <line
          key={i}
          x1={c}
          y1={c}
          x2={x.toFixed(2)}
          y2={y.toFixed(2)}
          pathLength={1}
          style={{ ['--i' as string]: i } as CSSProperties}
          className={clsx(styles.sceauAxe, 'stroke-grille')}
          strokeWidth={0.75}
        />
      ))}
      <polygon
        points={polygone(Array(AXES).fill(1), c, r)}
        pathLength={1}
        className={clsx(styles.sceauContour, 'fill-none stroke-safran')}
        strokeWidth={2.5}
        strokeLinejoin='round'
      />
      {lettre && (
        <text
          x={c}
          y={c}
          dy='0.36em'
          textAnchor='middle'
          className={clsx(styles.sceauLettre, 'fill-encre font-display')}
          fontSize={34}
          fontWeight={600}
        >
          {lettre}
        </text>
      )}
    </svg>
  );
}
