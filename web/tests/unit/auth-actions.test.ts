import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));
vi.mock('next/server', () => ({ after: vi.fn() }));

const jar = { get: vi.fn(), has: vi.fn(), set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => jar }));

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: { isLimited: vi.fn() }
}));
vi.mock('@/lib/security-log', () => ({ logSecurityEvent: vi.fn() }));
vi.mock('@/lib/mailer', () => ({ sendMail: vi.fn() }));

const rpc = vi.fn();
const openSession = vi.fn();
const refreshSession = vi.fn();
const signOut = vi.fn();
const userClientFactory = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({ rpc, openSession, refreshSession }),
  userClient: (token: string) => {
    userClientFactory(token);
    return { signOut };
  }
}));

import { consumeLoginCode, signOutAction } from '@/actions/auth';
import { sharedLimiter } from '@/lib/rate-limit';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const NEW_SESSION = {
  accessToken: 'aaaa.bbbb.cccc',
  refreshToken: 'rt-new',
  expiresIn: 3600
};

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const cookiesPresent = (present: Record<string, string>) => {
  jar.get.mockImplementation((name: string) =>
    name in present ? { name, value: present[name] } : undefined
  );
};

const clearedNames = (): string[] =>
  jar.set.mock.calls
    .filter(([, value, options]) => value === '' && options.maxAge === 0)
    .map(([name]) => name as string);

beforeEach(() => {
  jar.get.mockReset().mockReturnValue(undefined);
  jar.set.mockReset();
  rpc.mockReset();
  openSession.mockReset().mockResolvedValue(NEW_SESSION);
  refreshSession.mockReset().mockResolvedValue(NEW_SESSION);
  signOut.mockReset().mockResolvedValue(undefined);
  userClientFactory.mockReset();
  vi.mocked(sharedLimiter.isLimited).mockReset().mockReturnValue(false);
});

describe('signOutAction', () => {
  it('sans cookie d’accès : renouvelle par le client de service puis révoque avec le jeton neuf', async () => {
    cookiesPresent({ [REFRESH_COOKIE]: 'rt-old' });
    await expect(signOutAction(form({ locale: 'fr' }))).rejects.toThrow(
      'REDIRECT:/fr/'
    );
    expect(refreshSession).toHaveBeenCalledWith('rt-old');
    expect(userClientFactory).toHaveBeenCalledWith(NEW_SESSION.accessToken);
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(clearedNames().sort()).toEqual(
      [ACCESS_COOKIE, REFRESH_COOKIE].sort()
    );
  });

  it('avec un jeton d’accès valide : révoque directement, sans renouveler', async () => {
    cookiesPresent({ [ACCESS_COOKIE]: 'aaa.bbb.ccc', [REFRESH_COOKIE]: 'rt' });
    await expect(signOutAction(form({ locale: 'en' }))).rejects.toThrow(
      'REDIRECT:/'
    );
    expect(refreshSession).not.toHaveBeenCalled();
    expect(userClientFactory).toHaveBeenCalledWith('aaa.bbb.ccc');
  });

  it('jeton d’accès expiré : se rabat sur le renouvellement', async () => {
    cookiesPresent({ [ACCESS_COOKIE]: 'aaa.bbb.ccc', [REFRESH_COOKIE]: 'rt' });
    signOut
      .mockRejectedValueOnce(new Error('401'))
      .mockResolvedValue(undefined);
    await expect(signOutAction(form({ locale: 'en' }))).rejects.toThrow(
      'REDIRECT:/'
    );
    expect(refreshSession).toHaveBeenCalledWith('rt');
    expect(signOut).toHaveBeenCalledTimes(2);
  });

  it('efface toujours les cookies, même si le renouvellement et la révocation échouent', async () => {
    cookiesPresent({ [REFRESH_COOKIE]: 'rt-old' });
    refreshSession.mockRejectedValue(new Error('panne'));
    await expect(signOutAction(form({ locale: 'fr' }))).rejects.toThrow(
      'REDIRECT:/fr/'
    );
    expect(clearedNames().sort()).toEqual(
      [ACCESS_COOKIE, REFRESH_COOKIE].sort()
    );
  });

  it('sans aucun cookie : efface et redirige, sans appel réseau', async () => {
    await expect(signOutAction(form({ locale: 'en' }))).rejects.toThrow(
      'REDIRECT:/'
    );
    expect(refreshSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('consumeLoginCode : durée minimale avant chaque retour', () => {
  const valid = { email: 'a@tenga.ma', code: '123456', locale: 'fr' };

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** Lance l’action et mesure le temps simulé avant qu’elle se termine. */
  const elapsedMs = async (fields: Record<string, string>): Promise<number> => {
    const start = Date.now();
    let settledAt: number | null = null;
    const run = consumeLoginCode({ status: 'idle' }, form(fields))
      .then(
        () => undefined,
        () => undefined
      )
      .then(() => {
        settledAt = Date.now();
      });
    for (let i = 0; i < 100 && settledAt === null; i++) {
      await vi.advanceTimersByTimeAsync(10);
    }
    await run;
    return (settledAt ?? Infinity) - start;
  };

  it('saisie invalide', async () => {
    expect(
      await elapsedMs({ email: 'x', code: '1', locale: 'fr' })
    ).toBeGreaterThanOrEqual(800);
  });

  it('plafond par IP atteint', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    expect(await elapsedMs(valid)).toBeGreaterThanOrEqual(800);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('panne de la base', async () => {
    rpc.mockRejectedValue(new Error('panne'));
    expect(await elapsedMs(valid)).toBeGreaterThanOrEqual(800);
  });

  it('mauvais code', async () => {
    rpc.mockResolvedValue(null);
    expect(await elapsedMs(valid)).toBeGreaterThanOrEqual(800);
  });

  it('ouverture de session impossible', async () => {
    rpc.mockResolvedValue(USER_ID);
    openSession.mockRejectedValue(new Error('panne'));
    expect(await elapsedMs(valid)).toBeGreaterThanOrEqual(800);
  });

  it('succès : la redirection n’a lieu qu’après la durée minimale', async () => {
    rpc.mockResolvedValue(USER_ID);
    const start = Date.now();
    let redirectedAt: number | null = null;
    const run = consumeLoginCode({ status: 'idle' }, form(valid)).catch(
      (error: unknown) => {
        redirectedAt = Date.now();
        expect((error as Error).message).toBe('REDIRECT:/fr/mon-compte');
      }
    );
    for (let i = 0; i < 100 && redirectedAt === null; i++) {
      await vi.advanceTimersByTimeAsync(10);
    }
    await run;
    expect((redirectedAt ?? 0) - start).toBeGreaterThanOrEqual(800);
    expect(jar.set).toHaveBeenCalled();
  });
});
