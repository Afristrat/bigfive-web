import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

// Rubrique « Articles » occultée (décision du 24/10/2026) : aucun lien de
// navigation, routes en 404 dans toutes les langues, rien dans le sitemap.
// Le catalogue français réel est lu : une clé absente lève.
type Tree = { [key: string]: string | Tree };
const chercher = (namespace: string, key: string): string => {
  let node: string | Tree | undefined = (fr as Tree)[namespace];
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node !== 'string') {
    throw new Error(`Message absent ${namespace}.${key}`);
  }
  return node;
};

vi.mock('next-intl/server', () => ({
  setRequestLocale: () => undefined,
  getTranslations: async (arg: string | { namespace: string }) => {
    const namespace = typeof arg === 'string' ? arg : arg.namespace;
    return (key: string) => chercher(namespace, key);
  }
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));
vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown }) =>
    createElement('a', { href: props.href }, props.children as never)
}));

// Un article anglais et un norvégien : s'ils fuyaient, ils seraient visibles.
const lectures = vi.hoisted(() => ({ compte: 0 }));
vi.mock('contentlayer/generated', () => {
  const article = (locale: string, slug: string) => ({
    _id: `${locale}-${slug}`,
    slug,
    locale,
    url: `/articles/${slug}`,
    title: `Titre ${slug}`,
    description: 'Description',
    date: '2024-03-01',
    tags: 'personnalité',
    image: '/image.png',
    author: { name: 'Auteur', link: 'https://exemple.test' },
    body: { raw: 'corps', html: '<p>corps</p>' }
  });
  const posts = [article('en', 'big-five'), article('no', 'femfaktor')];
  return {
    // Toute lecture du contenu est comptée : les routes doivent lever avant.
    get allPosts() {
      lectures.compte += 1;
      return posts;
    }
  };
});

// Composants de l'accueil sans rapport avec la rubrique : neutralisés.
vi.mock('@/components/home-sections', () => ({
  HomeSections: () => null,
  HomeClosing: () => null,
  MotsCinetiques: ({ texte }: { texte: string }) => texte
}));
vi.mock('@/components/mots-cinetiques', () => ({
  MotsCinetiques: ({ texte }: { texte: string }) => texte
}));
vi.mock('@/components/home/hero-radar', () => ({ HeroRadar: () => null }));
vi.mock('@/components/post-list-item', () => ({
  PostListItem: ({ post }: { post: { url: string } }) =>
    createElement('li', null, createElement('a', { href: post.url }))
}));

import { ARTICLES_PUBLICS, getNavItems, siteConfig } from '@/config/site';
import sitemap from '@/app/sitemap';
import ArticlesPage, {
  generateMetadata as metadonneesListe
} from '@/app/[locale]/articles/page';
import ArticlePage, {
  generateMetadata as metadonneesArticle,
  generateStaticParams
} from '@/app/[locale]/articles/[slug]/page';
import Home from '@/app/[locale]/page';

const langues = ['fr', 'en', 'ar', 'no'];
const versArticles = (href: string) => /(^|\/)articles(\/|$)/.test(href);

describe('rubrique Articles occultée', () => {
  it('l’interrupteur est coupé', () => {
    expect(ARTICLES_PUBLICS).toBe(false);
  });

  it('aucun lien Articles dans l’en-tête, le menu mobile ni le pied de page', async () => {
    for (const linkType of [
      'navItems',
      'navMenuItems',
      'footerLinks'
    ] as const) {
      expect(siteConfig[linkType].map((lien) => lien.href)).not.toContain(
        '/articles'
      );
      const liens = await getNavItems({ locale: 'fr', linkType });
      expect(liens.some((lien) => versArticles(lien.href))).toBe(false);
      expect(liens.map((lien) => lien.label)).not.toContain('Articles');
    }
  });

  it('les autres liens de navigation restent en place', async () => {
    const pied = await getNavItems({ locale: 'fr', linkType: 'footerLinks' });
    expect(pied.map((lien) => lien.href)).toEqual([
      '/',
      '/privacy',
      '/about',
      '/faq',
      '/methode',
      '/presentation'
    ]);
    const entete = await getNavItems({ locale: 'fr', linkType: 'navItems' });
    expect(entete.map((lien) => lien.href)).toEqual([
      '/',
      '/about',
      '/mon-compte'
    ]);
  });

  it('la liste /articles répond 404 dans toutes les langues, sans lire le contenu', async () => {
    for (const locale of langues) {
      lectures.compte = 0;
      const params = Promise.resolve({ locale });
      await expect(ArticlesPage({ params })).rejects.toThrow('NOT_FOUND');
      await expect(metadonneesListe({ params })).rejects.toThrow('NOT_FOUND');
      expect(lectures.compte).toBe(0);
    }
  });

  it('un article /articles/[slug] répond 404 dans toutes les langues, sans lire le contenu', async () => {
    for (const locale of langues) {
      for (const slug of ['big-five', 'femfaktor']) {
        lectures.compte = 0;
        const params = Promise.resolve({ locale, slug });
        await expect(ArticlePage({ params })).rejects.toThrow('NOT_FOUND');
        await expect(metadonneesArticle({ params })).rejects.toThrow(
          'NOT_FOUND'
        );
        expect(lectures.compte).toBe(0);
      }
    }
  });

  it('aucune page d’article n’est générée statiquement', async () => {
    lectures.compte = 0;
    expect(await generateStaticParams()).toEqual([]);
    expect(lectures.compte).toBe(0);
  });

  it('le sitemap ne contient aucune URL d’article', () => {
    const urls = sitemap().flatMap((entree) => [
      entree.url,
      ...Object.values(entree.alternates?.languages ?? {})
    ]);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.filter((url) => String(url).includes('/articles'))).toEqual([]);
    expect(urls.some((url) => String(url).endsWith('/presentation'))).toBe(
      true
    );
  });

  it('l’accueil ne renvoie vers aucun article, même en anglais et en norvégien', async () => {
    for (const locale of langues) {
      const html = renderToStaticMarkup(
        (await Home({ params: Promise.resolve({ locale }) })) as ReactElement
      );
      expect(html).toContain('href="/presentation"');
      expect(html).not.toMatch(/href="[^"]*\/articles/);
      expect(html).not.toContain(chercher('frontpage', 'posts.all'));
    }
  });
});
