import { beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const rpc = vi.fn();
const tokens: string[] = [];
const serviceClient = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => {
    serviceClient();
    throw new Error(
      'Le service role ne doit pas lire la liste des administrateurs'
    );
  },
  userClient: (token: string) => {
    tokens.push(token);
    return {
      rpc: async (fn: string, args: unknown, schema: Parser) =>
        schema.parse(await rpc(fn, args))
    };
  }
}));

import {
  loadTengaAdmins,
  notificationRecipients,
  type TengaAdmin
} from '@/lib/admin-data';
import { GatewayError } from '@/lib/supabase/server';

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'acteur@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const OTHER = '22222222-2222-4222-8222-222222222222';
const THIRD = '33333333-3333-4333-8333-333333333333';

const rows = [
  {
    user_id: VIEWER.id,
    adresse: 'acteur@tenga.test',
    ajoute_le: '2026-10-01T08:00:00+00:00',
    est_moi: true
  },
  {
    user_id: OTHER,
    adresse: 'nezha@tenga.test',
    ajoute_le: '2026-10-21T09:30:00+00:00',
    est_moi: false
  }
];

beforeEach(() => {
  rpc.mockReset();
  tokens.length = 0;
  serviceClient.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('loadTengaAdmins', () => {
  it('appelle la fonction SQL avec la session de l’administrateur, jamais le service role', async () => {
    rpc.mockResolvedValue(rows);
    await loadTengaAdmins(VIEWER);
    expect(rpc).toHaveBeenCalledWith('lister_administrateurs_tenga', {});
    expect(tokens).toEqual([VIEWER.accessToken]);
    expect(serviceClient).not.toHaveBeenCalled();
  });

  it('rend les lignes dans l’ordre reçu, en noms de domaine', async () => {
    rpc.mockResolvedValue(rows);
    expect(await loadTengaAdmins(VIEWER)).toEqual([
      {
        userId: VIEWER.id,
        adresse: 'acteur@tenga.test',
        ajouteLe: '2026-10-01T08:00:00+00:00',
        estMoi: true
      },
      {
        userId: OTHER,
        adresse: 'nezha@tenga.test',
        ajouteLe: '2026-10-21T09:30:00+00:00',
        estMoi: false
      }
    ]);
  });

  it('refus de la base : null, journal avec le code HTTP seul', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await loadTengaAdmins(VIEWER)).toBeNull();
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain('admin.list_failed');
    expect(logged).toContain('403');
  });

  it('réponse mal formée : null, sans adresse dans le journal', async () => {
    rpc.mockResolvedValue([{ ...rows[0], user_id: 'pas-un-uuid' }]);
    expect(await loadTengaAdmins(VIEWER)).toBeNull();
    expect(JSON.stringify(vi.mocked(console.warn).mock.calls)).not.toContain(
      'acteur@tenga.test'
    );
  });

  it('panne réseau : null aussi (l’écran se dégrade, la page reste utilisable)', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'));
    expect(await loadTengaAdmins(VIEWER)).toBeNull();
  });
});

describe('notificationRecipients', () => {
  const admin = (
    userId: string,
    adresse: string,
    estMoi = false
  ): TengaAdmin => ({
    userId,
    adresse,
    ajouteLe: '2026-10-21T09:30:00+00:00',
    estMoi
  });

  it('exclut l’acteur (est_moi) et la personne concernée', () => {
    const list = [
      admin(VIEWER.id, 'acteur@tenga.test', true),
      admin(OTHER, 'cible@tenga.test'),
      admin(THIRD, 'autre@tenga.test')
    ];
    expect(notificationRecipients(list, OTHER)).toEqual(['autre@tenga.test']);
  });

  it('liste réduite à l’acteur et à la cible : personne à prévenir', () => {
    const list = [
      admin(VIEWER.id, 'acteur@tenga.test', true),
      admin(OTHER, 'cible@tenga.test')
    ];
    expect(notificationRecipients(list, OTHER)).toEqual([]);
  });

  it('liste vide : aucun destinataire', () => {
    expect(notificationRecipients([], OTHER)).toEqual([]);
  });
});
