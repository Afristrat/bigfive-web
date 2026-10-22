import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';
import { getTestResult, type Report } from '@/actions';
import { B5Error } from '@/types';
import { getTranslations } from 'next-intl/server';
import { boutonPrincipal, title } from '@/components/primitives';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { basePath } from '@/config/site';
import { formatDate } from '@/lib/format';
import { Link } from '@/navigation';
import { CopyId } from './copy-id';
import { PrintButton } from './print-button';

type ResultPageParams = {
  params: Promise<{ id: string; locale: string }>;
};

const servedLocales = ['fr', 'ar', 'en'];

export async function generateMetadata({ params }: ResultPageParams) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'results' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('seo.title'),
    description: t('seo.description'),
    alternates: {
      canonical: basePath + localePath + `/result/${id}`,
      languages: servedLocales.reduce(
        (a, v) => ({ ...a, [v]: `${basePath}/${v}/result/${id}` }),
        {}
      )
    }
  };
}

// Page publique (défaut conservé : identifiant MongoDB, sans connexion). Le rendu
// est celui de « Mes résultats » : cinq niveaux du moteur, libellés et textes de
// la bibliothèque, aucun texte du paquet de résultats d’origine.
export default async function ResultPage({
  params
}: ResultPageParams): Promise<ReactElement> {
  const { id, locale } = await params;

  let report: Report;
  try {
    report = await getTestResult(id.substring(0, 24));
  } catch (error) {
    if (error instanceof B5Error && error.name === 'NotFoundError') notFound();
    throw error;
  }

  const t = await getTranslations({ locale, namespace: 'results' });
  const mes = await getTranslations({ locale, namespace: 'mesResultats' });
  const niveaux = await getTranslations({ locale, namespace: 'niveaux' });

  return (
    <>
      <header>
        <h1 className={title({ size: 'display' })}>{t('title')}</h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          {t('intro')}
        </p>
        <p className='mt-3 colonne-lecture text-petit text-texte-2'>
          {t('interpretationNote')}
        </p>
      </header>

      <div className='mt-8'>
        <ResultView
          profil={report.profil}
          locale={locale}
          audience='personne'
          libelles={libellesResultView(mes, niveaux)}
          date={formatDate(report.timestamp, locale)}
        />
      </div>

      <CopyId
        id={report.id}
        title={t('idLabel')}
        hint={t('idHint')}
        copyLabel={t('copyId')}
        copiedLabel={t('copied')}
      />

      <div className='mt-6 flex flex-wrap gap-3 print:hidden'>
        <PrintButton label={t('print')} />
        <Link
          href='/'
          className={boutonPrincipal({
            className:
              'border-trait-fort bg-surface text-encre shadow-none hover:bg-creux'
          })}
        >
          {t('backHome')}
        </Link>
      </div>
    </>
  );
}
