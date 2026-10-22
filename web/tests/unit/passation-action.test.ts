import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getItems } from '@bigfive-org/questions';

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const PARTICIPATION = '22222222-2222-4222-8222-222222222222';
const AUTRE = '33333333-3333-4333-8333-333333333333';

const currentViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer()
}));

const order: string[] = [];
const rpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) => {
      order.push(`rpc:${fn}`);
      return schema.parse(await rpc(fn, args));
    }
  })
}));

const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  isRateLimited: (action: string, limit: unknown, subject?: string) =>
    isRateLimited(action, limit, subject)
}));

vi.mock('@/lib/moteur', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/moteur')>();
  return {
    ...original,
    calculerScores: (...args: Parameters<typeof original.calculerScores>) => {
      order.push('calculerScores');
      return original.calculerScores(...args);
    }
  };
});

import { submitParticipation } from '@/actions/passation';
import {
  loadParticipationOuverte,
  loadParticipationsAPasser
} from '@/lib/passation-data';
import { limits } from '@/lib/rate-limit';
import { QUESTIONNAIRE_VERSION } from '@/lib/question-overrides';
import { GatewayError } from '@/lib/supabase/server';
import { CALCUL_VERSION, calculerScores, lireScores } from '@/lib/moteur';
import type { DbResult } from '@/types';

const ITEMS = getItems('en');

const resultat = (over: Partial<DbResult> = {}): DbResult => ({
  testId: 'b5-120',
  lang: 'fr',
  invalid: false,
  timeElapsed: 1234,
  dateStamp: new Date('2026-10-21T10:00:00Z'),
  answers: ITEMS.map((item, i) => ({
    id: item.id,
    score: (i % 5) + 1,
    domain: item.domain,
    facet: item.facet
  })),
  ...over
});

beforeEach(() => {
  order.length = 0;
  currentViewer.mockReset().mockResolvedValue({ status: 'ok', viewer: VIEWER });
  rpc.mockReset().mockResolvedValue(PARTICIPATION);
  isRateLimited.mockReset().mockResolvedValue(false);
});

