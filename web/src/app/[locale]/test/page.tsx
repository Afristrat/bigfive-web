import { getLocalizedItems } from '@/lib/question-overrides';
import { Survey } from './survey';
import { saveTest } from '@/actions';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const questions = getLocalizedItems(locale);
  const t = await getTranslations('test');
  return (
    <>
      <Survey
        questions={questions}
        nextText={t('next')}
        prevText={t('back')}
        resultsText={t('seeResults')}
        labels={{
          restored: t('restored'),
          newTest: t('newTest'),
          saveFailedTitle: t('saveFailedTitle'),
          saveFailedText: t('saveFailedText'),
          reload: t('reload')
        }}
        saveTest={saveTest}
        locale={locale}
      />
    </>
  );
}
