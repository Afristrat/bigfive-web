import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateLimiter } from '@/lib/sliding-window';

type Parser = { parse: (value: unknown) => unknown };

const events: string[] = [];

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
const revalidatePath = vi.fn();

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'resp@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  requireViewer: (locale: string, path: string) => requireViewer(locale, path)
}));

const select = vi.fn();
const rpc = vi.fn();
// Plafonds journaliers tenus en base : fonction réservée à service_role,
// appelée par le client de service (jamais par celui de la personne connectée).
const ceilingRpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await ceilingRpc(fn, args))
  }),
  userClient: () => ({
    select: async (table: string, query: string, schema: Parser) => {
      events.push(`select:${table}`);
      return schema.parse(await select(table, query));
    },
    rpc: async (fn: string, args: unknown, schema: Parser) => {
      events.push(`rpc:${fn}`);
      return schema.parse(await rpc(fn, args));
    }
  })
}));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => {
    events.push('loadOrgPage');
    return loadOrgPage(viewer, slug);
  }
}));

const sendMail = vi.fn();
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: (mail: unknown) => sendMail(mail)
}));

const logSecurityEvent = vi.fn();
vi.mock('@/lib/security-log', () => ({
  logSecurityEvent: (event: string, fields: unknown) =>
    logSecurityEvent(event, fields)
}));

const limiterBox = vi.hoisted(() => ({
  current: undefined as RateLimiter | undefined
}));
vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: {
    isLimited: (action: string, limit: never, subject: string) =>
      limiterBox.current?.isLimited(action, limit, subject) ?? false,
    size: () => 0
  }
}));

import { inviteParticipants } from '@/actions/invitations';
import { recipientDigest } from '@/lib/invitation-delivery';
import { MailConfigError } from '@/lib/mailer';
import { createRateLimiter } from '@/lib/sliding-window';
import { GatewayError } from '@/lib/supabase/server';

const ORG_ID = '22222222-2222-4222-8222-222222222222';
const CAMPAIGN_ID = '33333333-3333-4333-8333-333333333333';
const idle = { status: 'idle' } as const;

const orgPage = (role: string | null, isAdmin = false) => ({
  org: { id: ORG_ID, nom: 'Acme', slug: 'acme', statut: 'active' },
  isAdmin,
  role
});

const token = (n: number): string => `T${n}`.padEnd(43, 'x');
let counter = 0;

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const invite = (over: Record<string, string> = {}): FormData =>
  form({
    campagne: CAMPAIGN_ID,
    slug: 'acme',
    adresses: 'ana@client.test, Ana\nben@client.test\nchloe@client.test',
    langue: 'fr',
    message: '',
    locale: 'fr',
    ...over
  });

type Spy = ReturnType<typeof vi.spyOn> & {
  mock: { calls: unknown[][] };
};
const logged = (...spies: Spy[]): string =>
  spies
    .flatMap((spy) => spy.mock.calls.map((call: unknown[]) => String(call[0])))
    .join('\n');

let warn: Spy;
let error: Spy;
let timers: Spy;

beforeEach(() => {
  events.length = 0;
  counter = 0;
  process.env.SITE_URL = 'https://tenga.test';
  limiterBox.current = createRateLimiter();
  revalidatePath.mockReset();
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  logSecurityEvent.mockReset();
  sendMail.mockReset().mockImplementation(async () => {
    events.push('send');
    return true;
  });
  process.env.RESEND_API_KEY = 're_test_key';
  delete process.env.MAIL_SINK;
  delete process.env.APP_ENV;
  loadOrgPage.mockReset().mockResolvedValue(orgPage('responsable'));
  select.mockReset().mockImplementation(async (table: string) =>
    table === 'campaigns'
      ? [
          {
            id: CAMPAIGN_ID,
            titre: 'Équipe commerciale',
            langue: 'fr',
            statut: 'ouverte',
            organization_id: ORG_ID
          }
        ]
      : []
  );
  ceilingRpc.mockReset().mockResolvedValue('accepte');
  rpc.mockReset().mockImplementation(async () => {
    counter += 1;
    return [
      {
        invitation: '44444444-4444-4444-8444-444444444444',
        jeton: token(counter),
        expire: '2026-11-04T10:00:00Z'
      }
    ];
  });
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  // La pause de 500 ms entre deux envois est franchie sans attendre.
  const realSetTimeout = globalThis.setTimeout;
  timers = vi
    .spyOn(globalThis, 'setTimeout')
    .mockImplementation(((handler: () => void, ms?: number) =>
      ms === 500
        ? (handler(), 0)
        : realSetTimeout(handler, ms)) as unknown as typeof setTimeout);
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
  timers.mockRestore();
});

