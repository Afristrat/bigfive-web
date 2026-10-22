import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const select = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    // Les schémas zod du chargeur s'appliquent aux lignes simulées.
    select: async (table: string, query: string, schema: Parser) =>
      schema.parse(await select(table, query))
  })
}));

import {
  loadSynthese,
  parseCampaignId,
  peutLireSynthese
} from '@/lib/synthese-data';

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'resp@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const ORG_ID = '22222222-2222-4222-8222-222222222222';
const CAMPAIGN_ID = '33333333-3333-4333-8333-333333333333';
const G1 = '44444444-4444-4444-8444-444444444444';
const G2 = '55555555-5555-4555-8555-555555555555';
const G3 = '66666666-6666-4666-8666-666666666666';

type Handlers = {
  campaigns?: unknown[];
  groups?: unknown[];
  group_aggregates?: unknown[];
};

const reponses = (h: Handlers): void => {
  select.mockImplementation(async (table: string) => {
    if (table === 'campaigns') return h.campaigns ?? [];
    if (table === 'groups') return h.groups ?? [];
    if (table === 'group_aggregates') return h.group_aggregates ?? [];
    throw new Error(`Table inattendue : ${table}`);
  });
};

const campagne = (statut: string) => ({
  id: CAMPAIGN_ID,
  titre: 'Cohorte 1',
  statut
});

const ligne = (
  group_id: string,
  portee: 'groupe' | 'complement',
  domaine: string,
  effectif: number,
  moyenne: unknown,
  ecart_type: unknown
) => ({ group_id, portee, domaine, effectif, moyenne, ecart_type });

beforeEach(() => {
  select.mockReset();
});

describe('chargeur : périmètre de lecture (test statique sur le source)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/lib/synthese-data.ts'),
    'utf8'
  );

  it.each([
    'results',
    'participations',
    'group_members',
    'lire_resultat_individuel'
  ])('le source ne contient aucune occurrence de « %s »', (mot) => {
    expect(source).not.toContain(mot);
  });

  it('les seules tables interrogées sont group_aggregates, groups et campaigns', () => {
    const tables = [...source.matchAll(/\.select\(\s*'([a-z_]+)'/g)].map(
      (m) => m[1]
    );
    expect(tables.length).toBeGreaterThanOrEqual(3);
    expect(new Set(tables)).toEqual(
      new Set(['campaigns', 'groups', 'group_aggregates'])
    );
  });

  it('aucun appel de fonction SQL (rpc) dans le chargeur', () => {
    expect(source).not.toMatch(/\.rpc\(/);
  });
});

describe('parseCampaignId', () => {
  it('accepte un uuid, refuse le reste', () => {
    expect(parseCampaignId(CAMPAIGN_ID)).toBe(CAMPAIGN_ID);
    expect(parseCampaignId('abc')).toBeNull();
    expect(parseCampaignId('')).toBeNull();
    expect(parseCampaignId(undefined)).toBeNull();
    expect(parseCampaignId(`${CAMPAIGN_ID}&x=1`)).toBeNull();
  });
});

describe('peutLireSynthese', () => {
  it('responsable, consultant et administrateur Tenga : oui', () => {
    expect(peutLireSynthese({ isAdmin: false, role: 'responsable' })).toBe(
      true
    );
    expect(peutLireSynthese({ isAdmin: false, role: 'consultant' })).toBe(true);
    expect(peutLireSynthese({ isAdmin: true, role: null })).toBe(true);
  });

  it('participant ou sans rôle : non', () => {
    expect(peutLireSynthese({ isAdmin: false, role: 'participant' })).toBe(
      false
    );
    expect(peutLireSynthese({ isAdmin: false, role: null })).toBe(false);
  });
});

