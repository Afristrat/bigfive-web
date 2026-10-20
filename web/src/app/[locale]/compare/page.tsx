import { title } from '@/components/primitives';
import { ComparePeople } from './compare-people';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ id?: string; edit?: string }>;
}

export default async function ComparePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { id, edit } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations('getCompare');
  return (
    <div className='min-h-screen'>
      <h1 className={title()}>{t('title')}</h1>
      <br />
      <br />
      <span className='mt-2'>{t('description1')}</span>
      <div className='my-4' />
      <Suspense fallback='loading...'>
        <ComparePeople
          addPersonText={t('addPerson')}
          comparePeopleText={t('comparePeople')}
          invalidIdText={t('invalidId')}
          paramId={id}
          edit={edit}
        />
      </Suspense>
    </div>
  );
}
