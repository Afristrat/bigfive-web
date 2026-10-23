import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { canManageCampaigns } from '@/lib/access-rules';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import {
  GroupSynthesis,
  libellesSynthese
} from '@/components/synthese/group-synthesis';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import { isolerEnArabe } from '@/lib/format';
import { VERSION_MOTEUR } from '@/lib/moteur/seuils';
import { requireViewer } from '@/lib/session';
import {
  loadSynthese,
  parseCampaignId,
  peutLireSynthese
} from '@/lib/synthese-data';

interface Props {
  params: Promise<{ locale: string; slug: string; campagne: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'synthese' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function SynthesePage({ params }: Props) {
  const { locale, slug: rawSlug, campagne: rawCampagne } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, organisation ou campagne absente ou
  // invisible, rôle sans droit de lecture (participant). Aucune cause ne se distingue.
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  if (!slug || !campaignId) notFound();
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/synthese`
  );
  const page = await loadOrgPage(viewer, slug);
  if (!page || !peutLireSynthese({ isAdmin: page.isAdmin, role: page.role })) {
    notFound();
  }
  const synthese = await loadSynthese(viewer, page.org.id, campaignId);
  if (!synthese) notFound();

  const t = await getTranslations('synthese');
  const tn = await getTranslations('niveaux');
  const passation = await getTranslations('passation');
  const tp = await getTranslations('pilotage');
  // La page de l'organisation est réservée au responsable et à l'administrateur
  // Tenga : le consultant, lui, retourne à son compte.
  const versOrganisation = canManageCampaigns({
    isTengaAdmin: page.isAdmin,
    roleInOrganization: page.role
  });

  return (
    <div className='flex flex-col gap-12'>
      <EntetePilotage
        retour={
          versOrganisation
            ? { href: `/o/${slug}`, libelle: t('retour') }
            : { href: '/mon-compte', libelle: passation('backToAccount') }
        }
        surtitre={<bdi>{page.org.nom}</bdi>}
        titre={t('title')}
        chapo={<p>{t('intro')}</p>}
        reperes={[
          {
            terme: tp('repere.campagne'),
            valeur: <bdi>{isolerEnArabe(synthese.campagne.titre, locale)}</bdi>
          }
        ]}
      />

      {synthese.etat === 'non_close' ? (
        <p className='carte text-texte-2'>{t('nonClose')}</p>
      ) : (
        <>
          <GroupSynthesis
            groupes={synthese.groupes}
            locale={locale}
            labels={libellesSynthese(t, tn)}
          />
          <p className='text-legende text-texte-3'>
            {tn('versionMoteur', { version: VERSION_MOTEUR })}
          </p>
        </>
      )}
    </div>
  );
}
