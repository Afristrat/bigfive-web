import { MetadataRoute } from 'next';
import {
  ARTICLES_PUBLICS,
  PARCOURS_ANONYME_OUVERT,
  basePath,
  locales
} from '@/config/site';
import { allPosts } from 'contentlayer/generated';

export default function sitemap(): MetadataRoute.Sitemap {
  const alternatesPageLang = (path: string = '') =>
    locales.reduce((a, v) => ({ ...a, [v]: basePath + `/${v}${path}` }), {});
  // Rubrique occultée : ni la liste ni les articles ne sont annoncés.
  const articles: MetadataRoute.Sitemap = ARTICLES_PUBLICS
    ? [
        { url: `${basePath}/articles`, lastModified: new Date() },
        ...['', '/no'].flatMap((lang) =>
          allPosts.map((post) => ({
            url: `${basePath}${lang}${post.url}`,
            lastModified: new Date()
          }))
        )
      ]
    : [];
  // Parcours anonyme fermé : ni le questionnaire public ni la recherche de
  // résultat ne sont annoncés.
  const parcoursAnonyme: MetadataRoute.Sitemap = PARCOURS_ANONYME_OUVERT
    ? [
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
        }
      ]
    : [];
  return [
    {
      url: basePath,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLang()
      }
    },
    ...parcoursAnonyme,
    {
      url: `${basePath}/about`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/presentation`,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLang('/presentation')
      }
    },
    {
      url: `${basePath}/faq`,
      lastModified: new Date()
    },
    {
      url: `${basePath}/methode`,
      lastModified: new Date(),
      alternates: {
        languages: alternatesPageLang('/methode')
      }
    },
    {
      url: `${basePath}/privacy`,
      lastModified: new Date()
    },
    ...articles
  ];
}
