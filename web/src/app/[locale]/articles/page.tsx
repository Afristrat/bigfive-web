import { compareDesc } from 'date-fns';
import { allPosts } from 'contentlayer/generated';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { subtitle, title } from '@/components/primitives';
import { MotsCinetiques } from '@/components/home-sections';
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

  // Le plus récent ouvre la liste en grand ; les suivants montent au défilement,
  // décalés par groupes de trois pour que ceux qui entrent ensemble se suivent.
  return (
    <div>
      <h1 className={title({ size: 'display' })}>
        <MotsCinetiques texte={toolbar('articles')} />
      </h1>
      <p
        style={{ ['--i' as string]: 1 }}
        className={subtitle({ class: 'apparait-tard' })}
      >
        {frontpage('posts.subtitle')}
      </p>
      {posts.length > 0 ? (
        <ul className='mt-10 divide-y divide-trait border-t-2 border-encre'>
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