describe('submitParticipation : contrôle de session', () => {
  it('refuse sans session et ne touche ni la base ni le limiteur', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status: 'forbidden' });
    expect(rpc).not.toHaveBeenCalled();
    expect(isRateLimited).not.toHaveBeenCalled();
  });

  it('refuse une session à renouveler (une action ne peut pas poser de cookie)', async () => {
    currentViewer.mockResolvedValue({ status: 'refresh' });
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status: 'forbidden' });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('submitParticipation : validation avant tout appel', () => {
  it('refuse un identifiant de participation qui n’est pas un uuid', async () => {
    const outcome = await submitParticipation('pas-un-uuid', resultat());
    expect(outcome).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['119 réponses', () => resultat({ answers: resultat().answers.slice(1) })],
    [
      'une valeur hors de 1 à 5',
      () => {
        const r = resultat();
        return resultat({
          answers: r.answers.map((a, i) => (i === 0 ? { ...a, score: 6 } : a))
        });
      }
    ],
    [
      'une question inconnue',
      () => {
        const r = resultat();
        return resultat({
          answers: r.answers.map((a, i) =>
            i === 0 ? { ...a, id: 'inconnue' } : a
          )
        });
      }
    ],
    ['une charge null', () => null as unknown as DbResult]
  ])('refuse %s sans appeler la base', async (_nom, fabrique) => {
    const outcome = await submitParticipation(PARTICIPATION, fabrique());
    expect(outcome).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('respecte le plafond par utilisateur (limits.saveTest) sans appeler la base', async () => {
    isRateLimited.mockResolvedValue(true);
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status: 'failed' });
    expect(isRateLimited).toHaveBeenCalledWith(
      'saveTest',
      limits.saveTest,
      VIEWER.id
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('submitParticipation : appel de la base', () => {
  it('calcule les scores puis appelle app.soumettre_resultat, dans cet ordre', async () => {
    await submitParticipation(PARTICIPATION, resultat());
    expect(order).toEqual(['calculerScores', 'rpc:soumettre_resultat']);
  });

  it('remet des réponses 1 à 5 et des scores conformes à lireScores', async () => {
    const r = resultat();
    const outcome = await submitParticipation(PARTICIPATION, r);
    expect(outcome).toEqual({
      status: 'ok',
      href: `/mes-resultats/${PARTICIPATION}`
    });
    const [fn, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe('soumettre_resultat');
    expect(Object.keys(args).sort()).toEqual([
      'p_calcul_version',
      'p_participation',
      'p_questionnaire_version',
      'p_reponses',
      'p_scores'
    ]);
    expect(args.p_participation).toBe(PARTICIPATION);
    expect(args.p_questionnaire_version).toBe(QUESTIONNAIRE_VERSION);
    expect(args.p_calcul_version).toBe(CALCUL_VERSION);
    const reponses = args.p_reponses as Record<string, number>;
    expect(Object.keys(reponses)).toHaveLength(120);
    expect(
      Object.values(reponses).every((v) => Number.isInteger(v) && v >= 1)
    ).toBe(true);
    const lus = lireScores(args.p_scores);
    expect(lus).not.toBeNull();
    expect(lus?.format).toBe('tenga-scores-1');
    expect(lus?.meta.duree_secondes).toBe(1234);
  });

  it('timeElapsed à 0 (passation reprise) : durée inconnue, jamais « 0 seconde »', async () => {
    await submitParticipation(PARTICIPATION, resultat({ timeElapsed: 0 }));
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(lireScores(args.p_scores)?.meta.duree_secondes).toBeNull();
  });

  it('timeElapsed positif : conservé tel quel', async () => {
    await submitParticipation(PARTICIPATION, resultat({ timeElapsed: 1 }));
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(lireScores(args.p_scores)?.meta.duree_secondes).toBe(1);
  });

  it('relit domaine et facette côté serveur : ceux du client sont ignorés', async () => {
    const r = resultat();
    const truquees = resultat({
      answers: r.answers.map((a) => ({ ...a, domain: 'O', facet: 1 }))
    });
    await submitParticipation(PARTICIPATION, truquees);
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    const attendus = calculerScores(
      Object.fromEntries(r.answers.map((a) => [a.id, a.score])),
      1234
    );
    expect(args.p_scores).toEqual(attendus);
  });

  it('ne laisse fuir ni adresse ni jeton dans le résultat', async () => {
    const ok = await submitParticipation(PARTICIPATION, resultat());
    rpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    const ko = await submitParticipation(PARTICIPATION, resultat());
    for (const outcome of [ok, ko]) {
      const texte = JSON.stringify(outcome);
      expect(texte).not.toContain(VIEWER.email);
      expect(texte).not.toContain(VIEWER.accessToken);
    }
  });

  it.each([
    ['55000', 'closed'],
    ['23505', 'already'],
    ['22023', 'invalid'],
    ['42501', 'forbidden'],
    ['P0002', 'forbidden'],
    ['XX000', 'failed'],
    [null, 'failed']
  ])('code SQL %s donne %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status });
  });

  it('une panne réseau donne failed', async () => {
    rpc.mockRejectedValue(new Error('ECONNRESET'));
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status: 'failed' });
  });

  it('une réponse de la base qui n’est pas un uuid donne failed', async () => {
    rpc.mockResolvedValue('pas un uuid');
    const outcome = await submitParticipation(PARTICIPATION, resultat());
    expect(outcome).toEqual({ status: 'failed' });
  });
});

const ligne = (
  over: Record<string, unknown> = {}
): Record<string, unknown> => ({
  participation_id: PARTICIPATION,
  campagne_id: '44444444-4444-4444-8444-444444444444',
  campagne_titre: 'Équipe commerciale',
  organisation_nom: 'Acme',
  organisation_slug: 'acme',
  statut: 'ouverte',
  ouverte_le: '2026-10-01T08:00:00Z',
  terminee_le: null,
  scores: null,
  questionnaire_version: null,
  calcul_version: null,
  campagne_statut: 'ouverte',
  ...over
});

describe('loadParticipationOuverte (RPC app.mes_resultats)', () => {
  it('trouve la participation de la personne', async () => {
    rpc.mockResolvedValue([ligne()]);
    const trouvee = await loadParticipationOuverte(VIEWER, PARTICIPATION);
    expect(rpc).toHaveBeenCalledWith('mes_resultats', {});
    expect(trouvee).toEqual({
      participationId: PARTICIPATION,
      campagneId: '44444444-4444-4444-8444-444444444444',
      campagneTitre: 'Équipe commerciale',
      campagneStatut: 'ouverte',
      organisationNom: 'Acme',
      organisationSlug: 'acme',
      statut: 'ouverte'
    });
  });

  it('renvoie null pour la participation d’un autre compte (absente de la liste)', async () => {
    rpc.mockResolvedValue([ligne({ participation_id: AUTRE })]);
    expect(await loadParticipationOuverte(VIEWER, PARTICIPATION)).toBeNull();
  });

  it('renvoie null sans appeler la base si l’identifiant n’est pas un uuid', async () => {
    expect(await loadParticipationOuverte(VIEWER, 'x')).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('refuse une ligne de statut inconnu (la valeur lue est validée)', async () => {
    rpc.mockResolvedValue([ligne({ campagne_statut: 'archivee' })]);
    await expect(
      loadParticipationOuverte(VIEWER, PARTICIPATION)
    ).rejects.toThrow();
  });
});

describe('loadParticipationsAPasser', () => {
  it('ne garde que les participations ouvertes ou en cours d’une campagne ouverte', async () => {
    const ids = [1, 2, 3, 4].map(
      (n) => `${n}`.repeat(8) + '-1111-4111-8111-111111111111'
    );
    rpc.mockResolvedValue([
      ligne({ participation_id: ids[0], statut: 'ouverte' }),
      ligne({ participation_id: ids[1], statut: 'en_cours' }),
      ligne({ participation_id: ids[2], statut: 'terminee' }),
      ligne({
        participation_id: ids[3],
        statut: 'ouverte',
        campagne_statut: 'close'
      })
    ]);
    const liste = await loadParticipationsAPasser(VIEWER);
    expect(liste.map((p) => p.participationId)).toEqual([ids[0], ids[1]]);
  });
});
