import { ReactElement } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { subtitle, title } from '@/components/primitives';
import { basePath } from '@/config/site';
import { domainCodes, domainLabel, facetLabel } from '@/lib/domain-labels';
import {
  methodGroups,
  methodReferenceById,
  type MethodGroupId
} from '@/lib/method-references';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

// Traducteur de l'espace « method », passé aux fiches.
const methodTranslations = (locale: string) =>
  getTranslations({ locale, namespace: 'method' });
type Translate = Awaited<ReturnType<typeof methodTranslations>>;

const servedLocales = ['fr', 'ar', 'en'];

const section = 'mt-16 border-t border-trait pt-10 lg:mt-20 lg:pt-12';

const textLink =
  'inline-flex min-h-11 items-center gap-2 text-petit font-medium text-accent underline-offset-4 transition-colors duration-courte ease-tenga hover:text-accent-survol hover:underline';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'method' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('seo.title'),
    description: t('seo.description'),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${basePath}${localePath}/methode`,
      languages: servedLocales.reduce(
        (a, v) => ({ ...a, [v]: `${basePath}/${v}/methode` }),
        {}
      )
    }
  };
}

// Une fiche de référence : auteurs, année, revue, lien, niveau de preuve, mode
// de lecture, puis ce que la source établit et ses limites.
function Reference({ id, t }: { id: string; t: Translate }): ReactElement {
  const reference = methodReferenceById(id);
  return (
    <li className='flex flex-col gap-3 border-t border-trait py-6'>
      <h4 className='text-titre-3 text-encre'>
        <bdi dir='ltr'>
          {reference.authors}
          {reference.year !== null && ` (${reference.year})`}
        </bdi>
      </h4>
      <p className='text-petit text-texte-2'>
        <bdi dir='ltr'>
          <i>{reference.venue}</i>
        </bdi>
        {' · '}
        <a
          href={reference.url}
          rel='noopener noreferrer'
          target='_blank'
          className='font-medium text-accent underline underline-offset-2 hover:text-accent-survol'
        >
          <bdi dir='ltr'>{reference.linkLabel}</bdi>
        </a>
        {reference.year === null && ` · ${t('labels.consulted')}`}
      </p>
      <p className='flex flex-wrap items-center gap-2 text-petit'>
        <span className='font-medium text-encre'>{t('labels.evidence')}</span>
        <span className='text-texte-2'>{t(`refs.${id}.strength`)}</span>
      </p>
      <p>
        <span className='inline-flex rounded-petit border border-trait-fort px-2 py-0.5 text-legende font-medium text-encre'>
          {t(`labels.reading.${reference.reading}`)}
        </span>
      </p>
      <dl className='flex flex-col gap-3'>
        <div>
          <dt className='text-petit font-medium text-encre'>
            {t('labels.finding')}
          </dt>
          <dd className='mt-1 text-texte-2'>{t(`refs.${id}.finding`)}</dd>
        </div>
        <div>
          <dt className='text-petit font-medium text-encre'>
            {t('labels.limit')}
          </dt>
          <dd className='mt-1 text-texte-2'>{t(`refs.${id}.limit`)}</dd>
        </div>
      </dl>
    </li>
  );
}

function Group({ id, t }: { id: MethodGroupId; t: Translate }): ReactElement {
  const group = methodGroups.find((item) => item.id === id);
  return (
    <div className='mt-10'>
      <h3 className='text-titre-2 text-encre'>{t(`research.groups.${id}`)}</h3>
      <ul role='list' className='mt-4 grid gap-x-8 min-[900px]:grid-cols-2'>
        {(group?.refs ?? []).map((ref) => (
          <Reference key={ref} id={ref} t={t} />
        ))}
      </ul>
    </div>
  );
}

export default async function MethodPage({
  params
}: Props): Promise<ReactElement> {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await methodTranslations(locale);
  const h = await getTranslations({ locale, namespace: 'home' });
  const p = await getTranslations({ locale, namespace: 'presentation' });

  const researchGroups: MethodGroupId[] = [
    'culture',
    'work',
    'teams',
    'selection',
    'feedback',
    'morocco'
  ];
  const gaps = ['morocco', 'team', 'norms'] as const;
  const facetNumbers = [1, 2, 3, 4, 5, 6];

  const toc = [
    { id: 'instrument', label: t('instrument.title') },
    { id: 'domaines', label: t('domains.title') },
    { id: 'recherche', label: t('research.title') },
    { id: 'lacunes', label: t('gaps.title') }
  ];

  return (
    <article>
      <header>
        <h1 className={title()}>{t('title')}</h1>
        <p className={subtitle()}>{t('lead')}</p>
        <p className='mt-4 max-w-[48em] text-petit text-texte-3'>
          {t('verified')}
        </p>
        <nav aria-label={t('toc')} className='mt-6'>
          <ul role='list' className='flex flex-wrap gap-x-6 gap-y-1'>
            {toc.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={textLink}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <section
        id='instrument'
        aria-labelledby='instrument-titre'
        className={section}
      >
        <h2 id='instrument-titre' className={title({ size: 'section' })}>
          {t('instrument.title')}
        </h2>
        <p className='mt-3 colonne-lecture text-chapo text-texte-2'>
          {t('instrument.intro')}
        </p>
        <p className='mt-3 colonne-lecture text-texte-2'>
          {t('instrument.notNeo')}
        </p>
        <Group id='instrument' t={t} />
      </section>

      <section
        id='domaines'
        aria-labelledby='domaines-titre'
        className={section}
      >
        <h2 id='domaines-titre' className={title({ size: 'section' })}>
          {t('domains.title')}
        </h2>
        <p className='mt-3 colonne-lecture text-texte-2'>
          {t('domains.intro')}
        </p>
        <ul
          role='list'
          className='mt-8 grid gap-x-8 border-t border-trait min-[800px]:grid-cols-2'
        >
          {domainCodes.map((code) => (
            <li
              key={code}
              className='flex flex-col gap-3 border-b border-trait py-6'
            >
              <h3 className='text-titre-3 text-encre'>
                {domainLabel(code, locale, 'long')}
              </h3>
              <p className='text-texte-2'>{h(`factors.${code}`)}</p>
              <h4 className='text-petit font-medium text-encre'>
                {t('domains.facets')}
              </h4>
              <ul
                role='list'
                className='grid grid-cols-1 gap-x-6 gap-y-1 text-texte-2 min-[480px]:grid-cols-2'
              >
                {facetNumbers.map((number) => (
                  <li key={number}>{facetLabel(code, number, locale)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section
        id='recherche'
        aria-labelledby='recherche-titre'
        className={section}
      >
        <h2 id='recherche-titre' className={title({ size: 'section' })}>
          {t('research.title')}
        </h2>
        <p className='mt-3 colonne-lecture text-texte-2'>
          {t('research.intro')}
        </p>
        <aside className='mt-6 colonne-lecture border-s-2 border-accent ps-5'>
          <h3 className='text-titre-3 text-encre'>
            {t('research.reading.title')}
          </h3>
          <p className='mt-2 text-texte-2'>{t('research.reading.text')}</p>
        </aside>
        {researchGroups.map((id) => (
          <Group key={id} id={id} t={t} />
        ))}
      </section>

      <section id='lacunes' aria-labelledby='lacunes-titre' className={section}>
        <h2 id='lacunes-titre' className={title({ size: 'section' })}>
          {t('gaps.title')}
        </h2>
        <p className='mt-3 colonne-lecture text-texte-2'>{t('gaps.intro')}</p>
        <ul
          role='list'
          className='mt-6 grid gap-x-8 border-t border-trait min-[900px]:grid-cols-3'
        >
          {gaps.map((key) => (
            <li key={key} className='border-b border-trait py-5 text-texte-2'>
              {t(`gaps.${key}`)}
            </li>
          ))}
        </ul>
        <p className='mt-8'>
          <Link href='/presentation' className={textLink}>
            {p('cta')}
            <ArrowRightIcon size={18} />
          </Link>
        </p>
      </section>
    </article>
  );
}
