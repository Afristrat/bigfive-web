import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { boutonPrincipal, heading, title } from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import { HomeClosing, HomeSections } from '@/components/home-sections';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { HeroRadar } from '@/components/home/hero-radar';
import { ratioDeScore } from '@/components/home/pentagone';
import { PostListItem } from '@/components/post-list-item';
import { secondaryButtonClass } from '@/components/form-styles';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { DomainCode, domainCodes, domainLabel } from '@/lib/domain-labels';

interface HomeProps {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

// Profils d'exemple du héros : valeurs fictives fixées dans le code (24 à 120
// par domaine), affichées comme telles (légende « Exemple, valeurs fictives »).
const profils: ReadonlyArray<Record<DomainCode, number>> = [
  { O: 97, C: 91, E: 88, A: 79, N: 62 },
  { O: 64, C: 108, E: 52, A: 96, N: 41 },
  { O: 112, C: 58, E: 99, A: 61, N: 83 }
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
  const h = await getTranslations('home');
  const p = await getTranslations('presentation');
  const toolbar = await getTranslations('toolbar');
  const ratios = profils.map((profil) =>
    domainCodes.map((code) => ratioDeScore(profil[code]))
  );

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <>
      {/* Ouverture : le titre monte mot à mot en début de ligne ; en fin de
          ligne, le radar vivant des cinq facteurs, en trois plans. Sur mobile, le
          radar s'intercale entre le titre et le chapeau. */}
      <section className='grid items-center gap-x-8 pb-16 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-12 lg:pb-20'>
        <h1
          className={`${title({ size: 'display' })} max-w-[11em] lg:col-span-7 lg:row-start-1`}
        >
          <MotsCinetiques texte={h('title')} />
        </h1>
        <div className='mx-auto mt-8 w-[82%] max-w-[380px] lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:m-0 lg:w-full lg:max-w-none'>
          <HeroRadar
            noms={domainCodes.map((code) => domainLabel(code, locale, 'short'))}
            profils={ratios}
            legende={h('specimenTag')}
          />
        </div>
        <div className='lg:col-span-7 lg:row-start-2 lg:self-start'>
          <p
            style={{ ['--i' as string]: 1 }}
            className='apparait-tard mt-8 max-w-[34em] text-chapo text-texte-2 lg:mt-8'
          >
            {h('lead')}
          </p>
          <div
            style={{ ['--i' as string]: 2 }}
            className='apparait-tard mt-8 flex flex-wrap gap-3'
          >
            <Link href='/test' data-aimant='' className={boutonPrincipal()}>
              {t('call_to_action')}
              <ArrowRightIcon size={18} />
            </Link>
            <Link
              href='/presentation'
              data-aimant=''
              className={secondaryButtonClass}
            >
              {p('cta')}
            </Link>
          </div>
          <p
            style={{ ['--i' as string]: 3 }}
            className='apparait-tard mt-10 max-w-[38em] border-t border-trait pt-4 text-petit text-texte-3 [&_a]:font-medium [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2'
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
