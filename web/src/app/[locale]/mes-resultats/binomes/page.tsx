import clsx from 'clsx';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { boutonPrincipal } from '@/components/primitives';
import { BinomeConsent } from '@/components/rapports/binome-consent';
import { libellesConsent } from '@/components/rapports/rapport-binome';
import { LienRetour } from '@/components/resultats/lien-retour';
import { ResultHeader } from '@/components/resultats/result-header';
import { ResultMotion } from '@/components/resultats/result-motion';
import styles from '@/components/resultats/result-motion.module.css';
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
  const mes = await getTranslations('mesResultats');
  const consent = libellesConsent(t);

  return (
    <ResultMotion locale={locale}>
      <ResultHeader
        retour={
          <LienRetour href='/mes-resultats'>{t('liste.retour')}</LienRetour>
        }
        surtitre={mes('title')}
        titre={t('liste.titre')}
        chapo={t('liste.intro')}
      />
      {binomes.length === 0 ? (
        <p className='mt-12 max-w-[40em] border-t-2 border-encre pt-8 text-chapo text-texte-2'>
          {t('liste.vide')}
        </p>
      ) : (
        <ul data-revele className='mt-12 border-t-2 border-encre'>
          {binomes.map((b, index) => {
            const statut = etat(b);
            const date = formatDateMaroc(b.proposeLe, locale);
            return (
              <li
                key={b.binomeId}
                data-statut={statut}
                style={{ ['--i' as string]: index }}
                className={`flex flex-col gap-5 border-b border-trait py-7 ${styles.cascade}`}
              >
                <div>
                  <p className='text-petit font-medium text-texte-2'>
                    {t('liste.organisation', {
                      nom: isolerEnArabe(b.organisationNom, locale)
                    })}
                  </p>
                  {statut !== 'retire' && (
                    <p className='mt-1 font-display text-titre-2 text-encre'>
                      {t('liste.avec', {
                        nom: b.autreNom
                          ? isolerEnArabe(b.autreNom, locale)
                          : t('liste.autreInconnu')
                      })}
                    </p>
                  )}
                  <p className='mt-2 flex flex-wrap items-center gap-x-2 text-petit text-texte-2'>
                    <span
                      aria-hidden='true'
                      className={clsx(
                        'block size-2 rounded-full',
                        statut === 'actif'
                          ? 'bg-encre'
                          : statut === 'retire'
                            ? 'border border-trait-fort'
                            : 'bg-safran'
                      )}
                    />
                    <span className='font-medium text-encre'>
                      {t(`liste.statut.${statut}`)}
                    </span>
                    <span aria-hidden='true'>·</span>
                    {t('liste.propose', { date })}
                  </p>
                </div>
                {statut === 'actif' && (
                  <p>
                    <Link
                      href={`/mes-resultats/binomes/${b.binomeId}`}
                      aria-label={t('liste.lireAria', { date })}
                      data-aimant=''
                      className={boutonPrincipal()}
                    >
                      {t('liste.lire')}
                      <ArrowRightIcon size={18} />
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
    </ResultMotion>
  );
}
