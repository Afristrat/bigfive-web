import { CSSProperties, ReactElement, ReactNode } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PentagoneTrace } from '@/components/cadre/pentagone-trace';
import { Sommaire } from '@/components/cadre/sommaire';
import { DomainShape } from '@/components/domain-shape';
import { ArrowRightIcon } from '@/components/icons';
import { MotsCinetiques } from '@/components/mots-cinetiques';
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

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

const textLink =
  'lien-fleche inline-flex min-h-11 items-center gap-2 text-petit font-medium text-accent underline-offset-4 transition-colors duration-courte ease-tenga hover:text-accent-survol hover:underline';

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
// de lecture, puis ce que la source établit et ses limites. Les fiches montent
// à leur entrée dans l'écran, la seconde colonne un temps après la première.
function Reference({
  id,
  colonne,
  t
}: {
  id: string;
  colonne: number;
  t: Translate;
}): ReactElement {
  const reference = methodReferenceById(id);
  return (
    <li
      data-reveal='monte'
      style={rang(colonne)}
      className='flex flex-col gap-3 border-t border-trait py-6'
    >
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
      <h3 data-reveal='monte' className='text-titre-2 text-encre'>
        {t(`research.groups.${id}`)}
      </h3>
      <ul role='list' className='mt-4 grid gap-x-8 min-[900px]:grid-cols-2'>
        {(group?.refs ?? []).map((ref, index) => (
          <Reference key={ref} id={ref} colonne={index % 2} t={t} />
        ))}
      </ul>
    </div>
  );
}

// Section de la page : son numéro d'ordre en safran devant le titre ; un filet
// safran ouvre la bordure et le titre monte de son masque à l'entrée dans
// l'écran (moteur MotionRuntime). La marge d'ancrage tient compte de l'en-tête
// et du sommaire collants.
function Section({
  id,
  numero,
  titre,
  children
}: {
  id: string;
  numero: number;
  titre: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-titre`}
      className='relative mt-16 scroll-mt-20 border-t border-trait pt-10 lg:mt-20 lg:scroll-mt-32 lg:pt-12'
    >
      <span
        aria-hidden='true'
        data-reveal='volet'
        className='absolute -top-px start-0 block h-0.5 w-16 bg-safran'
      />
      <div className='flex items-baseline gap-4 sm:gap-6'>
        <span
          aria-hidden='true'
          className='chiffres flex-none font-display text-titre-section leading-none text-safran'
        >
          {String(numero).padStart(2, '0')}
        </span>
        <h2
          id={`${id}-titre`}
          data-reveal='masque'
          className={title({ size: 'section' })}
        >
          {titre}
        </h2>
      </div>
      {children}
    </section>
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
      {/* Ouverture : le titre monte mot à mot ; en fin de ligne, le pentagone
          des cinq domaines se trace, chaque forme au bout de son axe. */}
      <header className='grid items-center gap-x-12 lg:grid-cols-12'>
        <div className='lg:col-span-8'>
          <h1 className={title({ size: 'display' })}>
            <MotsCinetiques texte={t('title')} />
          </h1>
          <p style={rang(0)} className={subtitle({ class: 'apparait-tard' })}>
            {t('lead')}
          </p>
          <p
            style={rang(1)}
            className='apparait-tard mt-4 max-w-[48em] text-petit text-texte-3'
          >
            {t('verified')}
          </p>
        </div>
        <PentagoneTrace
          formes
          className='hidden max-w-[300px] justify-self-end lg:col-span-4 lg:block'
        />
      </header>

      <Sommaire label={t('toc')} items={toc} />

      <Section id='instrument' numero={1} titre={t('instrument.title')}>
        <p
          data-reveal='monte'
          className='mt-3 colonne-lecture text-chapo text-texte-2'
        >
          {t('instrument.intro')}
        </p>
        <p
          data-reveal='monte'
          style={rang(1)}
          className='mt-3 colonne-lecture text-texte-2'
        >
          {t('instrument.notNeo')}
        </p>
        <Group id='instrument' t={t} />
      </Section>

      <Section id='domaines' numero={2} titre={t('domains.title')}>
        <p data-reveal='monte' className='mt-3 colonne-lecture text-texte-2'>
          {t('domains.intro')}
        </p>
        <ul
          role='list'
          className='mt-8 grid gap-x-8 border-t border-trait min-[800px]:grid-cols-2'
        >
          {domainCodes.map((code, index) => (
            <li
              key={code}
              data-reveal='monte'
              style={rang(index % 2)}
              className='flex flex-col gap-3 border-b border-trait py-6'
            >
              <h3 className='flex items-center gap-3 text-titre-3 text-encre'>
                <DomainShape domain={code} size={18} className='text-accent' />
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
      </Section>

      <Section id='recherche' numero={3} titre={t('research.title')}>
        <p data-reveal='monte' className='mt-3 colonne-lecture text-texte-2'>
          {t('research.intro')}
        </p>
        {/* Son filet d'accent se trace de haut en bas à l'entrée dans l'écran. */}
        <aside
          data-reveal='trace'
          className='relative mt-6 colonne-lecture ps-5'
        >
          <span
            aria-hidden='true'
            className='filet-vertical absolute inset-y-0 start-0 block w-0.5 bg-accent'
          />
          <h3 className='text-titre-3 text-encre'>
            {t('research.reading.title')}
          </h3>
          <p className='mt-2 text-texte-2'>{t('research.reading.text')}</p>
        </aside>
        {researchGroups.map((id) => (
          <Group key={id} id={id} t={t} />
        ))}
      </Section>

      <Section id='lacunes' numero={4} titre={t('gaps.title')}>
        <p data-reveal='monte' className='mt-3 colonne-lecture text-texte-2'>
          {t('gaps.intro')}
        </p>
        <ul
          role='list'
          className='mt-6 grid gap-x-8 border-t border-trait min-[900px]:grid-cols-3'
        >
          {gaps.map((key, index) => (
            <li
              key={key}
              data-reveal='monte'
              style={rang(index)}
              className='border-b border-trait py-5 text-texte-2'
            >
              {t(`gaps.${key}`)}
            </li>
          ))}
        </ul>
        <p data-reveal='monte' className='mt-8'>
          <Link href='/presentation' className={textLink}>
            {p('cta')}
            <ArrowRightIcon size={18} />
          </Link>
        </p>
      </Section>
    </article>
  );
}
