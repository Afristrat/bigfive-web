import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

// Parcours anonyme fermé (décision du 24/10/2026) : chacun lit son résultat
// derrière la connexion. Sans session, /test, /result et /result/[id] mènent à
// la connexion ; avec session, /test garde l'encart de passation et les routes
// de résultat mènent à « Mes résultats ». Le catalogue français réel est lu.
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
    return (key: string, values?: Record<string, string>) =>
      chercher(namespace, key).replace(
        /\{(\w+)\}/g,
        (whole, name: string) => values?.[name] ?? whole
      );
  }
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  }
}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown }) =>
    createElement('a', { href: props.href }, props.children as never)
}));

// Session réelle (requireViewer, currentViewer) sur des cookies simulés.
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    has: (name: string) => jar.has(name)
  })
}));
const VIEWER = { id: 'u-1', email: 'personne@tenga.test' };
vi.mock('@/lib/supabase/server', () => ({
  GatewayError: class GatewayError extends Error {},
  userClient: (token: string) => ({
    getUser: async () => (token === 'jeton-valide' ? VIEWER : null)
  })
}));

const lectures = vi.hoisted(() => ({
  questions: 0,
  resultats: 0,
  participations: 0
}));
const aPasser = vi.hoisted(() => ({
  liste: [] as unknown[],
  panne: false
}));
const formulaire = vi.hoisted(() => ({ rendus: 0, envois: 0 }));
vi.mock('@/lib/question-overrides', () => ({
  getLocalizedItems: () => {
    lectures.questions += 1;
    return [];
  }
}));
vi.mock('@/lib/passation-data', () => ({
  loadParticipationsAPasser: async () => {
    lectures.participations += 1;
    if (aPasser.panne) throw new Error('passerelle');
    return aPasser.liste;
  }
}));
vi.mock('@/actions', () => ({
  savePublicTest: async () => {
    formulaire.envois += 1;
    return { href: '/result/0' };
  },
  getTestResult: async () => {
    lectures.resultats += 1;
    throw new Error('MongoDB ne doit pas être lu');
  }
}));
vi.mock('@/app/[locale]/test/survey', () => ({
  Survey: () => {
    formulaire.rendus += 1;
    return createElement('div', { 'data-survey': '' });
  }
}));
vi.mock('@/components/questionnaire/reprise-locale', () => ({
  libellesSurvey: () => ({})
}));
vi.mock('contentlayer/generated', () => ({ allPosts: [] }));
vi.mock('@/components/home-sections', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/home-sections')>()),
  HomeSections: () => null,
  HomeClosing: () => null
}));
vi.mock('@/components/home/hero-radar', () => ({ HeroRadar: () => null }));

import {
  PARCOURS_ANONYME_OUVERT,
  getNavItems,
  siteConfig
} from '@/config/site';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';
import sitemap from '@/app/sitemap';
import TestPage from '@/app/[locale]/test/page';
import ResultPage from '@/app/[locale]/result/page';
import ResultIdPage from '@/app/[locale]/result/[id]/page';
import Home from '@/app/[locale]/page';
import NotFound from '@/app/[locale]/not-found';

const ID = '0123456789abcdef01234567';
const connecter = () => jar.set(ACCESS_COOKIE, 'jeton-valide');
const html = (element: unknown) =>
  renderToStaticMarkup(element as ReactElement);

beforeEach(() => {
  jar.clear();
  lectures.questions = 0;
  lectures.resultats = 0;
  lectures.participations = 0;
  aPasser.liste = [];
  aPasser.panne = false;
  formulaire.rendus = 0;
  formulaire.envois = 0;
});

describe('parcours anonyme fermé : interrupteur et navigation', () => {
  it('l’interrupteur est fermé', () => {
    expect(PARCOURS_ANONYME_OUVERT).toBe(false);
  });

  it('ni l’en-tête, ni le menu mobile, ni le pied de page ne mènent à /result ou /test', async () => {
    for (const linkType of [
      'navItems',
      'navMenuItems',
      'footerLinks'
    ] as const) {
      const hrefs = siteConfig[linkType].map((lien) => lien.href);
      expect(hrefs).not.toContain('/result');
      expect(hrefs).not.toContain('/test');
      const liens = await getNavItems({ locale: 'fr', linkType });
      expect(liens.map((lien) => lien.label)).not.toContain(
        chercher('toolbar', 'result')
      );
    }
  });

  it('le menu garde l’accueil et « Mon compte »', async () => {
    const menu = await getNavItems({ locale: 'fr', linkType: 'navMenuItems' });
    expect(menu.map((lien) => lien.href)).toEqual([
      '/',
      '/privacy',
      '/about',
      '/faq',
      '/mon-compte'
    ]);
  });

  it('le sitemap n’annonce ni /test ni /result', () => {
    const urls = sitemap().flatMap((entree) => [
      entree.url,
      ...Object.values(entree.alternates?.languages ?? {})
    ]);
    expect(urls.length).toBeGreaterThan(0);
    expect(
      urls.filter((url) => /\/(test|result)(\/|$)/.test(String(url)))
    ).toEqual([]);
  });
});

