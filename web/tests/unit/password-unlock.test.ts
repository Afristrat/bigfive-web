import { beforeEach, describe, expect, it, vi } from 'vitest';

// Revue I4 : le déverrouillage d'un mot de passe est réservé à un
// administrateur Tenga (la base le vérifie aussi : private.peut_deverrouiller).

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const { requireAdmin, rpc } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  rpc: vi.fn()
}));
vi.mock('@/lib/session', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({ rpc })
}));

import { unlockPassword } from '@/actions/password-unlock';

const TARGET = '33333333-3333-4333-8333-333333333333';
const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'admin@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  });
  rpc.mockReset().mockResolvedValue(undefined);
});

describe('unlockPassword', () => {
  it('exige un administrateur Tenga avant tout appel à la base', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(
      unlockPassword({ status: 'idle' }, form({ locale: 'fr', userId: TARGET }))
    ).rejects.toThrow('NOT_FOUND');
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('identifiant invalide : erreur, aucun appel', async () => {
    const state = await unlockPassword(
      { status: 'idle' },
      form({ locale: 'fr', userId: 'pas-un-uuid' })
    );
    expect(state).toEqual({ status: 'error' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('administrateur Tenga : déverrouillage demandé avec sa propre session', async () => {
    const state = await unlockPassword(
      { status: 'idle' },
      form({ locale: 'fr', userId: TARGET })
    );
    expect(state).toEqual({ status: 'unlocked' });
    expect(rpc).toHaveBeenCalledWith(
      'deverrouiller_mot_de_passe',
      { p_utilisateur: TARGET },
      expect.anything()
    );
  });

  it('refus de la base (soi-même, hors droit) : erreur neutre', async () => {
    rpc.mockRejectedValue(new Error('refus'));
    const state = await unlockPassword(
      { status: 'idle' },
      form({ locale: 'fr', userId: TARGET })
    );
    expect(state).toEqual({ status: 'error' });
  });
});
