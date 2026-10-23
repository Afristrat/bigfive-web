import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FACETTES, type ScoresTenga } from '@/lib/moteur';

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const BINOME = '44444444-4444-4444-8444-444444444444';
const PART_A = '66666666-6666-4666-8666-666666666666';
const PART_B = '77777777-7777-4777-8777-777777777777';
const SLUG = 'acme';
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';

const currentViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer()
}));

const rpc = vi.fn();
const select = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args)),
    select: async (...args: unknown[]) => select(...args)
  })
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path)
}));

import {
  proposerBinome,
  repondreBinome,
  retirerBinome,
  type PropositionState
} from '@/actions/binome';
import { loadBinome, loadMesBinomes, parseBinomeId } from '@/lib/binome-data';
import { GatewayError } from '@/lib/supabase/server';

beforeEach(() => {
  currentViewer.mockReset();
  currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
  rpc.mockReset();
  select.mockReset();
  revalidatePath.mockReset();
});

const formulaire = (champs: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) data.set(cle, valeur);
  return data;
};
const idle: PropositionState = { status: 'idle' };

// ---------------------------------------------------------------------------
// repondreBinome et retirerBinome.

describe('repondreBinome : la personne accepte ou refuse', () => {
  it('sans session : forbidden, aucun appel à la base', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await repondreBinome(BINOME, true)).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('session à renouveler : forbidden aussi, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'refresh' });
    expect(await repondreBinome(BINOME, true)).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('identifiant hors format ou accord qui n’est pas un booléen : invalid, aucun appel', async () => {
    expect(await repondreBinome('pas-un-uuid', true)).toEqual({
      status: 'invalid'
    });
    expect(await repondreBinome(BINOME, 'oui' as unknown as boolean)).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepter appelle repondre_binome avec l’identité de la personne et rend le statut de la base', async () => {
    rpc.mockResolvedValue('en_attente');
    expect(await repondreBinome(BINOME, true)).toEqual({
      status: 'en_attente'
    });
    expect(rpc).toHaveBeenCalledWith('repondre_binome', {
      p_binome: BINOME,
      p_accord: true
    });
    rpc.mockResolvedValue('actif');
    expect(await repondreBinome(BINOME, true)).toEqual({ status: 'actif' });
  });

  it('refuser envoie un accord faux et rend « retire »', async () => {
    rpc.mockResolvedValue('retire');
    expect(await repondreBinome(BINOME, false)).toEqual({ status: 'retire' });
    expect(rpc).toHaveBeenCalledWith('repondre_binome', {
      p_binome: BINOME,
      p_accord: false
    });
  });

  it.each([
    ['55000', 'closed'],
    ['P0002', 'notfound'],
    ['42501', 'forbidden'],
    ['22023', 'invalid']
  ])('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await repondreBinome(BINOME, true)).toEqual({ status });
  });

  it('panne de la passerelle ou réponse inattendue : failed, sans détail', async () => {
    rpc.mockRejectedValue(new GatewayError(502, null));
    expect(await repondreBinome(BINOME, true)).toEqual({ status: 'failed' });
    rpc.mockRejectedValue(new Error('réseau'));
    expect(await repondreBinome(BINOME, true)).toEqual({ status: 'failed' });
    rpc.mockResolvedValue('autre chose');
    expect(await repondreBinome(BINOME, true)).toEqual({ status: 'failed' });
  });

  it('le résultat ne contient ni jeton, ni adresse, ni identifiant', async () => {
    rpc.mockResolvedValue('actif');
    const sortie = JSON.stringify(await repondreBinome(BINOME, true));
    expect(sortie).not.toContain(VIEWER.accessToken);
    expect(sortie).not.toContain(VIEWER.email);
    expect(sortie).not.toContain(VIEWER.id);
    expect(sortie).not.toContain(BINOME);
  });
});

