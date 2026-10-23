import { getTranslations, setRequestLocale } from 'next-intl/server';
import clsx from 'clsx';
import { secondaryButtonClass } from '@/components/form-styles';
import { ArrowRightIcon } from '@/components/icons';
import { boutonPrincipal } from '@/components/primitives';
import { ResultHeader } from '@/components/resultats/result-header';
import { ResultMotion } from '@/components/resultats/result-motion';
import styles from '@/components/resultats/result-motion.module.css';
import { isolerEnArabe } from '@/lib/format';
import {
  loadMesParticipations,
  type MaParticipation
} from '@/lib/mes-resultats-data';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'mesResultats' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

// Une passation se commence ou se reprend tant qu'elle n'est pas terminée ET
// que la campagne est ouverte ; sinon on ne peut que la voir.
const peutPasser = (p: MaParticipation): boolean =>
  p.statut !== 'terminee' && p.campagneStatut === 'ouverte';

export default async function MesResultatsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/mes-resultats');
  const participations = await loadMesParticipations(viewer);
  const t = await getTranslations('mesResultats');
  const binome = await getTranslations('binome');

  return (
    <ResultMotion locale={locale}>
      <ResultHeader
        surtitre={t('surtitre')}
        titre={t('title')}
        chapo={t('intro')}
        actions={
          <Link
            href='/mes-resultats/binomes'
            className='lien-fleche inline-flex min-h-11 items-center gap-2 font-medium text-accent underline-offset-4 hover:text-accent-survol hover:underline'
          >
            {binome('liste.lien')}
            <ArrowRightIcon size={16} />
          </Link>
        }
      />
      {participations.length === 0 ? (
        <p className='mt-12 max-w-[40em] border-t-2 border-encre pt-8 text-chapo text-texte-2'>
          {t('empty')}
        </p>
      ) : (
        <ol data-revele className='mt-12 border-t-2 border-encre'>
          {participations.map((p, index) => {
            const passer = peutPasser(p);
            const href = passer
              ? `/mes-resultats/${p.participationId}/questionnaire`
              : `/mes-resultats/${p.participationId}`;
            const action = !passer
              ? 'view'
              : p.statut === 'ouverte'
                ? 'start'
                : 'resume';
            return (
              <li
                key={p.participationId}
                style={{ ['--i' as string]: index }}
                className={`grid gap-x-8 gap-y-4 border-b border-trait py-7 sm:grid-cols-[1fr_auto] sm:items-center ${styles.cascade}`}
              >
                <div className='min-w-0'>
                  <p className='text-petit font-medium text-texte-2'>
                    {isolerEnArabe(p.organisationNom, locale)}
                  </p>
                  <p className='mt-1 font-display text-titre-2 text-encre'>
                    {isolerEnArabe(p.campagneTitre, locale)}
                  </p>
                  <p className='mt-2 flex flex-wrap items-center gap-x-2 text-petit text-texte-2'>
                    <span
                      aria-hidden='true'
                      className={clsx(
                        'block size-2 rounded-full',
                        p.statut === 'terminee'
                          ? 'bg-encre'
                          : p.statut === 'en_cours'
                            ? 'bg-safran'
                            : 'border border-trait-fort'
                      )}
                    />
                    {t(`statut.${p.statut}`)}
                    {p.campagneStatut === 'close' && p.statut !== 'terminee'
                      ? ` · ${t('campagneClose')}`
                      : ''}
                  </p>
                </div>
                <Link
                  href={href}
                  className={passer ? boutonPrincipal() : secondaryButtonClass}
                >
                  {t(`action.${action}`)}
                  <span className='sr-only'>
                    {' '}
                    {isolerEnArabe(p.campagneTitre, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </ResultMotion>
  );
}
