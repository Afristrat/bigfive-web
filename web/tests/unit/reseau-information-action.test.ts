import { beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'consultant@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const CAMPAGNE = '22222222-2222-4222-8222-222222222222';
const P1 = '33333333-3333-4333-8333-333333333331';
const P2 = '33333333-3333-4333-8333-333333333332';
const P3 = '33333333-3333-4333-8333-333333333333';

const currentViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer()
}));

const rpc = vi.fn();
const serviceRpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args))
  }),
  serviceClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await serviceRpc(fn, args))
  })
}));

const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimited(...args),
  getClientIp: async () => '203.0.113.1'
}));

const sendMail = vi.fn();
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: (mail: unknown) => sendMail(mail)
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path)
}));

import { informerLesMembresReseau } from '@/actions/reseau-information';
import { GatewayError } from '@/lib/supabase/server';

const aInformer = (...ids: Array<[string, string]>) =>
  ids.map(([participation_id, langue]) => ({ participation_id, langue }));

beforeEach(() => {
  vi.clearAllMocks();
  currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
  isRateLimited.mockResolvedValue(false);
  sendMail.mockResolvedValue(true);
  rpc.mockImplementation(async (fn: string) =>
    fn === 'reseau_a_informer'
      ? aInformer([P1, 'fr'], [P2, 'ar'])
      : fn === 'reseau_marquer_informes'
        ? 2
        : null
  );
  serviceRpc.mockResolvedValue([
    { participation_id: P1, courriel: 'un@exemple.test' },
    { participation_id: P2, courriel: 'deux@exemple.test' }
  ]);
});

