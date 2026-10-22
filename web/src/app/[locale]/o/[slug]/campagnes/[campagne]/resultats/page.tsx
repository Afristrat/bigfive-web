import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { canManageCampaigns } from '@/lib/access-rules';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  loadResultatsCampagne,
  peutLireResultats
} from '@/lib/consultant-data';
import {
  formatDate,
  formatNombre,
  isolerEnArabe,
  formatDateMaroc
} from '@/lib/format';
import { requireViewer } from '@/lib/session';
import { parseCampaignId } from '@/lib/synthese-data';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; slug: string; campagne: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rapport' });
  return { title: t('liste.titre'), robots: { index: false, follow: false } };
}

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';

// Liste des résultats d'une campagne pour le consultant et l'administrateur
// Tenga. Aucune identité : une ligne par résultat remis, par l'identifiant
// opaque de la participation. La liste vient de app.lister_resultats_campagne,
// qui journalise la consultation.
export default async function ListeResultatsPage({ params }: Props) {
  const { locale, slug: rawSlug, campagne: rawCampagne } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, organisation ou campagne absente ou
  // invisible, rôle sans droit (responsable, participant), refus de la base.
  const slug = parseOrgSlug(rawSlug);
  const campaignId = parseCampaignId(rawCampagne);
  if (!slug || !campaignId) notFound();
  const viewer = await requireViewer(
    locale,
    `/o/${slug}/campagnes/${campaignId}/resultats`
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

  const t = await getTranslations('rapport');
  const passation = await getTranslations('passation');
  // La page de l'organisation est réservée au responsable et à l'administrateur
  // Tenga : le consultant, lui, retourne à son compte.
  const versOrganisation = canManageCampaigns({
    isTengaAdmin: page.isAdmin,
    roleInOrganization: page.role
  });

  return (
    <div className='flex flex-col gap-8'>
      <header>
        <h1 className={title()}>
          <bdi>{page.org.nom}</bdi>{' '}
          <span className='mt-2 block text-titre-2 text-encre'>
            {t('liste.titre')}
          </span>
        </h1>
        <p className='mt-2 text-chapo text-texte-2'>
          {t('liste.campagne', {
            titre: isolerEnArabe(campagne.titre, locale)
          })}
        </p>
        <p className='mt-4 colonne-lecture text-texte-2'>{t('liste.intro')}</p>
        <p className='mt-4'>
          {versOrganisation ? (
            <Link href={`/o/${slug}`} className='underline'>
              {t('liste.retour')}
            </Link>
          ) : (
            <Link href='/mon-compte' className='underline'>
              {passation('backToAccount')}
            </Link>
          )}
        </p>
      </header>

      {liste.length === 0 ? (
        <p className='text-texte-2'>{t('liste.aucun')}</p>
      ) : (
        <div className='carte overflow-x-auto !p-0'>
          <table className='w-full text-petit'>
            <thead className='border-b border-trait'>
              <tr>
                <th scope='col' className={th}>
                  {t('liste.colResultat')}
                </th>
                <th scope='col' className={th}>
                  {t('liste.colDate')}
                </th>
                <th scope='col' className={th}>
                  <span className='sr-only'>{t('liste.lire')}</span>
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-trait'>
              {liste.map((ligne, rang) => {
                const numero = formatNombre(rang + 1, locale);
                return (
                  <tr key={ligne.participationId}>
                    <th
                      scope='row'
                      className={`${td} text-start font-semibold`}
                    >
                      {t('liste.resultat', { numero })}
                    </th>
                    <td className={td}>
                      {formatDateMaroc(ligne.soumisLe, locale)}
                    </td>
                    <td className={td}>
                      <Link
                        href={`/o/${slug}/campagnes/${campaignId}/resultats/${ligne.participationId}`}
                        aria-label={t('liste.lireAria', {
                          numero,
                          titre: isolerEnArabe(campagne.titre, locale)
                        })}
                        className='underline'
                      >
                        {t('liste.lire')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