describe('inviteParticipants : parcours nominal', () => {
  it('lot de 3 : trois RPC puis trois envois, chaque envoi après sa RPC', async () => {
    const state = await inviteParticipants(idle, invite());
    expect(state).toEqual({
      status: 'done',
      sent: 3,
      total: 3,
      failures: [],
      aborted: null
    });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(sendMail).toHaveBeenCalledTimes(3);
    const rpcs = events.filter((e) => e.startsWith('rpc') || e === 'send');
    expect(rpcs).toEqual([
      'rpc:inviter',
      'send',
      'rpc:inviter',
      'send',
      'rpc:inviter',
      'send'
    ]);
    expect(revalidatePath).toHaveBeenCalledWith('/fr/o/acme');
    expect(requireViewer).toHaveBeenCalledWith('fr', '/o/acme');
  });

  it('transmet à la RPC l’adresse, le prénom, le message et la langue, sans groupe', async () => {
    await inviteParticipants(
      idle,
      invite({
        adresses: 'Ana@Client.test, Ana',
        langue: 'ar',
        message: 'Merci de votre aide.'
      })
    );
    expect(rpc).toHaveBeenCalledWith('inviter', {
      p_campagne: CAMPAIGN_ID,
      p_email: 'ana@client.test',
      p_prenom: 'Ana',
      p_message: 'Merci de votre aide.',
      p_langue: 'ar'
    });
  });

  it('envoie l’e-mail à l’adresse invitée avec le lien construit depuis SITE_URL', async () => {
    await inviteParticipants(idle, invite({ adresses: 'ana@client.test' }));
    const mail = sendMail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      text: string;
    };
    expect(mail.to).toBe('ana@client.test');
    expect(mail.text).toContain(`https://tenga.test/fr/i/${token(1)}`);
    expect(mail.subject).toContain('Acme');
  });

  it('lit la campagne puis l’organisation avant toute RPC', async () => {
    await inviteParticipants(idle, invite());
    expect(events.slice(0, 3)).toEqual([
      'select:campaigns',
      'loadOrgPage',
      'rpc:inviter'
    ]);
    expect(select.mock.calls[0]?.[1]).toContain(`id=eq.${CAMPAIGN_ID}`);
  });

  it('le jeton n’apparaît ni dans l’état retourné ni dans les journaux', async () => {
    sendMail.mockResolvedValueOnce(false);
    const state = await inviteParticipants(idle, invite());
    const everything = JSON.stringify(state) + logged(warn, error);
    const events2 = JSON.stringify(logSecurityEvent.mock.calls);
    for (const n of [1, 2, 3]) {
      expect(everything).not.toContain(token(n));
      expect(events2).not.toContain(token(n));
    }
    expect(events2).not.toContain('@');
  });
});

