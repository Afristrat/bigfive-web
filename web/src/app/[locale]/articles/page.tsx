import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { subtitle, title } from '@/components/primitives';
import { PostListItem } from '@/components/post-list-item';
import { Link } from '@/navigation';
import { getTranslationLocale } from '@/lib/helpers';

interface ArticlesProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ArticlesProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'toolbar' });
  return { title: t('articles') };
}

export default async function ArticlesPage({ params }: ArticlesProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const toolbar = await getTranslations('toolbar');
  const frontpage = await getTranslations('frontpage');
  const articles = await getTranslations('articles');
  const notFound = await getTranslations('notFound');

  // Repli sur l'anglais conservé : la liste n'est vide que si l'anglais l'est aussi.
  const translationLocale = getTranslationLocale(locale);
  const posts = allPosts
    .filter((post) => post.locale === translationLocale)
    .sort((a, b) => compareDesc(new Date(a.date), new Date(b.date)));

  return (
    <div>
      <h1 className={title()}>{toolbar('articles')}</h1>
      <p className={subtitle()}>{frontpage('posts.subtitle')}</p>
      {posts.length > 0 ? (
        <ul className='mt-8 divide-y divide-trait'>
          {posts.map((post) => (
            <PostListItem key={post._id} post={post} locale={locale} />
          ))}
        </ul>
      ) : (
        <div className='mt-8 colonne-lecture'>
          <p className='text-texte-2'>{articles('empty')}</p>
          <Link
            href='/'
            className='mt-4 inline-flex text-petit font-medium text-accent hover:text-accent-survol hover:underline'
          >
            {notFound('home')}
          </Link>
        </div>
      )}
    </div>
  );
}
