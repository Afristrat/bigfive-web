import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: { isLimited: vi.fn() }
}));
vi.mock('@/lib/security-log', () => ({ logSecurityEvent: vi.fn() }));
vi.mock('@/lib/min-duration', () => ({ holdUntil: async () => undefined }));

const rpc = vi.fn();
const passwordGrant = vi.fn();
const signOut = vi.fn();
const verifiedTotpFactor = vi.fn();
const verifyTotp = vi.fn();
const getUser = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({ rpc, passwordGrant }),
  userClient: () => ({ signOut, verifiedTotpFactor, verifyTotp, getUser })
}));

import { signInWithPassword, verifyLoginTotp } from '@/actions/password-login';
import { openPending, sealPending } from '@/lib/mfa-pending';
import { sharedLimiter } from '@/lib/rate-limit';
import {
  ACCESS_COOKIE,
  NEXT_COOKIE,
  PENDING_COOKIE,
  REFRESH_COOKIE
} from '@/lib/session-cookies';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const FACTOR_ID = '22222222-2222-4222-8222-222222222222';
const LEVEL1 = 'aaaa.bbbb.cccc';
const SESSION_L1 = {
  accessToken: LEVEL1,
  refreshToken: 'rt1',
  expiresIn: 3600
};
const SESSION_L2 = {
  accessToken: 'dddd.eeee.ffff',
  refreshToken: 'rt2',
  expiresIn: 3600
};
// Essai admis par la base : déjà compté comme un échec (débit préalable, I1).
const ADMITTED = [{ admin: true, etat: 'libre', jusqu: null, tentative: 7 }];

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const credentials = form({
  email: 'admin@tenga.test',
  password: 'cheval vapeur bleu ocre',
  locale: 'fr'
});

const setNames = (): string[] =>
  jar.set.mock.calls.map(([name]) => name as string);

const rpcCalls = (fn: string): unknown[][] =>
  rpc.mock.calls.filter(([name]) => name === fn);