describe('inviteParticipants : la campagne avant la RPC', () => {
  it('campagne en brouillon : closed, aucune RPC, aucun envoi', async () => {
    select.mockImplementation(async (table: string) =>
      table === 'campaigns'
        ? [
            {
              id: CAMPAIGN_ID,
              titre: 'T',
              langue: 'fr',
              statut: 'brouillon',
              organization_id: ORG_ID
            }
          ]
        : []
    );
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'closed'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('campagne close : closed, aucune RPC', async () => {
    select.mockImplementation(async (table: string) =>
      table === 'campaigns'
        ? [
            {
              id: CAMPAIGN_ID,
              titre: 'T',
              langue: 'fr',
              statut: 'close',
              organization_id: ORG_ID
            }
          ]
        : []
    );
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'closed'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('campagne introuvable : forbidden, aucune RPC', async () => {
    select.mockResolvedValue([]);
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('organisation illisible : forbidden, aucune RPC', async () => {
    loadOrgPage.mockResolvedValue(null);
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('identifiant de campagne qui n’est pas un uuid : error, aucune lecture', async () => {
    expect(
      await inviteParticipants(idle, invite({ campagne: 'x&y=1' }))
    ).toEqual({ status: 'error' });
    expect(select).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('inviteParticipants : saisie refusée sans effet', () => {
  it('message avec http:// : invalid (message), aucun appel', async () => {
    const state = await inviteParticipants(
      idle,
      invite({ message: 'Voyez http://exemple.test' })
    );
    expect(state).toEqual({
      status: 'invalid',
      reason: 'message',
      rejected: []
    });
    expect(select).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('message de 1001 caractères : invalid (message)', async () => {
    const state = await inviteParticipants(
      idle,
      invite({ message: 'a'.repeat(1001) })
    );
    expect(state).toMatchObject({ status: 'invalid', reason: 'message' });
  });

  it('message avec marque bidirectionnelle : invalid (message)', async () => {
    const state = await inviteParticipants(
      idle,
      invite({ message: 'ok\u202Eko' })
    );
    expect(state).toMatchObject({ status: 'invalid', reason: 'message' });
  });

  it('26 adresses : invalid (too_many), aucun appel', async () => {
    const adresses = Array.from(
      { length: 26 },
      (_, i) => `p${i}@client.test`
    ).join('\n');
    expect(await inviteParticipants(idle, invite({ adresses }))).toEqual({
      status: 'invalid',
      reason: 'too_many',
      rejected: []
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('liste vide : invalid (empty)', async () => {
    expect(
      await inviteParticipants(idle, invite({ adresses: '  \n ' }))
    ).toEqual({ status: 'invalid', reason: 'empty', rejected: [] });
  });

  it('adresse mal formée : invalid (address) avec la ligne refusée, aucun envoi', async () => {
    const state = await inviteParticipants(
      idle,
      invite({ adresses: 'ana@client.test\nnon-valide' })
    );
    expect(state).toEqual({
      status: 'invalid',
      reason: 'address',
      rejected: ['non-valide']
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('langue inconnue : error, aucun appel', async () => {
    expect(await inviteParticipants(idle, invite({ langue: 'de' }))).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('exige une personne connectée avant tout', async () => {
    requireViewer.mockRejectedValue(new Error('REDIRECT:/fr/connexion'));
    await expect(inviteParticipants(idle, invite())).rejects.toThrow(
      'REDIRECT'
    );
    expect(select).not.toHaveBeenCalled();
  });
});

describe('inviteParticipants : échecs de livraison et de la base', () => {
  it('envoi refusé pour la 2e : done avec un mail_failed, les autres partent', async () => {
    sendMail
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 2,
      total: 3,
      failures: [{ email: 'ben@client.test', outcome: 'mail_failed' }],
      aborted: null
    });
    expect(rpc).toHaveBeenCalledTimes(3);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'invitation.delivery_failed',
      expect.objectContaining({ reason: expect.any(String) })
    );
  });

  it('42501 en cours de lot : forbidden, plus aucun envoi après le refus', async () => {
    rpc.mockReset().mockRejectedValue(new GatewayError(403, '42501'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'forbidden'
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('55000 (campagne close entre-temps) : closed', async () => {
    rpc.mockReset().mockRejectedValue(new GatewayError(400, '55000'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'closed'
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('22023 pour une adresse : refused, le lot continue', async () => {
    rpc
      .mockReset()
      .mockRejectedValueOnce(new GatewayError(400, '22023'))
      .mockImplementation(async () => [
        {
          invitation: '44444444-4444-4444-8444-444444444444',
          jeton: token(9),
          expire: '2026-11-04T10:00:00Z'
        }
      ]);
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 2,
      total: 3,
      failures: [{ email: 'ana@client.test', outcome: 'refused' }],
      aborted: null
    });
  });

  it('erreur réseau de la RPC : error (l’exception est attrapée), journal sans adresse ni jeton', async () => {
    rpc.mockReset().mockRejectedValue(new TypeError('fetch failed'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    const text =
      logged(warn, error) + JSON.stringify(logSecurityEvent.mock.calls);
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'invitation.delivery_failed',
      expect.objectContaining({ reason: expect.stringContaining('TypeError') })
    );
    expect(text).not.toContain('@');
    expect(text).not.toContain(CAMPAIGN_ID);
  });

  it('P0002 (introuvable) : error, jamais une exception', async () => {
    rpc.mockReset().mockRejectedValue(new GatewayError(404, 'P0002'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
  });

  it('clé d’envoi absente : error, aucune RPC, aucun envoi', async () => {
    delete process.env.RESEND_API_KEY;
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('réceptacle de test actif en préproduction : pas de clé requise', async () => {
    delete process.env.RESEND_API_KEY;
    process.env.MAIL_SINK = 'true';
    process.env.APP_ENV = 'preproduction';
    expect(await inviteParticipants(idle, invite())).toMatchObject({
      status: 'done',
      sent: 3
    });
  });

  it('réceptacle de test actif hors préproduction : error, aucune RPC, aucun envoi', async () => {
    process.env.MAIL_SINK = 'true';
    process.env.APP_ENV = 'production';
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('MailConfigError levée en cours de lot : mail_failed pour la ligne, journal sans adresse', async () => {
    sendMail.mockReset().mockRejectedValue(new MailConfigError());
    expect(
      await inviteParticipants(idle, invite({ adresses: 'ana@client.test' }))
    ).toMatchObject({
      status: 'done',
      sent: 0,
      failures: [{ email: 'ana@client.test', outcome: 'mail_failed' }]
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'invitation.delivery_failed',
      expect.objectContaining({ reason: expect.stringContaining('MailConfig') })
    );
  });

  it('lecture de la campagne en erreur : error', async () => {
    select.mockReset().mockRejectedValue(new GatewayError(500, null));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('inviteParticipants : plafonds', () => {
  it('double soumission immédiate : la seconde donne skipped_recent, une seule RPC par adresse', async () => {
    const data = invite({ adresses: 'ana@client.test' });
    expect(await inviteParticipants(idle, data)).toMatchObject({
      status: 'done',
      sent: 1
    });
    expect(await inviteParticipants(idle, data)).toEqual({
      status: 'done',
      sent: 0,
      total: 1,
      failures: [{ email: 'ana@client.test', outcome: 'skipped_recent' }],
      aborted: null
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('plafond par utilisateur atteint pour tout le lot : rate_limited, aucune RPC, événement journalisé', async () => {
    limiterBox.current = {
      isLimited: (action) => action === 'invitationPerUser',
      size: () => 0
    };
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'rate_limited'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'invitation.rate_limited',
      expect.objectContaining({ ip: '203.0.113.9' })
    );
  });
});

describe('inviteParticipants : plafonds journaliers tenus en base (T19, valeurs NON VALIDÉES par Amine)', () => {
  it('appelle consommer_plafond_invitation par le client de service, avec l’identifiant de l’organisation, un condensat et les constantes', async () => {
    await inviteParticipants(idle, invite({ adresses: 'Ana@Client.test' }));
    expect(ceilingRpc).toHaveBeenCalledTimes(1);
    expect(ceilingRpc).toHaveBeenCalledWith('consommer_plafond_invitation', {
      p_organisation: ORG_ID,
      p_empreinte_destinataire: recipientDigest('ana@client.test'),
      p_max_organisation: 300,
      p_max_destinataire: 5,
      p_fenetre_secondes: 86_400
    });
  });

  it('aucune adresse ne part vers la base dans cet appel', async () => {
    await inviteParticipants(idle, invite());
    const sent = JSON.stringify(ceilingRpc.mock.calls);
    expect(sent).not.toContain('@');
    expect(sent).not.toContain('client.test');
  });

  it('l’appel de la base précède la RPC inviter, qui précède l’envoi', async () => {
    await inviteParticipants(idle, invite({ adresses: 'ana@client.test' }));
    const order = (mock: { mock: { invocationCallOrder: number[] } }) =>
      mock.mock.invocationCallOrder[0] ?? 0;
    expect(order(ceilingRpc)).toBeLessThan(order(rpc));
    expect(order(rpc)).toBeLessThan(order(sendMail));
  });

  it.each(['refuse_organisation', 'refuse_destinataire'])(
    '%s pour tout le lot : rate_limited, aucune RPC inviter, aucun envoi, événement journalisé',
    async (reply) => {
      ceilingRpc.mockResolvedValue(reply);
      expect(await inviteParticipants(idle, invite())).toEqual({
        status: 'rate_limited'
      });
      expect(rpc).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
      expect(logSecurityEvent).toHaveBeenCalledWith(
        'invitation.rate_limited',
        expect.objectContaining({ ip: '203.0.113.9' })
      );
    }
  );

  it('refus sur une adresse seulement : les autres partent, la refusée est rate_limited', async () => {
    ceilingRpc
      .mockResolvedValueOnce('accepte')
      .mockResolvedValueOnce('refuse_destinataire')
      .mockResolvedValueOnce('accepte');
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 2,
      total: 3,
      failures: [{ email: 'ben@client.test', outcome: 'rate_limited' }],
      aborted: null
    });
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('erreur de la base : refus sûr, status error, ni RPC inviter ni envoi', async () => {
    ceilingRpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('réponse inattendue de la base (hors des trois états) : refus sûr, aucun envoi', async () => {
    ceilingRpc.mockResolvedValue('autre');
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('le droit d’inviter est contrôlé avant : un consultant ne consomme aucun plafond en base', async () => {
    loadOrgPage.mockResolvedValue(orgPage('consultant'));
    await inviteParticipants(idle, invite());
    expect(ceilingRpc).not.toHaveBeenCalled();
  });
});

describe('inviteParticipants : droit d’inviter avant toute consommation', () => {
  it.each(['consultant', 'participant', null])(
    'rôle %s : forbidden, limiteur non consommé, aucune RPC',
    async (role) => {
      const isLimited = vi.fn(() => false);
      limiterBox.current = { isLimited, size: () => 0 };
      loadOrgPage.mockResolvedValue(orgPage(role));
      expect(await inviteParticipants(idle, invite())).toEqual({
        status: 'forbidden'
      });
      expect(isLimited).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
      expect(sendMail).not.toHaveBeenCalled();
    }
  );

  it('organisation de la page différente de celle de la campagne : forbidden', async () => {
    loadOrgPage.mockResolvedValue({
      ...orgPage('responsable'),
      org: { ...orgPage('responsable').org, id: CAMPAIGN_ID }
    });
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'forbidden'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('administrateur Tenga sans rôle dans l’organisation : le lot part', async () => {
    loadOrgPage.mockResolvedValue(orgPage(null, true));
    expect(await inviteParticipants(idle, invite())).toMatchObject({
      status: 'done',
      sent: 3
    });
  });

  it('le plafond par adresse compte campagne et adresse, sans l’utilisateur', async () => {
    const subjects: string[] = [];
    limiterBox.current = {
      isLimited: (_action, _limit, subject) => {
        subjects.push(subject);
        return false;
      },
      size: () => 0
    };
    await inviteParticipants(idle, invite({ adresses: 'ana@client.test' }));
    expect(subjects).toContain(VIEWER.id);
    expect(subjects.filter((s) => s.includes('ana@client.test'))).toEqual([
      `${CAMPAIGN_ID}:ana@client.test`,
      `${CAMPAIGN_ID}:ana@client.test`
    ]);
  });

  it('deux gestionnaires, même adresse, même minute : le second obtient skipped_recent, une seule RPC', async () => {
    const data = invite({ adresses: 'ana@client.test' });
    await inviteParticipants(idle, data);
    requireViewer.mockResolvedValue({
      ...VIEWER,
      id: '55555555-5555-4555-8555-555555555555'
    });
    expect(await inviteParticipants(idle, data)).toMatchObject({
      status: 'done',
      sent: 0,
      failures: [{ email: 'ana@client.test', outcome: 'skipped_recent' }]
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendMail).toHaveBeenCalledTimes(1);
  });
});

describe('inviteParticipants : jeton mal formé et lot interrompu', () => {
  const issued = (jeton: string) => [
    {
      invitation: '44444444-4444-4444-8444-444444444444',
      jeton,
      expire: '2026-11-04T10:00:00Z'
    }
  ];

  it('un jeton mal formé refuse cette ligne seule, le lot continue', async () => {
    rpc.mockReset().mockImplementation(async () => {
      counter += 1;
      return issued(counter === 2 ? 'trop-court' : token(counter));
    });
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 2,
      total: 3,
      failures: [{ email: 'ben@client.test', outcome: 'refused' }],
      aborted: null
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
  });

  it('erreur de la base au 2e envoi : done avec aborted error et le résultat partiel, page rafraîchie', async () => {
    rpc.mockReset();
    rpc.mockImplementationOnce(async () => issued(token(1)));
    rpc.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 1,
      total: 3,
      failures: [],
      aborted: 'error'
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/o/acme');
  });

  it('42501 au 2e envoi : done avec aborted forbidden et le partiel', async () => {
    rpc.mockReset();
    rpc.mockImplementationOnce(async () => issued(token(1)));
    rpc.mockRejectedValueOnce(new GatewayError(403, '42501'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 1,
      total: 3,
      failures: [],
      aborted: 'forbidden'
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it('55000 au 2e envoi : done avec aborted closed et le partiel', async () => {
    rpc.mockReset();
    rpc.mockImplementationOnce(async () => issued(token(1)));
    rpc.mockRejectedValueOnce(new GatewayError(400, '55000'));
    expect(await inviteParticipants(idle, invite())).toMatchObject({
      status: 'done',
      sent: 1,
      aborted: 'closed'
    });
  });

  it('revalidatePath qui lève après des envois réussis : le résultat partiel est conservé', async () => {
    revalidatePath.mockImplementation(() => {
      throw new Error('cache indisponible');
    });
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'done',
      sent: 3,
      total: 3,
      failures: [],
      aborted: null
    });
    expect(logged(warn)).toContain('invitation.revalidate_failed');
  });

  it('interruption sans aucun envoi : error et pas de rafraîchissement', async () => {
    rpc.mockReset().mockRejectedValue(new TypeError('fetch failed'));
    expect(await inviteParticipants(idle, invite())).toEqual({
      status: 'error'
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe('inviteParticipants : état retourné minimal', () => {
  it('ne renvoie aucune adresse envoyée avec succès', async () => {
    sendMail
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const text = JSON.stringify(await inviteParticipants(idle, invite()));
    expect(text).toContain('ben@client.test');
    expect(text).not.toContain('ana@client.test');
    expect(text).not.toContain('chloe@client.test');
  });
});
