import { getLocalizedItems } from '@/lib/question-overrides';
import { Survey } from './survey';
import { savePublicTest } from '@/actions';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { formatNombre } from '@/lib/format';
import { Notice } from '@/components/notice';
import {
  loadParticipationsAPasser,
  type ParticipationPassation
} from '@/lib/passation-data';
import { currentViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

// Une personne connectée qui a un questionnaire de campagne à passer doit le
// faire depuis sa passation : ce parcours public écrit ailleurs. Aucune panne de
// lecture ne doit empêcher le parcours public.
async function participationsAPasser(): Promise<ParticipationPassation[]> {
  try {
    const state = await currentViewer();
    return state.status === 'ok'
      ? await loadParticipationsAPasser(state.viewer)
      : [];
  } catch {
    return [];
  }
}

export default async function TestPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const questions = getLocalizedItems(locale);
  const t = await getTranslations('test');
  const p = await getTranslations('passation');
  const aPasser = await participationsAPasser();
  return (
    <>
      <h1 className='sr-only'>{t('heading')}</h1>
      <div className='mx-auto max-w-[56.25rem]'>
        {aPasser.map((participation) => (
          <Notice
            key={participation.participationId}
            ton='avis'
            titre={p('encartTitle', {
              organisation: participation.organisationNom
            })}
            className='mb-6'
          >
            <p>{p('encartText', { campagne: participation.campagneTitre })}</p>
            <Link
              href={`/mes-resultats/${participation.participationId}/questionnaire`}
              className='font-semibold text-accent underline'
            >
              {p('encartCta')}
            </Link>
          </Notice>
        ))}
        <Survey
          questions={questions}
          labels={{
            next: t('next'),
            prev: t('back'),
            results: t('seeResults'),
            progress: String(t.raw('progress')),
            saving: t('saving'),
            dismiss: t('dismiss'),
            instructions: t('instructions', {
              total: formatNombre(questions.length, locale)
            }),
            halfway: String(t.raw('halfway')),
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
          onSubmit={savePublicTest}
          storageKey='b5'
          locale={locale}
        />
      </div>
    </>
  );
}
