import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateLimiter } from '@/lib/sliding-window';

type Parser = { parse: (value: unknown) => unknown };

const events: string[] = [];

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock('next/cache', () => ({ revalidatePath }));
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
  email: 'acteur@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const requireAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  requireAdmin: async (locale: string, path: string) => {
    events.push('requireAdmin');
    return requireAdmin(locale, path);
  }
}));

const NEW_ID = '22222222-2222-4222-8222-222222222222';
const FOUND_ID = '33333333-3333-4333-8333-333333333333';
const findUserId = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const rpc = vi.fn();
const tokens: string[] = [];
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({
    // Fonctions SQL du service role (migration 0013) : recherche par adresse
    // et retrait d'un compte sans appartenance.
    rpc: async (
      fn: string,
      args: { p_email?: string; p_utilisateur?: string },
      schema: Parser
    ) => {
      if (fn === 'retirer_compte_sans_appartenance') {
        events.push('deleteUser');
        await deleteUser(args.p_utilisateur);
        return schema.parse(true);
      }
      events.push('findUserId');
      return schema.parse(await findUserId(args.p_email));
    },
    createUser: async (email: string, langue: string) => {
      events.push('createUser');
      return createUser(email, langue);
    }
  }),
  userClient: (token: string) => ({
    rpc: async (fn: string, args: unknown, schema: Parser) => {
      events.push(`rpc:${fn}`);
      tokens.push(token);
      return schema.parse(await rpc(fn, args));
    }
  })
}));

const sendMail = vi.fn();
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: async (mail: unknown) => {
    events.push('sendMail');
    return sendMail(mail);
  }
}));

const logSecurityEvent = vi.fn();
vi.mock('@/lib/security-log', () => ({
  logSecurityEvent: (event: string, fields: unknown) =>
    logSecurityEvent(event, fields)
}));

const limiterBox = vi.hoisted(() => ({
  current: undefined as RateLimiter | undefined
}));
const isRateLimited = vi.fn(
  async (action: string, limit: never, subject?: string) => {
    events.push('isRateLimited');
    return limiterBox.current?.isLimited(action, limit, subject ?? '') ?? false;
  }
);
vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  isRateLimited: (action: string, limit: never, subject?: string) =>
    isRateLimited(action, limit, subject)
}));

import { addTengaAdmin, assignRole, removeTengaAdmin } from '@/actions/admin';
import { GatewayError } from '@/lib/supabase/server';
import { createRateLimiter } from '@/lib/sliding-window';

const idle = { status: 'idle' } as const;
const THIRD = '55555555-5555-4555-8555-555555555555';
const FOURTH = '66666666-6666-4666-8666-666666666666';
const admin = (userId: string, adresse: string, estMoi = false) => ({
  user_id: userId,
  adresse,
  ajoute_le: '2026-10-21T09:30:00+00:00',
  est_moi: estMoi
});
let admins: ReturnType<typeof admin>[] = [];
const calls = (fn: string): number =>
  events.filter((event) => event === `rpc:${fn}`).length;
const mailsTo = (): string[] =>
  sendMail.mock.calls.map((call) => (call[0] as { to: string }).to);
const ORG = '44444444-4444-4444-8444-444444444444';

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const grant = (over: Record<string, string> = {}): FormData =>
  form({
    locale: 'fr',
    email: 'Nouveau@Tenga.test',
    confirmation: ' nouveau@tenga.TEST ',
    langue: 'fr',
    ...over
  });
const role = (over: Record<string, string> = {}): FormData =>
  form({
    locale: 'fr',
    email: 'membre@client.test',
    organisation: ORG,
    role: 'consultant',
    langue: 'fr',
    ...over
  });

