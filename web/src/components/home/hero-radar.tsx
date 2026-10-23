'use client';

import { CSSProperties, ReactElement, useEffect, useRef } from 'react';
import { AXES, adoucir, polygone, sommet } from './pentagone';

interface HeroRadarProps {
  // Noms courts des domaines, dans l'ordre des axes.
  noms: readonly string[];
  // Profils d'exemple fictifs, ratios de 0 à 1 par axe.
  profils: readonly (readonly number[])[];
  legende: string;
}

const C = 300;
const R = 205;
const ANNEAUX = [0.25, 0.5, 0.75, 1];
const GRADUATIONS = [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
const PERIODE = 4200; // un profil tenu, puis le glissement vers le suivant
const TENUE = 0.58;

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

// Héros dimensionnel : trois plans (grille, forme, étiquettes) qui se décalent
// à la souris à des profondeurs différentes et dérivent au défilement, et une
// forme qui respire en glissant d'un profil fictif à l'autre. La boucle ne
// tourne que si le bloc est visible, l'onglet affiché et le mouvement autorisé.
export function HeroRadar({
  noms,
  profils,
  legende
}: HeroRadarProps): ReactElement {
  const scene = useRef<HTMLDivElement>(null);
  const aire = useRef<SVGPolygonElement>(null);
  const trace = useRef<SVGPolygonElement>(null);
  const points = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    const el = scene.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const plans = Array.from(el.querySelectorAll<HTMLElement>('[data-plan]'));
    const fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cible = { x: 0, y: 0 };
    const actuel = { x: 0, y: 0 };
    let raf = 0;
    let visible = false;
    const origine = performance.now() + 1900; // après l'ouverture

    const dessiner = (ratios: number[]): void => {
      const p = polygone(ratios, C, R);
      aire.current?.setAttribute('points', p);
      trace.current?.setAttribute('points', p);
      ratios.forEach((ratio, i) => {
        const [x, y] = sommet(i, ratio, C, R);
        points.current[i]?.setAttribute('cx', x.toFixed(2));
        points.current[i]?.setAttribute('cy', y.toFixed(2));
      });
    };

    const image = (t: number): void => {
      if (t > origine) {
        const e = (t - origine) / PERIODE;
        const tour = Math.floor(e);
        const f = e - tour;
        const a = profils[tour % profils.length];
        const b = profils[(tour + 1) % profils.length];
        const k = f < TENUE ? 0 : adoucir((f - TENUE) / (1 - TENUE));
        const souffle = 1 + 0.018 * Math.sin(t / 820);
        dessiner(a.map((v, i) => (v + (b[i] - v) * k) * souffle));
      }
      actuel.x += (cible.x - actuel.x) * 0.075;
      actuel.y += (cible.y - actuel.y) * 0.075;
      plans.forEach((plan) => {
        const d = Number(plan.dataset.plan);
        plan.style.transform = `translate3d(${(actuel.x * d).toFixed(2)}px, ${(actuel.y * d).toFixed(2)}px, 0)`;
      });
      raf = requestAnimationFrame(image);
    };

    const demarrer = (): void => {
      if (!raf && visible && !document.hidden) {
        raf = requestAnimationFrame(image);
      }
    };
    const arreter = (): void => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const observateur = new IntersectionObserver(([entree]) => {
      visible = entree.isIntersecting;
      if (visible) demarrer();
      else arreter();
    });
    observateur.observe(el);
    const onglet = (): void => (document.hidden ? arreter() : demarrer());
    document.addEventListener('visibilitychange', onglet);

    const bouger = (e: PointerEvent): void => {
      const r = el.getBoundingClientRect();
      cible.x = Math.max(
        -1,
        Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)
      );
      cible.y = Math.max(
        -1,
        Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)
      );
    };
    const quitter = (): void => {
      cible.x = 0;
      cible.y = 0;
    };
    if (fin) {
      window.addEventListener('pointermove', bouger, { passive: true });
      document.documentElement.addEventListener('pointerleave', quitter);
    }

    return () => {
      arreter();
      observateur.disconnect();
      document.removeEventListener('visibilitychange', onglet);
      window.removeEventListener('pointermove', bouger);
      document.documentElement.removeEventListener('pointerleave', quitter);
    };
  }, [profils]);

  const depart = profils[0];
  const pointsDepart = polygone(depart, C, R);

  return (
    <figure className='relative mx-auto w-full max-w-[560px]'>
      <div ref={scene} className='relative aspect-square' aria-hidden='true'>
        {/* Plan arrière : grille pentagonale et axes gradués. */}
        <div data-plan='-8' className='absolute inset-0'>
          <div className='derive size-full [--derive:-36px]'>
            <svg viewBox='0 0 600 600' className='size-full overflow-visible'>
              {ANNEAUX.map((a) => (
                <polygon
                  key={a}
                  points={polygone(Array(AXES).fill(a), C, R)}
                  style={rang(a * 4)}
                  className='fondu-tard fill-none stroke-grille'
                  strokeWidth={a === 1 ? 1.5 : 1}
                  strokeDasharray={a === 1 ? undefined : '2 7'}
                />
              ))}
              {noms.map((nom, i) => {
                const [x, y] = sommet(i, 1.06, C, R);
                const angle = (i * 360) / AXES;
                return (
                  <g key={nom}>
                    <line
                      x1={C}
                      y1={C}
                      x2={x}
                      y2={y}
                      pathLength={1}
                      style={rang(i)}
                      className='axe-trace stroke-trait-fort'
                      strokeWidth={1.25}
                    />
                    {GRADUATIONS.map((g) => {
                      const [gx, gy] = sommet(i, g, C, R);
                      return (
                        <line
                          key={g}
                          x1={gx - 5}
                          y1={gy}
                          x2={gx + 5}
                          y2={gy}
                          transform={`rotate(${angle} ${gx} ${gy})`}
                          style={rang(i)}
                          className='fondu-tard stroke-trait-fort'
                          strokeWidth={1}
                        />
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Plan médian : la forme du profil, qui s'ouvre puis respire. */}
        <div data-plan='5' className='absolute inset-0'>
          <svg viewBox='0 0 600 600' className='size-full overflow-visible'>
            <g className='forme-ouvre'>
              <polygon
                ref={aire}
                points={pointsDepart}
                className='fill-safran/25'
              />
              <polygon
                ref={trace}
                points={pointsDepart}
                className='fill-none stroke-safran'
                strokeWidth={3}
                strokeLinejoin='round'
              />
              {depart.map((ratio, i) => {
                const [x, y] = sommet(i, ratio, C, R);
                return (
                  <circle
                    key={i}
                    ref={(n) => {
                      points.current[i] = n;
                    }}
                    cx={x}
                    cy={y}
                    r={7}
                    className='fill-encre stroke-fond'
                    strokeWidth={3}
                  />
                );
              })}
            </g>
          </svg>
        </div>

        {/* Plan avant : les noms des facteurs, au plus près du regard. */}
        <div data-plan='14' className='absolute inset-0'>
          <div className='derive size-full [--derive:-96px]'>
            {noms.map((nom, i) => {
              const [x, y] = sommet(i, 1.22, C, R);
              return (
                <span
                  key={nom}
                  style={{
                    left: `${(x / 6).toFixed(2)}%`,
                    top: `${(y / 6).toFixed(2)}%`,
                    ...rang(i)
                  }}
                  className='fondu-tard absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-petit bg-fond/85 px-2 py-0.5 text-petit font-medium text-encre max-sm:text-legende'
                >
                  {nom}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <figcaption
        style={rang(6)}
        className='apparait-tard mt-3 text-center text-legende text-texte-3'
      >
        {legende}
      </figcaption>
    </figure>
  );
}
