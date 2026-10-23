import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { boutonPrincipal } from '@/components/primitives';
import { LienRetour } from '@/components/resultats/lien-retour';
import { ResultHeader } from '@/components/resultats/result-header';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { formatDateMaroc, isolerEnArabe } from '@/lib/format';
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
  const rapport = await getTranslations('rapport');
  const flow = await getTranslations('flow');

  const peutPasser =
    participation.statut !== 'terminee' &&
    participation.campagneStatut === 'ouverte';
  const date = participation.termineeLe
    ? formatDateMaroc(participation.termineeLe, locale)
    : null;

  const entete = (
    <ResultHeader
      retour={<LienRetour href='/mes-resultats'>{t('retour')}</LienRetour>}
      surtitre={isolerEnArabe(participation.organisationNom, locale)}
      titre={isolerEnArabe(participation.campagneTitre, locale)}
      titreSaisi
      sousTitre={date ? t('passeLe', { date }) : null}
      actions={
        participation.scores ? (
          <Link
            href={`/mes-resultats/${participation.participationId}/rapport`}
            data-aimant=''
            className={boutonPrincipal()}
          >
            {rapport('personne.titre')}
            <ArrowRightIcon size={18} />
          </Link>
        ) : null
      }
    />
  );

  if (participation.scores) {
    return (
      <div>
        {entete}
        <ResultView
          profil={profilDepuisScores(participation.scores)}
          locale={locale}
          audience='personne'
          libelles={libellesResultView(t, niveaux, flow)}
          date={null}
        />
      </div>
    );
  }

  return (
    <div>
      {entete}
      <div className='mt-10 max-w-[40em] border-t-2 border-encre pt-8'>
        {participation.scoresIllisibles ? (
          <p className='text-chapo text-texte-2'>{t('formatAnterieur')}</p>
        ) : (
          <div className='flex flex-col items-start gap-6'>
            <p className='text-chapo text-texte-2'>
              {participation.campagneStatut === 'close'
                ? t('sansResultatClose')
                : t('sansResultat')}
            </p>
            {peutPasser && (
              <Link
                href={`/mes-resultats/${participation.participationId}/questionnaire`}
                data-aimant=''
                className={boutonPrincipal()}
              >
                {participation.statut === 'ouverte'
                  ? t('action.start')
                  : t('action.resume')}
                <ArrowRightIcon size={18} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