beforeEach(() => {
  events.length = 0;
  vi.clearAllMocks();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  limiterBox.current = createRateLimiter();
  requireAdmin.mockResolvedValue(VIEWER);
  findUserId.mockResolvedValue(null);
  createUser.mockResolvedValue(NEW_ID);
  deleteUser.mockResolvedValue(undefined);
  tokens.length = 0;
  admins = [
    admin(VIEWER.id, 'acteur@tenga.test', true),
    admin(NEW_ID, 'nouveau@tenga.test')
  ];
  rpc.mockImplementation(async (fn: string) =>
    fn === 'lister_administrateurs_tenga' ? admins : true
  );
  sendMail.mockResolvedValue(true);
});

describe('addTengaAdmin : confirmation de l’adresse', () => {
  it('refuse sans confirmation, avant tout appel GoTrue', async () => {
    const data = grant();
    data.delete('confirmation');
    expect(await addTengaAdmin(idle, data)).toEqual({ status: 'invalid' });
    expect(events).not.toContain('findUserId');
    expect(events).not.toContain('createUser');
  });

  it('refuse une confirmation différente', async () => {
    expect(
      await addTengaAdmin(idle, grant({ confirmation: 'autre@tenga.test' }))
    ).toEqual({ status: 'invalid' });
    expect(findUserId).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('accepte une confirmation identique à la casse et aux espaces près', async () => {
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
    expect(createUser).toHaveBeenCalledWith('nouveau@tenga.test', 'fr');
  });
});

describe('addTengaAdmin : limitation de débit', () => {
  it('10 ajouts par heure et par administrateur, clé = identifiant du viewer', async () => {
    await addTengaAdmin(idle, grant());
    expect(isRateLimited).toHaveBeenCalledWith(
      'addTengaAdmin',
      { max: 10, windowMs: 3_600_000 },
      VIEWER.id
    );
  });

  it('le 11e ajout est refusé sans appel GoTrue ni RPC, journal sans adresse', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await addTengaAdmin(idle, grant())).toEqual({
        status: 'granted'
      });
    }
    events.length = 0;
    vi.clearAllMocks();
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'error' });
    expect(events).toEqual(['requireAdmin', 'isRateLimited']);
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_rate_limited', {
      ip: '203.0.113.9'
    });
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toContain('tenga');
  });

  it('le plafond est par administrateur', async () => {
    for (let i = 0; i < 10; i++) await addTengaAdmin(idle, grant());
    requireAdmin.mockResolvedValue({ ...VIEWER, id: FOUND_ID });
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
  });

  it('le limiteur passe après requireAdmin et avant GoTrue', async () => {
    await addTengaAdmin(idle, grant());
    expect(events.indexOf('requireAdmin')).toBeLessThan(
      events.indexOf('isRateLimited')
    );
    expect(events.indexOf('isRateLimited')).toBeLessThan(
      events.indexOf('findUserId')
    );
  });
});

describe('addTengaAdmin : compte orphelin', () => {
  it('supprime le compte créé par l’appel si la RPC échoue', async () => {
    rpc.mockRejectedValue(new GatewayError(403, null));
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'error' });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(NEW_ID);
  });

  it.each([
    ['5xx', new GatewayError(500, null)],
    ['panne réseau', new TypeError('fetch failed')],
    ['délai dépassé', new DOMException('timeout', 'TimeoutError')]
  ])('panne (%s) : le compte créé est gardé', async (_label, failure) => {
    rpc.mockRejectedValue(failure);
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'error' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('ne supprime JAMAIS un compte retrouvé par findUserId, même sur refus définitif', async () => {
    findUserId.mockResolvedValue(FOUND_ID);
    rpc.mockRejectedValue(new GatewayError(403, null));
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'error' });
    expect(createUser).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('ne supprime rien si la RPC réussit (granted ou exists)', async () => {
    await addTengaAdmin(idle, grant());
    rpc.mockResolvedValue(false);
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'exists' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('ne supprime rien si createUser lui-même échoue', async () => {
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    await addTengaAdmin(idle, grant());
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('avale l’échec de la suppression et garde l’erreur d’origine', async () => {
    rpc.mockRejectedValue(new GatewayError(400, null));
    deleteUser.mockRejectedValue(new GatewayError(500, null));
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'invalid' });
  });

  it('conserve le statut exists d’une RPC en conflit malgré la suppression', async () => {
    rpc.mockRejectedValue(new GatewayError(409, '23505'));
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'exists' });
    expect(deleteUser).toHaveBeenCalledWith(NEW_ID);
  });
});

