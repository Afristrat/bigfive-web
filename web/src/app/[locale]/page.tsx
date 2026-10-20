import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  boutonPrincipal,
  heading,
  subtitle,
  title
} from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import { PostListItem } from '@/components/post-list-item';
import { ScoreRule } from '@/components/score-rule';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { DomainCode, domainLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';
import { niveauDeScore } from '@/lib/niveau';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

// Valeurs d'exemple, affichées comme telles.
const specimen: { code: DomainCode; score: number }[] = [
  { code: 'N', score: 87 },
  { code: 'E', score: 64 },
  { code: 'O', score: 101 },
  { code: 'A', score: 58 },
  { code: 'C', score: 79 }
];

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
  const r = await getTranslations('results');
  const h = await getTranslations('home');
  const toolbar = await getTranslations('toolbar');

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  const surMax = r('outOf', { max: formatNombre(120, locale) });

  return (
    <>
      <section className='grid gap-12 pt-6 md:pt-12 lg:grid-cols-12 lg:items-center lg:gap-16'>
        <div className='lg:col-span-7'>
          <h1 className={title({ size: 'display' }) + ' [font-stretch:90%]'}>
            {t.rich('description.top', { violet: (chunks) => chunks })}
          </h1>
          <p className={subtitle()}>{t('description.info')}</p>
          <Link href='/test' className={boutonPrincipal({ class: 'mt-8' })}>
            {t('call_to_action')}
            <ArrowRightIcon />
          </Link>
        </div>
        <figure
          aria-describedby='specimen-legende'
          className='rounded-panneau border border-trait bg-surface p-6 md:p-8 lg:col-span-5'
        >
          <ul className='flex flex-col gap-5'>
            {specimen.map(({ code, score }, index) => (
              <li key={code}>
                <ScoreRule
                  label={domainLabel(code, locale, 'short')}
                  score={score}
                  min={24}
                  max={120}
                  valeur={formatNombre(score, locale)}
                  surMax={surMax}
                  niveau={r(`level.${niveauDeScore(score, 24)}`)}
                  anime
                  rang={index}
                />
              </li>
            ))}
          </ul>
          <figcaption
            id='specimen-legende'
            className='mt-6 text-legende text-texte-3'
          >
            {h('specimen')}
          </figcaption>
        </figure>
      </section>

      <section className='mt-24 border-t border-trait pt-12'>
        <p className='colonne-lecture text-petit text-texte-2 [&_a]:text-accent [&_a]:underline'>
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
      </section>

      {posts.length > 0 && (
        <section className='mt-24'>
          <h2 className={heading()}>{toolbar('articles')}</h2>
          <ul className='mt-4 divide-y divide-trait'>
            {posts.map((post) => (
              <PostListItem key={post._id} post={post} locale={locale} />
            ))}
          </ul>
          <Link
            href='/articles'
            className='mt-4 inline-flex text-petit font-medium text-accent hover:text-accent-survol hover:underline'
          >
            {t('posts.all')}
          </Link>
        </section>
      )}
    </>
  );
}
