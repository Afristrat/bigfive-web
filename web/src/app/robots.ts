import { MetadataRoute } from 'next';
import { basePath } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espace privé, liens de connexion et d'invitation : jamais indexés.
      disallow: [
        '/admin',
        '/mon-compte',
        '/connexion',
        '/c/',
        '/i/',
        '/o/',
        '/api/',
        '/*/admin',
        '/*/mon-compte',
        '/*/connexion',
        '/*/c/',
        '/*/i/',
        '/*/o/'
      ]
    },
    sitemap: `${basePath}/sitemap.xml`
  };
}
