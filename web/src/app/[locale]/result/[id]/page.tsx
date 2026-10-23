import type { ReactElement } from 'react';
import { notFound } from 'next/navigation';
import { getTestResult, type Report } from '@/actions';
import { B5Error } from '@/types';
import { getTranslations } from 'next-intl/server';
import { boutonPrincipal } from '@/components/primitives';
import { ResultHeader } from '@/components/resultats/result-header';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { basePath } from '@/config/site';
import { formatDate, remplir } from '@/lib/format';
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
  const flow = await getTranslations({ locale, namespace: 'flow' });
  const libelles = libellesResultView(mes, niveaux, flow);

  return (
    <ResultView
      profil={report.profil}
      locale={locale}
      audience='personne'
      libelles={libelles}
      date={null}
      ancres={[{ id: 'identifiant', label: flow('railId') }]}
      entete={
        <ResultHeader
          titre={t('title')}
          date={remplir(libelles.passeLe, {
            date: formatDate(report.timestamp, locale)
          })}
          chapo={t('intro')}
          note={t('interpretationNote')}
        />
      }
    >
      <div id='identifiant' data-revele className='scroll-mt-32'>
        <CopyId
          id={report.id}
          title={t('idLabel')}
          hint={t('idHint')}
          copyLabel={t('copyId')}
          copiedLabel={t('copied')}
        />
      </div>

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
    </ResultView>
  );
}
