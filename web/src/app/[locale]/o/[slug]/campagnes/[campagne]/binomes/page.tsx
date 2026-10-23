import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { BinomeProposition } from '@/components/rapports/binome-consent';
import { libellesProposition } from '@/components/rapports/rapport-binome';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  loadResultatsCampagne,
  peutLireResultats
} from '@/lib/consultant-data';
import { formatDateMaroc, formatNombre, isolerEnArabe } from '@/lib/format';
import { requireViewer } from '@/lib/session';
import { parseCampaignId } from '@/lib/synthese-data';

interface Props {
  params: Promise<{ locale: string; slug: string; campagne: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'binome' });
  return {
    title: t('proposition.titre'),
    robots: { index: false, follow: false }
  };
}

// Proposition d'un binôme par le consultant ou l'administrateur Tenga : deux
// résultats remis de la campagne, désignés par leur numéro (aucune identité).
// Rien n'est lisible avant l'accord des deux personnes, pas même pour celui qui
// propose. Responsable et participant : 404 avant tout appel.
export default async function PropositionPage({ params }: Props) {
  const { locale, slug: rawSlug, campagne: rawCampagne } = await params;
  setRequestLocale(locale);
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  if (!slug || !campaignId) notFound();
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/binomes`
  );
  const page = await loadOrgPage(viewer, slug);
  if (!page || !peutLireResultats({ isAdmin: page.isAdmin, role: page.role })) {
    notFound();
  }
  const campagne = await loadCampagneOrganisation(
    viewer,
    page.org.id,
    campaignId
  );
  if (!campagne) notFound();
  const liste = await loadResultatsCampagne(viewer, campaignId);
  if (!liste) notFound();

  const t = await getTranslations('binome');
  const options = liste.map((ligne, rang) => ({
    id: ligne.participationId,
    label: t('proposition.option', {
      numero: formatNombre(rang + 1, locale),
      date: formatDateMaroc(ligne.soumisLe, locale)
    })
  }));

  return (
    <div className='flex flex-col gap-12'>
      <EntetePilotage
        retour={{
          href: `/o/${slug}/campagnes/${campaignId}/resultats`,
          libelle: t('proposition.retour')
        }}
        surtitre={<bdi>{page.org.nom}</bdi>}
        titre={t('proposition.titre')}
        chapo={
          <>
            <p>
              {t('proposition.campagne', {
                titre: isolerEnArabe(campagne.titre, locale)
              })}
            </p>
            <p className='mt-3 text-corps'>{t('proposition.intro')}</p>
          </>
        }
      />

      {options.length < 2 ? (
        <p className='carte text-texte-2'>{t('proposition.moinsDeDeux')}</p>
      ) : (
        <BinomeProposition options={options} labels={libellesProposition(t)} />
      )}
    </div>
  );
}
