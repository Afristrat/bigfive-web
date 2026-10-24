import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  peutLireResultats
} from '@/lib/consultant-data';
import { formatNombre, isolerEnArabe } from '@/lib/format';
import { loadReseauCampagne } from '@/lib/reseau-data';
import { requireViewer } from '@/lib/session';
import { parseCampaignId } from '@/lib/synthese-data';

interface Props {
  params: Promise<{ locale: string; slug: string; campagne: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reseau' });
  return {
    title: t('consultant.titre'),
    robots: { index: false, follow: false }
  };
}

const CHIFFRES = [
  'effectif',
  'informes',
  'oppositions',
  'repondants',
  'accordsCarte'
] as const;

// Relevé du réseau d'une campagne, pour le consultant de l'organisation et
// l'administrateur Tenga : des nombres par groupe, jamais un nom ni une carte.
// « Oppositions » est le nombre rendu par la base pour chaque groupe (le
// consultant ne reçoit ni la ligne ni le nom des personnes opposées) ;
// « Informés » compte les personnes informées et non opposées. La lecture
// passe par app.reseau_lire, qui refuse le responsable et inscrit chaque
// lecture au journal ; les réponses ne sortent que par l'export
// (app.reseau_exporter, journalisée à part).
// 404 uniforme : identifiant hors format, rôle sans droit, campagne d'une autre
// organisation, refus de la base.
export default async function ReseauConsultantPage({ params }: Props) {
  const { locale, slug: rawSlug, campagne: rawCampagne } = await params;
  setRequestLocale(locale);
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  if (!slug || !campaignId) notFound();
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/reseau`
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
  const lecture = await loadReseauCampagne(viewer, campaignId);
  if (!lecture) notFound();

  const t = await getTranslations('reseau');
  const tp = await getTranslations('pilotage');
  // L'export est une route serveur ; l'anglais (langue par défaut) est servi sans préfixe.
  const prefixe = locale === 'en' ? '' : `/${locale}`;
  const exportHref = `${prefixe}/o/${slug}/campagnes/${campaignId}/reseau/export`;

  return (
    <div className='flex flex-col gap-12'>
      <EntetePilotage
        retour={{
          href: `/o/${slug}/campagnes/${campaignId}/resultats`,
          libelle: t('consultant.retour')
        }}
        surtitre={<bdi>{page.org.nom}</bdi>}
        titre={t('consultant.titre')}
        chapo={<p>{t('consultant.intro')}</p>}
        reperes={[
          {
            terme: tp('repere.campagne'),
            valeur: <bdi>{isolerEnArabe(campagne.titre, locale)}</bdi>
          },
          {
            terme: t('consultant.statut'),
            valeur: t(`consultant.statuts.${lecture.statut}`)
          }
        ]}
      />

      {lecture.groupes.length === 0 ? (
        <p className='carte text-texte-2'>{t('consultant.aucunGroupe')}</p>
      ) : (
        <ul role='list' className='flex flex-col gap-4'>
          {lecture.groupes.map((groupe, index) => (
            <li
              key={groupe.groupeId}
              data-reveal='monte'
              style={{ ['--i' as string]: Math.min(index, 5) }}
              className='rounded-panneau border border-trait bg-surface p-5 sm:p-6'
            >
              <h2 className='text-titre-3 text-encre [overflow-wrap:anywhere]'>
                <bdi>{groupe.nom}</bdi>
              </h2>
              <dl className='mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5'>
                {CHIFFRES.map((cle) => (
                  <div key={cle} className='flex flex-col-reverse gap-1'>
                    <dt className='text-petit text-texte-2'>
                      {t(`consultant.${cle}`)}
                    </dt>
                    <dd className='chiffres font-display text-titre-2 leading-none text-encre'>
                      {formatNombre(groupe[cle], locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <div className='flex flex-col gap-3 border-t border-trait pt-6'>
        <p>
          <a
            href={exportHref}
            download
            className='appui inline-flex min-h-11 items-center gap-2 rounded-controle border border-trait-fort bg-surface px-4 text-petit font-medium text-encre hover:bg-creux'
          >
            <svg
              aria-hidden='true'
              focusable='false'
              viewBox='0 0 16 16'
              width={14}
              height={14}
              fill='none'
              stroke='currentColor'
              strokeWidth={1.75}
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10' />
            </svg>
            {t('consultant.exporter')}
          </a>
        </p>
        <p className='colonne-lecture text-petit text-texte-2'>
          {t('consultant.exportAide')}
        </p>
      </div>
    </div>
  );
}
