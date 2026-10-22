import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getItems } from '@bigfive-org/questions';

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const PARTICIPATION = '22222222-2222-4222-8222-222222222222';

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
    select: async (table: string, query: string, schema: Parser) =>
      schema.parse(await select(table, query))
  })
}));

const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  isRateLimited: (action: string, limit: unknown, subject?: string) =>
    isRateLimited(action, limit, subject)
}));

import { saveProgress } from '@/actions/passation';
import { loadTentative, versReprise } from '@/lib/passation-data';
import { limits } from '@/lib/rate-limit';
import { QUESTIONNAIRE_VERSION } from '@/lib/question-overrides';
import { GatewayError } from '@/lib/supabase/server';
import {
  creerFileProgression,
  type ProgressNotice,
  type Reprise,
  type SurveyProps
} from '@/app/[locale]/test/survey';
import type { Answer } from '@/types';

const ITEMS = getItems('en');

const reponse = (index: number, score = 3): Answer => ({
  id: ITEMS[index].id,
  score,
  domain: ITEMS[index].domain,
  facet: ITEMS[index].facet
});

const reponses = (n: number): Answer[] =>
  Array.from({ length: n }, (_, i) => reponse(i, (i % 5) + 1));

beforeEach(() => {
  currentViewer.mockReset().mockResolvedValue({ status: 'ok', viewer: VIEWER });
  rpc.mockReset().mockResolvedValue(1);
  select.mockReset().mockResolvedValue([]);
  isRateLimited.mockReset().mockResolvedValue(false);
});