describe('addTengaAdmin : notification de la personne promue', () => {
  it('envoie un e-mail après la RPC, dans la langue du formulaire, sans l’acteur', async () => {
    expect(await addTengaAdmin(idle, grant({ langue: 'en' }))).toEqual({
      status: 'granted'
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      text: string;
    };
    expect(mail.to).toBe('nouveau@tenga.test');
    expect(mail.subject).toContain('Super administrator');
    expect(mail.text).toContain('/connexion');
    expect(mail.text).not.toContain(VIEWER.email);
    expect(events.indexOf('rpc:ajouter_admin_tenga')).toBeLessThan(
      events.indexOf('sendMail')
    );
  });

  it('n’envoie rien si la RPC échoue', async () => {
    rpc.mockRejectedValue(new GatewayError(403, null));
    await addTengaAdmin(idle, grant());
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('n’envoie rien si la personne était déjà administrateur (exists)', async () => {
    rpc.mockResolvedValue(false);
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'exists' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('un envoi qui lève n’annule pas l’ajout : granted, nom de l’erreur seul journalisé', async () => {
    sendMail.mockRejectedValue(new TypeError('boom nouveau@tenga.test'));
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
    expect(deleteUser).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      reason: 'TypeError'
    });
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toContain(
      'nouveau@'
    );
  });

  it('un envoi refusé (false) n’annule pas l’ajout et est journalisé', async () => {
    sendMail.mockResolvedValue(false);
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      reason: 'refused'
    });
  });
});

describe('assignRole', () => {
  it('30 attributions par heure et par administrateur, après requireAdmin et avant GoTrue', async () => {
    await assignRole(idle, role());
    expect(isRateLimited).toHaveBeenCalledWith(
      'assignRole',
      { max: 30, windowMs: 3_600_000 },
      VIEWER.id
    );
    expect(events.indexOf('requireAdmin')).toBeLessThan(
      events.indexOf('isRateLimited')
    );
    expect(events.indexOf('isRateLimited')).toBeLessThan(
      events.indexOf('findUserId')
    );
  });

  it('la 31e attribution est refusée sans appel GoTrue', async () => {
    for (let i = 0; i < 30; i++) {
      expect(await assignRole(idle, role())).toEqual({ status: 'assigned' });
    }
    vi.clearAllMocks();
    expect(await assignRole(idle, role())).toEqual({ status: 'error' });
    expect(findUserId).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.role_rate_limited', {
      ip: '203.0.113.9'
    });
  });

  it('les deux plafonds sont indépendants', async () => {
    for (let i = 0; i < 10; i++) await addTengaAdmin(idle, grant());
    expect(await assignRole(idle, role())).toEqual({ status: 'assigned' });
  });

  it('supprime le compte créé par l’appel si la base refuse définitivement', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await assignRole(idle, role())).toEqual({ status: 'error' });
    expect(deleteUser).toHaveBeenCalledWith(NEW_ID);
  });

  it.each([
    ['5xx', new GatewayError(500, null)],
    ['panne réseau', new TypeError('fetch failed')],
    ['délai dépassé', new DOMException('timeout', 'TimeoutError')]
  ])('panne (%s) : le compte créé est gardé', async (_label, failure) => {
    rpc.mockRejectedValue(failure);
    expect(await assignRole(idle, role())).toEqual({ status: 'error' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('ne supprime jamais un compte retrouvé', async () => {
    findUserId.mockResolvedValue(FOUND_ID);
    rpc.mockRejectedValue(new GatewayError(500, null));
    await assignRole(idle, role());
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('succès : aucune suppression', async () => {
    expect(await assignRole(idle, role())).toEqual({ status: 'assigned' });
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

const removal = (over: Record<string, string> = {}): FormData =>
  form({ locale: 'fr', userId: THIRD, confirmer: 'oui', ...over });

describe('addTengaAdmin : notification des AUTRES administrateurs', () => {
  beforeEach(() => {
    admins = [
      admin(VIEWER.id, 'acteur@tenga.test', true),
      admin(THIRD, 'autre@tenga.test'),
      admin(FOURTH, 'quatrieme@tenga.test'),
      admin(NEW_ID, 'nouveau@tenga.test')
    ];
  });

  it('prévient les autres (ni l’acteur ni la personne ajoutée) après la RPC, liste lue avec la session', async () => {
    expect(await addTengaAdmin(idle, grant({ locale: 'en' }))).toEqual({
      status: 'granted'
    });
    expect(mailsTo().sort()).toEqual(
      ['autre@tenga.test', 'nouveau@tenga.test', 'quatrieme@tenga.test'].sort()
    );
    const mail = sendMail.mock.calls
      .map((call) => call[0] as { to: string; subject: string; text: string })
      .find((m) => m.to === 'autre@tenga.test');
    expect(mail?.subject).toContain('has been added');
    expect(mail?.text).toContain('nouveau@tenga.test');
    expect(mail?.text).not.toContain('acteur@tenga.test');
    expect(events.indexOf('rpc:ajouter_admin_tenga')).toBeLessThan(
      events.indexOf('rpc:lister_administrateurs_tenga')
    );
    expect(tokens.every((token) => token === VIEWER.accessToken)).toBe(true);
  });

  it('n’appelle ni la liste ni la messagerie quand la personne était déjà administrateur', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'ajouter_admin_tenga' ? false : admins
    );
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'exists' });
    expect(calls('lister_administrateurs_tenga')).toBe(0);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('liste illisible : ajout confirmé, avis à la personne promue envoyé, journal sans adresse', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'lister_administrateurs_tenga') {
        throw new GatewayError(500, null);
      }
      return true;
    });
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
    expect(mailsTo()).toEqual(['nouveau@tenga.test']);
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'list_failed'
    });
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toContain('@');
  });

  it('un envoi qui échoue ne prive pas les autres destinataires ni ne change le résultat', async () => {
    sendMail.mockImplementation(async (mail: { to: string }) => {
      if (mail.to === 'autre@tenga.test') throw new TypeError('boom autre@');
      return true;
    });
    expect(await addTengaAdmin(idle, grant())).toEqual({ status: 'granted' });
    expect(mailsTo()).toContain('quatrieme@tenga.test');
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'TypeError'
    });
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toContain('@');
  });

  it('un envoi refusé (false) est journalisé « refused »', async () => {
    sendMail.mockResolvedValue(false);
    await addTengaAdmin(idle, grant());
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'refused'
    });
  });
});

