import { beforeEach, describe, expect, it, vi } from 'vitest';

// Les redirections de Next.js lèvent : on les rend observables.
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));

const jar = { get: vi.fn(), has: vi.fn(), set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => jar }));

import { localizedPath } from '@/lib/safe-path';
import { requireAdmin, requireViewer } from '@/lib/session';

const attempt = async (run: () => Promise<unknown>): Promise<string> => {
  try {
    await run();
    return 'OK';
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

beforeEach(() => {
  jar.get.mockReset().mockReturnValue(undefined);
  jar.has.mockReset().mockReturnValue(false);
});

describe('localizedPath défensif', () => {
  it('replie une langue mal formée sur la langue par défaut, sans préfixe', () => {
    expect(localizedPath('/evil.example', '/mon-compte')).toBe('/mon-compte');
    expect(localizedPath('//evil.example', '/mon-compte')).toBe('/mon-compte');
    expect(localizedPath('FR', '/mon-compte')).toBe('/mon-compte');
    expect(localizedPath('', '/mon-compte')).toBe('/mon-compte');
    expect(localizedPath('fr\n', '/mon-compte')).toBe('/mon-compte');
  });

  it('ne produit jamais une URL qui commence par « // »', () => {
    const attaques = ['/evil.example', '\\evil.example', '/\t/evil', '//x', ''];
    for (const locale of attaques) {
      for (const path of ['/mon-compte', '//evil.example', '/']) {
        expect(localizedPath(locale, path).startsWith('//')).toBe(false);
      }
    }
  });

  it('garde les langues valides', () => {
    expect(localizedPath('fr', '/mon-compte')).toBe('/fr/mon-compte');
    expect(localizedPath('zh-hant', '/')).toBe('/zh-hant/');
    expect(localizedPath('en', '/mon-compte')).toBe('/mon-compte');
  });
});

describe('requireViewer et requireAdmin : paramètre [locale] hostile', () => {
  it('renvoie un 404 pour « /evil.example » (décodé de /%2Fevil.example/mon-compte)', async () => {
    for (const locale of [
      '/evil.example',
      '%2Fevil.example',
      '//evil.example',
      'xx'
    ]) {
      expect(await attempt(() => requireViewer(locale, '/mon-compte'))).toBe(
        'NOT_FOUND'
      );
      expect(await attempt(() => requireAdmin(locale, '/admin'))).toBe(
        'NOT_FOUND'
      );
    }
  });

  it('ne redirige jamais vers une URL commençant par « // »', async () => {
    for (const locale of ['/evil.example', '//x', 'en', 'fr']) {
      const outcome = await attempt(() => requireViewer(locale, '/mon-compte'));
      expect(outcome.startsWith('REDIRECT://')).toBe(false);
    }
  });

  it('redirige un anonyme vers la connexion de sa langue', async () => {
    expect(await attempt(() => requireViewer('fr', '/mon-compte'))).toBe(
      'REDIRECT:/fr/connexion?next=%2Fmon-compte'
    );
    expect(await attempt(() => requireViewer('en', '/mon-compte'))).toBe(
      'REDIRECT:/connexion?next=%2Fmon-compte'
    );
  });

  it('envoie vers le renouvellement quand seul le cookie de renouvellement existe', async () => {
    jar.has.mockReturnValue(true);
    expect(await attempt(() => requireViewer('fr', '/mon-compte'))).toBe(
      'REDIRECT:/api/session/refresh?next=%2Ffr%2Fmon-compte'
    );
  });
});