beforeEach(() => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test_cle_de_service_longue');
  jar.get.mockReset().mockReturnValue(undefined);
  jar.set.mockReset();
  rpc.mockReset().mockImplementation(async (fn: string) => {
    if (fn === 'mdp_tentative') return ADMITTED;
    if (fn === 'mdp_succes' || fn === 'mdp_rembourser') return true;
    return undefined;
  });
  passwordGrant
    .mockReset()
    .mockResolvedValue({ session: SESSION_L1, userId: USER_ID });
  signOut.mockReset().mockResolvedValue(undefined);
  verifiedTotpFactor.mockReset().mockResolvedValue(FACTOR_ID);
  verifyTotp.mockReset().mockResolvedValue(SESSION_L2);
  getUser
    .mockReset()
    .mockResolvedValue({ id: USER_ID, email: 'admin@tenga.test' });
  vi.mocked(sharedLimiter.isLimited).mockReset().mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('signInWithPassword', () => {
  it('refuse un formulaire invalide sans rien interroger', async () => {
    const state = await signInWithPassword(
      { status: 'idle' },
      form({ email: 'pas-une-adresse', password: 'x', locale: 'fr' })
    );
    expect(state).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
    expect(passwordGrant).not.toHaveBeenCalled();
  });

  it('refuse sans interroger la base quand le plafond par IP est atteint', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    const state = await signInWithPassword({ status: 'idle' }, credentials);
    expect(state).toEqual({ status: 'failed' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('I1 : l’essai est débité par la base AVANT que GoTrue ne vérifie le mot de passe', async () => {
    passwordGrant.mockResolvedValue(null);
    await signInWithPassword({ status: 'idle' }, credentials);
    const [tentative] = rpcCalls('mdp_tentative');
    expect(tentative?.[1]).toEqual({ p_email: 'admin@tenga.test' });
    const debitOrder = rpc.mock.invocationCallOrder[0] ?? Infinity;
    const grantOrder = passwordGrant.mock.invocationCallOrder[0] ?? -Infinity;
    expect(debitOrder).toBeLessThan(grantOrder);
  });

  it('I1 : une rafale parallèle ne fait vérifier que les essais admis par la base', async () => {
    let admis = 0;
    rpc.mockImplementation(async (fn: string) => {
      if (fn !== 'mdp_tentative') return undefined;
      admis += 1;
      return admis <= 5
        ? [{ admin: true, etat: 'libre', jusqu: null, tentative: admis }]
        : [{ admin: true, etat: 'temporaire', jusqu: null, tentative: null }];
    });
    passwordGrant.mockResolvedValue(null);
    const states = await Promise.all(
      Array.from({ length: 12 }, () =>
        signInWithPassword({ status: 'idle' }, credentials)
      )
    );
    expect(states.every((s) => s.status === 'failed')).toBe(true);
    expect(passwordGrant).toHaveBeenCalledTimes(5);
  });

  it.each(['temporaire', 'definitif'])(
    "compte %s : même réponse, GoTrue n'est pas interrogé, rien n'est remboursé",
    async (etat) => {
      rpc.mockImplementation(async () => [
        { admin: true, etat, jusqu: null, tentative: null }
      ]);
      const state = await signInWithPassword({ status: 'idle' }, credentials);
      expect(state).toEqual({ status: 'failed' });
      expect(passwordGrant).not.toHaveBeenCalled();
      expect(rpcCalls('mdp_rembourser')).toHaveLength(0);
    }
  );

  it('mot de passe faux : le débit reste, aucun autre appel à la base, aucun cookie', async () => {
    passwordGrant.mockResolvedValue(null);
    const state = await signInWithPassword({ status: 'idle' }, credentials);
    expect(state).toEqual({ status: 'failed' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpcCalls('mdp_rembourser')).toHaveLength(0);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('mot de passe juste mais compte non administrateur : session révoquée, réponse neutre', async () => {
    rpc.mockImplementation(async () => [
      { admin: false, etat: 'libre', jusqu: null, tentative: null }
    ]);
    const state = await signInWithPassword({ status: 'idle' }, credentials);
    expect(state).toEqual({ status: 'failed' });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(verifiedTotpFactor).not.toHaveBeenCalled();
    expect(rpcCalls('mdp_rembourser')).toHaveLength(0);
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('administrateur sans code TOTP vérifié : refusé, session révoquée, essai remboursé', async () => {
    verifiedTotpFactor.mockResolvedValue(null);
    const state = await signInWithPassword({ status: 'idle' }, credentials);
    expect(state).toEqual({ status: 'failed' });
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(rpcCalls('mdp_rembourser')[0]?.[1]).toEqual({ p_tentative: 7 });
    expect(jar.set).not.toHaveBeenCalled();
  });

  it("mot de passe juste avec TOTP : essai remboursé, étape du code, cookie d'étape seulement, aucune session", async () => {
    const state = await signInWithPassword({ status: 'idle' }, credentials);
    expect(state).toEqual({ status: 'totp' });
    expect(rpcCalls('mdp_rembourser')[0]?.[1]).toEqual({ p_tentative: 7 });
    expect(setNames()).toEqual([PENDING_COOKIE]);
    expect(setNames()).not.toContain(ACCESS_COOKIE);
    expect(setNames()).not.toContain(REFRESH_COOKIE);
  });

  it('B1 : le cookie d’étape ne contient pas le jeton de niveau 1, seul le serveur le rouvre', async () => {
    await signInWithPassword({ status: 'idle' }, credentials);
    const value = String(jar.set.mock.calls[0]?.[1]);
    expect(value).not.toContain(LEVEL1);
    expect(value).not.toContain(FACTOR_ID);
    expect(openPending(value)).toEqual({
      factorId: FACTOR_ID,
      accessToken: LEVEL1
    });
  });
});

describe('verifyLoginTotp', () => {
  const withPending = (
    extra: Record<string, string> = {},
    value: string = sealPending({ factorId: FACTOR_ID, accessToken: LEVEL1 })
  ): void => {
    const present: Record<string, string> = {
      [PENDING_COOKIE]: value,
      ...extra
    };
    jar.get.mockImplementation((name: string) =>
      name in present ? { name, value: present[name] } : undefined
    );
  };
  const code = form({ code: '123456', locale: 'fr' });
  const TOTP_STEP = [{ admin: true, etat: 'libre', jusqu: null, tentative: 8 }];

  beforeEach(() => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'mdp_tentative') return TOTP_STEP;
      if (fn === 'mdp_succes') return true;
      return undefined;
    });
  });

  it("sans cookie d'étape : refus, aucune vérification", async () => {
    const state = await verifyLoginTotp({ status: 'idle' }, code);
    expect(state).toEqual({ status: 'failed' });
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it('B1 : un cookie fabriqué en clair (facteur:jeton) est refusé sans rien vérifier', async () => {
    withPending({}, `${FACTOR_ID}:${LEVEL1}`);
    const state = await verifyLoginTotp({ status: 'idle' }, code);
    expect(state).toEqual({ status: 'failed' });
    expect(getUser).not.toHaveBeenCalled();
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it('code mal formé : invalide', async () => {
    withPending();
    const state = await verifyLoginTotp(
      { status: 'idle' },
      form({ code: 'abc', locale: 'fr' })
    );
    expect(state).toEqual({ status: 'invalid' });
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it("compte devenu bloqué pendant l'étape : le code n'est pas vérifié, l'étape est abandonnée", async () => {
    withPending();
    rpc.mockImplementation(async () => [
      { admin: true, etat: 'temporaire', jusqu: null, tentative: null }
    ]);
    const state = await verifyLoginTotp({ status: 'idle' }, code);
    expect(state).toEqual({ status: 'failed' });
    expect(verifyTotp).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(setNames()).toEqual([PENDING_COOKIE]);
    expect(jar.set.mock.calls[0]?.[1]).toBe('');
  });

  it('I1 : le code est débité par la base AVANT sa vérification ; un code faux ne conclut rien', async () => {
    withPending();
    verifyTotp.mockResolvedValue(null);
    const state = await verifyLoginTotp({ status: 'idle' }, code);
    expect(state).toEqual({ status: 'failed' });
    const [tentative] = rpcCalls('mdp_tentative');
    expect(tentative?.[1]).toEqual({ p_email: 'admin@tenga.test' });
    const debitOrder = rpc.mock.invocationCallOrder[0] ?? Infinity;
    const verifyOrder = verifyTotp.mock.invocationCallOrder[0] ?? -Infinity;
    expect(debitOrder).toBeLessThan(verifyOrder);
    expect(rpcCalls('mdp_succes')).toHaveLength(0);
    expect(setNames()).not.toContain(ACCESS_COOKIE);
  });

  it('code juste : connexion liée à l’essai admis, session de niveau 2, étape effacée, redirection', async () => {
    withPending({ [NEXT_COOKIE]: '/admin' });
    await expect(verifyLoginTotp({ status: 'idle' }, code)).rejects.toThrow(
      'REDIRECT:/fr/admin'
    );
    expect(rpcCalls('mdp_succes')[0]?.[1]).toEqual({
      p_utilisateur: USER_ID,
      p_tentative: 8
    });
    const values = Object.fromEntries(
      jar.set.mock.calls.map(([n, v]) => [n, v])
    );
    expect(values[ACCESS_COOKIE]).toBe(SESSION_L2.accessToken);
    expect(values[REFRESH_COOKIE]).toBe(SESSION_L2.refreshToken);
    expect(values[PENDING_COOKIE]).toBe('');
    expect(values[NEXT_COOKIE]).toBe('');
  });

  it('succès refusé par la base (verrou survenu entre-temps) : aucune session, session révoquée', async () => {
    withPending();
    rpc.mockImplementation(async (fn: string) =>
      fn === 'mdp_tentative' ? TOTP_STEP : false
    );
    const state = await verifyLoginTotp({ status: 'idle' }, code);
    expect(state).toEqual({ status: 'failed' });
    expect(setNames()).not.toContain(ACCESS_COOKIE);
    expect(signOut).toHaveBeenCalled();
  });
});