describe('informerLesMembresReseau', () => {
  it('sans session : reconnexion, rien n’est lu ni envoyé', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'reconnexion'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('identifiant hors format : refusé sans appel', async () => {
    expect(await informerLesMembresReseau('pas-un-uuid')).toEqual({
      status: 'interdit'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('plafond par personne atteint : aucun appel', async () => {
    isRateLimited.mockResolvedValue(true);
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'plafond'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('envoie à chacun dans sa langue, passe l’identité du consultant à la fonction des adresses, puis inscrit les envois', async () => {
    const etat = await informerLesMembresReseau(CAMPAGNE);
    expect(etat).toEqual({
      status: 'termine',
      envoyes: 2,
      echecs: 0,
      restants: 0,
      nonTraces: 0
    });
    expect(serviceRpc).toHaveBeenCalledWith('reseau_courriels', {
      p_acteur: VIEWER.id,
      p_campagne: CAMPAGNE,
      p_participations: [P1, P2]
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    const mails = sendMail.mock.calls.map(
      (c) => c[0] as { to: string; subject: string; text: string }
    );
    const un = mails.find((m) => m.to === 'un@exemple.test');
    const deux = mails.find((m) => m.to === 'deux@exemple.test');
    expect(un?.subject).toContain('relevé du réseau');
    expect(un?.text).toContain(
      encodeURIComponent(`/mes-resultats/reseau/${P1}`)
    );
    expect(deux?.subject).toContain('شبكة');
    expect(rpc).toHaveBeenCalledWith('reseau_marquer_informes', {
      p_campagne: CAMPAGNE,
      p_participations: [P1, P2]
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it('un courriel refusé n’est pas inscrit : il sera repris au prochain envoi', async () => {
    sendMail.mockImplementation(
      async (m: { to: string }) => m.to === 'un@exemple.test'
    );
    rpc.mockImplementation(async (fn: string, args: unknown) =>
      fn === 'reseau_a_informer'
        ? aInformer([P1, 'fr'], [P2, 'fr'])
        : (args as { p_participations: string[] }).p_participations.length
    );
    const etat = await informerLesMembresReseau(CAMPAGNE);
    expect(etat).toEqual({
      status: 'termine',
      envoyes: 1,
      echecs: 1,
      restants: 0,
      nonTraces: 0
    });
    expect(rpc).toHaveBeenCalledWith('reseau_marquer_informes', {
      p_campagne: CAMPAGNE,
      p_participations: [P1]
    });
  });

  it('un envoi qui lève (clé absente) compte comme un échec et n’arrête pas les autres', async () => {
    sendMail.mockImplementation(async (m: { to: string }) => {
      if (m.to === 'deux@exemple.test') throw new Error('MailConfigError');
      return true;
    });
    rpc.mockImplementation(async (fn: string, args: unknown) =>
      fn === 'reseau_a_informer'
        ? aInformer([P1, 'fr'], [P2, 'fr'])
        : (args as { p_participations: string[] }).p_participations.length
    );
    const etat = await informerLesMembresReseau(CAMPAGNE);
    expect(etat).toMatchObject({ envoyes: 1, echecs: 1 });
  });

  it('inscription au journal en échec : courriels partis, signalés non tracés', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'reseau_a_informer') return aInformer([P1, 'fr'], [P2, 'fr']);
      throw new GatewayError(500, 'XX000');
    });
    const etat = await informerLesMembresReseau(CAMPAGNE);
    expect(etat).toEqual({
      status: 'termine',
      envoyes: 0,
      echecs: 0,
      restants: 0,
      nonTraces: 2
    });
  });

  it('plus de 100 personnes : 100 au plus par clic, le reste est annoncé', async () => {
    const beaucoup = Array.from({ length: 130 }, (_, i) => [
      `44444444-4444-4444-8444-${String(i).padStart(12, '0')}`,
      'fr'
    ]) as Array<[string, string]>;
    rpc.mockImplementation(async (fn: string, args: unknown) =>
      fn === 'reseau_a_informer'
        ? aInformer(...beaucoup)
        : (args as { p_participations: string[] }).p_participations.length
    );
    serviceRpc.mockImplementation(
      async (_fn: string, args: { p_participations: string[] }) =>
        args.p_participations.map((participation_id) => ({
          participation_id,
          courriel: `${participation_id}@exemple.test`
        }))
    );
    const etat = await informerLesMembresReseau(CAMPAGNE);
    expect(etat).toEqual({
      status: 'termine',
      envoyes: 100,
      echecs: 0,
      restants: 30,
      nonTraces: 0
    });
    expect(sendMail).toHaveBeenCalledTimes(100);
  });

  it('personne à informer : aucun appel aux adresses ni à l’expéditeur', async () => {
    rpc.mockImplementation(async () => []);
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'termine',
      envoyes: 0,
      echecs: 0,
      restants: 0,
      nonTraces: 0
    });
    expect(serviceRpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it.each([
    ['55000', 'ferme'],
    ['42501', 'interdit'],
    ['P0002', 'interdit']
  ] as const)(
    'refus %s de la base : statut %s, aucun envoi',
    async (code, statut) => {
      rpc.mockRejectedValue(new GatewayError(403, code));
      expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
        status: statut
      });
      expect(sendMail).not.toHaveBeenCalled();
    }
  );

  it('relevé refermé entre la liste et les adresses : aucun envoi', async () => {
    serviceRpc.mockRejectedValue(new GatewayError(400, '55000'));
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'ferme'
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('jeton refusé : reconnexion ; panne : erreur', async () => {
    rpc.mockRejectedValueOnce(new GatewayError(401, null));
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'reconnexion'
    });
    rpc.mockRejectedValueOnce(new GatewayError(500, null));
    expect(await informerLesMembresReseau(CAMPAGNE)).toEqual({
      status: 'erreur'
    });
  });

  it('le journal d’exploitation ne contient ni adresse ni identifiant de personne', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'reseau_a_informer') return aInformer([P1, 'fr']);
      throw new GatewayError(500, 'XX000');
    });
    await informerLesMembresReseau(CAMPAGNE);
    const trace = warn.mock.calls.flat().join(' ');
    expect(trace).toContain('reseau_information.non_trace');
    expect(trace).not.toMatch(/@|3333/);
    warn.mockRestore();
  });
});
