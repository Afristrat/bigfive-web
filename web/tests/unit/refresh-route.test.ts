import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const refreshSession = vi.fn();
const getUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  serviceClient: () => ({ refreshSession }),
  userClient: () => ({ getUser })
}));

import { GET } from '@/app/api/session/refresh/route';
import { isRefreshRequestAllowed, refreshTarget } from '@/lib/refresh-guard';
import { REFRESH_COOKIE } from '@/lib/session-cookies';

const locales = ['en', 'fr', 'ar'];
const headersOf = (h: Record<string, string>) => ({
  get: (name: string) => h[name.toLowerCase()] ?? null
});

const call = (next: string, headers: Record<string, string> = {}) =>
  GET(
    new NextRequest(
      `https://tenga.test/api/session/refresh?next=${encodeURIComponent(next)}`,
      { headers: { cookie: `${REFRESH_COOKIE}=rt`, ...headers } }
    )
  );

beforeEach(() => {
  refreshSession.mockReset().mockResolvedValue({
    accessToken: 'aaaa.bbbb.cccc',
    refreshToken: 'rt2',
    expiresIn: 3600
  });
  getUser.mockReset().mockResolvedValue({ id: 'u', email: 'a@b.ma' });
});

describe('redirection derrière le proxy', () => {
  // Régression du 21/10 : dans le conteneur, request.url vaut http://0.0.0.0:3000 ;
  // la redirection partait vers cette adresse et la session n'était jamais renouvelée.
  const interne = (next: string) =>
    GET(
      new NextRequest(
        `http://0.0.0.0:3000/api/session/refresh?next=${encodeURIComponent(next)}`,
        { headers: { cookie: `${REFRESH_COOKIE}=rt` } }
      )
    );

  it('renvoie vers l’adresse publique après un renouvellement réussi', async () => {
    vi.stubEnv('SITE_URL', 'https://tenga.test');
    const response = await interne('/fr/admin?x=1');
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.origin).toBe('https://tenga.test');
    expect(location.pathname + location.search).toBe('/fr/admin?x=1');
    vi.unstubAllEnvs();
  });

  it('renvoie vers l’adresse publique quand le renouvellement échoue', async () => {
    vi.stubEnv('SITE_URL', 'https://tenga.test');
    refreshSession.mockRejectedValue(new Error('refus'));
    const response = await interne('/fr/admin');
    const location = new URL(response.headers.get('location') ?? '');
    expect(location.origin).toBe('https://tenga.test');
    expect(location.pathname).toBe('/fr/connexion');
    vi.unstubAllEnvs();
  });
});

describe('refreshTarget', () => {
  it('refuse toute route d’API, avec ou sans langue, et la boucle sur soi-même', () => {
    for (const v of [
      '/api/session/refresh?next=/mon-compte',
      '/api/x',
      '/api',
      '/api?x=1',
      '/fr/api/x',
      '/api/../api/x'
    ]) {
      expect(refreshTarget(v, locales, '/mon-compte')).toBe('/mon-compte');
    }
  });

  it('garde une page privée normale et refuse l’externe', () => {
    expect(refreshTarget('/fr/mon-compte', locales, '/mon-compte')).toBe(
      '/fr/mon-compte'
    );
    expect(refreshTarget('//evil.example', locales, '/mon-compte')).toBe(
      '/mon-compte'
    );
    expect(refreshTarget('/apiary', locales, '/mon-compte')).toBe('/apiary');
  });
});

describe('isRefreshRequestAllowed', () => {
  it('accepte même origine, saisie directe et absence d’en-têtes', () => {
    expect(isRefreshRequestAllowed(headersOf({}))).toBe(true);
    expect(
      isRefreshRequestAllowed(headersOf({ 'sec-fetch-site': 'same-origin' }))
    ).toBe(true);
    expect(
      isRefreshRequestAllowed(headersOf({ 'sec-fetch-site': 'none' }))
    ).toBe(true);
  });

  it('accepte une navigation de document venue d’un autre site (lien d’e-mail)', () => {
    expect(
      isRefreshRequestAllowed(
        headersOf({
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': 'navigate',
          'sec-fetch-dest': 'document'
        })
      )
    ).toBe(true);
  });

  it('refuse fetch, image et iframe d’un autre site ou du même site', () => {
    const cas: Record<string, string>[] = [
      { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' },
      {
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-dest': 'image'
      },
      {
        'sec-fetch-site': 'same-site',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-dest': 'iframe'
      }
    ];
    for (const c of cas)
      expect(isRefreshRequestAllowed(headersOf(c))).toBe(false);
  });
});

describe('GET /api/session/refresh', () => {
  it('renouvelle puis redirige vers la page demandée', async () => {
    const response = await call('/fr/mon-compte', {
      'sec-fetch-site': 'same-origin'
    });
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
      '/fr/mon-compte'
    );
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });

  it('ne suit jamais un next vers /api/ : repli sur /mon-compte', async () => {
    for (const next of [
      '/api/session/refresh?next=%2Fmon-compte',
      '/api/mail-sink'
    ]) {
      const response = await call(next);
      expect(new URL(response.headers.get('location') ?? '').pathname).toBe(
        '/mon-compte'
      );
    }
  });

  it('refuse (403) une requête d’un autre site sans toucher à la session', async () => {
    const response = await call('/mon-compte', {
      'sec-fetch-site': 'cross-site',
      'sec-fetch-mode': 'cors'
    });
    expect(response.status).toBe(403);
    expect(refreshSession).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});
