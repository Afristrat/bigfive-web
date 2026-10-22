import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  loadResultatIndividuel,
  peutLireResultats
} from '@/lib/consultant-data';
import { formatDate, isolerEnArabe, formatDateMaroc } from '@/lib/format';
import { parseParticipationId } from '@/lib/mes-resultats-data';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';
import { requireViewer } from '@/lib/session';
import { parseCampaignId } from '@/lib/synthese-data';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{
    locale: string;
    slug: string;
    campagne: string;
    participation: string;
  }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rapport' });
  return {
    title: t('consultant.titre'),
    robots: { index: false, follow: false }
  };
}

// Lecture d'un résultat individuel par le consultant ou l'administrateur Tenga
// (audience « consultant »). La seule lecture passe par
// app.lire_resultat_individuel, qui vérifie le droit et écrit la ligne de
// journal avant de rendre le résultat. Le responsable et le participant
// n'atteignent jamais cette lecture : 404 avant tout appel.
export default async function LectureResultatPage({ params }: Props) {
  const {
    locale,
    slug: rawSlug,
    campagne: rawCampagne,
    participation: rawParticipation
  } = await params;
  setRequestLocale(locale);
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  const participationId = parseParticipationId(rawParticipation);
  if (!slug || !campaignId || !participationId) notFound();
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/resultats/${participationId}`
  );
  const page = await loadOrgPage(viewer, slug);
  if (!page || !peutLireResultats({ isAdmin: page.isAdmin, role: page.role })) {
    notFound();
  }
  // La campagne doit être celle de l'organisation de l'URL AVANT toute lecture :
  // une lecture mal adressée ne laisse pas de ligne de journal.
  const campagne = await loadCampagneOrganisation(
    viewer,
    page.org.id,
    campaignId
  );
  if (!campagne) notFound();
  const resultat = await loadResultatIndividuel(viewer, participationId);
  if (
    !resultat ||
    resultat.campagneId !== campaignId ||
    resultat.organisationId !== page.org.id
  ) {
    notFound();
  }

  const t = await getTranslations('rapport');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');

  return (
    <div>
      <p>
        <Link
          href={`/o/${slug}/campagnes/${campaignId}/resultats`}
          className='font-semibold text-accent'
        >
          {t('consultant.retour')}
        </Link>
      </p>
      <h1 className={`mt-4 ${title()}`}>{t('consultant.titre')}</h1>
      <p className='mt-2 text-texte-2'>
        {t('liste.campagne', { titre: isolerEnArabe(campagne.titre, locale) })}
      </p>
      <div className='mt-8'>
        {resultat.scores ? (
          <RapportIndividuel
            rapport={construireRapportIndividuel({
              scores: resultat.scores,
              locale,
              audience: 'consultant'
            })}
            locale={locale}
            libelles={libellesRapport(t, mes, niveaux)}
            date={formatDateMaroc(resultat.soumisLe, locale)}
          />
        ) : (
          <p className='text-texte-2'>{mes('formatAnterieur')}</p>
        )}
      </div>
    </div>
  );
}
