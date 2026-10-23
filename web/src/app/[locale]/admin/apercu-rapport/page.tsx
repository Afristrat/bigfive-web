import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { rapportApercuHtml } from '@/data/rapport-apercu-html';
import { requireAdmin } from '@/lib/session';

const formats = ['pdf', 'docx', 'md', 'html'] as const;

interface Props {
  params: Promise<{ locale: string }>;
}

// ponytail: rapport « cabinet » généré hors ligne par docs/design/rapport-cabinet (moteur, bibliothèque, audit), figé dans src/data et rédigé en français seulement, à remplacer par le moteur de rapports (lot 4 et 6) qui lira les vrais résultats, déclencheur : branchement du rapport sur app.results.
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pilotage' });
  return {
    title: t('rapportCabinet.titre'),
    robots: { index: false, follow: false }
  };
}

export default async function ApercuRapportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, '/admin/apercu-rapport');
  const tp = await getTranslations('pilotage');
  const t = (cle: string): string => tp(`rapportCabinet.${cle}`);
  // Préfixe de langue : l'anglais (langue par défaut) est servi sans préfixe.
  const prefixe = locale === 'en' ? '' : `/${locale}`;

  return (
    <div className='flex flex-col gap-10'>
      <EntetePilotage
        retour={{ href: '/admin', libelle: tp('retourAdmin') }}
        surtitre={tp('surtitreApercu')}
        titre={t('titre')}
        chapo={
          <>
            <p>{t('intro')}</p>
            {locale !== 'fr' && <p className='mt-3'>{t('langue')}</p>}
          </>
        }
      />
      <div className='flex flex-wrap items-center gap-x-4 gap-y-3'>
        <span className='text-petit font-medium text-texte-3'>
          {t('telecharger')}
        </span>
        <ul role='list' className='flex flex-wrap gap-2'>
          {formats.map((code) => (
            <li key={code}>
              <a
                href={`${prefixe}/admin/apercu-rapport/export/${code}`}
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
                {t(`formats.${code}`)}
              </a>
            </li>
          ))}
        </ul>
      </div>
      <iframe
        title={t('cadre')}
        srcDoc={rapportApercuHtml}
        sandbox='allow-scripts allow-modals'
        className='h-[85vh] w-full rounded-panneau border border-trait bg-fond'
      />
    </div>
  );
}
