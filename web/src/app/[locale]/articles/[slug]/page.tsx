import { allPosts } from 'contentlayer/generated';
import { getTranslations } from 'next-intl/server';
import { Image } from '@nextui-org/image';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ChevronRightLinearIcon } from '@/components/icons';
import { title } from '@/components/primitives';
import { MotsCinetiques } from '@/components/home-sections';
import styles from '@/components/editorial.module.css';
import { PostListItem } from '@/components/post-list-item';
import { ShareArticle } from '@/components/share-article';
import { Link } from '@/navigation';
import { calculateReadingTime, getTranslationLocale } from '@/lib/helpers';
import { formatDate, formatNombre } from '@/lib/format';
import { basePath } from '@/config/site';

interface PostLayoutProps {
  params: Promise<{
    slug: string;
    locale: string;
  }>;
}

export const generateStaticParams = async () =>
  allPosts.map((post) => ({ slug: post.slug }));

export const generateMetadata = async ({
  params
}: PostLayoutProps): Promise<Metadata> => {
  const { slug, locale } = await params;
  const translationLocale = getTranslationLocale(locale);
  const localizedPosts = allPosts.filter(
    (post) => post.locale === translationLocale
  );

  const post = localizedPosts.find((post) => post.slug === slug);
  if (!post) notFound();
  return {
    title: post.title,
    description: post.description,
    authors: [{ name: post.author.name, url: post.author.link }],
    keywords: post.tags,
    openGraph: {
      type: 'website',
      url: post.url,
      title: post.title,
      description: post.description,
      images: {
        url: `${basePath}${post.image}`,
        alt: post.title
      }
    },
    twitter: {
      title: post.title,
      card: 'summary_large_image',
      description: post.description,
      site: basePath,
      creator: post.author.link,
      images: {
        url: `${basePath}${post.image}`,
        alt: post.title
      }
    }
  };
};

const PostLayout = async ({ params }: PostLayoutProps) => {
  const { slug, locale } = await params;
  const translationLocale = getTranslationLocale(locale);
  const localizedPosts = allPosts.filter(
    (post) => post.locale === translationLocale
  );

  const currentPost = localizedPosts.find((post) => post.slug === slug);
  if (!currentPost) notFound();

  const t = await getTranslations('articles');
  const currentTags = new Set(currentPost.tags.split(', '));
  const relevantPosts = localizedPosts
    .filter((post) => post._id !== currentPost._id)
    .map((post) => ({
      post,
      relevance: post.tags
        .split(', ')
        .reduce((acc, tag) => acc + (currentTags.has(tag) ? 1 : 0), 0)
    }))
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 3)
    .map(({ post }) => post);

  // Contenu affiché hors de sa langue (repli sur l'anglais) : balisé dans sa
  // langue et son sens de lecture ; l'interface autour reste dans la langue de
  // la page.
  const langue = currentPost.locale === locale ? undefined : currentPost.locale;
  const sens = langue ? 'auto' : undefined;

  // Mise en page de lecture : une seule colonne à la mesure du texte. Le titre
  // monte mot à mot, la description de l'article sert de chapeau, l'image se
  // dévoile en rideau, le corps monte bloc à bloc au défilement.
  return (
    <article className='mx-auto max-w-3xl'>
      {/* Le chevron « suivant » retourné de 180 degrés pointe vers l'arrière ;
          son retournement RTL par défaut le fait pointer à droite en arabe. */}
      <Link
        href='/articles'
        className='inline-flex min-h-11 items-center gap-1 text-petit text-texte-2 hover:text-encre'
      >
        <ChevronRightLinearIcon className='rotate-180' size={16} />
        {t('back')}
      </Link>
      <header className='mt-6'>
        <h1
          lang={langue}
          dir={sens}
          className={title({ class: 'text-balance' })}
        >
          <MotsCinetiques texte={currentPost.title} />
        </h1>
        <p
          lang={langue}
          dir={sens}
          style={{ ['--i' as string]: 0 }}
          className='apparait-tard mt-6 text-chapo text-texte-2'
        >
          {currentPost.description}
        </p>
        <div
          style={{ ['--i' as string]: 1 }}
          className='apparait-tard mt-8 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-y border-trait py-2'
        >
          <p className='flex flex-wrap gap-x-4 text-petit text-texte-3'>
            <span className='font-medium text-encre'>
              {currentPost.author.name}
            </span>
            <time dateTime={currentPost.date}>
              {formatDate(currentPost.date, locale)}
            </time>
            <span>
              {t('readingTime', {
                minutes: formatNombre(
                  calculateReadingTime(currentPost.body.raw),
                  locale
                )
              })}
            </span>
          </p>
          <ShareArticle
            slug={slug}
            label={(reseau) => t('share', { reseau })}
          />
        </div>
      </header>
      {currentPost.image && (
        <Image
          src={currentPost.image}
          alt=''
          height={600}
          width={1200}
          removeWrapper
          className={`${styles.image} mt-10 aspect-video w-full rounded-panneau object-cover`}
        />
      )}
      <div
        lang={langue}
        dir={sens}
        className={`${styles.corps} texte-riche mx-auto mt-12 colonne-lecture`}
        dangerouslySetInnerHTML={{ __html: currentPost.body.html }}
      />
      <section
        aria-labelledby='themes'
        data-reveal='monte'
        className='mx-auto mt-12 colonne-lecture border-t border-trait pt-6'
      >
        <h2 id='themes' className='text-petit font-medium text-texte-3'>
          {t('tags')}
        </h2>
        <ul
          role='list'
          lang={langue}
          dir={sens}
          className='mt-3 flex flex-wrap gap-x-5 gap-y-2 text-petit text-texte-2'
        >
          {currentPost.tags.split(', ').map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      </section>
      {relevantPosts.length > 0 && (
        <section aria-labelledby='a-lire' className='mt-20'>
          <h2 id='a-lire' className='text-titre-2 text-encre'>
            {t('related')}
          </h2>
          <ul className='mt-4 divide-y divide-trait border-t-2 border-encre'>
            {relevantPosts.map((post, index) => (
              <PostListItem
                key={post._id}
                post={post}
                locale={locale}
                rang={index}
              />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
};

export default PostLayout;