describe('removeTengaAdmin', () => {
  beforeEach(() => {
    admins = [
      admin(VIEWER.id, 'acteur@tenga.test', true),
      admin(THIRD, 'cible@tenga.test'),
      admin(FOURTH, 'autre@tenga.test')
    ];
  });

  it('retire avec la session de l’administrateur, revalide /admin, jamais le service role', async () => {
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'removed'
    });
    expect(rpc).toHaveBeenCalledWith('retirer_admin_tenga', {
      p_utilisateur: THIRD
    });
    expect(tokens.every((token) => token === VIEWER.accessToken)).toBe(true);
    expect(events).not.toContain('findUserId');
    expect(events).not.toContain('createUser');
    expect(events).not.toContain('deleteUser');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin');
  });

  it.each([
    ['sans confirmation', { confirmer: '' }],
    ['confirmation autre que « oui »', { confirmer: 'on' }],
    ['identifiant non UUID', { userId: 'pas-un-uuid' }],
    ['identifiant vide', { userId: '' }]
  ])('refuse %s, avant tout appel', async (_label, over) => {
    expect(await removeTengaAdmin(idle, removal(over))).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(isRateLimited).not.toHaveBeenCalled();
  });

  it('session administrateur vérifiée en premier', async () => {
    await removeTengaAdmin(idle, removal());
    expect(events[0]).toBe('requireAdmin');
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin');
  });

  it('visant l’acteur : « self », sans retrait ni liste', async () => {
    expect(
      await removeTengaAdmin(idle, removal({ userId: VIEWER.id }))
    ).toEqual({ status: 'self' });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('10 retraits par heure et par administrateur ; le 11e est refusé sans appel, journal sans adresse', async () => {
    for (let i = 0; i < 10; i++) {
      expect(await removeTengaAdmin(idle, removal())).toEqual({
        status: 'removed'
      });
    }
    expect(isRateLimited).toHaveBeenCalledWith(
      'removeTengaAdmin',
      { max: 10, windowMs: 3_600_000 },
      VIEWER.id
    );
    vi.clearAllMocks();
    events.length = 0;
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'error'
    });
    expect(rpc).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_rate_limited', {
      ip: '203.0.113.9',
      scope: 'remove'
    });
  });

  it('la base répond « false » : déjà retiré, aucun avis', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'retirer_admin_tenga' ? false : admins
    );
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'absent'
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin');
  });

  it('refus de la base (403) : « forbidden », aucun avis', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'retirer_admin_tenga') throw new GatewayError(403, '42501');
      return admins;
    });
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'forbidden'
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('autre échec : « error », journal avec le code HTTP seul', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'retirer_admin_tenga') throw new GatewayError(500, null);
      return admins;
    });
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'error'
    });
    const logged = JSON.stringify(vi.mocked(console.warn).mock.calls);
    expect(logged).toContain('500');
    expect(logged).not.toContain('@');
  });

  it('lit la liste AVANT le retrait, puis prévient les autres (ni l’acteur ni la cible)', async () => {
    await removeTengaAdmin(idle, removal({ locale: 'en' }));
    expect(events.indexOf('rpc:lister_administrateurs_tenga')).toBeLessThan(
      events.indexOf('rpc:retirer_admin_tenga')
    );
    expect(events.indexOf('rpc:retirer_admin_tenga')).toBeLessThan(
      events.indexOf('sendMail')
    );
    expect(mailsTo()).toEqual(['autre@tenga.test']);
    const mail = sendMail.mock.calls[0]?.[0] as {
      subject: string;
      text: string;
    };
    expect(mail.subject).toContain('has been removed');
    expect(mail.text).toContain('cible@tenga.test');
    expect(mail.text).not.toContain('acteur@tenga.test');
  });

  it('liste illisible : le retrait aboutit quand même, journal sans adresse', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'lister_administrateurs_tenga') {
        throw new GatewayError(500, null);
      }
      return true;
    });
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'removed'
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'list_failed'
    });
  });

  it('cible absente de la liste lue : retrait fait, pas d’avis, journal « unknown_target »', async () => {
    admins = [admin(VIEWER.id, 'acteur@tenga.test', true)];
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'removed'
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'unknown_target'
    });
  });

  it('un envoi qui lève n’annule pas le retrait et ne fuit pas', async () => {
    sendMail.mockRejectedValue(new TypeError('boom autre@tenga.test'));
    expect(await removeTengaAdmin(idle, removal())).toEqual({
      status: 'removed'
    });
    expect(logSecurityEvent).toHaveBeenCalledWith('admin.grant_notice_failed', {
      ip: '203.0.113.9',
      scope: 'others',
      reason: 'TypeError'
    });
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toContain('@');
  });
});
