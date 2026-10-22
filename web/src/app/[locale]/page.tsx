import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { boutonPrincipal, heading, title } from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import { HomeClosing, HomeSections } from '@/components/home-sections';
import { PostListItem } from '@/components/post-list-item';
import { ScoreRule } from '@/components/score-rule';
import { secondaryButtonClass } from '@/components/form-styles';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { DomainCode, domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre } from '@/lib/format';
import { niveau } from '@/lib/moteur';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

// Spécimen de restitution : valeurs fictives fixées dans le code, affichées
// comme telles (légende « Exemple, valeurs fictives »).
const specimen: Record<DomainCode, number> = {
  N: 62,
  E: 88,
  O: 97,
  A: 79,
  C: 91
};

// Échelle d'un domaine : 24 affirmations notées de 1 à 5.
const DOMAINE_MIN = 24;
const DOMAINE_MAX = 120;
const DOMAINE_QUESTIONS = 24;

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
  const r = await getTranslations('results');
  const n = await getTranslations('niveaux');
  const toolbar = await getTranslations('toolbar');
  const surMax = r('outOf', { max: formatNombre(DOMAINE_MAX, locale) });

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <>
      {/* Ouverture : la promesse en début de ligne, le produit lui-même en fin de
          ligne (le spécimen de restitution), sans illustration. */}
      <section className='grid items-center gap-12 pb-16 lg:grid-cols-12 lg:gap-8 lg:pb-24'>
        <div className='lg:col-span-7'>
          <h1 className={`${title({ size: 'display' })} max-w-[14em]`}>
            {h('title')}
          </h1>
          <p className='mt-6 max-w-[34em] text-chapo text-texte-2'>
            {h('lead')}
          </p>
          <div className='mt-8 flex flex-wrap gap-3'>
            <Link href='/test' className={boutonPrincipal()}>
              {t('call_to_action')}
              <ArrowRightIcon size={18} />
            </Link>
            <Link href='/presentation' className={secondaryButtonClass}>
              {p('cta')}
            </Link>
          </div>
          <p className='mt-8 max-w-[38em] border-t border-trait pt-4 text-petit text-texte-3 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2'>
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
        <figure className='carte lg:col-span-5'>
          <ul role='list' className='grid gap-5'>
            {domainCodes.map((code, rang) => {
              const score = specimen[code];
              return (
                <li key={code}>
                  <ScoreRule
                    label={domainLabel(code, locale, 'short')}
                    score={score}
                    min={DOMAINE_MIN}
                    max={DOMAINE_MAX}
                    valeur={formatNombre(score, locale)}
                    surMax={surMax}
                    niveau={n(niveau(score / DOMAINE_QUESTIONS))}
                    disposition='pile'
                    anime
                    rang={rang}
                  />
                </li>
              );
            })}
          </ul>
          <figcaption className='mt-6 border-t border-trait pt-3 text-legende text-texte-3'>
            {h('specimenTag')}
          </figcaption>
        </figure>
      </section>

      <HomeSections locale={locale} />

      {posts.length > 0 && (
        <section className='border-t border-trait py-16'>
          <h2 className={heading()}>{toolbar('articles')}</h2>
          <ul className='mt-4 divide-y divide-trait'>
            {posts.map((post) => (
              <PostListItem key={post._id} post={post} locale={locale} />
            ))}
          </ul>
          <Link
            href='/articles'
            className='mt-4 inline-flex min-h-11 items-center text-petit font-medium text-accent underline-offset-4 hover:text-accent-survol hover:underline'
          >
            {t('posts.all')}
          </Link>
        </section>
      )}

      <HomeClosing locale={locale} />
    </>
  );
}
