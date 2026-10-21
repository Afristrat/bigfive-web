import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path)
}));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'resp@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  requireViewer: (locale: string, path: string) => requireViewer(locale, path)
}));

const rpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args))
  })
}));

import {
  closeCampaign,
  createCampaign,
  openCampaign
} from '@/actions/campaigns';
import { GatewayError } from '@/lib/supabase/server';

const ORG_ID = '22222222-2222-4222-8222-222222222222';
const CAMPAIGN_ID = '33333333-3333-4333-8333-333333333333';
const idle = { status: 'idle' } as const;

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const create = (over: Record<string, string> = {}): FormData =>
  form({
    organisation: ORG_ID,
    slug: 'acme',
    titre: 'Équipe commerciale',
    langue: 'fr',
    locale: 'fr',
    ...over
  });

const ident = (over: Record<string, string> = {}): FormData =>
  form({ campagne: CAMPAIGN_ID, slug: 'acme', locale: 'fr', ...over });

type Spy = ReturnType<typeof vi.spyOn> & {
  mock: { calls: unknown[][] };
};
const logged = (...spies: Spy[]): string =>
  spies
    .flatMap((spy) => spy.mock.calls.map((call: unknown[]) => String(call[0])))
    .join('\n');

let warn: Spy;
let error: Spy;

beforeEach(() => {
  revalidatePath.mockReset();
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  rpc.mockReset();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

describe('createCampaign', () => {
  it('création valide : RPC à trois paramètres, puis revalidation de la page', async () => {
    rpc.mockResolvedValue(CAMPAIGN_ID);
    expect(await createCampaign(idle, create())).toEqual({ status: 'created' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('creer_campagne', {
      p_organisation: ORG_ID,
      p_titre: 'Équipe commerciale',
      p_langue: 'fr'
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/o/acme');
    expect(requireViewer).toHaveBeenCalledWith('fr', '/o/acme');
  });

  it('exige une personne connectée avant toute lecture du formulaire', async () => {
    requireViewer.mockRejectedValue(new Error('REDIRECT:/fr/connexion'));
    await expect(createCampaign(idle, create())).rejects.toThrow('REDIRECT');
    expect(rpc).not.toHaveBeenCalled();
  });

  it('identifiant d’URL hors format : la redirection de connexion ne reprend pas la saisie', async () => {
    expect(await createCampaign(idle, create({ slug: '../x' }))).toEqual({
      status: 'invalid'
    });
    expect(requireViewer).toHaveBeenCalledWith('fr', '/mon-compte');
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['titre vide', { titre: '   ' }],
    ['titre de 161 caractères', { titre: 'x'.repeat(161) }],
    ['titre avec caractère de contrôle', { titre: 'a\u0007b' }],
    ['organisation qui n’est pas un uuid', { organisation: 'acme' }],
    ['langue inconnue', { langue: 'de' }]
  ])('%s : invalid sans appel', async (_name, over) => {
    expect(await createCampaign(idle, create(over))).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('42501 : forbidden, sans revalidation', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await createCampaign(idle, create())).toEqual({
      status: 'forbidden'
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('55000 (organisation archivée) : conflict', async () => {
    rpc.mockRejectedValue(new GatewayError(400, '55000'));
    expect(await createCampaign(idle, create())).toEqual({
      status: 'conflict'
    });
  });

  it('22023 : invalid', async () => {
    rpc.mockRejectedValue(new GatewayError(400, '22023'));
    expect(await createCampaign(idle, create())).toEqual({
      status: 'invalid'
    });
  });

  it('erreur réseau : error, journal sans identifiant, adresse ni titre', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'));
    expect(await createCampaign(idle, create())).toEqual({ status: 'error' });
    const text = logged(warn, error);
    expect(text).not.toBe('');
    for (const secret of [
      VIEWER.id,
      VIEWER.email,
      VIEWER.accessToken,
      ORG_ID,
      'Équipe commerciale'
    ]) {
      expect(text).not.toContain(secret);
    }
  });
});

describe('openCampaign', () => {
  it('ouvre la campagne par la RPC puis revalide', async () => {
    rpc.mockResolvedValue(null);
    expect(await openCampaign(idle, ident())).toEqual({ status: 'opened' });
    expect(rpc).toHaveBeenCalledWith('ouvrir_campagne', {
      p_campagne: CAMPAIGN_ID
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/o/acme');
  });

  it('campagne qui n’est pas un uuid : invalid sans appel', async () => {
    expect(await openCampaign(idle, ident({ campagne: 'x' }))).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('55000 (déjà ouverte ou close) : conflict', async () => {
    rpc.mockRejectedValue(new GatewayError(400, '55000'));
    expect(await openCampaign(idle, ident())).toEqual({ status: 'conflict' });
  });

  it('42501 : forbidden', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await openCampaign(idle, ident())).toEqual({ status: 'forbidden' });
  });

  it('erreur réseau : error', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'));
    expect(await openCampaign(idle, ident())).toEqual({ status: 'error' });
  });
});

describe('closeCampaign', () => {
  it('avec confirmation : clôt par la RPC puis revalide', async () => {
    rpc.mockResolvedValue(null);
    expect(await closeCampaign(idle, ident({ confirmer: 'oui' }))).toEqual({
      status: 'closed'
    });
    expect(rpc).toHaveBeenCalledWith('clore_campagne', {
      p_campagne: CAMPAIGN_ID
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/o/acme');
  });

  it('sans confirmation : invalid, aucune RPC (la clôture est irréversible)', async () => {
    expect(await closeCampaign(idle, ident())).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(['on', 'true', 'non', ''])(
    'confirmation « %s » : invalid, aucune RPC',
    async (value) => {
      expect(await closeCampaign(idle, ident({ confirmer: value }))).toEqual({
        status: 'invalid'
      });
      expect(rpc).not.toHaveBeenCalled();
    }
  );

  it('55000 (déjà close, ou pas ouverte) : conflict', async () => {
    rpc.mockRejectedValue(new GatewayError(400, '55000'));
    expect(await closeCampaign(idle, ident({ confirmer: 'oui' }))).toEqual({
      status: 'conflict'
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('42501 : forbidden', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await closeCampaign(idle, ident({ confirmer: 'oui' }))).toEqual({
      status: 'forbidden'
    });
  });

  it('erreur réseau : error, journal sans identifiant', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'));
    expect(await closeCampaign(idle, ident({ confirmer: 'oui' }))).toEqual({
      status: 'error'
    });
    const text = logged(warn, error);
    expect(text).not.toContain(CAMPAIGN_ID);
    expect(text).not.toContain(VIEWER.id);
  });
});
