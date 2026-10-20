import { Domain } from '@bigfive-org/results';
import { domainLabel, isDomainCode } from '@/lib/domain-labels';
import { DomainSection, DomainSectionLabels } from './domain';
import { ResultNav } from './result-nav';

export type ResultBodyLabels = DomainSectionLabels & { contents: string };

interface ResultBodyProps {
  results: Domain[];
  locale: string;
  labels: ResultBodyLabels;
  showExpanded: boolean;
}

export function ResultBody({
  results,
  locale,
  labels,
  showExpanded
}: ResultBodyProps) {
  const domains = results.flatMap((domain) =>
    isDomainCode(domain.domain) ? [{ code: domain.domain, domain }] : []
  );
  return (
    <div className='mt-16 lg:grid lg:grid-cols-12 lg:gap-12'>
      <ResultNav
        label={labels.contents}
        items={domains.map(({ code }) => ({
          code,
          label: domainLabel(code, locale, 'short')
        }))}
      />
      <div className='flex flex-col gap-16 lg:col-span-9'>
        {domains.map(({ code, domain }) => (
          <DomainSection
            key={code}
            code={code}
            domain={domain}
            locale={locale}
            labels={labels}
            showExpanded={showExpanded}
          />
        ))}
      </div>
    </div>
  );
}