describe('saveProgress : contrôle de session', () => {
  it('refuse sans session et ne touche ni la base ni le limiteur', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status: 'failed'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(isRateLimited).not.toHaveBeenCalled();
  });

  it('refuse une session à renouveler', async () => {
    currentViewer.mockResolvedValue({ status: 'refresh' });
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status: 'failed'
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('saveProgress : validation avant tout appel', () => {
  it.each([
    ['un identifiant qui n’est pas un uuid', 'pas-un-uuid', 0, reponses(2)],
    ['une révision négative', PARTICIPATION, -1, reponses(2)],
    ['une révision décimale', PARTICIPATION, 1.5, reponses(2)],
    ['une révision NaN', PARTICIPATION, Number.NaN, reponses(2)],
    ['aucune réponse', PARTICIPATION, 0, []],
    ['une valeur hors de 1 à 5', PARTICIPATION, 0, [reponse(0, 6)]],
    ['une valeur décimale', PARTICIPATION, 0, [reponse(0, 2.5)]],
    [
      'une question inconnue',
      PARTICIPATION,
      0,
      [{ ...reponse(0), id: 'inconnue' }]
    ],
    ['une même question deux fois', PARTICIPATION, 0, [reponse(0), reponse(0)]],
    ['plus de 120 réponses', PARTICIPATION, 0, [...reponses(120), reponse(0)]],
    ['une charge null', PARTICIPATION, 0, null as unknown as readonly Answer[]]
  ])('refuse %s sans appeler la base', async (_nom, id, revision, answers) => {
    expect(await saveProgress(id, revision, answers)).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('applique un plafond propre à la progression, plus large que saveTest', async () => {
    isRateLimited.mockResolvedValue(true);
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status: 'failed'
    });
    expect(isRateLimited).toHaveBeenCalledTimes(1);
    const [action, limit, subject] = isRateLimited.mock.calls[0] as [
      string,
      { max: number },
      string
    ];
    expect(action).toBe('saveProgress');
    expect(subject).toBe(VIEWER.id);
    expect(limit.max).toBeGreaterThanOrEqual(240);
    expect(limit.max).toBeGreaterThan(limits.saveTest.max);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('saveProgress : appel de la base', () => {
  it('première sauvegarde : révision attendue 0, nouvelle révision 1', async () => {
    rpc.mockResolvedValue(1);
    const answers = reponses(3);
    const outcome = await saveProgress(PARTICIPATION, 0, answers);
    expect(outcome).toEqual({ status: 'ok', revision: 1 });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('enregistrer_progression', {
      p_participation: PARTICIPATION,
      p_revision: 0,
      p_reponses: Object.fromEntries(answers.map((a) => [a.id, a.score])),
      p_questionnaire_version: QUESTIONNAIRE_VERSION
    });
  });

  it('sauvegarde suivante : la révision attendue est transmise telle quelle', async () => {
    rpc.mockResolvedValue(4);
    const outcome = await saveProgress(PARTICIPATION, 3, reponses(5));
    expect(outcome).toEqual({ status: 'ok', revision: 4 });
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_revision).toBe(3);
  });

  it('n’envoie que des réponses 1 à 5 : domaine et facette du client ne partent pas', async () => {
    await saveProgress(PARTICIPATION, 0, [
      { ...reponse(0), domain: 'O', facet: 6 }
    ]);
    const [, args] = rpc.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_reponses).toEqual({ [ITEMS[0].id]: 3 });
  });

  it('conflit 40001 : renvoie conflict avec la révision et les réponses du serveur', async () => {
    rpc.mockRejectedValue(new GatewayError(409, '40001'));
    select.mockResolvedValue([
      { revision: 7, reponses: { [ITEMS[0].id]: 5, [ITEMS[1].id]: 2 } }
    ]);
    const outcome = await saveProgress(PARTICIPATION, 3, reponses(2));
    expect(outcome).toEqual({
      status: 'conflict',
      revision: 7,
      reponses: { [ITEMS[0].id]: 5, [ITEMS[1].id]: 2 }
    });
    expect(select).toHaveBeenCalledTimes(1);
    expect(select.mock.calls[0][0]).toBe('attempts');
  });

  it('conflit 40001 sans tentative lisible : révision 0 et aucune réponse', async () => {
    rpc.mockRejectedValue(new GatewayError(409, '40001'));
    select.mockResolvedValue([]);
    expect(await saveProgress(PARTICIPATION, 3, reponses(2))).toEqual({
      status: 'conflict',
      revision: 0,
      reponses: {}
    });
  });

  it('conflit 40001 dont la relecture échoue : failed', async () => {
    rpc.mockRejectedValue(new GatewayError(409, '40001'));
    select.mockRejectedValue(new Error('ECONNRESET'));
    expect(await saveProgress(PARTICIPATION, 3, reponses(2))).toEqual({
      status: 'failed'
    });
  });

  it.each([
    ['55000', 'closed'],
    ['23505', 'closed'],
    ['22023', 'invalid'],
    ['42501', 'failed'],
    ['P0002', 'failed'],
    ['XX000', 'failed'],
    [null, 'failed']
  ])('code SQL %s donne %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status
    });
  });

  it('une panne réseau donne failed', async () => {
    rpc.mockRejectedValue(new Error('ECONNRESET'));
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status: 'failed'
    });
  });

  it('une révision renvoyée qui n’est pas un entier donne failed', async () => {
    rpc.mockResolvedValue('un');
    expect(await saveProgress(PARTICIPATION, 0, reponses(2))).toEqual({
      status: 'failed'
    });
  });

  it('ne laisse fuir ni adresse ni jeton dans le résultat', async () => {
    const ok = await saveProgress(PARTICIPATION, 0, reponses(2));
    rpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    const ko = await saveProgress(PARTICIPATION, 0, reponses(2));
    for (const outcome of [ok, ko]) {
      const texte = JSON.stringify(outcome);
      expect(texte).not.toContain(VIEWER.email);
      expect(texte).not.toContain(VIEWER.accessToken);
    }
  });
});

describe('loadTentative (app.attempts, règle de lecture du propriétaire)', () => {
  it('lit la révision et les réponses de la participation', async () => {
    select.mockResolvedValue([{ revision: 2, reponses: { [ITEMS[0].id]: 4 } }]);
    const tentative = await loadTentative(VIEWER, PARTICIPATION);
    expect(tentative).toEqual({
      revision: 2,
      reponses: { [ITEMS[0].id]: 4 }
    });
    const [table, query] = select.mock.calls[0] as [string, string];
    expect(table).toBe('attempts');
    expect(query).toContain(`participation_id=eq.${PARTICIPATION}`);
    expect(query).toContain('select=revision,reponses');
  });

  it('renvoie null quand aucune sauvegarde n’existe', async () => {
    select.mockResolvedValue([]);
    expect(await loadTentative(VIEWER, PARTICIPATION)).toBeNull();
  });

  it('renvoie null sans appeler la base si l’identifiant n’est pas un uuid', async () => {
    expect(await loadTentative(VIEWER, 'a&b=c')).toBeNull();
    expect(select).not.toHaveBeenCalled();
  });

  it('refuse une ligne mal formée (la valeur lue est validée)', async () => {
    select.mockResolvedValue([{ revision: 2, reponses: 'oups' }]);
    await expect(loadTentative(VIEWER, PARTICIPATION)).rejects.toThrow();
    select.mockResolvedValue([{ revision: 0, reponses: {} }]);
    await expect(loadTentative(VIEWER, PARTICIPATION)).rejects.toThrow();
  });
});

