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
      <h1 className='sr-only'>{t('heading')}</h1>
      <div className='mx-auto max-w-[56.25rem]'>
        <Survey
          questions={questions}
          labels={{
            next: t('next'),
            prev: t('back'),
            results: t('seeResults'),
            progress: String(t.raw('progress')),
            saving: t('saving'),
            dismiss: t('dismiss'),
            instructions: t('instructions'),
            noTimeLimit: t('noTimeLimit'),
            progressBar: t('progressBar'),
            statement: String(t.raw('statement')),
            prompt: t('prompt'),
            restored: t('restored'),
            newTest: t('newTest'),
            saveFailedTitle: t('saveFailedTitle'),
            saveFailedText: t('saveFailedText'),
            reload: t('reload'),
            nextHelp: t('nextHelp')
          }}
          saveTest={saveTest}
          locale={locale}
        />
      </div>
    </>
  );
}
