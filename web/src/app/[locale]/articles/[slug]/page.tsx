import { allPosts } from 'contentlayer/generated';
import { getTranslations } from 'next-intl/server';
import { User } from '@nextui-org/user';
import { Chip, Divider } from '@nextui-org/react';
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

  return (
    <article className='mx-auto max-w-3xl'>
      {/* Le chevron « suivant » retourné de 180 degrés pointe vers l'arrière ;
          son retournement RTL par défaut le fait pointer à droite en arabe. */}
      <Link
        href='/articles'
        className='inline-flex items-center gap-1 text-petit text-texte-2 hover:text-encre'
      >
        <ChevronRightLinearIcon className='rotate-180' size={16} />
        {t('back')}
      </Link>
      <h1 className={title({ class: 'mt-6' })}>
        <MotsCinetiques texte={currentPost.title} />
      </h1>
      <p
        style={{ ['--i' as string]: 0 }}
        className='apparait-tard mt-4 flex flex-wrap gap-x-4 text-petit text-texte-3'
      >
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
      {currentPost.image && (
        <Image
          src={currentPost.image}
          alt={currentPost.title}
          height={600}
          width={1200}
          removeWrapper
          className={`${styles.image} mt-8 aspect-video w-full rounded-panneau object-cover`}
        />
      )}
      <Divider className='mt-8 bg-trait' />
      <div
        style={{ ['--i' as string]: 1 }}
        className='apparait-tard mt-4 flex w-full items-center justify-between gap-4'
      >
        <User
          name={currentPost.author.name}
          avatarProps={{ src: currentPost.author.avatar }}
          description={currentPost.author.username}
        />
        <ShareArticle slug={slug} />
      </div>
      <Divider className='mt-4 bg-trait' />
      <div
        className={`${styles.corps} texte-riche mt-10`}
        dangerouslySetInnerHTML={{ __html: currentPost.body.html }}
      />
      <div data-reveal='monte' className='mt-8 flex flex-wrap gap-2'>
        {currentPost.tags.split(', ').map((tag) => (
          <Chip key={tag} variant='flat' radius='sm'>
            {tag}
          </Chip>
        ))}
      </div>
      <ul className='mt-16 divide-y divide-trait border-t border-trait'>
        {relevantPosts.map((post, index) => (
          <PostListItem
            key={post._id}
            post={post}
            locale={locale}
            rang={index}
          />
        ))}
      </ul>
    </article>
  );
};

export default PostLayout;