describe('versReprise', () => {
  it('reconstitue les réponses avec domaine et facette du questionnaire', () => {
    const reprise = versReprise({
      revision: 5,
      reponses: { [ITEMS[0].id]: 4, [ITEMS[1].id]: 2 }
    });
    expect(reprise.revision).toBe(5);
    expect(reprise.answers).toEqual([reponse(0, 4), { ...reponse(1, 2) }]);
  });

  it('place l’écran sur la première question sans réponse', () => {
    const reponsesServeur = Object.fromEntries(
      reponses(10).map((a) => [a.id, a.score])
    );
    expect(versReprise({ revision: 1, reponses: reponsesServeur }).index).toBe(
      10
    );
  });

  it('toutes les questions répondues : dernier écran', () => {
    const reponsesServeur = Object.fromEntries(
      reponses(ITEMS.length).map((a) => [a.id, a.score])
    );
    expect(versReprise({ revision: 1, reponses: reponsesServeur }).index).toBe(
      ITEMS.length - 1
    );
  });

  it('ignore une question inconnue et une valeur hors de 1 à 5', () => {
    const reprise = versReprise({
      revision: 1,
      reponses: { inconnue: 3, [ITEMS[0].id]: 9, [ITEMS[1].id]: 3 }
    });
    expect(reprise.answers).toEqual([reponse(1, 3)]);
    expect(reprise.index).toBe(0);
  });
});

// --- File d'attente de progression ------------------------------------------
type Sortie = Awaited<ReturnType<NonNullable<SurveyProps['onProgress']>>>;

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const differe = () => {
  let resoudre: (sortie: Sortie) => void = () => undefined;
  const promesse = new Promise<Sortie>((r) => {
    resoudre = r;
  });
  return { promesse, resoudre };
};