describe('retirerBinome : la personne retire son accord', () => {
  it('sans session : forbidden, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await retirerBinome(BINOME)).toEqual({ status: 'forbidden' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('envoie toujours un accord faux, jamais vrai', async () => {
    rpc.mockResolvedValue('retire');
    expect(await retirerBinome(BINOME)).toEqual({ status: 'retire' });
    expect(rpc).toHaveBeenCalledWith('repondre_binome', {
      p_binome: BINOME,
      p_accord: false
    });
  });

  it('proposition déjà retirée (55000) : closed', async () => {
    rpc.mockRejectedValue(new GatewayError(400, '55000'));
    expect(await retirerBinome(BINOME)).toEqual({ status: 'closed' });
  });

  it('identifiant hors format : invalid, aucun appel', async () => {
    expect(await retirerBinome('x')).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// proposerBinome : le consultant propose.

describe('proposerBinome : le consultant propose un binôme', () => {
  const champs = (surcharge: Record<string, string> = {}) =>
    formulaire({
      a: PART_A,
      b: PART_B,
      slug: SLUG,
      campagne: CAMPAGNE,
      locale: 'fr',
      ...surcharge
    });

  it('sans session : forbidden, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await proposerBinome(idle, champs())).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('une proposition valide appelle proposer_binome et rend l’identifiant du binôme', async () => {
    rpc.mockResolvedValue(BINOME);
    expect(await proposerBinome(idle, champs())).toEqual({
      status: 'proposed',
      binome: BINOME
    });
    expect(rpc).toHaveBeenCalledWith('proposer_binome', {
      p_a: PART_A,
      p_b: PART_B
    });
  });

  it.each([
    ['a absent', { a: '' }],
    ['b hors format', { b: 'pas-un-uuid' }],
    ['deux fois la même personne', { b: PART_A }]
  ])('%s : invalid, aucun appel', async (_, surcharge) => {
    expect(await proposerBinome(idle, champs(surcharge))).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['42501', 'forbidden'],
    ['22023', 'invalid'],
    ['23505', 'already']
  ])('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await proposerBinome(idle, champs())).toEqual({ status });
  });

  it('panne : error, sans détail', async () => {
    rpc.mockRejectedValue(new GatewayError(500, null));
    expect(await proposerBinome(idle, champs())).toEqual({ status: 'error' });
  });

  it('un identifiant de binôme illisible dans la réponse : error', async () => {
    rpc.mockResolvedValue('pas-un-uuid');
    expect(await proposerBinome(idle, champs())).toEqual({ status: 'error' });
  });
});

// ---------------------------------------------------------------------------
// Chargeurs.

const ligneMes = (surcharge: Record<string, unknown> = {}) => ({
  binome_id: BINOME,
  organisation_nom: 'Acme',
  ma_participation: PART_A,
  propose_le: '2026-10-20T10:00:00Z',
  statut: 'en_attente',
  mon_accord_le: null,
  autre_nom: 'Karim',
  ...surcharge
});

describe('loadMesBinomes : app.mes_binomes', () => {
  it('appelle la fonction sans argument et met en forme', async () => {
    rpc.mockResolvedValue([ligneMes(), ligneMes({ autre_nom: null })]);
    const rows = await loadMesBinomes(VIEWER);
    expect(rpc).toHaveBeenCalledWith('mes_binomes', {});
    expect(rows).toEqual([
      {
        binomeId: BINOME,
        organisationNom: 'Acme',
        maParticipation: PART_A,
        proposeLe: '2026-10-20T10:00:00Z',
        statut: 'en_attente',
        monAccordLe: null,
        autreNom: 'Karim'
      },
      expect.objectContaining({ autreNom: null })
    ]);
  });

  it('un statut inconnu de la base est refusé (jamais un affichage au hasard)', async () => {
    rpc.mockResolvedValue([ligneMes({ statut: 'bientot' })]);
    await expect(loadMesBinomes(VIEWER)).rejects.toThrow();
  });
});

describe('parseBinomeId', () => {
  it('rend la forme canonique d’un uuid, null sinon', () => {
    expect(parseBinomeId(BINOME)).toBe(BINOME);
    expect(parseBinomeId('pas-un-uuid')).toBeNull();
    expect(parseBinomeId(undefined)).toBeNull();
  });
});

// Scores complets, comme les rend la base pour la ligne de la personne.
const facettes = (domaine: string): Record<string, unknown> =>
  Object.fromEntries(
    [1, 2, 3, 4, 5, 6].map((f) => [
      String(f),
      { score: 12, count: 4, moyenne: 3, domaine, f }
    ])
  );
const scoresBase = (): Record<string, unknown> => ({
  format: 'tenga-scores-1',
  meta: { duree_secondes: null },
  ...Object.fromEntries(
    ['N', 'E', 'O', 'A', 'C'].map((d) => [
      d,
      { score: 72, count: 24, moyenne: 3, facettes: facettes(d) }
    ])
  )
});
// Ce que rend lire_binome pour la ligne de l'autre : O6 retirée (#- '{O,facettes,6}').
const scoresSansO6 = (): Record<string, unknown> => {
  const s = scoresBase();
  const o = s.O as { facettes: Record<string, unknown> };
  const { '6': _retiree, ...reste } = o.facettes;
  void _retiree;
  return { ...s, O: { ...o, facettes: reste } };
};

const ligneLue = (surcharge: Record<string, unknown> = {}) => ({
  participation_id: PART_A,
  cote: 'a',
  est_la_mienne: true,
  scores: scoresBase(),
  questionnaire_version: 'b5-120-ma-2026-10',
  calcul_version: 'tenga-somme-1',
  soumis_le: '2026-10-20T10:00:00Z',
  ...surcharge
});
const deuxLignes = () => [
  ligneLue(),
  ligneLue({
    participation_id: PART_B,
    cote: 'b',
    est_la_mienne: false,
    scores: scoresSansO6()
  })
];

describe('loadBinome : app.lire_binome', () => {
  it('identifiant hors format : lève avant toute requête', async () => {
    await expect(loadBinome(VIEWER, 'pas-un-uuid')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('appelle la fonction journalisée et jamais un select', async () => {
    rpc.mockResolvedValue(deuxLignes());
    await loadBinome(VIEWER, BINOME);
    expect(rpc).toHaveBeenCalledWith('lire_binome', { p_binome: BINOME });
    expect(select).not.toHaveBeenCalled();
  });

  it('rend les deux personnes dans l’ordre de la base, avec leurs scores lisibles', async () => {
    rpc.mockResolvedValue(deuxLignes());
    const lu = await loadBinome(VIEWER, BINOME);
    expect(lu?.binomeId).toBe(BINOME);
    expect(lu?.personnes.map((p) => p.participationId)).toEqual([
      PART_A,
      PART_B
    ]);
    expect(lu?.personnes.map((p) => p.estLaMienne)).toEqual([true, false]);
    expect(lu?.personnes.every((p) => p.scores !== null)).toBe(true);
  });

  it('la ligne de l’autre personne n’a pas O6 : le chargeur la lit sans erreur, la valeur de O6 est neutre', async () => {
    rpc.mockResolvedValue(deuxLignes());
    const lu = await loadBinome(VIEWER, BINOME);
    const autre: ScoresTenga | null | undefined = lu?.personnes[1]?.scores;
    expect(autre).not.toBeNull();
    expect(autre?.O.facettes['6']).toEqual({ score: 12, count: 4, moyenne: 3 });
    // Les cinq autres facettes de O et les autres domaines gardent leurs valeurs.
    expect(autre?.O.facettes['1']?.moyenne).toBe(3);
    expect(FACETTES).toHaveLength(30);
  });

  it('les réponses brutes éventuelles de la base ne sortent pas du chargeur', async () => {
    rpc.mockResolvedValue(
      deuxLignes().map((l) => ({ ...l, reponses: { Q1: 5 } }))
    );
    const lu = await loadBinome(VIEWER, BINOME);
    expect(JSON.stringify(lu)).not.toContain('reponses');
  });

  it('scores illisibles : la personne correspondante a scores null, jamais une erreur', async () => {
    const lignes = deuxLignes();
    lignes[0] = ligneLue({ scores: { format: 'ancien' } });
    rpc.mockResolvedValue(lignes);
    const lu = await loadBinome(VIEWER, BINOME);
    expect(lu?.personnes[0]?.scores).toBeNull();
    expect(lu?.personnes[1]?.scores).not.toBeNull();
  });

  it.each([
    ['42501 : interdit ou inexistant', new GatewayError(403, '42501')],
    ['403 sans code', new GatewayError(403, null)],
    ['401', new GatewayError(401, null)],
    [
      '55000 : un accord manque, binôme retiré ou résultat purgé',
      new GatewayError(400, '55000')
    ]
  ])('%s : null, donc 404', async (_, erreur) => {
    rpc.mockRejectedValue(erreur);
    expect(await loadBinome(VIEWER, BINOME)).toBeNull();
  });

  it('une panne de la passerelle n’est pas avalée', async () => {
    rpc.mockRejectedValue(new GatewayError(502, null));
    await expect(loadBinome(VIEWER, BINOME)).rejects.toThrow();
  });

  it('autre chose que deux lignes : null (jamais un rapport à moitié)', async () => {
    rpc.mockResolvedValue([ligneLue()]);
    expect(await loadBinome(VIEWER, BINOME)).toBeNull();
    rpc.mockResolvedValue([]);
    expect(await loadBinome(VIEWER, BINOME)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Contrats de source : ce que les modules n'ont pas le droit de faire.

const source = (relatif: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../src/${relatif}`, import.meta.url)),
    'utf8'
  );

describe('contrats de source', () => {
  it('le chargeur ne lit ni results, ni participations, ni binomes en direct, et n’utilise pas la clé de service', () => {
    const s = source('lib/binome-data.ts');
    expect(s).not.toMatch(/\.select\(/);
    expect(s).not.toMatch(/['"`]results['"`]/);
    expect(s).not.toMatch(/['"`]participations['"`]/);
    expect(s).not.toMatch(/['"`]binomes['"`]/);
    expect(s).not.toContain('serviceClient');
    expect(s).toContain("'lire_binome'");
    expect(s).toContain("'mes_binomes'");
  });

  it('les actions n’écrivent jamais dans une table et n’utilisent pas la clé de service', () => {
    const s = source('actions/binome.ts');
    expect(s).not.toMatch(/\.select\(/);
    expect(s).not.toContain('serviceClient');
    expect(s.startsWith("'use server'")).toBe(true);
  });

  it('le composant de consentement est client et n’atteint pas le module serveur Supabase', () => {
    const s = source('components/rapports/binome-consent.tsx');
    expect(s.startsWith("'use client'")).toBe(true);
    expect(s).not.toContain('supabase/server');
  });

  it('la construction pure n’importe aucun accès aux données', () => {
    const s = source('lib/rapports/binome.ts');
    expect(s).not.toContain('supabase');
    expect(s).not.toContain('binome-data');
  });
});
