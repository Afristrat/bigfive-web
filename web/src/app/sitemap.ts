import { MetadataRoute } from 'next';
import { basePath, locales } from '@/config/site';
import { allPosts } from 'contentlayer/generated';

const postUrls = allPosts.map((post) => post.url);

export default function sitemap(): MetadataRoute.Sitemap {
  const alternatesPageLang = (path: string = '') =>
    locales.reduce((a, v) => ({ ...a, [v]: basePath + `/${v}${path}` }), {});
  const alternatesPageLangAfter = (path: string = '') =>
    locales.reduce((a, v) => ({ ...a, [v]: basePath + `/${path}${v}` }), {});
  return [
    {
      url: basePath,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLang()
      }
    },
    {
      url: basePath + '/result',
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLang('/result')
      }
    },
    {
      url: `${basePath}/test`,
      lastModified: new Date()
      // add lang
    },
    {
      url: `${basePath}/about`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/faq`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/privacy`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/translations`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/translations/b5-johnson-120-ipip-neo-pi-r`,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLangAfter(
          'translations/b5-johnson-120-ipip-neo-pi-r/'
        )
      }
    },
    {
      url: `${basePath}/result/`,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLangAfter('translations/result/')
      }
    },
    {
      url: `${basePath}/articles`,
      lastModified: new Date()
    },
    ...['', '/no'].flatMap((lang) =>
      postUrls.map((article) => ({
        url: `${basePath}${lang}${article}`,
        lastModified: new Date()
      }))
    )
  ];
}