describe('parcours anonyme fermé : routes sans session', () => {
  it('/test redirige vers la connexion avec retour sûr sur /test, sans lire le questionnaire', async () => {
    await expect(
      TestPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT /fr/connexion?next=%2Ftest');
    await expect(
      TestPage({ params: Promise.resolve({ locale: 'en' }) })
    ).rejects.toThrow('REDIRECT /connexion?next=%2Ftest');
    expect(lectures.questions).toBe(0);
    expect(lectures.participations).toBe(0);
  });

  it('/test avec une session à renouveler passe par le renouvellement', async () => {
    jar.set(REFRESH_COOKIE, 'renouvellement');
    await expect(
      TestPage({ params: Promise.resolve({ locale: 'ar' }) })
    ).rejects.toThrow('REDIRECT /api/session/refresh?next=%2Far%2Ftest');
  });

  it('/result redirige vers la connexion avec retour sûr sur /mes-resultats', async () => {
    await expect(
      ResultPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT /fr/connexion?next=%2Fmes-resultats');
  });

  it('/result/[id] redirige vers la connexion sans lire MongoDB', async () => {
    await expect(
      ResultIdPage({ params: Promise.resolve({ locale: 'fr', id: ID }) })
    ).rejects.toThrow('REDIRECT /fr/connexion?next=%2Fmes-resultats');
    await expect(
      ResultIdPage({ params: Promise.resolve({ locale: 'en', id: ID }) })
    ).rejects.toThrow('REDIRECT /connexion?next=%2Fmes-resultats');
    expect(lectures.resultats).toBe(0);
  });
});

describe('parcours anonyme fermé : routes avec session', () => {
  it('/result et /result/[id] mènent à « Mes résultats », sans lire MongoDB', async () => {
    connecter();
    await expect(
      ResultPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT /fr/mes-resultats');
    await expect(
      ResultIdPage({ params: Promise.resolve({ locale: 'ar', id: ID }) })
    ).rejects.toThrow('REDIRECT /ar/mes-resultats');
    expect(lectures.resultats).toBe(0);
  });

  it('/test affiche seulement l’encart de passation, sans formulaire public', async () => {
    connecter();
    aPasser.liste = [
      {
        participationId: 'p-1',
        organisationNom: 'Acme',
        campagneTitre: 'Équipe commerciale'
      }
    ];
    const sortie = html(
      await TestPage({ params: Promise.resolve({ locale: 'fr' }) })
    );
    expect(sortie).toContain('href="/mes-resultats/p-1/questionnaire"');
    expect(sortie).toContain(
      chercher('passation', 'encartTitle').replace('{organisation}', 'Acme')
    );
    expect(sortie).not.toContain('data-survey');
    expect(formulaire.rendus).toBe(0);
    expect(formulaire.envois).toBe(0);
    expect(lectures.questions).toBe(0);
  });

  it('/test sans participation à passer mène à « Mes résultats »', async () => {
    connecter();
    await expect(
      TestPage({ params: Promise.resolve({ locale: 'fr' }) })
    ).rejects.toThrow('REDIRECT /fr/mes-resultats');
    expect(formulaire.rendus).toBe(0);
    expect(lectures.questions).toBe(0);
  });

  it('/test : une panne de lecture des participations mène à « Mes résultats », journalisée', async () => {
    const journal = vi.spyOn(console, 'error').mockImplementation(() => {});
    connecter();
    aPasser.panne = true;
    await expect(
      TestPage({ params: Promise.resolve({ locale: 'en' }) })
    ).rejects.toThrow('REDIRECT /mes-resultats');
    expect(journal).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(journal.mock.calls[0])).not.toContain(VIEWER.email);
    expect(formulaire.rendus).toBe(0);
    journal.mockRestore();
  });
});

describe('parcours anonyme fermé : appels à l’action des pages publiques', () => {
  it('l’accueil propose la connexion, jamais /test ni /result', async () => {
    // Héros puis appel final (rendu à part : composant serveur asynchrone).
    const { HomeClosing } = await vi.importActual<
      typeof import('@/components/home-sections')
    >('@/components/home-sections');
    for (const sortie of [
      html(await Home({ params: Promise.resolve({ locale: 'fr' }) })),
      html(await HomeClosing({ locale: 'fr' }))
    ]) {
      expect(sortie).not.toMatch(/href="[^"]*\/(test|result)(\/|")/);
      expect(sortie).not.toContain(chercher('frontpage', 'call_to_action'));
      // Un lien vers la connexion, avec un libellé existant du catalogue.
      expect(sortie.match(/href="\/connexion"/g)).toHaveLength(1);
      expect(sortie).toContain(chercher('login', 'connect.button'));
    }
  });

  it('la page introuvable ne renvoie plus vers /test', () => {
    const sortie = renderToStaticMarkup(
      createElement(NextIntlClientProvider, {
        locale: 'fr',
        timeZone: 'Africa/Casablanca',
        messages: { notFound: fr.notFound },
        children: createElement(NotFound)
      })
    );
    expect(sortie).toContain('href="/"');
    expect(sortie).not.toContain('href="/test"');
    expect(sortie).not.toContain(chercher('notFound', 'test'));
  });

  // Défaut non validé par Amine (arabe à faire relire par un natif).
  it('le texte de la page introuvable ne propose plus le questionnaire', () => {
    expect(fr.notFound.text).toBe(
      'La page demandée n’existe pas ou n’existe plus.'
    );
    expect(en.notFound.text).toBe(
      'The page you asked for does not exist or no longer exists.'
    );
    expect(ar.notFound.text).toBe(
      'الصفحة المطلوبة غير موجودة أو لم تعد موجودة.'
    );
  });
});
