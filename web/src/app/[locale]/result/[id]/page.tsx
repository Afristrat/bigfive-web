import { notFound } from 'next/navigation';
import { Report, getTestResult } from '@/actions';
import { B5Error } from '@/types';
import { Snippet } from '@nextui-org/snippet';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { heading, title } from '@/components/primitives';
import { Notice } from '@/components/notice';
import { ScoreRule } from '@/components/score-rule';
import ShareBar from '@/components/share-bar';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { domainLabel, isDomainCode } from '@/lib/domain-labels';
import { formatDate, formatNombre } from '@/lib/format';
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

const Results = ({ report, locale, showExpanded }: ResultsProps) => {
  const t = useTranslations('results');
  const link = `${basePath}/result/${report.id}`;
  const level: Record<string, string> = {
    low: t('level.low'),
    neutral: t('level.neutral'),
    high: t('level.high')
  };
  const domainOutOf = t('outOf', { max: formatNombre(120, locale) });
  const domains = report.results.flatMap((domain) =>
    isDomainCode(domain.domain) ? [{ code: domain.domain, domain }] : []
  );

  return (
    <>
      <header className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div className='flex flex-col gap-2'>
          <h1 className={title()}>{t('title')}</h1>
          <p className='text-petit text-texte-3'>
            {formatDate(report.timestamp, locale)}
          </p>
        </div>
        <PrintButton label={t('print')} />
      </header>

      <section aria-labelledby='vue-ensemble' className='mt-12'>
        <h2 id='vue-ensemble' className={heading()}>
          {t('overview')}
        </h2>
        <ul className='mt-6 flex flex-col gap-5'>
          {domains.map(({ code, domain }, index) => (
            <li key={code}>
              <ScoreRule
                label={domainLabel(code, locale, 'short')}
                href={'#domaine-' + code}
                score={domain.score}
                min={24}
                max={120}
                valeur={formatNombre(domain.score, locale)}
                surMax={domainOutOf}
                niveau={level[domain.scoreText]}
                anime
                rang={index}
              />
            </li>
          ))}
        </ul>
        <p className='mt-6 colonne-lecture text-texte-2'>{t('intro')}</p>
        <p className='mt-2 colonne-lecture text-petit text-texte-3'>
          {t('scaleNote')}
        </p>
      </section>

      {/* Identifiant et partage : supprimés au lot 1, aucun soin supplémentaire. */}
      <Notice ton='info' className='mt-10 print:hidden'>
        <p>
          <span className='font-semibold'>{t('important')}</span>{' '}
          {t('saveResults')}{' '}
          <Link href={`/compare/?id=${report.id}`} className='underline'>
            {t('compare')}
          </Link>{' '}
          {t('toOthers')}
        </p>
        <Snippet
          hideSymbol
          color='default'
          variant='flat'
          codeString={report.id}
          className='w-full justify-between'
          tooltipProps={{ content: t('copyId') }}
          copyButtonProps={{ 'aria-label': t('copyId') }}
        >
          <bdi dir='ltr'>{report.id}</bdi>
        </Snippet>
        <div className='flex gap-1'>
          <ShareBar
            link={link}
            description={t('seo.title')}
            resultId={report.id}
          />
        </div>
      </Notice>

      <ResultBody
        results={report.results}
        locale={locale}
        showExpanded={showExpanded}
        labels={{
          contents: t('contents'),
          facets: t('facets'),
          learnMore: t('learnMore'),
          neuroticismGloss: t('neuroticismGloss'),
          domainOutOf,
          facetOutOf: t('outOf', { max: formatNombre(20, locale) }),
          level
        }}
      />
    </>
  );
};
