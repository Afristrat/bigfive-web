import { Domain, Facet } from '@bigfive-org/results';
import { heading } from '@/components/primitives';
import { ScoreRule } from '@/components/score-rule';
import { DomainCode, domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';

export type DomainSectionLabels = {
  facets: string;
  learnMore: string;
  neuroticismGloss: string;
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

export const DomainSection = ({
  domain,
  code,
  locale,
  labels,
  showExpanded
}: DomainSectionProps) => (
  <section
    id={'domaine-' + code}
    aria-labelledby={'titre-' + code}
    className='scroll-mt-24 border-t border-trait pt-10 break-inside-avoid-page first:border-t-0 first:pt-0'
  >
    <h2 id={'titre-' + code} className={heading()}>
      {domainLabel(code, locale)}
    </h2>
    {code === 'N' && (
      <p className='mt-1 text-petit text-texte-3'>{labels.neuroticismGloss}</p>
    )}
    <div className='mt-6'>
      <ScoreRule
        label={domainLabel(code, locale, 'short')}
        score={domain.score}
        min={24}
        max={120}
        valeur={formatNombre(domain.score, locale)}
        surMax={labels.domainOutOf}
        niveau={labels.level[domain.scoreText]}
      />
    </div>
    <p className='mt-6 colonne-lecture text-chapo text-encre'>
      {domain.shortDescription}
    </p>
    <details className='mt-4 colonne-lecture' open={showExpanded}>
      <summary className='cursor-pointer text-petit font-medium text-accent'>
        {labels.learnMore}
      </summary>
      <div
        className='texte-riche mt-3'
        dangerouslySetInnerHTML={{ __html: domain.description }}
      />
    </details>
    <p className='mt-6 colonne-lecture text-texte-2'>{domain.text}</p>
    <h3 className='mt-10 text-titre-3 text-encre'>{labels.facets}</h3>
    <ul className='mt-4 divide-y divide-trait'>
      {domain.facets.map((facet: Facet) => (
        <li key={facet.facet} className='py-6 break-inside-avoid'>
          <ScoreRule
            taille='facette'
            label={facetLabel(code, facet.facet, locale)}
            score={facet.score}
            min={4}
            max={20}
            valeur={formatNombre(facet.score, locale)}
            surMax={labels.facetOutOf}
            niveau={labels.level[facet.scoreText]}
          />
          <p className='mt-3 colonne-lecture text-texte-2'>{facet.text}</p>
        </li>
      ))}
    </ul>
  </section>
);
