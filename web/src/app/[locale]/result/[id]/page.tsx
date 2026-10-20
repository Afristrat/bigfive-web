import { notFound } from 'next/navigation';
import { Report, getTestResult } from '@/actions';
import { B5Error } from '@/types';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { boutonPrincipal, title } from '@/components/primitives';
import { DomainShape } from '@/components/domain-shape';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import { basePath } from '@/config/site';
import { domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatDate, formatNombre } from '@/lib/format';
import { Link } from '@/navigation';
import { CopyId } from './copy-id';
import { ScoreValue } from './domain';
import { PrintButton } from './print-button';
import { ResultBody } from './result-body';

interface ResultPageParams {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ showExpanded?: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

export async function generateMetadata({ params }: ResultPageParams) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'results' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('seo.title'),
    description: t('seo.description'),
    alternates: {
      canonical: basePath + localePath + `/result/${id}`,
      languages: servedLocales.reduce(
        (a, v) => ({ ...a, [v]: `${basePath}/${v}/result/${id}` }),
        {}
      )
    }
  };
}

export default async function ResultPage({
  params,
  searchParams
}: ResultPageParams) {
  const { id, locale } = await params;
  const { showExpanded } = await searchParams;
  let report: Report | undefined;

  try {
    report = await getTestResult(id.substring(0, 24), locale);
  } catch (error) {
    if (error instanceof B5Error && error.name === 'NotFoundError') notFound();
    throw error;
  }

  // Le type de retour autorise undefined : on le traite comme une page introuvable.
  if (!report) notFound();

  return (
    <Results report={report} locale={locale} showExpanded={!!showExpanded} />
  );
}

interface ResultsProps {
  report: Report;
  locale: string;
  showExpanded: boolean;
}

const carte =
  'rounded-panneau border border-trait bg-surface p-[clamp(1.375rem,3vw,2.25rem)] shadow-carte';

const Results = ({ report, locale, showExpanded }: ResultsProps) => {
  const t = useTranslations('results');
  const level: Record<string, string> = {
    low: t('level.low'),
    neutral: t('level.neutral'),
    high: t('level.high')
  };
  const domainOutOf = t('outOf', { max: formatNombre(120, locale) });
  // Ordre fixe N, E, O, A, C : celui du radar et de la liste.
  const domains = domainCodes.flatMap((code) => {
    const domain = report.results.find((item) => item.domain === code);
    return domain ? [{ code, domain }] : [];
  });

  return (
    <>
      <header>
        <p className='inline-flex rounded-full bg-creux px-3.5 py-1.5 text-legende font-medium text-encre'>
          {formatDate(report.timestamp, locale)}
        </p>
        <h1 className={title({ size: 'display', className: 'mt-4' })}>
          {t('title')}
        </h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          {t('intro')}
        </p>
      </header>

      <div className='mt-8 grid gap-4 lg:grid-cols-[11fr_10fr]'>
        <section aria-labelledby='radar-titre' className={carte}>
          <h2 id='radar-titre' className='text-titre-2 text-encre'>
            {t('factorsTitle')}
          </h2>
          {domains.length === 5 && (
            <RadarChart
              className='mt-4'
              domains={domains.map(({ code, domain }) => ({
                code,
                label: domainLabel(code, locale, 'short'),
                value: domain.score
              }))}
              min={24}
              max={120}
              locale={locale}
              title={t('radar.title')}
              summary={t('radar.summary', {
                min: formatNombre(24, locale),
                max: formatNombre(120, locale)
              })}
              columnLabels={{
                domain: t('radar.domain'),
                score: t('radar.score')
              }}
            />
          )}
          <p className='mt-4 text-center text-petit text-texte-2'>
            {t('scales', {
              domainMin: formatNombre(24, locale),
              domainMax: formatNombre(120, locale),
              facetMin: formatNombre(4, locale),
              facetMax: formatNombre(20, locale)
            })}
          </p>
        </section>

        <section aria-label={t('factorsTitle')} className={carte}>
          <ul className='flex flex-col gap-7'>
            {domains.map(({ code, domain }, index) => (
              <li key={code} className='break-inside-avoid'>
                <div className='flex items-center gap-3'>
                  <span className='grid h-10 w-10 flex-none place-items-center rounded-petit bg-accent-doux text-accent'>
                    <DomainShape domain={code} size={18} />
                  </span>
                  <span className='text-corps font-bold text-encre'>
                    {domainLabel(code, locale, 'short')}
                    {level[domain.scoreText] && (
                      <span className='sr-only'>
                        {' '}
                        ({level[domain.scoreText]})
                      </span>
                    )}
                  </span>
                  <span className='ms-auto'>
                    <ScoreValue
                      valeur={formatNombre(domain.score, locale)}
                      max={formatNombre(120, locale)}
                      spoken={`${t('radar.score')} ${formatNombre(domain.score, locale)} ${domainOutOf}`}
                    />
                  </span>
                </div>
                <div className='mt-2.5'>
                  <ScoreBar
                    score={domain.score}
                    min={24}
                    max={120}
                    anime
                    rang={index}
                  />
                </div>
                <p className='mt-2.5 text-petit text-texte-2'>
                  {domain.shortDescription}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <ResultBody
        results={report.results}
        locale={locale}
        showExpanded={showExpanded}
        labels={{
          detailTitle: t('detailTitle'),
          detailHint: t('detailHint'),
          facets: t('facets'),
          learnMore: t('learnMore'),
          neuroticismGloss: t('neuroticismGloss'),
          score: t('radar.score'),
          domainOutOf,
          facetOutOf: t('outOf', { max: formatNombre(20, locale) }),
          level
        }}
      />

      <CopyId
        id={report.id}
        title={t('idLabel')}
        hint={t('idHint')}
        copyLabel={t('copyId')}
        copiedLabel={t('copied')}
      />

      <div className='mt-6 flex flex-wrap gap-3 print:hidden'>
        <PrintButton label={t('print')} />
        <Link
          href='/'
          className={boutonPrincipal({
            className:
              'border-trait-fort bg-surface text-encre shadow-none hover:bg-creux'
          })}
        >
          {t('backHome')}
        </Link>
      </div>
    </>
  );
};
