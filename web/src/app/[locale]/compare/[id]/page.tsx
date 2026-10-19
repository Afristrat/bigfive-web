import { base64url } from '@/lib/helpers';
import { notFound } from 'next/navigation';
import { getTestResult } from '@/actions';
import { B5Error } from '@/types';
import { title } from '@/components/primitives';
import { DomainComparePage } from './domain';
import { BarChartCompare } from '@/components/bar-chart-generic';
import ShareBar from '@/components/share-bar';
import CompareEdit from './compare-edit';
import { getTranslations } from 'next-intl/server';
import { basePath, locales } from '@/config/site';

interface ComparePageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}

export async function generateMetadata({ params }: ComparePageProps) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'getCompare' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('title'),
    description: t('description1'),
    alternates: {
      canonical: basePath + localePath + `/compare/${id}`,
      languages: locales.reduce(
        (a, v) => ({ ...a, [v]: `${v}/compare/${id}` }),
        {}
      )
    }
  };
}

type Person = {
  id: string;
  name: string;
};

export default async function ComparePage({ params }: ComparePageProps) {
  const { id, locale } = await params;
  let people: Person[];

  if (id.includes('_')) {
    // new format for compare
    people = id.split('_').map((person) => {
      const [name, id] = person.split('-');
      return { name: decodeURI(name), id };
    });
  } else {
    // old format for compare
    people = base64url.decode(id);
  }
  const reports = await Promise.all(
    people.map(async (person) => {
      let report;
      try {
        report = await getTestResult(person.id, locale);
      } catch (error) {
        if (error instanceof B5Error && error.name === 'NotFoundError')
          notFound();
        throw error;
      }
      if (!report) notFound();
      return {
        name: person.name,
        report
      };
    })
  );

  const domains = reports[0].report.results;
  const categories = domains.map((result) => result.title);

  const series = reports.map(({ name, report }) => {
    return {
      name,
      data: domains.map((domain) => {
        const match = report.results.find((r) => r.domain === domain.domain);
        return match?.score ?? 0;
      })
    };
  });
  const getNamedFacets = (domain: string) =>
    reports.map((report) => {
      const domainResult = report.report.results.find(
        (result) => result.domain === domain
      );
      return {
        name: report.name,
        facets: domainResult?.facets ?? []
      };
    });

  const link = `${basePath}/compare/${id}`;

  return (
    <>
      <div className='flex mt-8 w-full'>
        <CompareEdit id={id} />
        <div className='flex justify-end w-full gap-x-1 print:hidden'>
          <ShareBar
            link={link}
            description='Explore our detailed comparison of personality traits'
          />
        </div>
      </div>
      <div className='mt-8'>
        <h1 className={title()}>Overview</h1>
        <BarChartCompare max={120} categories={categories} series={series} />
        {reports[0].report.results.map((domain) => (
          <DomainComparePage
            key={domain.domain}
            title={domain.title}
            shortDescription={domain.shortDescription}
            domain={getNamedFacets(domain.domain)}
          />
        ))}
      </div>
    </>
  );
}
