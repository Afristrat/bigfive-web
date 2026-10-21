import { beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const select = vi.fn();
const rpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    // Les schémas zod des chargeurs s'appliquent aux lignes simulées.
    select: async (table: string, query: string, schema: Parser) =>
      schema.parse(await select(table, query)),
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args))
  })
}));

const isTengaAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  isTengaAdmin: (viewer: unknown) => isTengaAdmin(viewer)
}));

import {
  loadCampaignStats,
  loadCampaigns,
  loadOrgPage
} from '@/lib/campaign-data';

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'resp@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const CAMPAIGN_ID = '33333333-3333-4333-8333-333333333333';
const ORG_ROW = { id: ORG_ID, nom: 'Acme', slug: 'acme', statut: 'active' };

beforeEach(() => {
  select.mockReset();
  rpc.mockReset();
  isTengaAdmin.mockReset().mockResolvedValue(false);
});

describe('loadOrgPage', () => {
  it('lit l’organisation par son identifiant d’URL, puis l’appartenance FILTRÉE sur l’utilisateur', async () => {
    select.mockImplementation(async (table: string) =>
      table === 'organizations' ? [ORG_ROW] : [{ role: 'responsable' }]
    );
    const page = await loadOrgPage(VIEWER, 'acme');
    expect(page).toEqual({
      org: ORG_ROW,
      isAdmin: false,
      role: 'responsable'
    });
    const [orgCall, memberCall] = select.mock.calls;
    expect(orgCall?.[0]).toBe('organizations');
    expect(orgCall?.[1]).toContain('slug=eq.acme');
    expect(memberCall?.[0]).toBe('memberships');
    expect(memberCall?.[1]).toContain(`organization_id=eq.${ORG_ID}`);
    expect(memberCall?.[1]).toContain(`user_id=eq.${VIEWER.id}`);
  });

  it('organisation absente (ou invisible) : null, sans lire les appartenances', async () => {
    select.mockResolvedValue([]);
    expect(await loadOrgPage(VIEWER, 'acme')).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('administrateur non membre : isAdmin vrai, rôle null', async () => {
    isTengaAdmin.mockResolvedValue(true);
    select.mockImplementation(async (table: string) =>
      table === 'organizations' ? [ORG_ROW] : []
    );
    expect(await loadOrgPage(VIEWER, 'acme')).toEqual({
      org: ORG_ROW,
      isAdmin: true,
      role: null
    });
  });

  it('consultant : rôle lu, jamais administrateur', async () => {
    select.mockImplementation(async (table: string) =>
      table === 'organizations' ? [ORG_ROW] : [{ role: 'consultant' }]
    );
    const page = await loadOrgPage(VIEWER, 'acme');
    expect(page?.role).toBe('consultant');
    expect(page?.isAdmin).toBe(false);
  });

  it.each(['acme&x=1', 'ac/me', 'a', '', 'ac--me', 'Ac me'])(
    'identifiant d’URL hors format « %s » : lève avant tout appel',
    async (slug) => {
      await expect(loadOrgPage(VIEWER, slug)).rejects.toThrow();
      expect(select).not.toHaveBeenCalled();
      expect(isTengaAdmin).not.toHaveBeenCalled();
    }
  );
});

describe('loadCampaigns', () => {
  it('lit les campagnes de l’organisation, de la plus récente à la plus ancienne', async () => {
    const row = {
      id: CAMPAIGN_ID,
      titre: 'Équipe commerciale',
      langue: 'fr',
      statut: 'brouillon',
      cree_le: '2026-10-21T08:00:00Z'
    };
    select.mockResolvedValue([row]);
    expect(await loadCampaigns(VIEWER, ORG_ID)).toEqual([row]);
    expect(select.mock.calls[0]?.[0]).toBe('campaigns');
    expect(select.mock.calls[0]?.[1]).toContain(`organization_id=eq.${ORG_ID}`);
    expect(select.mock.calls[0]?.[1]).toContain('order=cree_le.desc');
  });

  it('identifiant d’organisation qui n’est pas un uuid : lève avant tout appel', async () => {
    await expect(loadCampaigns(VIEWER, `${ORG_ID}&x=1`)).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});

describe('loadCampaignStats', () => {
  it('appelle informer_responsable et renomme les effectifs', async () => {
    rpc.mockResolvedValue([
      {
        statut_campagne: 'ouverte',
        participants: 5,
        en_cours: 2,
        termines: 3,
        invitations_en_attente: 7
      }
    ]);
    expect(await loadCampaignStats(VIEWER, CAMPAIGN_ID)).toEqual({
      participants: 5,
      enCours: 2,
      termines: 3,
      enAttente: 7
    });
    expect(rpc).toHaveBeenCalledWith('informer_responsable', {
      p_campagne: CAMPAIGN_ID
    });
  });

  it('aucune ligne : null', async () => {
    rpc.mockResolvedValue([]);
    expect(await loadCampaignStats(VIEWER, CAMPAIGN_ID)).toBeNull();
  });

  it('identifiant de campagne qui n’est pas un uuid : lève avant tout appel', async () => {
    await expect(loadCampaignStats(VIEWER, 'x')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
