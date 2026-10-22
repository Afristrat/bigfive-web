// Radar des cinq grands facteurs (direction B2). SVG pur, rendu côté serveur,
// aucune bibliothèque de graphiques.
//
// Props :
// - domains : exactement cinq entrées, dans l'ordre N, E, O, A, C, chacune avec
//   son code, son libellé complet (déjà traduit) et sa valeur ;
// - min, max : bornes de l'échelle (24 et 120 pour un domaine). Le centre du
//   radar vaut min, le sommet de l'axe vaut max ; une valeur hors bornes est
//   ramenée à la borne la plus proche ;
// - locale : langue de la page. Dans une langue écrite de droite à gauche
//   (arabe), le tracé est dessiné en miroir : l'ordre des axes est inversé et
//   les libellés restent alignés vers l'intérieur ;
// - title, summary : nom et phrase d'introduction de l'alternative textuelle
//   (par exemple « Graphique en radar à cinq axes, de 24 à 120. ») ;
// - columnLabels : en-têtes du tableau de l'alternative textuelle ;
// - className : classes de l'enveloppe.
//
// Accessibilité : chaque SVG porte un titre et une description (role img) et un
// tableau visuellement masqué double l'information. Chaque axe affiche son
// libellé complet et sa valeur : la lecture ne dépend ni de la couleur ni de la
// grille. Deux variantes sont rendues, une large et une resserrée (libellés plus
// grands) sous 640 px ; les classes Tailwind n'en montrent qu'une.
// Mouvement (radar-motion.module.css) : la grille se pose, chaque axe se trace
// depuis le centre, son sommet apparaît, puis le contour se referme et l'aire
// se pose, en 1,9 s au total ; opacité, transformation et stroke-dashoffset
// seulement. Chaque valeur porte data-compte pour la montée du compteur (page
// de résultat). prefers-reduced-motion et l'impression affichent l'état final.
import { ReactElement, useId } from 'react';
import clsx from 'clsx';
import { isRtlLang } from 'rtl-detect';
import { DomainCode } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';
import { domainShapes, shapePath } from '@/components/domain-shape';
import motion from './radar-motion.module.css';

export interface RadarDomain {
  code: DomainCode;
  label: string;
  value: number;
}

export interface RadarChartProps {
  domains: readonly RadarDomain[];
  min: number;
  max: number;
  locale: string;
  title: string;
  summary: string;
  columnLabels: { domain: string; score: string };
  className?: string;
}

export type RadarVariant = 'large' | 'compact';
export type Anchor = 'start' | 'middle' | 'end';

const VARIANTS = {
  large: { width: 540, height: 450, cx: 270, cy: 236, radius: 150, marker: 9 },
  compact: { width: 420, height: 410, cx: 210, cy: 214, radius: 100, marker: 8 }
} as const;

// Décalage du libellé par rapport au bout de l'axe, en sens de lecture de
// gauche à droite : dx (vers l'intérieur), ligne du nom, ligne de la valeur.
const LABEL_OFFSETS: readonly {
  dx: number;
  name: number;
  value: number;
  anchor: Anchor;
}[] = [
  { dx: 0, name: -40, value: -12, anchor: 'middle' },
  { dx: -22, name: -46, value: -18, anchor: 'start' },
  { dx: -6, name: 30, value: 58, anchor: 'start' },
  { dx: 6, name: 30, value: 58, anchor: 'end' },
  { dx: 22, name: -46, value: -18, anchor: 'end' }
];

const RINGS = [0.25, 0.5, 0.75, 1] as const;

export interface RadarGeometry {
  width: number;
  height: number;
  marker: number;
  rings: string[];
  axes: { x1: number; y1: number; x2: number; y2: number }[];
  polygon: string;
  points: { x: number; y: number }[];
  labels: { x: number; nameY: number; valueY: number; anchor: Anchor }[];
}

