import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

// Branchement du lot mot de passe sur /connexion et /mon-compte : props
// passées aux formulaires, section sécurité réservée aux administrateurs Tenga.

type Tree = { [key: string]: string | Tree };
vi.mock('next-intl/server', () => {
  const lookup = (namespace: string, key: string): string => {
    let node: string | Tree | undefined = (fr as Tree)[namespace];
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string') {
      throw new Error(`Message absent ${namespace}.${key}`);
    }
    return node;
  };
  return {
    setRequestLocale: () => undefined,
    getTranslations: async (arg: string | { namespace: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg.namespace;
      return (key: string) => lookup(namespace, key);
    }
  };
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));
vi.mock('@/navigation', () => ({
  Link: ({ children }: { children: string }) =>
    createElement('a', null, children)
}));

const viewer = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'acteur@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const isTengaAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: async () => ({ status: 'anonymous' }),
  requireViewer: async () => viewer,
  isTengaAdmin: (v: unknown) => isTengaAdmin(v)
}));
const hasVerifiedTotp = vi.fn();
vi.mock('@/lib/account-data', () => ({
  loadAccount: async () => ({ nom: null, langue: 'fr', roles: [] }),
  hasVerifiedTotp: (v: unknown) => hasVerifiedTotp(v)
}));
vi.mock('@/actions/auth', () => ({ signOutAction: vi.fn() }));
vi.mock('@/components/profile-form', () => ({ ProfileForm: () => null }));
vi.mock('@/components/login-form', () => ({
  LoginForm: () => createElement('p', null, 'formulaire-lien')
}));

type Props = Record<string, unknown> & { labels: Record<string, unknown> };
const captured: Record<string, Props | undefined> = {};
const marker = (name: string) => (props: Props) => {
  captured[name] = props;
  return createElement('p', null, name);
};
vi.mock('@/components/password-login-form', () => ({
  PasswordLoginForm: (props: Props) => marker('formulaire-mot-de-passe')(props)
}));
vi.mock('@/components/security-forms', () => ({
  TotpSection: (props: Props) => marker('section-totp')(props),
  PasswordSection: (props: Props) => marker('section-mot-de-passe')(props)
}));

import LoginPage from '@/app/[locale]/connexion/page';
import AccountPage from '@/app/[locale]/mon-compte/page';

const wrap = (node: unknown): string =>
  renderToStaticMarkup(createElement('div', null, node as never));

beforeEach(() => {
  for (const key of Object.keys(captured)) delete captured[key];
  isTengaAdmin.mockReset();
  hasVerifiedTotp.mockReset();
});

describe('/connexion : mot de passe à côté du lien magique', () => {
  it('affiche les deux formulaires et passe tous les textes du bloc login.password', async () => {
    const html = wrap(
      await LoginPage({
        params: Promise.resolve({ locale: 'fr' }),
        searchParams: Promise.resolve({ next: '/mon-compte' })
      })
    );
    expect(html).toContain('formulaire-lien');
    expect(html).toContain('formulaire-mot-de-passe');
    expect(html.indexOf('formulaire-lien')).toBeLessThan(
      html.indexOf('formulaire-mot-de-passe')
    );
    const props = captured['formulaire-mot-de-passe'];
    expect(props?.locale).toBe('fr');
    expect(props?.next).toBe('/mon-compte');
    expect(props?.labels).toEqual(fr.login.password);
  });
});

describe('/mon-compte : sécurité de la connexion', () => {
  it('administrateur Tenga : section titrée, TOTP et mot de passe, état TOTP lu', async () => {
    isTengaAdmin.mockResolvedValue(true);
    hasVerifiedTotp.mockResolvedValue(true);
    const html = wrap(
      await AccountPage({ params: Promise.resolve({ locale: 'fr' }) })
    );
    expect(html).toMatch(/<h2 id="securite-titre"/);
    expect(html).toContain(fr.account.security.title);
    expect(html).toContain(fr.account.security.intro);
    expect(html).toContain('section-totp');
    expect(html).toContain('section-mot-de-passe');
    expect(hasVerifiedTotp).toHaveBeenCalledWith(viewer);
    expect(captured['section-totp']?.active).toBe(true);
    expect(captured['section-mot-de-passe']?.totpActive).toBe(true);
    const { title, intro, ...labels } = fr.account.security;
    expect(title && intro).toBeTruthy();
    expect(captured['section-mot-de-passe']?.labels).toEqual(labels);
  });

  it('TOTP non activé : les deux sections le savent', async () => {
    isTengaAdmin.mockResolvedValue(true);
    hasVerifiedTotp.mockResolvedValue(false);
    await AccountPage({ params: Promise.resolve({ locale: 'fr' }) }).then(wrap);
    expect(captured['section-totp']?.active).toBe(false);
    expect(captured['section-mot-de-passe']?.totpActive).toBe(false);
  });

  it('autre compte : aucune section sécurité, état TOTP jamais demandé', async () => {
    isTengaAdmin.mockResolvedValue(false);
    const html = wrap(
      await AccountPage({ params: Promise.resolve({ locale: 'fr' }) })
    );
    expect(html).not.toContain('securite-titre');
    expect(html).not.toContain('section-totp');
    expect(html).not.toContain('section-mot-de-passe');
    expect(hasVerifiedTotp).not.toHaveBeenCalled();
  });
});
