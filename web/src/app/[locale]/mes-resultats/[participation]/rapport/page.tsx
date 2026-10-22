import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';
import { formatDate, isolerEnArabe, formatDateMaroc } from '@/lib/format';
import {
  loadMaParticipation,
  parseParticipationId
} from '@/lib/mes-resultats-data';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; participation: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rapport' });
  return {
    title: t('personne.titre'),
    robots: { index: false, follow: false }
  };
}

// Rapport individuel de la personne elle-même (audience « personne ») : elle
// lit son propre résultat par app.mes_resultats, la seule voie qui lui est
// ouverte.
export default async function RapportPersonnePage({ params }: Props) {
  const { locale, participation: brut } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, participation absente, d'autrui ou
  // sans résultat lisible.
  const id = parseParticipationId(brut);
  if (!id) notFound();
  const viewer = await requireViewer(locale, `/mes-resultats/${id}/rapport`);
  const participation = await loadMaParticipation(viewer, id);
  if (!participation?.scores) notFound();

  const t = await getTranslations('rapport');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');

  const rapport = construireRapportIndividuel({
    scores: participation.scores,
    locale,
    audience: 'personne'
  });
  const date = participation.termineeLe
    ? formatDateMaroc(participation.termineeLe, locale)
    : null;

  return (
    <div>
      <p>
        <Link
          href={`/mes-resultats/${participation.participationId}`}
          className='font-semibold text-accent'
        >
          {t('personne.retour')}
        </Link>
      </p>
      <h1 className={`mt-4 ${title()}`}>{t('personne.titre')}</h1>
      <p className='mt-2 text-texte-2'>
        {isolerEnArabe(participation.campagneTitre, locale)},{' '}
        {isolerEnArabe(participation.organisationNom, locale)}
      </p>
      <div className='mt-8'>
        <RapportIndividuel
          rapport={rapport}
          locale={locale}
          libelles={libellesRapport(t, mes, niveaux)}
          date={date}
        />
      </div>
    </div>
  );
}