// Part de l'échelle couverte par une valeur, bornée à [0, 1].
export function radarFraction(value: number, min: number, max: number): number {
  if (!(max > min) || Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

const un = (valeur: number): string => valeur.toFixed(1);

// Rang de l'axe pour la cascade de construction (variable CSS --i).
const rang = (index: number) => ({ ['--i' as string]: index });

const flip = (anchor: Anchor): Anchor =>
  anchor === 'start' ? 'end' : anchor === 'end' ? 'start' : anchor;

export function radarGeometry(
  values: readonly number[],
  min: number,
  max: number,
  rtl: boolean,
  variant: RadarVariant
): RadarGeometry {
  if (values.length !== 5) {
    throw new RangeError(`Le radar attend cinq valeurs, reçu ${values.length}`);
  }
  const { width, height, cx, cy, radius, marker } = VARIANTS[variant];
  const sens = rtl ? -1 : 1;
  const pointAt = (index: number, fraction: number) => {
    const angle = ((-90 + 72 * index) * Math.PI) / 180;
    return {
      x: cx + sens * fraction * radius * Math.cos(angle),
      y: cy + fraction * radius * Math.sin(angle)
    };
  };
  const chaine = (points: { x: number; y: number }[]): string =>
    points.map((point) => `${un(point.x)},${un(point.y)}`).join(' ');
  const ends = values.map((_, index) => pointAt(index, 1));
  const points = values.map((value, index) =>
    pointAt(index, radarFraction(value, min, max))
  );

  return {
    width,
    height,
    marker,
    rings: RINGS.map((fraction) =>
      chaine(values.map((_, index) => pointAt(index, fraction)))
    ),
    axes: ends.map((end) => ({ x1: cx, y1: cy, x2: end.x, y2: end.y })),
    polygon: chaine(points),
    points,
    labels: LABEL_OFFSETS.map((offset, index) => ({
      x: ends[index].x + sens * offset.dx,
      nameY: ends[index].y + offset.name,
      valueY: ends[index].y + offset.value,
      anchor: rtl ? flip(offset.anchor) : offset.anchor
    }))
  };
}

interface RadarSvgProps {
  variant: RadarVariant;
  geometry: RadarGeometry;
  domains: readonly RadarDomain[];
  max: number;
  locale: string;
  title: string;
  description: string;
  className?: string;
}

function RadarSvg({
  variant,
  geometry,
  domains,
  max,
  locale,
  title,
  description,
  className
}: RadarSvgProps): ReactElement {
  const id = useId();
  const surMax = `/ ${formatNombre(max, locale)}`;
  return (
    <svg
      className={clsx(
        'radar',
        motion.radar,
        variant === 'compact' && 'radar-etroit',
        className
      )}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      role='img'
      aria-labelledby={`${id}t ${id}d`}
    >
      <title id={`${id}t`}>{title}</title>
      <desc id={`${id}d`}>{description}</desc>
      {geometry.rings.map((points) => (
        <polygon
          key={points}
          className={clsx('radar-anneau', motion.anneau)}
          points={points}
        />
      ))}
      {geometry.axes.map((axis, index) => (
        <line
          key={`${axis.x2},${axis.y2}`}
          className={clsx('radar-axe', motion.axe)}
          style={rang(index)}
          pathLength={1}
          x1={axis.x1}
          y1={axis.y1}
          x2={un(axis.x2)}
          y2={un(axis.y2)}
        />
      ))}
      <polygon
        className={clsx('radar-aire', motion.aire)}
        points={geometry.polygon}
      />
      <polygon
        className={clsx('radar-trace', motion.trace)}
        pathLength={1}
        points={geometry.polygon}
      />
      {geometry.points.map((point, index) => (
        <path
          key={domains[index].code}
          className={clsx('radar-marqueur', motion.marqueur)}
          style={rang(index)}
          d={shapePath(
            domainShapes[domains[index].code],
            point.x,
            point.y,
            geometry.marker
          )}
        />
      ))}
      {geometry.labels.map((label, index) => (
        <g
          key={domains[index].code}
          className={motion.etiquette}
          style={rang(index)}
        >
          <text
            className='radar-nom'
            textAnchor={label.anchor}
            x={un(label.x)}
            y={un(label.nameY)}
          >
            {domains[index].label}
          </text>
          <text
            className='radar-texte-valeur'
            textAnchor={label.anchor}
            x={un(label.x)}
            y={un(label.valueY)}
          >
            <tspan className='radar-valeur' data-compte={domains[index].value}>
              {formatNombre(domains[index].value, locale)}
            </tspan>
            <tspan className='radar-max' dx={4}>
              {surMax}
            </tspan>
          </text>
        </g>
      ))}
    </svg>
  );
}

export function RadarChart({
  domains,
  min,
  max,
  locale,
  title,
  summary,
  columnLabels,
  className
}: RadarChartProps): ReactElement {
  const rtl = isRtlLang(locale) === true;
  const values = domains.map((domain) => domain.value);
  const surMax = `/ ${formatNombre(max, locale)}`;
  const description = `${summary} ${domains
    .map(
      (domain) =>
        `${domain.label} : ${formatNombre(domain.value, locale)} ${surMax}`
    )
    .join(', ')}`;
  const common = { domains, max, locale, title, description };
  return (
    <div className={className}>
      <RadarSvg
        {...common}
        variant='large'
        geometry={radarGeometry(values, min, max, rtl, 'large')}
        className='max-sm:hidden'
      />
      <RadarSvg
        {...common}
        variant='compact'
        geometry={radarGeometry(values, min, max, rtl, 'compact')}
        className='sm:hidden'
      />
      <table className='sr-only'>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope='col'>{columnLabels.domain}</th>
            <th scope='col'>{columnLabels.score}</th>
          </tr>
        </thead>
        <tbody>
          {domains.map((domain) => (
            <tr key={domain.code}>
              <th scope='row'>{domain.label}</th>
              <td dir='ltr'>
                {formatNombre(domain.value, locale)} {surMax}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
