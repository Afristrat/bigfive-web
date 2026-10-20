import { Domain } from '@bigfive-org/results';
import { isRtlLang } from 'rtl-detect';
import { title } from '@/components/primitives';
import { domainLabel, isDomainCode } from '@/lib/domain-labels';
import { DomainSection, DomainSectionLabels } from './domain';
import { DomainTabs } from './domain-tabs';

export type ResultBodyLabels = DomainSectionLabels & {
  detailTitle: string;
  detailHint: string;
};

interface ResultBodyProps {
  results: Domain[];
  locale: string;
  labels: ResultBodyLabels;
  showExpanded: boolean;
}

// Détail par domaine : onglets accessibles, six facettes par panneau.
export function ResultBody({
  results,
  locale,
  labels,
  showExpanded
}: ResultBodyProps) {
  const panels = results.flatMap((domain) =>
    isDomainCode(domain.domain)
      ? [
          {
            code: domain.domain,
            label: domainLabel(domain.domain, locale, 'short'),
            content: (
              <DomainSection
                code={domain.domain}
                domain={domain}
                locale={locale}
                labels={labels}
                showExpanded={showExpanded}
              />
            )
          }
        ]
      : []
  );
  return (
    <section
      aria-labelledby='detail'
      className='mt-4 rounded-panneau border border-trait bg-surface p-[clamp(1.375rem,3vw,2.25rem)] shadow-carte'
    >
      <h2 id='detail' className={title({ size: 'section' })}>
        {labels.detailTitle}
      </h2>
      <p className='mt-2 text-corps text-texte-2 print:hidden'>
        {labels.detailHint}
      </p>
      <DomainTabs
        label={labels.detailTitle}
        rtl={isRtlLang(locale) === true}
        panels={panels}
      />
    </section>
  );
}
