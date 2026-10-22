import { getItems } from '@bigfive-org/questions';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { calculerScores } from '@/lib/moteur';

type Parser = { parse: (value: unknown) => unknown };

const rpc = vi.fn();
const select = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    // Le schéma zod du chargeur s'applique aux lignes simulées.
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args)),
    select: async (table: string, query: string) => select(table, query)
  })
}));

import {
  loadMaParticipation,
  loadMesParticipations,
  parseParticipationId
} from '@/lib/mes-resultats-data';

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const P1 = '22222222-2222-4222-8222-222222222222';
const P2 = '33333333-3333-4333-8333-333333333333';
const P3 = '44444444-4444-4444-8444-444444444444';
const CAMPAGNE = '55555555-5555-4555-8555-555555555555';

const SCORES = calculerScores(
  Object.fromEntries(getItems('en').map((item) => [item.id, 3])),
  900
);

const ligne = (
  id: string,
  extra: Record<string, unknown> = {}
): Record<string, unknown> => ({
  participation_id: id,
  campagne_id: CAMPAGNE,
  campagne_titre: 'Cohorte 2026',
  organisation_nom: 'Atelier Atlas',
  organisation_slug: 'atelier-atlas',
  statut: 'terminee',
  ouverte_le: '2026-10-01T08:00:00+00:00',
  terminee_le: '2026-10-02T09:00:00+00:00',
  scores: SCORES,
  questionnaire_version: 'b5-120-ma-2026-10',
  calcul_version: 'tenga-somme-1',
  campagne_statut: 'close',
  ...extra
});

beforeEach(() => {
  rpc.mockReset();
  select.mockReset();
});

describe('parseParticipationId', () => {
  it('refuse tout ce qui n’est pas un uuid', () => {
    expect(parseParticipationId(P1)).toBe(P1);
    for (const mauvais of [
      '',
      'abc',
      "1' or '1'='1",
      `${P1}&select=*`,
      undefined,
      42
    ]) {
      expect(parseParticipationId(mauvais)).toBeNull();
    }
  });
});

describe('loadMesParticipations', () => {
  it('appelle app.mes_resultats avec l’identité de la personne, sans argument', async () => {
    rpc.mockResolvedValue([]);
    expect(await loadMesParticipations(VIEWER)).toEqual([]);
    expect(rpc).toHaveBeenCalledWith('mes_resultats', {});
  });

  it('traduit une ligne terminée en participation avec des scores lisibles', async () => {
    rpc.mockResolvedValue([ligne(P1)]);
    const [p] = await loadMesParticipations(VIEWER);
    expect(p).toMatchObject({
      participationId: P1,
      campagneId: CAMPAGNE,
      campagneTitre: 'Cohorte 2026',
      campagneStatut: 'close',
      organisationNom: 'Atelier Atlas',
      organisationSlug: 'atelier-atlas',
      statut: 'terminee',
      ouverteLe: '2026-10-01T08:00:00+00:00',
      termineeLe: '2026-10-02T09:00:00+00:00',
      questionnaireVersion: 'b5-120-ma-2026-10',
      calculVersion: 'tenga-somme-1',
      scoresIllisibles: false
    });
    expect(p?.scores?.N.score).toBe(72);
  });

  it('ligne sans résultat : scores null, version null, pas d’alerte de format', async () => {
    rpc.mockResolvedValue([
      ligne(P2, {
        statut: 'en_cours',
        terminee_le: null,
        scores: null,
        questionnaire_version: null,
        calcul_version: null,
        campagne_statut: 'ouverte'
      })
    ]);
    const [p] = await loadMesParticipations(VIEWER);
    expect(p).toMatchObject({
      statut: 'en_cours',
      termineeLe: null,
      scores: null,
      questionnaireVersion: null,
      calculVersion: null,
      scoresIllisibles: false
    });
  });

  it('scores d’un format inconnu : scores null et indicateur de format antérieur, sans lever', async () => {
    rpc.mockResolvedValue([ligne(P3, { scores: { O: { score: 62 } } })]);
    const [p] = await loadMesParticipations(VIEWER);
    expect(p?.scores).toBeNull();
    expect(p?.scoresIllisibles).toBe(true);
  });

  it('conserve l’ordre renvoyé par la base', async () => {
    rpc.mockResolvedValue([ligne(P1), ligne(P2), ligne(P3)]);
    const ids = (await loadMesParticipations(VIEWER)).map(
      (p) => p.participationId
    );
    expect(ids).toEqual([P1, P2, P3]);
  });

  it('refuse une réponse de forme inattendue (statut inconnu)', async () => {
    rpc.mockResolvedValue([ligne(P1, { statut: 'archivee' })]);
    await expect(loadMesParticipations(VIEWER)).rejects.toThrow();
  });
});

describe('loadMaParticipation', () => {
  it('identifiant non uuid : refusé AVANT toute requête', async () => {
    await expect(
      loadMaParticipation(VIEWER, "x' or true --")
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('retrouve la participation demandée parmi les siennes', async () => {
    rpc.mockResolvedValue([ligne(P1), ligne(P2, { scores: null })]);
    const p = await loadMaParticipation(VIEWER, P2);
    expect(p?.participationId).toBe(P2);
    expect(p?.scores).toBeNull();
  });

  it('participation d’une autre personne ou inexistante : null', async () => {
    rpc.mockResolvedValue([ligne(P1)]);
    expect(await loadMaParticipation(VIEWER, P3)).toBeNull();
  });

  it('ne lit jamais une table directement (aucune concaténation de requête)', async () => {
    rpc.mockResolvedValue([ligne(P1)]);
    await loadMaParticipation(VIEWER, P1);
    expect(select).not.toHaveBeenCalled();
  });
});
