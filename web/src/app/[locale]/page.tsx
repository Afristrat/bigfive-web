import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { boutonPrincipal, heading, title } from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import { DomainShape, domainNumber } from '@/components/domain-shape';
import { PostListItem } from '@/components/post-list-item';
import { RadarChart } from '@/components/radar-chart';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { DomainCode, domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

// Valeurs d'exemple (direction B2), affichées comme telles.
const specimen: Record<DomainCode, number> = {
  N: 62,
  E: 88,
  O: 97,
  A: 79,
  C: 91
};

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' },
  { code: 'en', name: 'English' }
];

const chip =
  'inline-flex items-center gap-2 rounded-full border border-trait bg-creux px-3.5 py-1.5 text-petit font-semibold text-encre';

const section = 'py-[clamp(2.25rem,5vw,4rem)]';

export async function generateMetadata({ params }: HomeProps) {
  const { locale } = await params;
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    alternates: {
      canonical: basePath + localePath,
      languages: servedLocales.reduce(
        (a, v) => ({ ...a, [v]: `${basePath}/${v}` }),
        {}
      )
    }
  };
}

export default async function Home({ params }: HomeProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('frontpage');
  const h = await getTranslations('home');
  const radar = await getTranslations('radar');
  const toolbar = await getTranslations('toolbar');

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  const faits = [
    { valeur: 120, libelle: h('stats.statements') },
    { valeur: 5, libelle: h('stats.domains') },
    { valeur: 30, libelle: h('stats.facets') },
    { valeur: 3, libelle: h('stats.languages') }
  ];

  return (
    <>
      <section className='fond-points relative pb-[clamp(2.5rem,6vw,4.5rem)]'>
        <div className='relative grid items-center gap-11 min-[960px]:grid-cols-[1.05fr_.95fr] min-[960px]:gap-16'>
          <div>
            <span className={`${chip} apparition`}>
              <i aria-hidden='true' className='size-2 rounded-full bg-accent' />
              {h('chip')}
            </span>
            <h1
              className={`${title({ size: 'display' })} apparition my-[22px]`}
              style={{ animationDelay: '0.05s' }}
            >
              {h('title')}
            </h1>
            <p
              className='apparition max-w-[34em] text-chapo text-texte-2'
              style={{ animationDelay: '0.1s' }}
            >
              {h('lead')}
            </p>
            <div
              className='apparition mt-[34px] flex flex-wrap gap-3'
              style={{ animationDelay: '0.15s' }}
            >
              <Link href='/test' className={boutonPrincipal()}>
                {t('call_to_action')}
                <ArrowRightIcon />
              </Link>
            </div>
            <p
              className='apparition mt-7 max-w-[34em] text-petit text-texte-2 [&_a]:font-bold [&_a]:text-accent [&_a]:underline'
              style={{ animationDelay: '0.2s' }}
            >
              {t.rich('description.reference', {
                ipip: (chunks) => (
                  <a
                    href='https://ipip.ori.org'
                    rel='noopener noreferrer'
                    target='_blank'
                  >
                    {chunks}
                  </a>
                )
              })}
            </p>
          </div>
          <div
            className='carte apparition relative p-[clamp(1rem,2.4vw,1.75rem)]'
            style={{ animationDelay: '0.12s' }}
          >
            <span className={`${chip} absolute start-[18px] top-[18px] z-10`}>
              {h('specimenTag')}
            </span>
            <RadarChart
              className='pt-10'
              domains={domainCodes.map((code) => ({
                code,
                label: domainLabel(code, locale, 'short'),
                value: specimen[code]
              }))}
              min={24}
              max={120}
              locale={locale}
              title={radar('title')}
              summary={radar('summary', {
                min: formatNombre(24, locale),
                max: formatNombre(120, locale)
              })}
              columnLabels={{
                domain: radar('domain'),
                score: radar('score')
              }}
            />
          </div>
        </div>
      </section>

      <section className={section}>
        <ul className='grid grid-cols-2 gap-3.5 min-[900px]:grid-cols-[1.25fr_1fr_1fr_1fr]'>
          {faits.map((fait, index) => (
            <li
              key={fait.libelle}
              className={`carte apparition p-[clamp(1.25rem,2.4vw,1.875rem)] ${
                index === 0 ? 'border-accent bg-accent text-sur-accent' : ''
              }`}
              style={{ animationDelay: `${0.1 + index * 0.06}s` }}
            >
              <b className='block text-[clamp(3.25rem,7vw,5.75rem)] font-extrabold leading-none tracking-[-0.045em]'>
                {formatNombre(fait.valeur, locale)}
              </b>
              <span
                className={`mt-2.5 block font-semibold ${
                  index === 0 ? 'opacity-90' : 'text-texte-2'
                }`}
              >
                {fait.libelle}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id='facteurs' className={section}>
        <h2 className={title({ size: 'section' })}>{h('factors.title')}</h2>
        <p className='mt-2.5 max-w-[40em] text-texte-2'>{h('factors.intro')}</p>
        <ul className='mt-8 grid gap-3.5 sm:grid-cols-2 min-[1000px]:grid-cols-5'>
          {domainCodes.map((code, index) => (
            <li
              key={code}
              className='carte carte-survol apparition flex flex-col gap-3 p-6'
              style={{ animationDelay: `${index * 0.06}s` }}
            >
              <div className='flex items-center justify-between'>
                <span
                  aria-hidden='true'
                  className='grid size-[46px] flex-none place-items-center rounded-[15px] bg-accent-doux text-accent'
                >
                  <DomainShape domain={code} />
                </span>
                <span className='text-petit font-extrabold tracking-[0.04em] text-texte-2'>
                  {domainNumber(code)}
                </span>
              </div>
              <h3 className='text-titre-3 text-encre'>
                {domainLabel(code, locale, 'short')}
              </h3>
              <p className='text-texte-2'>{h(`factors.${code}`)}</p>
              <p className='mt-auto pt-1.5 text-petit font-bold text-accent'>
                {h('factors.facets')}
              </p>
            </li>
          ))}
        </ul>
        <div className='mt-3.5 grid gap-3.5 min-[800px]:grid-cols-2'>
          <article className='carte'>
            <h3 className='text-titre-3 text-encre'>{h('languages.title')}</h3>
            <p className='mt-1.5 text-texte-2'>{h('languages.text')}</p>
            <ul className='mt-[18px] flex flex-wrap gap-2.5'>
              {languages.map((language) => (
                <li
                  key={language.code}
                  lang={language.code}
                  className='rounded-[14px] border-[1.5px] border-trait-fort bg-creux px-5 py-2.5 font-bold'
                >
                  {language.name}
                </li>
              ))}
            </ul>
          </article>
          <article className='carte'>
            <h3 className='text-titre-3 text-encre'>{h('reference.title')}</h3>
            <p className='mt-2.5 text-texte-2'>{h('reference.text')}</p>
            <p className='mt-2.5'>
              <a
                href='https://ipip.ori.org'
                rel='noopener noreferrer'
                target='_blank'
                className='font-bold text-accent underline underline-offset-2 hover:text-accent-survol'
              >
                <bdi dir='ltr'>ipip.ori.org</bdi>
              </a>
            </p>
          </article>
        </div>
      </section>

      {posts.length > 0 && (
        <section className={section}>
          <h2 className={heading()}>{toolbar('articles')}</h2>
          <ul className='mt-4 divide-y divide-trait'>
            {posts.map((post) => (
              <PostListItem key={post._id} post={post} locale={locale} />
            ))}
          </ul>
          <Link
            href='/articles'
            className='mt-4 inline-flex min-h-11 items-center text-petit font-bold text-accent hover:text-accent-survol hover:underline'
          >
            {t('posts.all')}
          </Link>
        </section>
      )}
    </>
  );
}
