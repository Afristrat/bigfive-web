import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { boutonPrincipal, heading, title } from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import { HomeClosing, HomeSections } from '@/components/home-sections';
import { PostListItem } from '@/components/post-list-item';
import { RadarChart } from '@/components/radar-chart';
import { secondaryButtonClass } from '@/components/form-styles';
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
  const p = await getTranslations('presentation');
  const radar = await getTranslations('radar');
  const toolbar = await getTranslations('toolbar');

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <>
      <section className='fond-points relative pb-[clamp(2.5rem,6vw,4.5rem)]'>
        <div className='relative grid items-center gap-11 min-[960px]:grid-cols-[1.05fr_.95fr] min-[960px]:gap-16'>
          <div>
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
              <Link href='/presentation' className={secondaryButtonClass}>
                {p('cta')}
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

      <HomeSections locale={locale} />

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

      <HomeClosing locale={locale} />
    </>
  );
}
