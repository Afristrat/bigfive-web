import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { Link } from '@/navigation';

// En-tête des écrans de pilotage (administration, organisation, résultats d'une
// campagne, synthèse). Même grammaire que l'accueil et le compte : surtitre
// discret, titre qui monte mot à mot derrière ses masques, filet safran tracé
// sous le titre, puis le chapeau et les repères qui entrent en cascade. Sous
// « réduire les animations », tout est posé à son état final.

export type RepereEntete = { terme: string; valeur: ReactNode };

type Props = {
  surtitre: ReactNode;
  titre: string;
  /** Texte d'appoint dans le titre, sous lui (nom de l'organisation, etc.). */
  complementTitre?: ReactNode;
  chapo?: ReactNode;
  retour?: { href: string; libelle: string };
  reperes?: readonly RepereEntete[];
  children?: ReactNode;
};

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

export function EntetePilotage({
  surtitre,
  titre,
  complementTitre,
  chapo,
  retour,
  reperes = [],
  children
}: Props): ReactElement {
  const nombreMots = titre.split(/\s+/).filter(Boolean).length;
  return (
    <header className='grid gap-x-10 gap-y-6 lg:grid-cols-12'>
      <div className='lg:col-span-8'>
        {retour && (
          <p className='mb-8'>
            <Link
              href={retour.href}
              className='group inline-flex min-h-11 items-center gap-2 rounded-petit text-petit font-medium text-texte-2 transition-colors duration-courte ease-tenga hover:text-encre'
            >
              <svg
                aria-hidden='true'
                focusable='false'
                viewBox='0 0 16 16'
                width={16}
                height={16}
                fill='none'
                stroke='currentColor'
                strokeWidth={1.75}
                strokeLinecap='round'
                strokeLinejoin='round'
                className='transition-transform duration-normale ease-tenga group-hover:-translate-x-1 rtl:-scale-x-100 rtl:group-hover:translate-x-1'
              >
                <path d='M13 8H3M7 4L3 8l4 4' />
              </svg>
              {retour.libelle}
            </Link>
          </p>
        )}
        <p className='text-petit font-medium text-texte-3 [overflow-wrap:anywhere]'>
          {surtitre}
        </p>
        <h1 className='mt-3 font-display text-geant text-encre [overflow-wrap:anywhere]'>
          {/* Le titre se lit d'un seul tenant ; ses mots animés sont une image. */}
          <span className='sr-only'>{titre}</span>
          <bdi aria-hidden='true'>
            <MotsCinetiques texte={titre} />
          </bdi>
          {complementTitre && (
            <span
              style={rang(nombreMots)}
              className='apparait-tard mt-3 block text-titre-2 text-texte-2'
            >
              {complementTitre}
            </span>
          )}
        </h1>
        <span
          aria-hidden='true'
          className='mt-6 block h-[3px] w-20 origin-left animate-tracer bg-safran [animation-delay:450ms] rtl:origin-right'
        />
        {chapo && (
          <div
            style={rang(1)}
            className='apparait-tard mt-6 colonne-lecture text-chapo text-texte-2'
          >
            {chapo}
          </div>
        )}
        {children}
      </div>
      {reperes.length > 0 && (
        <dl className='flex flex-col gap-4 self-end border-s-2 border-trait ps-5 lg:col-span-4'>
          {reperes.map((repere, i) => (
            <div
              key={repere.terme}
              style={rang(2 + i)}
              className='apparait-tard'
            >
              <dt className='text-legende font-medium text-texte-3'>
                {repere.terme}
              </dt>
              <dd className='mt-0.5 font-semibold text-encre [overflow-wrap:anywhere]'>
                {repere.valeur}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}
