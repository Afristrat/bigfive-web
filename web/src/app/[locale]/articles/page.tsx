import { compareDesc } from 'date-fns';
import { notFound as introuvable } from 'next/navigation';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { MotsCinetiques } from '@/components/home-sections';
import { PostListItem } from '@/components/post-list-item';
import { Link } from '@/navigation';
import { getTranslationLocale } from '@/lib/helpers';
import { ARTICLES_PUBLICS } from '@/config/site';

interface ArticlesProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ArticlesProps) {
  // Rubrique occultée : 404 dans toutes les langues, avant toute lecture.
  if (!ARTICLES_PUBLICS) introuvable();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'toolbar' });
  return { title: t('articles') };
}

export default async function ArticlesPage({ params }: ArticlesProps) {
  if (!ARTICLES_PUBLICS) introuvable();
  const { locale } = await params;
  setRequestLocale(locale);
  const toolbar = await getTranslations('toolbar');
  const articles = await getTranslations('articles');
  const notFound = await getTranslations('notFound');

  // Repli sur l'anglais conservé : la liste n'est vide que si l'anglais l'est aussi.
  const translationLocale = getTranslationLocale(locale);
  const posts = allPosts
    .filter((post) => post.locale === translationLocale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));

  // Le plus récent ouvre la liste en grand ; les suivants montent au défilement,
  // décalés par groupes de trois pour que ceux qui entrent ensemble se suivent.
  // Hors de leur langue, les articles sont annoncés comme rédigés en anglais.
  return (
    <div>
      <header className='grid gap-x-8 gap-y-6 pb-12 lg:grid-cols-12 lg:items-end'>
        <h1 className={`${title({ size: 'display' })} lg:col-span-7`}>
          <MotsCinetiques texte={toolbar('articles')} />
        </h1>
        <div
          style={{ ['--i' as string]: 1 }}
          className='apparait-tard lg:col-span-5'
        >
          <p className='text-chapo text-texte-2'>{articles('lead')}</p>
          {posts.length > 0 && translationLocale !== locale && (
            <p className='mt-2 text-petit text-texte-3'>
              {articles('inEnglish')}
            </p>
          )}
        </div>
      </header>
      {posts.length > 0 ? (
        <ul className='divide-y divide-trait border-t-2 border-encre'>
          {posts.map((post, index) => (
            <PostListItem
              key={post._id}
              post={post}
              locale={locale}
              vedette={index === 0}
              rang={index % 3}
            />
          ))}
        </ul>
      ) : (
        <div
          style={{ ['--i' as string]: 2 }}
          className='apparait-tard mt-8 colonne-lecture'
        >
          <p className='text-texte-2'>{articles('empty')}</p>
          <Link
            href='/'
            className='mt-4 inline-flex min-h-11 items-center text-petit font-medium text-accent hover:text-accent-survol hover:underline'
          >
            {notFound('home')}
          </Link>
        </div>
      )}
    </div>
  );
}
