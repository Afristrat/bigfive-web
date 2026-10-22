import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { saveProgress, submitParticipation } from '@/actions/passation';
import { title } from '@/components/primitives';
import { formatNombre } from '@/lib/format';
import {
  loadParticipationOuverte,
  loadTentative,
  versReprise
} from '@/lib/passation-data';
import { getLocalizedItems } from '@/lib/question-overrides';
import { localizedPath } from '@/lib/safe-path';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';
import type { Answer, DbResult } from '@/types';
import {
  Survey,
  type ProgressSortie,
  type Reprise,
  type SurveyResultat
} from '@/app/[locale]/test/survey';

interface Props {
  params: Promise<{ locale: string; participation: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'passation' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function PassationPage({ params }: Props) {
  const { locale, participation: id } = await params;
  setRequestLocale(locale);
  // Identifiant issu de l'URL : validé avant toute connexion ou lecture.
  if (!z.string().uuid().safeParse(id).success) notFound();
  const viewer = await requireViewer(
    locale,
    `/mes-resultats/${id}/questionnaire`
  );
  const participation = await loadParticipationOuverte(viewer, id);
  // Absente de « mes résultats » : participation d'un autre compte ou inconnue.
  if (!participation) notFound();
  if (participation.statut === 'terminee') {
    redirect(
      localizedPath(locale, `/mes-resultats/${participation.participationId}`)
    );
  }

  const p = await getTranslations('passation');
  const values = {
    organisation: participation.organisationNom,
    campagne: participation.campagneTitre
  };

  if (participation.campagneStatut !== 'ouverte') {
    return (
      <div className='mx-auto max-w-[56.25rem]'>
        <h1 className={title()}>{p('closedTitle')}</h1>
        <p className='mt-4 text-texte-2'>{p('closedText', values)}</p>
        <p className='mt-6'>
          <Link
            href='/mon-compte'
            className='font-semibold text-accent underline'
          >
            {p('backToAccount')}
          </Link>
        </p>
      </div>
    );
  }

  // Action serveur propre à cette participation : traduit le résultat de la
  // soumission dans la forme attendue par le questionnaire.
  async function onSubmit(result: DbResult): Promise<SurveyResultat> {
    'use server';
    const outcome = await submitParticipation(id, result);
    switch (outcome.status) {
      case 'ok':
        return { href: outcome.href };
      case 'closed':
      case 'already':
        return { error: outcome.status };
      default:
        return { error: 'failed' };
    }
  }

  // Progression : la sauvegarde du serveur prime sur le navigateur. Une lecture
  // en panne ne bloque pas la passation : le tampon local prend le relais et un
  // éventuel conflit de révision se résout à la première sauvegarde.
  let initial: Reprise | undefined;
  try {
    const tentative = await loadTentative(viewer, id);
    if (tentative) initial = versReprise(tentative);
  } catch (error) {
    console.error('Could not load the attempt', error);
  }

  async function onProgress(
    answers: readonly Answer[],
    revision: number
  ): Promise<ProgressSortie> {
    'use server';
    const outcome = await saveProgress(id, revision, answers);
    switch (outcome.status) {
      case 'ok':
        return { revision: outcome.revision };
      case 'closed':
        return { error: 'closed' };
      case 'conflict':
        return {
          error: 'conflict',
          reprise: versReprise({
            revision: outcome.revision,
            reponses: outcome.reponses
          })
        };
      default:
        return { error: 'failed' };
    }
  }

  const questions = getLocalizedItems(locale);
  const t = await getTranslations('test');
  return (
    <>
      <div className='mx-auto max-w-[56.25rem]'>
        <h1 className={title()}>{t('heading')}</h1>
        <p className='mt-4 mb-6 text-texte-2'>{p('intro', values)}</p>
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
            nextHelp: t('nextHelp'),
            errorTexts: {
              closed: p('errors.closed'),
              already: p('errors.already'),
              conflict: p('errors.conflict'),
              conflictReloaded: p('errors.conflictReloaded')
            },
            resumed: p('resumed')
          }}
          onSubmit={onSubmit}
          onProgress={onProgress}
          initial={initial}
          storageKey={`b5:${participation.participationId}`}
          locale={locale}
        />
      </div>
    </>
  );
}
