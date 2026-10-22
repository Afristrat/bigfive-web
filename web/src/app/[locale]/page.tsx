import { CSSProperties } from 'react';
import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { boutonPrincipal, heading, title } from '@/components/primitives';
import { ArrowRightIcon } from '@/components/icons';
import {
  HomeClosing,
  HomeSections,
  MotsCinetiques
} from '@/components/home-sections';
import { HeroRadar } from '@/components/home/hero-radar';
import { ratioDeScore } from '@/components/home/pentagone';
import { PostListItem } from '@/components/post-list-item';
import { secondaryButtonClass } from '@/components/form-styles';
import { Link } from '@/navigation';
import { basePath } from '@/config/site';
import { DomainCode, domainCodes, domainLabel } from '@/lib/domain-labels';
import { formatNombre, localeRegionale } from '@/lib/format';
import '@/components/home/accueil.css';

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

// Repères de coupe de la planche : coin, position, filets visibles.
const coins = [
  'start-0 top-0 border-s border-t',
  'end-0 top-0 border-e border-t',
  'bottom-0 start-0 border-b border-s',
  'bottom-0 end-0 border-b border-e'
] as const;

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

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
  const regionale = localeRegionale(locale);
  const chiffres = [
    { valeur: 120, label: h('figures.items') },
    { valeur: 5, label: h('figures.factors') },
    { valeur: 30, label: h('figures.facets') },
    { valeur: 3, label: h('figures.languages') }
  ];

  // Articles seulement dans la langue exacte de la page (aucun en FR ni en AR).
  const posts = allPosts
    .filter((post) => post.locale === locale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)))
    .slice(0, 3);

  return (
    <>
      {/* Ouverture : l'intitulé, le titre qui monte mot à mot, puis, en fin de
          ligne, le radar vivant posé sur sa planche ; sur mobile, la planche
          s'intercale entre le titre et le chapeau. En pied, la fiche chiffrée
          de l'instrument, réglée par un filet d'encre. */}
      <section className='grid gap-x-10 pb-16 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-12 lg:content-center lg:pb-20'>
        <div className='lg:col-span-7 lg:row-start-1'>
          <p
            style={rang(0)}
            className='apparait-tard flex items-center gap-3 text-petit font-medium text-texte-2'
          >
            <span aria-hidden='true' className='block h-px w-10 bg-safran' />
            {h('eyebrow')}
          </p>
          <h1
            className={`${title({ size: 'display' })} mt-6 max-w-[11em] lg:mt-8`}
          >
            <MotsCinetiques texte={h('title')} />
          </h1>
        </div>

        <div className='relative mx-auto mt-10 w-[86%] max-w-[400px] p-4 sm:p-6 lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:m-0 lg:w-full lg:max-w-none lg:self-center'>
          {coins.map((coin, i) => (
            <span
              key={coin}
              aria-hidden='true'
              style={rang(i)}
              className={`planche-coin ${coin}`}
            />
          ))}
          <HeroRadar
            noms={domainCodes.map((code) => domainLabel(code, locale, 'short'))}
            profils={ratios}
            legende={h('specimenTag')}
          />
        </div>

        <div className='lg:col-span-7 lg:row-start-2 lg:self-start'>
          <p
            style={rang(1)}
            className='apparait-tard mt-8 max-w-[33em] text-chapo text-texte-2'
          >
            {h('lead')}
          </p>
          <div
            style={rang(2)}
            className='apparait-tard mt-9 flex flex-wrap gap-3'
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
        </div>

        <div className='relative mt-16 lg:col-span-12 lg:mt-20'>
          <span
            aria-hidden='true'
            className='fiche-filet absolute inset-x-0 top-0 block h-0.5 bg-encre'
          />
          <dl className='grid grid-cols-2 gap-x-6 gap-y-8 pt-8 md:grid-cols-4'>
            {chiffres.map((chiffre, i) => (
              <div
                key={chiffre.label}
                style={rang(i + 4)}
                className='apparait-tard flex flex-col-reverse gap-1'
              >
                <dt className='text-petit font-medium text-texte-2'>
                  {chiffre.label}
                </dt>
                <dd className='chiffres font-display text-[clamp(2.75rem,1.9rem+3.6vw,4.75rem)] font-semibold leading-none tracking-[-0.04em] text-encre'>
                  <span
                    data-compteur={chiffre.valeur}
                    data-ouverture={1000 + i * 90}
                    data-locale={regionale}
                    aria-hidden='true'
                  >
                    {formatNombre(chiffre.valeur, locale)}
                  </span>
                  <span className='sr-only'>
                    {formatNombre(chiffre.valeur, locale)}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
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

      <div className='mt-8'>
        <HomeClosing locale={locale} />
      </div>
    </>
  );
}
