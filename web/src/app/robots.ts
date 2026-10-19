import { MetadataRoute } from 'next';
import { basePath } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${basePath}/sitemap.xml`
  };
}
