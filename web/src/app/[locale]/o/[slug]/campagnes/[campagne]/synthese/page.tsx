import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { canManageCampaigns } from '@/lib/access-rules';
import { GroupSynthesis } from '@/components/synthese/group-synthesis';
import { title } from '@/components/primitives';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import { isolerEnArabe } from '@/lib/format';
import { VERSION_MOTEUR } from '@/lib/moteur/seuils';
import { requireViewer } from '@/lib/session';
import {
  loadSynthese,
  parseCampaignId,
  peutLireSynthese
} from '@/lib/synthese-data';
import { Link } from '@/navigation';

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
  // La page de l'organisation est réservée au responsable et à l'administrateur
  // Tenga : le consultant, lui, retourne à son compte.
  const versOrganisation = canManageCampaigns({
    isTengaAdmin: page.isAdmin,
    roleInOrganization: page.role
  });

  return (
    <div className='flex flex-col gap-10'>
      <header>
        <h1 className={title()}>
          <bdi>{page.org.nom}</bdi>{' '}
          <span className='mt-2 block text-titre-2 text-encre'>
            {t('title')}
          </span>
        </h1>
        <p className='mt-2 text-chapo text-texte-2'>
          {t('campagne', {
            titre: isolerEnArabe(synthese.campagne.titre, locale)
          })}
        </p>
        <p className='mt-4 colonne-lecture text-texte-2'>{t('intro')}</p>
        <p className='mt-4'>
          {versOrganisation ? (
            <Link href={`/o/${slug}`} className='underline'>
              {t('retour')}
            </Link>
          ) : (
            <Link href='/mon-compte' className='underline'>
              {passation('backToAccount')}
            </Link>
          )}
        </p>
      </header>

      {synthese.etat === 'non_close' ? (
        <p className='text-texte-2'>{t('nonClose')}</p>
      ) : (
        <>
          <GroupSynthesis
            groupes={synthese.groupes}
            locale={locale}
            labels={{
              groupeCaption: t('groupeCaption'),
              complementCaption: t('complementCaption'),
              colDomaine: t('colDomaine'),
              colEffectif: t('colEffectif'),
              colMoyenne: t('colMoyenne'),
              colEcartType: t('colEcartType'),
              ecartTypeAbsent: t('ecartTypeAbsent'),
              colNiveau: t('colNiveau'),
              nonPublie: t('nonPublie'),
              complementNonPublie: t('complementNonPublie'),
              complementVide: t('complementVide'),
              sansMoyenne: t('sansMoyenne'),
              dispersion: t('dispersion'),
              niveauLecture: t('niveauLecture', { niveau: '{niveau}' }),
              niveaux: {
                bas: tn('bas'),
                plutot_bas: tn('plutot_bas'),
                milieu: tn('milieu'),
                plutot_haut: tn('plutot_haut'),
                haut: tn('haut')
              },
              aucunGroupe: t('aucunGroupe')
            }}
          />
          <p className='text-legende text-texte-2'>
            {tn('versionMoteur', { version: VERSION_MOTEUR })}
          </p>
        </>
      )}
    </div>
  );
}
