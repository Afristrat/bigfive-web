import { beforeEach, describe, expect, it, vi } from 'vitest';

// Troisième accord du relevé du réseau réel : l'accord au rapport nominatif.
// Contrat : consentirReseau(participation, repondre, carte, rapport) transmet
// p_rapport à la RPC app.reseau_consentir. La base décide (p_rapport vrai avec
// p_repondre faux : 22023) ; l'action valide les entrées, ne laisse jamais
// passer un refus pour un succès et revalide la page seulement en cas de succès.

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const PART = '66666666-6666-4666-8666-666666666666';

const currentViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer()
}));

const rpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args)),
    select: async () => []
  })
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args)
}));

import { consentirReseau } from '@/actions/reseau';
import { GatewayError } from '@/lib/supabase/server';

const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(() => {
  currentViewer.mockReset();
  currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
  rpc.mockReset();
  warn.mockClear();
  revalidatePath.mockReset();
});

describe('consentirReseau : accord au rapport nominatif', () => {
  it('sans session : reconnexion, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await consentirReseau(PART, true, false, true)).toEqual({
      status: 'reconnexion'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('transmet p_rapport à la RPC avec les deux autres accords', async () => {
    rpc.mockResolvedValue('enregistre');
    expect(await consentirReseau(PART, true, false, true)).toEqual({
      status: 'enregistre'
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('reseau_consentir', {
      p_participation: PART,
      p_repondre: true,
      p_carte: false,
      p_rapport: true
    });
    await consentirReseau(PART, true, true, false);
    expect(rpc).toHaveBeenLastCalledWith('reseau_consentir', {
      p_participation: PART,
      p_repondre: true,
      p_carte: true,
      p_rapport: false
    });
  });

  it('retrait de tous les accords : trois faux transmis tels quels', async () => {
    rpc.mockResolvedValue('enregistre');
    await consentirReseau(PART, false, false, false);
    expect(rpc).toHaveBeenCalledWith('reseau_consentir', {
      p_participation: PART,
      p_repondre: false,
      p_carte: false,
      p_rapport: false
    });
  });

  it('rapport sans réponse : jamais un succès (invalid), la page n’est pas revalidée', async () => {
    // Que l’action refuse avant l’appel ou que la base lève 22023, le résultat
    // est le même : « invalid ».
    rpc.mockRejectedValue(new GatewayError(400, '22023'));
    expect(await consentirReseau(PART, false, false, true)).toEqual({
      status: 'invalid'
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('accord au rapport non booléen : invalid, aucun appel', async () => {
    expect(
      await consentirReseau(PART, true, false, 1 as unknown as boolean)
    ).toEqual({ status: 'invalid' });
    expect(
      await consentirReseau(PART, true, false, undefined as unknown as boolean)
    ).toEqual({ status: 'invalid' });
    expect(
      await consentirReseau(PART, true, false, 'true' as unknown as boolean)
    ).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('identifiant de participation forgé : invalid, aucun appel', async () => {
    expect(await consentirReseau('x', true, false, true)).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['55000', 'closed'],
    ['P0002', 'notfound'],
    ['42501', 'forbidden'],
    ['22023', 'invalid']
  ])('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await consentirReseau(PART, true, true, true)).toEqual({ status });
  });

  it('succès : la page est revalidée', async () => {
    rpc.mockResolvedValue('enregistre');
    await consentirReseau(PART, true, false, true);
    expect(revalidatePath).toHaveBeenCalledOnce();
  });
});
