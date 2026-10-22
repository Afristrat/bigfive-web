import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { secondaryButtonClass } from '@/components/form-styles';
import { title } from '@/components/primitives';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { formatDate, isoler } from '@/lib/format';
import {
  loadMaParticipation,
  parseParticipationId
} from '@/lib/mes-resultats-data';
import { profilDepuisScores } from '@/lib/moteur';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; participation: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mesResultats' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function MaParticipationPage({ params }: Props) {
  const { locale, participation: brut } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, participation absente ou d'autrui.
  const id = parseParticipationId(brut);
  if (!id) notFound();
  const viewer = await requireViewer(locale, `/mes-resultats/${id}`);
  const participation = await loadMaParticipation(viewer, id);
  if (!participation) notFound();

  const t = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');
  const iso = (valeur: string): string =>
    locale === 'ar' ? isoler(valeur) : valeur;

  const peutPasser =
    participation.statut !== 'terminee' &&
    participation.campagneStatut === 'ouverte';
  const date = participation.termineeLe
    ? formatDate(participation.termineeLe, locale, 'Africa/Casablanca')
    : null;

  return (
    <div>
      <p>
        <Link href='/mes-resultats' className='font-semibold text-accent'>
          {t('retour')}
        </Link>
      </p>
      <h1 className={`mt-4 ${title()}`}>{iso(participation.campagneTitre)}</h1>
      <p className='mt-2 text-texte-2'>{iso(participation.organisationNom)}</p>

      <div className='mt-8'>
        {participation.scores ? (
          <ResultView
            profil={profilDepuisScores(participation.scores)}
            locale={locale}
            audience='personne'
            libelles={libellesResultView(t, niveaux)}
            date={date}
          />
        ) : participation.scoresIllisibles ? (
          <p className='text-texte-2'>{t('formatAnterieur')}</p>
        ) : (
          <div className='flex flex-col items-start gap-4'>
            <p className='text-texte-2'>
              {participation.campagneStatut === 'close'
                ? t('sansResultatClose')
                : t('sansResultat')}
            </p>
            {peutPasser && (
              <Link
                href={`/mes-resultats/${participation.participationId}/questionnaire`}
                className={secondaryButtonClass}
              >
                {participation.statut === 'ouverte'
                  ? t('action.start')
                  : t('action.resume')}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
