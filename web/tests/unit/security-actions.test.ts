import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: { isLimited: vi.fn() }
}));
vi.mock('@/lib/security-log', () => ({ logSecurityEvent: vi.fn() }));

const applyCookies = vi.fn();
vi.mock('@/lib/session', () => ({
  requireAdmin: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  }),
  applyCookies: (specs: unknown) => applyCookies(specs)
}));

const verifiedTotpFactor = vi.fn();
const verifyTotp = vi.fn();
const setPassword = vi.fn();
const enrollTotp = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    verifiedTotpFactor,
    verifyTotp,
    setPassword,
    enrollTotp
  })
}));

import {
  changeAdminPassword,
  confirmTotpSetup,
  startTotpSetup
} from '@/actions/security';
import { sharedLimiter } from '@/lib/rate-limit';
import { ACCESS_COOKIE } from '@/lib/session-cookies';
import { GatewayError } from '@/lib/supabase/server';

const FACTOR_ID = '22222222-2222-4222-8222-222222222222';
const LEVEL2 = {
  accessToken: 'dddd.eeee.ffff',
  refreshToken: 'rt2',
  expiresIn: 3600
};
const idle = { status: 'idle' } as const;

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const change = (over: Record<string, string> = {}): FormData =>
  form({
    password: 'cheval vapeur bleu ocre',
    confirmation: 'cheval vapeur bleu ocre',
    code: '123456',
    locale: 'fr',
    ...over
  });

beforeEach(() => {
  applyCookies.mockReset();
  verifiedTotpFactor.mockReset().mockResolvedValue(FACTOR_ID);
  verifyTotp.mockReset().mockResolvedValue(LEVEL2);
  setPassword.mockReset().mockResolvedValue(undefined);
  enrollTotp.mockReset().mockResolvedValue({
    factorId: FACTOR_ID,
    secret: 'JBSWY3DP',
    qrCode: 'data:image/svg+xml;utf-8,<svg/>'
  });
  vi.mocked(sharedLimiter.isLimited).mockReset().mockReturnValue(false);
});

describe('changeAdminPassword', () => {
  it('refuse deux saisies différentes avant tout appel', async () => {
    const state = await changeAdminPassword(
      idle,
      change({ confirmation: 'autre chose' })
    );
    expect(state).toEqual({ status: 'mismatch' });
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it.each([
    ['court', 'too_short'],
    ['aaaaaaaaaaaaaa', 'repetitive'],
    ['iloveyou1234', 'common'],
    ['xx-admin-xx-91', 'contains_email']
  ])(
    'refuse « %s » (%s) sans consommer le code TOTP',
    async (password, problem) => {
      const state = await changeAdminPassword(
        idle,
        change({ password, confirmation: password })
      );
      expect(state).toEqual({ status: 'weak', problem });
      expect(verifyTotp).not.toHaveBeenCalled();
      expect(setPassword).not.toHaveBeenCalled();
    }
  );

  it('exige un TOTP vérifié', async () => {
    verifiedTotpFactor.mockResolvedValue(null);
    const state = await changeAdminPassword(idle, change());
    expect(state).toEqual({ status: 'totp_required' });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it('code TOTP faux : mot de passe inchangé', async () => {
    verifyTotp.mockResolvedValue(null);
    const state = await changeAdminPassword(idle, change());
    expect(state).toEqual({ status: 'code_failed' });
    expect(setPassword).not.toHaveBeenCalled();
    expect(applyCookies).not.toHaveBeenCalled();
  });

  it('plafond par compte atteint : refus avant tout appel', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    const state = await changeAdminPassword(idle, change());
    expect(state).toEqual({ status: 'rate_limited' });
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it('succès : la session de niveau 2 remplace la session et définit le mot de passe', async () => {
    const state = await changeAdminPassword(idle, change());
    expect(state).toEqual({ status: 'saved' });
    expect(setPassword).toHaveBeenCalledWith('cheval vapeur bleu ocre');
    const specs = applyCookies.mock.calls[0]?.[0] as {
      name: string;
      value: string;
    }[];
    expect(specs.find((s) => s.name === ACCESS_COOKIE)?.value).toBe(
      LEVEL2.accessToken
    );
  });

  it('refus 422 de GoTrue : traité comme un mot de passe refusé', async () => {
    setPassword.mockRejectedValue(new GatewayError(422, 'weak_password'));
    const state = await changeAdminPassword(idle, change());
    expect(state.status).toBe('weak');
  });
});

describe('startTotpSetup et confirmTotpSetup', () => {
  it('déjà vérifié : pas de nouvelle inscription', async () => {
    const state = await startTotpSetup(idle, form({ locale: 'fr' }));
    expect(state).toEqual({ status: 'already' });
    expect(enrollTotp).not.toHaveBeenCalled();
  });

  it('inscription : renvoie le QR code et la clé', async () => {
    verifiedTotpFactor.mockResolvedValue(null);
    const state = await startTotpSetup(idle, form({ locale: 'fr' }));
    expect(state).toMatchObject({ status: 'enroll', factorId: FACTOR_ID });
  });

  it('confirmation : identifiant de facteur forgé refusé', async () => {
    const state = await confirmTotpSetup(
      idle,
      form({ factorId: 'pas-un-uuid', code: '123456', locale: 'fr' })
    );
    expect(state).toEqual({ status: 'invalid' });
    expect(verifyTotp).not.toHaveBeenCalled();
  });

  it('confirmation : code faux, aucun cookie', async () => {
    verifyTotp.mockResolvedValue(null);
    const state = await confirmTotpSetup(
      idle,
      form({ factorId: FACTOR_ID, code: '123456', locale: 'fr' })
    );
    expect(state).toEqual({ status: 'failed' });
    expect(applyCookies).not.toHaveBeenCalled();
  });

  it('confirmation : code juste, session de niveau 2 posée', async () => {
    const state = await confirmTotpSetup(
      idle,
      form({ factorId: FACTOR_ID, code: '123456', locale: 'fr' })
    );
    expect(state).toEqual({ status: 'enabled' });
    expect(applyCookies).toHaveBeenCalledTimes(1);
  });
});
