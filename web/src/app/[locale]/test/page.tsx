import { getLocalizedItems } from '@/lib/question-overrides';
import { Survey } from './survey';
import { savePublicTest } from '@/actions';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { libellesSurvey } from '@/components/questionnaire/reprise-locale';
import { Notice } from '@/components/notice';
import {
  loadParticipationsAPasser,
  type ParticipationPassation
} from '@/lib/passation-data';
import { PARCOURS_ANONYME_OUVERT } from '@/config/site';
import { localizedPath } from '@/lib/safe-path';
import { currentViewer, requireViewer, type Viewer } from '@/lib/session';
import { Link } from '@/navigation';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';

interface Props {
  params: Promise<{ locale: string }>;
}

// Une personne connectée qui a un questionnaire de campagne à passer doit le
// faire depuis sa passation : ce parcours public écrit ailleurs. Aucune panne de
// lecture ne doit empêcher la page. `connu` : personne déjà vérifiée par la page.
async function participationsAPasser(
  connu: Viewer | null
): Promise<ParticipationPassation[]> {
  try {
    if (connu) return await loadParticipationsAPasser(connu);
    const state = await currentViewer();
    return state.status === 'ok'
      ? await loadParticipationsAPasser(state.viewer)
      : [];
  } catch (error) {
    // Contexte seulement : ni identité ni jeton dans le journal.
    console.error('Could not list the pending participations', error);
    return [];
  }
}

export default async function TestPage({ params }: Props) {
  // La page dépend de la session (encart de passation) : jamais prérendue.
  // Sans cela, le `catch` ci-dessus avale l'erreur de rendu dynamique et la
  // page part statique avec une liste vide.
  await connection();
  const { locale } = await params;
  // Parcours anonyme fermé : sans session, connexion avec retour sûr sur /test,
  // avant toute lecture. Avec session, seulement l'encart de passation de
  // campagne : ni formulaire public ni écriture MongoDB.
  const connu = PARCOURS_ANONYME_OUVERT
    ? null
    : await requireViewer(locale, '/test');
  setRequestLocale(locale);
  const t = await getTranslations('test');
  const p = await getTranslations('passation');
  const aPasser = await participationsAPasser(connu);
  // Fermé et rien à passer (ou lecture en panne, journalisée) : « Mes résultats ».
  if (!PARCOURS_ANONYME_OUVERT && aPasser.length === 0) {
    redirect(localizedPath(locale, '/mes-resultats'));
  }
  const questions = PARCOURS_ANONYME_OUVERT ? getLocalizedItems(locale) : [];
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
        {PARCOURS_ANONYME_OUVERT && (
          <Survey
            questions={questions}
            labels={libellesSurvey(t, locale, questions.length)}
            onSubmit={savePublicTest}
            storageKey='b5'
            locale={locale}
          />
        )}
      </div>
    </>
  );
}
