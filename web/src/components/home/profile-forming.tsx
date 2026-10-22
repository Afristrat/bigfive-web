'use client';

import { ReactElement, ReactNode, useEffect, useRef } from 'react';
import { AXES, polygone, sommet } from './pentagone';

export interface Etape {
  code: string;
  nom: string;
  nomCourt: string;
  texte: string;
  mention: string;
}

interface ProfileFormingProps {
  titre: string;
  intro: string;
  lead: string;
  legende: string;
  etapes: readonly Etape[];
  // Ratios fictifs du profil d'exemple, dans l'ordre des axes.
  ratios: readonly number[];
  children?: ReactNode;
}

const C = 300;
const R = 215;
const ANNEAUX = [0.25, 0.5, 0.75, 1];

// Pic de la page : en descendant, chaque facteur décrit à gauche tire son axe à
// droite, et le profil se ferme sommet après sommet. Sans script ou sous
// « réduire les animations », la forme est complète et toutes les étapes
// sont lisibles.
export function ProfileForming({
  titre,
  intro,
  lead,
  legende,
  etapes,
  ratios,
  children
}: ProfileFormingProps): ReactElement {
  const section = useRef<HTMLElement>(null);
  const liste = useRef<HTMLOListElement>(null);
  const aire = useRef<SVGPolygonElement>(null);
  const trace = useRef<SVGPolygonElement>(null);
  const points = useRef<(SVGCircleElement | null)[]>([]);
  const axes = useRef<(SVGLineElement | null)[]>([]);

  useEffect(() => {
    const el = section.current;
    const ol = liste.current;
    if (!el || !ol) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.setAttribute('data-anime', '');
    const items = Array.from(ol.querySelectorAll<HTMLElement>('[data-etape]'));
    let raf = 0;
    let dernier = -1;

    const rendre = (): void => {
      raf = 0;
      // Une lecture de mise en page, puis des écritures seulement.
      const r = ol.getBoundingClientRect();
      const vh = window.innerHeight;
      const course = Math.max(1, r.height - vh * 0.35);
      const p = Math.min(1, Math.max(0, (vh * 0.62 - r.top) / course));
      const avance = p * AXES;
      if (Math.abs(avance - dernier) < 0.002) return;
      dernier = avance;
      const valeurs = ratios.map((v, i) => {
        const k = Math.min(1, Math.max(0, avance - i));
        const e = 1 - Math.pow(1 - k, 3);
        return 0.04 + (v - 0.04) * e;
      });
      const pts = polygone(valeurs, C, R);
      aire.current?.setAttribute('points', pts);
      trace.current?.setAttribute('points', pts);
      valeurs.forEach((v, i) => {
        const [x, y] = sommet(i, v, C, R);
        points.current[i]?.setAttribute('cx', x.toFixed(2));
        points.current[i]?.setAttribute('cy', y.toFixed(2));
        const k = Math.min(1, Math.max(0, avance - i));
        axes.current[i]?.style.setProperty('stroke-dashoffset', String(1 - k));
      });
      const actif = Math.min(AXES - 1, Math.floor(avance));
      items.forEach((item, i) => {
        if (i === actif) item.setAttribute('data-actif', '');
        else item.removeAttribute('data-actif');
      });
    };
    const demander = (): void => {
      if (!raf) raf = requestAnimationFrame(rendre);
    };

    let actifObs = false;
    const observateur = new IntersectionObserver(([entree]) => {
      if (entree.isIntersecting && !actifObs) {
        actifObs = true;
        window.addEventListener('scroll', demander, { passive: true });
        window.addEventListener('resize', demander, { passive: true });
        demander();
      } else if (!entree.isIntersecting && actifObs) {
        actifObs = false;
        window.removeEventListener('scroll', demander);
        window.removeEventListener('resize', demander);
      }
    });
    observateur.observe(el);
    rendre();

    return () => {
      cancelAnimationFrame(raf);
      observateur.disconnect();
      window.removeEventListener('scroll', demander);
      window.removeEventListener('resize', demander);
      el.removeAttribute('data-anime');
    };
  }, [ratios]);

  const complet = polygone(ratios, C, R);

  return (
    <section
      ref={section}
      aria-labelledby='facteurs-titre'
      className='relative border-t border-trait pt-12 lg:pt-16'
    >
      <div className='max-w-[44rem]'>
        <h2 id='facteurs-titre' className='text-geant text-encre'>
          {titre}
        </h2>
        <p className='mt-5 max-w-[40em] text-chapo text-texte-2'>{intro}</p>
      </div>

      <div className='mt-10 grid gap-x-12 lg:mt-14 lg:grid-cols-12'>
        {/* La scène reste épinglée : en haut sur mobile, à droite sur grand écran. */}
        <div className='sticky top-16 z-[1] -mx-5 bg-fond/95 px-5 pb-2 pt-2 sm:-mx-8 sm:px-8 lg:order-2 lg:col-span-6 lg:mx-0 lg:h-[calc(100dvh-5rem)] lg:bg-transparent lg:px-0 lg:pt-6'>
          <figure className='mx-auto flex h-full max-w-[520px] flex-col justify-center max-lg:max-w-[300px]'>
            <svg
              viewBox='0 0 600 600'
              className='w-full overflow-visible'
              aria-hidden='true'
            >
              {ANNEAUX.map((a) => (
                <polygon
                  key={a}
                  points={polygone(Array(AXES).fill(a), C, R)}
                  className='fill-none stroke-grille'
                  strokeDasharray={a === 1 ? undefined : '2 7'}
                />
              ))}
              {etapes.map((etape, i) => {
                const [x, y] = sommet(i, 1, C, R);
                const [lx, ly] = sommet(i, 1.2, C, R);
                return (
                  <g key={etape.code}>
                    <line
                      x1={C}
                      y1={C}
                      x2={x}
                      y2={y}
                      className='stroke-grille'
                      strokeWidth={1.25}
                    />
                    <line
                      ref={(n) => {
                        axes.current[i] = n;
                      }}
                      x1={C}
                      y1={C}
                      x2={x}
                      y2={y}
                      pathLength={1}
                      strokeDasharray={1}
                      className='stroke-encre'
                      strokeWidth={2}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor='middle'
                      dominantBaseline='middle'
                      className='fill-encre text-[22px] font-semibold'
                    >
                      {etape.nomCourt}
                    </text>
                  </g>
                );
              })}
              <polygon ref={aire} points={complet} className='fill-safran/30' />
              <polygon
                ref={trace}
                points={complet}
                className='fill-none stroke-safran'
                strokeWidth={3.5}
                strokeLinejoin='round'
              />
              {ratios.map((ratio, i) => {
                const [x, y] = sommet(i, ratio, C, R);
                return (
                  <circle
                    key={i}
                    ref={(n) => {
                      points.current[i] = n;
                    }}
                    cx={x}
                    cy={y}
                    r={8}
                    className='fill-encre stroke-fond'
                    strokeWidth={3}
                  />
                );
              })}
            </svg>
            <figcaption className='mt-1 text-center text-legende text-texte-3'>
              {legende}
            </figcaption>
          </figure>
        </div>

        <div className='lg:order-1 lg:col-span-6'>
          <p className='mt-8 text-titre-3 text-texte-2 lg:mt-[22vh]'>{lead}</p>
          <ol ref={liste} role='list' className='mt-6 pb-[18vh] lg:pb-[30vh]'>
            {etapes.map((etape) => (
              <li
                key={etape.code}
                data-etape=''
                className='pic-etape flex min-h-[52vh] gap-5 border-t border-trait py-8 lg:min-h-[64vh]'
              >
                <span
                  aria-hidden='true'
                  className='pic-repere mt-2 block size-3 flex-none rotate-45 bg-safran'
                />
                <div>
                  <h3 className='pic-titre font-display text-titre-1 text-encre'>
                    {etape.nom}
                  </h3>
                  <p className='mt-1 text-petit font-medium text-texte-3'>
                    {etape.mention}
                  </p>
                  <p className='mt-4 max-w-[34em] text-chapo text-texte-2'>
                    {etape.texte}
                  </p>
                </div>
              </li>
            ))}
          </ol>
          {children}
        </div>
      </div>
    </section>
  );
}
