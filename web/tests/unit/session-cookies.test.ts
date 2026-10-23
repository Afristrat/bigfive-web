import { describe, expect, it } from 'vitest';
import {
  ACCESS_COOKIE,
  NEXT_COOKIE,
  PENDING_COOKIE,
  REFRESH_COOKIE,
  SESSION_IDLE_SECONDS,
  clearedNextCookie,
  clearedPendingCookie,
  clearedSessionCookies,
  nextCookie,
  pendingCookie,
  resolveNext,
  sessionCookies
} from '@/lib/session-cookies';

const session = {
  accessToken: 'a'.repeat(40),
  refreshToken: 'refresh',
  expiresIn: 3600
};

describe('sessionCookies', () => {
  const [access, refresh] = sessionCookies(session);

  it('pose deux cookies httpOnly, Secure, SameSite=Lax, sur tout le site', () => {
    for (const cookie of [access, refresh]) {
      expect(cookie?.options).toMatchObject({
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/'
      });
    }
  });

  it('utilise le préfixe __Host- (pas de Domain, Secure imposé)', () => {
    expect(ACCESS_COOKIE.startsWith('__Host-')).toBe(true);
    expect(REFRESH_COOKIE.startsWith('__Host-')).toBe(true);
    expect(access?.options).not.toHaveProperty('domain');
  });

  it('garde le renouvellement 30 jours, le jeton d’accès un peu moins que sa vie', () => {
    expect(SESSION_IDLE_SECONDS).toBe(30 * 24 * 3600);
    expect(refresh?.options.maxAge).toBe(SESSION_IDLE_SECONDS);
    expect(access?.options.maxAge).toBe(3570);
  });

  it('ne descend jamais sous une minute pour le jeton d’accès', () => {
    const [short] = sessionCookies({ ...session, expiresIn: 10 });
    expect(short?.options.maxAge).toBe(60);
  });

  it('range les valeurs sans les modifier', () => {
    expect(access?.value).toBe(session.accessToken);
    expect(refresh?.value).toBe('refresh');
  });
});

describe('clearedSessionCookies', () => {
  it('expire les deux cookies avec les mêmes attributs', () => {
    const cleared = clearedSessionCookies();
    expect(cleared.map((c) => c.name)).toEqual([ACCESS_COOKIE, REFRESH_COOKIE]);
    for (const cookie of cleared) {
      expect(cookie.value).toBe('');
      expect(cookie.options.maxAge).toBe(0);
      expect(cookie.options.secure).toBe(true);
    }
  });
});

describe('destination après connexion', () => {
  it('mémorise un chemin interne pour 15 minutes', () => {
    const cookie = nextCookie('/admin');
    expect(cookie).toMatchObject({ name: NEXT_COOKIE, value: '/admin' });
    expect(cookie?.options.maxAge).toBe(900);
    expect(cookie?.options.httpOnly).toBe(true);
  });

  it('ne mémorise ni la racine, ni une URL externe, ni un vide', () => {
    for (const value of [
      '/',
      '',
      undefined,
      'https://exemple.org',
      '//exemple.org',
      '/\\exemple.org',
      '/\t/exemple.org'
    ]) {
      expect(nextCookie(value)).toBeNull();
    }
  });

  it('relit le cookie avec le même contrôle et un repli sûr', () => {
    expect(resolveNext('/admin', '/mon-compte')).toBe('/admin');
    expect(resolveNext('//exemple.org', '/mon-compte')).toBe('/mon-compte');
    expect(resolveNext(undefined, '/mon-compte')).toBe('/mon-compte');
  });

  it('expire le cookie de destination', () => {
    expect(clearedNextCookie().options.maxAge).toBe(0);
  });
});

describe('cookie de l’étape TOTP (revue B1)', () => {
  it('httpOnly, Secure, SameSite=Lax, Path=/, sans Domain, préfixe __Host-, 5 minutes', () => {
    const cookie = pendingCookie('paquet-scelle');
    expect(PENDING_COOKIE).toBe('__Host-tenga_mfa');
    expect(cookie).toEqual({
      name: PENDING_COOKIE,
      value: 'paquet-scelle',
      options: {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300
      }
    });
    expect(cookie.options).not.toHaveProperty('domain');
  });

  it('s’efface avec les mêmes attributs', () => {
    expect(clearedPendingCookie()).toMatchObject({
      name: PENDING_COOKIE,
      value: '',
      options: { httpOnly: true, secure: true, path: '/', maxAge: 0 }
    });
  });
});
