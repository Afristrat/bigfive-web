import { CSSProperties } from 'react';
import { Post } from 'contentlayer/generated';
import { getTranslations } from 'next-intl/server';
import { ArrowRightIcon } from '@/components/icons';
import { Link } from '@/navigation';
import { calculateReadingTime } from '@/lib/helpers';
import { formatDate, formatNombre } from '@/lib/format';

interface PostListItemProps {
  post: Post;
  locale: string;
  // Rang dans la liste : l'entrée monte alors au défilement, décalée d'autant.
  rang?: number;
  // Article mis en avant en tête de liste : titre et description agrandis.
  vedette?: boolean;
}

// Entrée de liste éditoriale : titre, description, date et durée de lecture,
// sans image ni avatar. La flèche avance au survol (pointeur fin seulement) ;
// elle suit le sens de la page, même autour d'un titre dans une autre langue.
export async function PostListItem({
  post,
  locale,
  rang,
  vedette = false
}: PostListItemProps) {
  const t = await getTranslations({ locale, namespace: 'articles' });
  // Article affiché hors de sa langue (repli sur l'anglais) : titre et
  // description sont balisés dans leur langue, sens de lecture compris.
  const langue = post.locale === locale ? undefined : post.locale;
  const sens = langue ? 'auto' : undefined;
  const style: CSSProperties | undefined =
    rang === undefined ? undefined : { ['--i' as string]: rang };
  return (
    <li
      data-reveal={rang === undefined ? undefined : 'monte'}
      style={style}
      className={vedette ? 'py-8' : 'py-6'}
    >
      <Link href={post.url} className='lien-fleche group block'>
        <h3
          className={`flex items-baseline justify-between gap-4 text-encre transition-colors duration-courte group-hover:text-accent ${vedette ? 'text-titre-1' : 'text-titre-3'}`}
        >
          <span lang={langue} dir={sens}>
            {post.title}
          </span>
          <ArrowRightIcon size={vedette ? 24 : 18} className='text-accent' />
        </h3>
        <p
          lang={langue}
          dir={sens}
          className={`mt-2 colonne-lecture text-texte-2 ${vedette ? 'text-chapo' : ''}`}
        >
          {post.description}
        </p>
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
