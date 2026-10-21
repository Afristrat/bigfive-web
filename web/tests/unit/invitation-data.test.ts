import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';

const rpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  // Comme le vrai client : la réponse passe par le schéma fourni par l'appelant.
  serviceClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>, schema: z.ZodType) =>
      schema.parse(await rpc(fn, args))
  })
}));

import { GatewayError } from '@/lib/supabase/server';
import { loadInvitation } from '@/lib/invitation-data';

const TOKEN = `${'Zx9_-'.repeat(8)}Zx9`;

const ROW = {
  email: 'ines@exemple.ma',
  prenom: 'Inès',
  langue: 'fr',
  message: 'Bienvenue.',
  campagne_titre: 'Cohorte 2026',
  organisation_nom: 'Atelier Atlas',
  expire: '2026-11-20T10:00:00+00:00'
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue([ROW]);
});

describe('loadInvitation : forme du jeton, avant toute requête', () => {
  it('accepte un jeton de 43 caractères et appelle consulter_invitation', async () => {
    expect(TOKEN).toHaveLength(43);
    await expect(loadInvitation(TOKEN)).resolves.toEqual(ROW);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('consulter_invitation', {
      p_jeton: TOKEN
    });
  });

  it.each([
    ['42 caractères', TOKEN.slice(0, 42)],
    ['44 caractères', `${TOKEN}a`],
    ['une barre oblique', `${TOKEN.slice(0, 42)}/`],
    ['un plus', `${TOKEN.slice(0, 42)}+`],
    ['un égal', `${TOKEN.slice(0, 42)}=`],
    ['un espace', `${TOKEN.slice(0, 42)} `],
    ['un saut de ligne final', `${TOKEN}\n`],
    ['une chaîne vide', ''],
    ['un caractère accentué', `${TOKEN.slice(0, 42)}é`]
  ])('refuse %s sans aucune requête', async (_label, token) => {
    await expect(loadInvitation(token)).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([[null], [undefined], [43], [{}], [['a']]])(
    'refuse une valeur qui n’est pas une chaîne (%s) sans requête',
    async (value) => {
      await expect(loadInvitation(value)).resolves.toBeNull();
      expect(rpc).not.toHaveBeenCalled();
    }
  );
});

describe('loadInvitation : réponse de la base', () => {
  it('renvoie null quand aucune ligne ne correspond (inconnu, expiré, utilisé, campagne close)', async () => {
    rpc.mockResolvedValue([]);
    await expect(loadInvitation(TOKEN)).resolves.toBeNull();
  });

  it('accepte un prénom et un message absents (null)', async () => {
    rpc.mockResolvedValue([{ ...ROW, prenom: null, message: null }]);
    await expect(loadInvitation(TOKEN)).resolves.toMatchObject({
      prenom: null,
      message: null
    });
  });

  it('refuse une ligne qui n’a pas la forme attendue (champ manquant)', async () => {
    const { organisation_nom: _omitted, ...incomplete } = ROW;
    rpc.mockResolvedValue([incomplete]);
    await expect(loadInvitation(TOKEN)).rejects.toThrow();
  });

  it('refuse une réponse qui n’est pas une liste', async () => {
    rpc.mockResolvedValue(ROW);
    await expect(loadInvitation(TOKEN)).rejects.toThrow();
  });

  it('laisse remonter une panne de la passerelle (distincte du jeton inconnu)', async () => {
    rpc.mockRejectedValue(new GatewayError(503, null));
    await expect(loadInvitation(TOKEN)).rejects.toBeInstanceOf(GatewayError);
  });

  it('ne consomme rien : un seul appel de lecture, jamais accepter_invitation', async () => {
    await loadInvitation(TOKEN);
    expect(rpc.mock.calls.map(([fn]) => fn)).toEqual(['consulter_invitation']);
  });
});
