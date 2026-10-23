import { getTranslations, setRequestLocale } from 'next-intl/server';
import { BinomeConsent } from '@/components/rapports/binome-consent';
import { libellesConsent } from '@/components/rapports/rapport-binome';
import { title } from '@/components/primitives';
import { loadMesBinomes, type MonBinome } from '@/lib/binome-data';
import { formatDateMaroc, isolerEnArabe } from '@/lib/format';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'binome' });
  return { title: t('liste.titre'), robots: { index: false, follow: false } };
}

// Ce que la personne lit de l'état d'une proposition : son propre accord
// seulement, jamais celui de l'autre personne.
const etat = (b: MonBinome): 'decision' | 'attente' | 'actif' | 'retire' =>
  b.statut === 'retire'
    ? 'retire'
    : b.statut === 'actif'
      ? 'actif'
      : b.monAccordLe === null
        ? 'decision'
        : 'attente';

// Les propositions de binôme qui concernent la personne connectée. Le rapport
// n'est proposé à la lecture que lorsque les deux accords sont donnés ; la base
// refuse de toute façon toute autre lecture.
export default async function BinomesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/mes-resultats/binomes');
  const binomes = await loadMesBinomes(viewer);
  const t = await getTranslations('binome');
  const consent = libellesConsent(t);

  return (
    <div>
      <p>
        <Link href='/mes-resultats' className='font-semibold text-accent'>
          {t('liste.retour')}
        </Link>
      </p>
      <h1 className={`mt-4 ${title()}`}>{t('liste.titre')}</h1>
      <p className='mt-4 colonne-lecture text-texte-2'>{t('liste.intro')}</p>
      {binomes.length === 0 ? (
        <p className='mt-8 text-texte-2'>{t('liste.vide')}</p>
      ) : (
        <ul className='mt-8 divide-y divide-trait carte'>
          {binomes.map((b) => {
            const statut = etat(b);
            const date = formatDateMaroc(b.proposeLe, locale);
            return (
              <li
                key={b.binomeId}
                data-statut={statut}
                className='flex flex-col gap-3 py-4 first:pt-0 last:pb-0'
              >
                <div>
                  <p className='font-semibold text-encre'>
                    {t('liste.organisation', {
                      nom: isolerEnArabe(b.organisationNom, locale)
                    })}
                  </p>
                  {statut !== 'retire' && (
                    <p className='text-texte-2'>
                      {t('liste.avec', {
                        nom: b.autreNom
                          ? isolerEnArabe(b.autreNom, locale)
                          : t('liste.autreInconnu')
                      })}
                    </p>
                  )}
                  <p className='text-petit text-texte-2'>
                    {t('liste.propose', { date })}
                  </p>
                  <p className='text-petit font-semibold text-encre'>
                    {t(`liste.statut.${statut}`)}
                  </p>
                </div>
                {statut === 'actif' && (
                  <p>
                    <Link
                      href={`/mes-resultats/binomes/${b.binomeId}`}
                      aria-label={t('liste.lireAria', { date })}
                      className='font-semibold text-accent underline'
                    >
                      {t('liste.lire')}
                    </Link>
                  </p>
                )}
                <BinomeConsent
                  binomeId={b.binomeId}
                  statut={b.statut}
                  aDonneAccord={b.monAccordLe !== null}
                  labels={consent}
                  avecExplication
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
