import { FacebookIcon, LinkedInIcon, MastadonIcon, TwitterIcon } from './icons';
import { basePath } from '@/config/site';

interface ShareArticleProps {
  slug: string;
  // Intitulé accessible de chaque lien, réseau inséré : « Partager sur LinkedIn ».
  label: (reseau: string) => string;
}

const socialMedia = [
  {
    name: 'Twitter',
    icon: TwitterIcon,
    url: 'http://www.twitter.com/share?url='
  },
  {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    url: 'https://www.linkedin.com/sharing/share-offsite/?url='
  },
  {
    name: 'Facebook',
    icon: FacebookIcon,
    url: 'https://www.facebook.com/sharer/sharer.php?u='
  },
  {
    name: 'Mastodon',
    icon: MastadonIcon,
    url: 'https://mastodon.social/share?url='
  }
];

// Liens de partage : cibles de 44 px, intitulé traduit (lu par les lecteurs
// d'écran et affiché au survol), ouverts dans un nouvel onglet.
export function ShareArticle({ slug, label }: ShareArticleProps) {
  return (
    <ul role='list' className='flex gap-1'>
      {socialMedia.map(({ name, icon: Icon, url }) => (
        <li key={name}>
          <a
            href={`${url}${basePath}/articles/${slug}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={label(name)}
            title={label(name)}
            className='appui inline-flex size-11 items-center justify-center rounded-controle text-texte-3 hover:text-accent'
          >
            <Icon size={20} />
          </a>
        </li>
      ))}
    </ul>
  );
}
