import { Domain, Facet } from '@bigfive-org/results';
import { ScoreBar } from '@/components/score-bar';
import { DomainCode, domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';

export type DomainSectionLabels = {
  facets: string;
  learnMore: string;
  neuroticismGloss: string;
  score: string; // « Score »
  domainOutOf: string; // « sur 120 »
  facetOutOf: string; // « sur 20 »
  level: Record<string, string>;
};

interface DomainSectionProps {
  domain: Domain;
  code: DomainCode;
  locale: string;
  labels: DomainSectionLabels;
  showExpanded?: boolean;
}

// Valeur « 17 / 20 » : la version visible est masquée aux lecteurs d'écran, qui
// reçoivent une phrase complète (« Score 17 sur 20, élevé »).
export function ScoreValue({
  valeur,
  max,
  spoken,
  className
}: {
  valeur: string;
  max: string;
  spoken: string;
  className?: string;
}) {
  return (
    <span className='whitespace-nowrap text-end'>
      <span className='sr-only'>{spoken}</span>
      <span aria-hidden='true' dir='ltr' className='inline-block'>
        <span className={className ?? 'text-titre-3 font-semibold text-encre'}>
          {valeur}
        </span>{' '}
        <span className='text-petit text-texte-3'>/ {max}</span>
      </span>
    </span>
  );
}

export const DomainSection = ({
  domain,
  code,
  locale,
  labels,
  showExpanded
}: DomainSectionProps) => (
  <section aria-labelledby={'titre-' + code}>
    <h3 id={'titre-' + code} className='text-titre-3 text-encre'>
      {domainLabel(code, locale)}
    </h3>
    {code === 'N' && (
      <p className='mt-1 text-petit text-texte-2'>{labels.neuroticismGloss}</p>
    )}
    <ul className='mt-4 grid gap-x-8 border-t border-trait md:grid-cols-2'>
      {domain.facets.map((facet: Facet) => (
        <li
          key={facet.facet}
          className='break-inside-avoid border-b border-trait py-5'
        >
          <div className='flex items-baseline justify-between gap-3'>
            <span className='text-corps font-medium text-encre'>
              {facetLabel(code, facet.facet, locale)}
              {labels.level[facet.scoreText] && (
                <span className='sr-only'>
                  {' '}
                  ({labels.level[facet.scoreText]})
                </span>
              )}
            </span>
            <ScoreValue
              valeur={formatNombre(facet.score, locale)}
              max={formatNombre(20, locale)}
              spoken={`${labels.score} ${formatNombre(facet.score, locale)} ${labels.facetOutOf}`}
              className='text-corps font-semibold text-encre'
            />
          </div>
          <div className='mt-3'>
            <ScoreBar taille='facette' score={facet.score} min={4} max={20} />
          </div>
          <p className='mt-3 text-petit text-texte-2'>{facet.text}</p>
        </li>
      ))}
    </ul>
    <p className='mt-8 colonne-lecture text-corps text-encre'>{domain.text}</p>
    <details className='mt-4 colonne-lecture' open={showExpanded}>
      <summary className='flex min-h-11 cursor-pointer items-center text-petit font-medium text-accent underline-offset-4 hover:underline'>
        {labels.learnMore}
      </summary>
      <div
        className='texte-riche mt-3'
        dangerouslySetInnerHTML={{ __html: domain.description }}
      />
    </details>
  </section>
);