describe('creerFileProgression', () => {
  const notices: ProgressNotice[] = [];
  const notifier = (notice: ProgressNotice): void => void notices.push(notice);

  beforeEach(() => {
    notices.length = 0;
  });

  it('parcours public (onProgress absent) : aucune file, donc aucune sauvegarde', () => {
    expect(creerFileProgression(undefined, 0, notifier)).toBeNull();
  });

  it('première sauvegarde à la révision 0, puis la révision rendue par le serveur', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValueOnce({ revision: 1 })
      .mockResolvedValueOnce({ revision: 2 });
    const file = creerFileProgression(onProgress, 0, notifier);
    file?.pousser(reponses(1));
    await flush();
    file?.pousser(reponses(2));
    await flush();
    expect(onProgress.mock.calls.map((c) => c[1])).toEqual([0, 1]);
    expect(onProgress.mock.calls[1][0]).toHaveLength(2);
  });

  it('reprend à la révision de la tentative serveur', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValue({ revision: 9 });
    const file = creerFileProgression(onProgress, 8, notifier);
    file?.pousser(reponses(1));
    await flush();
    expect(onProgress.mock.calls[0][1]).toBe(8);
  });

  it('changements rapides : une seule requête en vol, une seule écriture en attente (la dernière)', async () => {
    const premiere = differe();
    let enVol = 0;
    let maxEnVol = 0;
    const onProgress = vi.fn<NonNullable<SurveyProps['onProgress']>>(
      async (answers) => {
        enVol += 1;
        maxEnVol = Math.max(maxEnVol, enVol);
        try {
          return answers.length === 1
            ? await premiere.promesse
            : { revision: 2 };
        } finally {
          enVol -= 1;
        }
      }
    );
    const file = creerFileProgression(onProgress, 0, notifier);
    file?.pousser(reponses(1));
    file?.pousser(reponses(2));
    file?.pousser(reponses(3));
    file?.pousser(reponses(4));
    await flush();
    expect(onProgress).toHaveBeenCalledTimes(1);
    premiere.resoudre({ revision: 1 });
    await flush();
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[1][0]).toHaveLength(4);
    expect(onProgress.mock.calls[1][1]).toBe(1);
    expect(maxEnVol).toBe(1);
  });

  it('conflit avec reprise : notifie, adopte la révision serveur, la suite repart de là', async () => {
    const reprise: Reprise = {
      answers: [reponse(0, 5)],
      index: 1,
      revision: 7
    };
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValueOnce({ error: 'conflict', reprise })
      .mockResolvedValueOnce({ revision: 8 });
    const file = creerFileProgression(onProgress, 3, notifier);
    file?.pousser(reponses(2));
    await flush();
    expect(notices).toEqual([{ error: 'conflict', reprise }]);
    file?.pousser(reponses(3));
    await flush();
    expect(onProgress.mock.calls[1][1]).toBe(7);
  });

  it('conflit : l’écriture en attente est abandonnée, elle reposait sur une révision périmée', async () => {
    const premiere = differe();
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockReturnValueOnce(premiere.promesse);
    const file = creerFileProgression(onProgress, 3, notifier);
    file?.pousser(reponses(1));
    file?.pousser(reponses(2));
    premiere.resoudre({
      error: 'conflict',
      reprise: { answers: [reponse(0, 5)], index: 1, revision: 7 }
    });
    await flush();
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('conflit dont le serveur n’a plus de réponses : révision adoptée, réponses locales renvoyées, aucune alerte', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValueOnce({
        error: 'conflict',
        reprise: { answers: [], index: 0, revision: 0 }
      })
      .mockResolvedValueOnce({ revision: 1 });
    const file = creerFileProgression(onProgress, 4, notifier);
    const locales = reponses(3);
    file?.pousser(locales);
    await flush();
    expect(notices).toEqual([]);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls[1]).toEqual([locales, 0]);
  });

  it('conflit sans reprise : alerte et arrêt des sauvegardes', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValue({ error: 'conflict' });
    const file = creerFileProgression(onProgress, 3, notifier);
    file?.pousser(reponses(1));
    await flush();
    file?.pousser(reponses(2));
    await flush();
    expect(notices).toEqual([{ error: 'conflict' }]);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('campagne close : une alerte, puis plus aucune sauvegarde', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValue({ error: 'closed' });
    const file = creerFileProgression(onProgress, 0, notifier);
    file?.pousser(reponses(1));
    await flush();
    file?.pousser(reponses(2));
    file?.pousser(reponses(3));
    await flush();
    expect(notices).toEqual([{ error: 'closed' }]);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('échec ordinaire : silencieux (tampon local), la sauvegarde suivante repart de la même révision', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockResolvedValueOnce({ error: 'failed' })
      .mockResolvedValueOnce({ revision: 6 });
    const file = creerFileProgression(onProgress, 5, notifier);
    file?.pousser(reponses(1));
    await flush();
    file?.pousser(reponses(2));
    await flush();
    expect(notices).toEqual([]);
    expect(onProgress.mock.calls.map((c) => c[1])).toEqual([5, 5]);
  });

  it('une action qui lève ne casse pas la file', async () => {
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockRejectedValueOnce(new Error('réseau'))
      .mockResolvedValueOnce({ revision: 1 });
    const file = creerFileProgression(onProgress, 0, notifier);
    file?.pousser(reponses(1));
    await flush();
    file?.pousser(reponses(2));
    await flush();
    expect(notices).toEqual([]);
    expect(onProgress).toHaveBeenCalledTimes(2);
  });

  it('arreter : la réponse en vol est ignorée et plus rien n’est envoyé', async () => {
    const premiere = differe();
    const onProgress = vi
      .fn<NonNullable<SurveyProps['onProgress']>>()
      .mockReturnValue(premiere.promesse);
    const file = creerFileProgression(onProgress, 0, notifier);
    file?.pousser(reponses(1));
    file?.pousser(reponses(2));
    file?.arreter();
    premiere.resoudre({ error: 'closed' });
    await flush();
    file?.pousser(reponses(3));
    await flush();
    expect(notices).toEqual([]);
    expect(onProgress).toHaveBeenCalledTimes(1);
  });

  it('n’envoie jamais une liste vide', async () => {
    const onProgress = vi.fn<NonNullable<SurveyProps['onProgress']>>();
    creerFileProgression(onProgress, 0, notifier)?.pousser([]);
    await flush();
    expect(onProgress).not.toHaveBeenCalled();
  });
});
