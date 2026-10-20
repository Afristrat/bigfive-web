import { MetadataRoute } from 'next';
import { basePath } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Espace privé et liens de connexion : jamais indexés.
      disallow: [
        '/admin',
        '/mon-compte',
        '/connexion',
        '/c/',
        '/api/',
        '/*/admin',
        '/*/mon-compte',
        '/*/connexion',
        '/*/c/'
      ]
    },
    sitemap: `${basePath}/sitemap.xml`
  };
}
