import { Post } from 'contentlayer/generated';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/navigation';
import { calculateReadingTime } from '@/lib/helpers';
import { formatDate, formatNombre } from '@/lib/format';

interface PostListItemProps {
  post: Post;
  locale: string;
}

// Entrée de liste éditoriale : titre, description, date et durée de lecture,
// sans image ni avatar.
export async function PostListItem({ post, locale }: PostListItemProps) {
  const t = await getTranslations({ locale, namespace: 'articles' });
  return (
    <li className='py-6'>
      <Link href={post.url} className='group block'>
        <h3 className='text-titre-3 text-encre transition-colors duration-courte group-hover:text-accent'>
          {post.title}
        </h3>
        <p className='mt-2 colonne-lecture text-texte-2'>{post.description}</p>
      </Link>
      <p className='mt-3 flex flex-wrap gap-x-4 text-legende text-texte-3'>
        <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
        <span>
          {t('readingTime', {
            minutes: formatNombre(calculateReadingTime(post.body.raw), locale)
          })}
        </span>
      </p>
    </li>
  );
}
