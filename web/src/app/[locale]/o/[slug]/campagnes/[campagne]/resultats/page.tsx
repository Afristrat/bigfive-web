import type { CSSProperties } from 'react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { canManageCampaigns } from '@/lib/access-rules';
import { loadOrgPage, parseOrgSlug } from '@/lib/campaign-data';
import {
  loadCampagneOrganisation,
  loadResultatsCampagne,
  peutLireResultats
} from '@/lib/consultant-data';
import { formatDateMaroc, formatNombre, isolerEnArabe } from '@/lib/format';
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

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

// Liste des résultats d'une campagne pour le consultant et l'administrateur
// Tenga. Aucune identité : une fiche par résultat remis, désignée par son rang
// et sa date, qui mène à la lecture par l'identifiant opaque de la
// participation. La liste vient de app.lister_resultats_campagne, qui
// journalise la consultation.
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
  const tb = await getTranslations('binome');
  const tp = await getTranslations('pilotage');
  // La page de l'organisation est réservée au responsable et à l'administrateur
  // Tenga : le consultant, lui, retourne à son compte.
  const versOrganisation = canManageCampaigns({
    isTengaAdmin: page.isAdmin,
    roleInOrganization: page.role
  });
  const titreCampagne = isolerEnArabe(campagne.titre, locale);

  return (
    <div className='flex flex-col gap-12'>
      <EntetePilotage
        retour={
          versOrganisation
            ? { href: `/o/${slug}`, libelle: t('liste.retour') }
            : { href: '/mon-compte', libelle: passation('backToAccount') }
        }
        surtitre={<bdi>{page.org.nom}</bdi>}
        titre={t('liste.titre')}
        chapo={<p>{t('liste.intro')}</p>}
        reperes={[
          { terme: tp('repere.campagne'), valeur: <bdi>{titreCampagne}</bdi> },
          {
            terme: tp('repere.remis'),
            valeur: (
              <span className='chiffres font-display text-titre-1'>
                {formatNombre(liste.length, locale)}
              </span>
            )
          }
        ]}
      />

      {liste.length === 0 ? (
        <p className='carte text-texte-2'>{t('liste.aucun')}</p>
      ) : (
        <>
          <ol
            role='list'
            aria-label={t('liste.titre')}
            className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'
          >
            {liste.map((ligne, position) => {
              const numero = formatNombre(position + 1, locale);
              return (
                <li
                  key={ligne.participationId}
                  data-reveal='monte'
                  style={rang(Math.min(position, 5))}
                >
                  <Link
                    href={`/o/${slug}/campagnes/${campaignId}/resultats/${ligne.participationId}`}
                    aria-label={t('liste.lireAria', {
                      numero,
                      titre: titreCampagne
                    })}
                    className='lien-fleche group flex h-full flex-col rounded-panneau border border-trait bg-surface p-5 transition-colors duration-courte ease-tenga hover:border-trait-fort'
                  >
                    <span
                      aria-hidden='true'
                      className='chiffres font-display text-titre-1 leading-none text-texte-3 transition-colors duration-courte ease-tenga group-hover:text-safran'
                    >
                      {numero.padStart(2, '0')}
                    </span>
                    <span className='mt-6 text-titre-3 text-encre'>
                      {t('liste.resultat', { numero })}
                    </span>
                    <span className='mt-1 text-petit text-texte-2'>
                      {t('liste.colDate')}{' '}
                      <span className='chiffres'>
                        {formatDateMaroc(ligne.soumisLe, locale)}
                      </span>
                    </span>
                    <span className='mt-5 inline-flex items-center gap-2 font-medium text-accent'>
                      {t('liste.lire')}
                      <ArrowRightIcon size={16} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {liste.length >= 2 && (
            <p className='border-t border-trait pt-6'>
              <Link
                href={`/o/${slug}/campagnes/${campaignId}/binomes`}
                className='lien-fleche group inline-flex min-h-11 items-center gap-2 font-medium text-encre underline decoration-trait-fort underline-offset-4 hover:decoration-accent'
              >
                {tb('proposition.titre')}
                <ArrowRightIcon size={16} />
              </Link>
            </p>
          )}
        </>
      )}
    </div>
  );
}
