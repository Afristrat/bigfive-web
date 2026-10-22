import { notFound } from 'next/navigation';
import { Report, getTestResult } from '@/actions';
import { B5Error } from '@/types';
import { getTranslations } from 'next-intl/server';
import { basePath } from '@/config/site';
import { Results } from './results-view';

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
