import { getTranslations, setRequestLocale } from 'next-intl/server';
import { secondaryButtonClass } from '@/components/form-styles';
import { title } from '@/components/primitives';
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
    <div>
      <h1 className={title()}>{t('title')}</h1>
      <p className='mt-4 text-texte-2'>{t('intro')}</p>
      <p className='mt-4'>
        <Link
          href='/mes-resultats/binomes'
          className='font-semibold text-accent'
        >
          {binome('liste.lien')}
        </Link>
      </p>
      {participations.length === 0 ? (
        <p className='mt-8 text-texte-2'>{t('empty')}</p>
      ) : (
        <ul className='mt-8 divide-y divide-trait carte'>
          {participations.map((p) => {
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
                className='flex flex-wrap items-center justify-between gap-3 py-4'
              >
                <div>
                  <p className='font-semibold text-encre'>
                    {isolerEnArabe(p.campagneTitre, locale)}
                  </p>
                  <p className='text-petit text-texte-2'>
                    {isolerEnArabe(p.organisationNom, locale)}
                  </p>
                  <p className='text-petit text-texte-2'>
                    {t(`statut.${p.statut}`)}
                    {p.campagneStatut === 'close' && p.statut !== 'terminee'
                      ? ` · ${t('campagneClose')}`
                      : ''}
                  </p>
                </div>
                <Link href={href} className={secondaryButtonClass}>
                  {t(`action.${action}`)}
                  <span className='sr-only'>
                    {' '}
                    {isolerEnArabe(p.campagneTitre, locale)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