describe('loadSynthese', () => {
  it('campagne absente ou d’une autre organisation : null, sans lire les agrégats', async () => {
    reponses({ campaigns: [] });
    expect(await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID)).toBeNull();
    expect(select).toHaveBeenCalledTimes(1);
    const [table, query] = select.mock.calls[0] ?? [];
    expect(table).toBe('campaigns');
    expect(query).toContain(`id=eq.${CAMPAIGN_ID}`);
    expect(query).toContain(`organization_id=eq.${ORG_ID}`);
  });

  it.each(['brouillon', 'ouverte'])(
    'campagne %s : état non clos, sans lire ni groupes ni agrégats',
    async (statut) => {
      reponses({ campaigns: [campagne(statut)] });
      const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
      expect(result).toEqual({
        etat: 'non_close',
        campagne: { id: CAMPAIGN_ID, titre: 'Cohorte 1' }
      });
      expect(select.mock.calls.map((c) => c[0])).toEqual(['campaigns']);
    }
  );

  it('campagne close : groupes et agrégats lus pour CETTE campagne seulement', async () => {
    reponses({ campaigns: [campagne('close')] });
    await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    const tables = select.mock.calls.map((c) => c[0]);
    expect(tables.sort()).toEqual(['campaigns', 'group_aggregates', 'groups']);
    for (const [table, query] of select.mock.calls) {
      if (table === 'campaigns') continue;
      expect(query).toContain(`campaign_id=eq.${CAMPAIGN_ID}`);
    }
  });

  it('groupe publié : cinq domaines dans l’ordre N E O A C, avec moyenne et écart type', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G1, nom: 'Équipe A', ordre: 0 }],
      group_aggregates: [
        ligne(G1, 'groupe', 'C', 6, 84.5, 10.25),
        ligne(G1, 'groupe', 'N', 6, 60, 8),
        ligne(G1, 'groupe', 'O', 6, 90.1, 5),
        ligne(G1, 'groupe', 'E', 6, 72, 7.5),
        ligne(G1, 'groupe', 'A', 6, 80, 9)
      ]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    expect(result?.etat).toBe('prete');
    if (result?.etat !== 'prete') return;
    const [groupe] = result.groupes;
    expect(groupe?.publie).toBe(true);
    expect(groupe?.groupe.map((l) => l.domaine)).toEqual([
      'N',
      'E',
      'O',
      'A',
      'C'
    ]);
    expect(groupe?.groupe[0]).toEqual({
      domaine: 'N',
      effectif: 6,
      moyenne: 60,
      ecartType: 8
    });
    expect(groupe?.complement).toEqual([]);
  });

  it('numeric renvoyé en chaîne par la passerelle : converti en nombre', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G1, nom: 'A', ordre: 0 }],
      group_aggregates: [ligne(G1, 'groupe', 'N', 5, '61.25', '3.50')]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    if (result?.etat !== 'prete') throw new Error('état inattendu');
    expect(result.groupes[0]?.groupe[0]).toMatchObject({
      moyenne: 61.25,
      ecartType: 3.5
    });
  });

  it('groupe sans aucune ligne : non publié, sans effectif ni domaine', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G2, nom: 'Petit groupe', ordre: 0 }],
      group_aggregates: []
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    if (result?.etat !== 'prete') throw new Error('état inattendu');
    expect(result.groupes).toEqual([
      { id: G2, nom: 'Petit groupe', publie: false, groupe: [], complement: [] }
    ]);
    expect(JSON.stringify(result)).not.toContain('effectif');
  });

  it('ligne complement d’effectif 0 : moyenne et écart type nuls', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G1, nom: 'A', ordre: 0 }],
      group_aggregates: [
        ligne(G1, 'groupe', 'N', 8, 60, 8),
        ligne(G1, 'complement', 'N', 0, null, null)
      ]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    if (result?.etat !== 'prete') throw new Error('état inattendu');
    expect(result.groupes[0]?.complement).toEqual([
      { domaine: 'N', effectif: 0, moyenne: null, ecartType: null }
    ]);
  });

  it('groupes triés par ordre puis nom ; les lignes vont au bon groupe', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [
        { id: G3, nom: 'Zeta', ordre: 1 },
        { id: G1, nom: 'Beta', ordre: 0 },
        { id: G2, nom: 'Alpha', ordre: 0 }
      ],
      group_aggregates: [
        ligne(G3, 'groupe', 'N', 5, 50, 1),
        ligne(G1, 'groupe', 'N', 7, 70, 2)
      ]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    if (result?.etat !== 'prete') throw new Error('état inattendu');
    expect(result.groupes.map((g) => [g.nom, g.publie])).toEqual([
      ['Alpha', false],
      ['Beta', true],
      ['Zeta', true]
    ]);
    expect(result.groupes[1]?.groupe[0]?.moyenne).toBe(70);
    expect(result.groupes[2]?.groupe[0]?.moyenne).toBe(50);
  });

  it('égalité d’ordre : noms accentués comparés en français, indépendamment de la langue du serveur', async () => {
    const comparaison = vi.spyOn(String.prototype, 'localeCompare');
    reponses({
      campaigns: [campagne('close')],
      groups: [
        { id: G3, nom: 'Zèbre', ordre: 0 },
        { id: G1, nom: 'école', ordre: 0 },
        { id: G2, nom: 'abc', ordre: 0 }
      ]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    if (result?.etat !== 'prete') throw new Error('état inattendu');
    expect(result.groupes.map((g) => g.nom)).toEqual(['abc', 'école', 'Zèbre']);
    expect(comparaison).toHaveBeenCalled();
    for (const appel of comparaison.mock.calls) expect(appel[1]).toBe('fr');
    comparaison.mockRestore();
  });

  it('ligne d’un groupe inconnu, domaine inconnu ou portée inconnue : refusée par le schéma', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G1, nom: 'A', ordre: 0 }],
      group_aggregates: [ligne(G1, 'groupe', 'X', 5, 1, 1)]
    });
    await expect(loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID)).rejects.toThrow();
  });

  it('aucune valeur minimale ni maximale n’est exposée', async () => {
    reponses({
      campaigns: [campagne('close')],
      groups: [{ id: G1, nom: 'A', ordre: 0 }],
      group_aggregates: [ligne(G1, 'groupe', 'N', 5, 60, 8)]
    });
    const result = await loadSynthese(VIEWER, ORG_ID, CAMPAIGN_ID);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/min|max/i);
    for (const [, query] of select.mock.calls) {
      expect(String(query)).not.toMatch(/min|max/i);
    }
  });

  it('identifiants hors format : lève avant toute requête', async () => {
    await expect(loadSynthese(VIEWER, ORG_ID, 'x&y=1')).rejects.toThrow();
    await expect(loadSynthese(VIEWER, 'x', CAMPAIGN_ID)).rejects.toThrow();
    expect(select).not.toHaveBeenCalled();
  });
});
