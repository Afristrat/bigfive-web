import { notFound } from 'next/navigation';
import { Report, getTestResult } from '@/actions';
import { B5Error } from '@/types';
import { Snippet } from '@nextui-org/snippet';
import { useTranslations } from 'next-intl';
import { title } from '@/components/primitives';
import { getTranslations } from 'next-intl/server';
import { BarChart } from '@/components/bar-chart';
import { Link } from '@/navigation';
import { basePath, locales } from '@/config/site';
import ShareBar from '@/components/share-bar';
import { DomainTabs } from './domain-tabs';
import { Chip } from '@nextui-org/react';

interface ResultPageParams {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ showExpanded?: string }>;
}

export async function generateMetadata({ params }: ResultPageParams) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'results' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('seo.title'),
    description: t('seo.description'),
    alternates: {
      canonical: basePath + localePath + `/result/${id}`,
      languages: locales.reduce(
        (a, v) => ({ ...a, [v]: `${v}/result/${id}` }),
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

  return <Results report={report} showExpanded={!!showExpanded} />;
}

interface ResultsProps {
  report: Report;
  showExpanded: boolean;
}

const Results = ({ report, showExpanded }: ResultsProps) => {
  const t = useTranslations('results');
  const link = `${basePath}/result/${report.id}`;

  return (
    <>
      <div className='flex justify-end'>
        <Chip>{new Date(report.timestamp).toLocaleDateString()}</Chip>
      </div>
      <div className='text-center mt-6'>
        <span className='font-bold'>{t('important')}</span> &nbsp;
        {t('saveResults')} &nbsp;
        <Link href={`/compare/?id=${report.id}`} className='underline'>
          {t('compare')}
        </Link>{' '}
        &nbsp;
        {t('toOthers')}
      </div>
      <div className='flex mt-8'>
        <Snippet
          hideSymbol
          color='danger'
          className='w-full justify-center'
          size='lg'
        >
          {report.id}
        </Snippet>
      </div>
      <div className='flex mt-8 justify-end w-full gap-x-1 print:hidden'>
        <ShareBar
          link={link}
          description='Explore my personality traits'
          resultId={report.id}
        />
      </div>
      <div className='mt-10'>
        <h1 className={title()}>{t('theBigFive')}</h1>
      </div>
      <BarChart max={120} results={report.results} />
      <DomainTabs
        results={report.results}
        showExpanded={showExpanded}
        scoreText={t('score')}
      />
    </>
  );
};
