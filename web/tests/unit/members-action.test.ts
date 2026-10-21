import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RateLimiter } from '@/lib/sliding-window';

type Parser = { parse: (value: unknown) => unknown };

const events: string[] = [];

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
  email: 'chef@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  requireViewer: (locale: string, path: string) => requireViewer(locale, path)
}));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => {
    events.push('loadOrgPage');
    return loadOrgPage(viewer, slug);
  }
}));

const rpc = vi.fn();
const findUserId = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({
    // Migration 0013 : recherche par adresse et retrait sans appartenance
    // passent par la base ; les marqueurs findUserId et deleteUser restent.
    rpc: async (fn: string, args: Record<string, unknown>, schema: Parser) => {
      if (fn === 'compte_par_adresse') {
        events.push('findUserId');
        return schema.parse(await findUserId(args.p_email));
      }
      if (fn === 'retirer_compte_sans_appartenance') {
        events.push('deleteUser');
        await deleteUser(args.p_utilisateur);
        return schema.parse(true);
      }
      throw new Error(`rpc de service inattendue : ${fn}`);
    },
    createUser: (email: string, locale: string) => {
      events.push('createUser');
      return createUser(email, locale);
    }
  }),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) => {
      events.push(`rpc:${fn}`);
      return schema.parse(await rpc(fn, args));
    }
  })
}));

const sendMail = vi.fn();
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: (mail: unknown) => sendMail(mail)
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

import { inviteMember, type MemberState } from '@/actions/members';
import { MailConfigError } from '@/lib/mailer';
import { localizedPath } from '@/lib/safe-path';
import { createRateLimiter } from '@/lib/sliding-window';
import { GatewayError } from '@/lib/supabase/server';

const ORG_ID = '22222222-2222-4222-8222-222222222222';
const NEW_USER = '33333333-3333-4333-8333-333333333333';
const EMAIL = 'nadia.nouvelle@exemple.ma';
const idle: MemberState = { status: 'idle' };

const page = (over: {
  isAdmin?: boolean;
  role?: 'responsable' | 'consultant' | 'participant' | null;
}) => ({
  org: { id: ORG_ID, nom: 'Acme', slug: 'acme', statut: 'active' },
  isAdmin: over.isAdmin ?? false,
  role: over.role === undefined ? 'responsable' : over.role
});

const form = (over: Record<string, string> = {}): FormData => {
  const data = new FormData();
  const fields: Record<string, string> = {
    locale: 'fr',
    slug: 'acme',
    organisation: ORG_ID,
    email: EMAIL,
    emailConfirmation: EMAIL,
    role: 'consultant',
    langue: 'fr',
    ...over
  };
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const call = (over: Record<string, string> = {}): Promise<MemberState> =>
  inviteMember(idle, form(over));

const noEffect = (): void => {
  expect(findUserId).not.toHaveBeenCalled();
  expect(createUser).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalled();
  expect(sendMail).not.toHaveBeenCalled();
  expect(revalidatePath).not.toHaveBeenCalled();
};

type Spy = ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };
let warn: Spy;
let error: Spy;
const logged = (): string =>
  [...warn.mock.calls, ...error.mock.calls]
    .map((call) => String(call[0]))
    .join('\n');

beforeEach(() => {
  events.length = 0;
  process.env.SITE_URL = 'https://tenga.test';
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL = 'aide@tenga.test';
  limiterBox.current = createRateLimiter();
  revalidatePath.mockReset();
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  loadOrgPage
    .mockReset()
    .mockResolvedValue(page({ isAdmin: true, role: null }));
  findUserId.mockReset().mockResolvedValue(NEW_USER);
  createUser.mockReset().mockResolvedValue(NEW_USER);
  deleteUser.mockReset().mockResolvedValue(undefined);
  rpc.mockReset().mockImplementation(async () => null);
  sendMail.mockReset().mockImplementation(async () => {
    events.push('send');
    return true;
  });
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

describe('inviteMember : droits (pré-contrôle avant tout effet de bord)', () => {
  it.each(['responsable', 'consultant'] as const)(
    'responsable qui demande « %s » : forbidden, aucun effet (décision I2)',
    async (role) => {
      loadOrgPage.mockResolvedValue(page({ role: 'responsable' }));
      expect(await call({ role })).toEqual({ status: 'forbidden' });
      noEffect();
    }
  );

  it.each(['consultant', 'participant'] as const)(
    '%s de l’organisation : forbidden, aucun effet',
    async (role) => {
      loadOrgPage.mockResolvedValue(page({ role }));
      expect(await call({ role: 'consultant' })).toEqual({
        status: 'forbidden'
      });
      noEffect();
    }
  );

  it('ni membre ni administrateur : forbidden, aucun effet', async () => {
    loadOrgPage.mockResolvedValue(page({ role: null }));
    expect(await call()).toEqual({ status: 'forbidden' });
    noEffect();
  });

  it('organisation introuvable ou invisible : forbidden, aucun effet', async () => {
    loadOrgPage.mockResolvedValue(null);
    expect(await call()).toEqual({ status: 'forbidden' });
    noEffect();
  });

  it('identifiant d’organisation différent de celui de la page : forbidden, aucun effet', async () => {
    expect(
      await call({ organisation: '99999999-9999-4999-8999-999999999999' })
    ).toEqual({ status: 'forbidden' });
    noEffect();
  });

  it('rôle « participant » demandé : invalid (hors formulaire), aucun effet', async () => {
    expect(await call({ role: 'participant' })).toEqual({ status: 'invalid' });
    noEffect();
    expect(loadOrgPage).not.toHaveBeenCalled();
  });
});

describe('inviteMember : saisie', () => {
  it('confirmation différente : invalid, aucun effet, aucune lecture', async () => {
    expect(
      await call({ emailConfirmation: 'autre.personne@exemple.ma' })
    ).toEqual({ status: 'invalid' });
    noEffect();
    expect(loadOrgPage).not.toHaveBeenCalled();
  });

  it('confirmation ne différant que par la casse : acceptée', async () => {
    expect(await call({ emailConfirmation: EMAIL.toUpperCase() })).toEqual({
      status: 'invited'
    });
  });

  it('adresse mal formée, organisation non uuid, slug hors format : invalid', async () => {
    expect(
      await call({
        email: 'pas-une-adresse',
        emailConfirmation: 'pas-une-adresse'
      })
    ).toEqual({ status: 'invalid' });
    expect(await call({ organisation: 'x' })).toEqual({ status: 'invalid' });
    expect(await call({ slug: 'a&b' })).toEqual({ status: 'invalid' });
    noEffect();
  });
});

describe('inviteMember : attribution puis notification', () => {
  it('administrateur invitant un consultant : lecture, compte, RPC, puis envoi', async () => {
    expect(await call()).toEqual({ status: 'invited' });
    expect(events).toEqual([
      'loadOrgPage',
      'findUserId',
      'rpc:attribuer_role',
      'send'
    ]);
    expect(rpc).toHaveBeenCalledWith('attribuer_role', {
      p_utilisateur: NEW_USER,
      p_organisation: ORG_ID,
      p_role: 'consultant'
    });
    expect(createUser).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith(localizedPath('fr', '/o/acme'));
  });

  it('administrateur non membre invitant un responsable : RPC puis envoi', async () => {
    loadOrgPage.mockResolvedValue(page({ isAdmin: true, role: null }));
    expect(await call({ role: 'responsable' })).toEqual({ status: 'invited' });
    expect(rpc).toHaveBeenCalledWith('attribuer_role', {
      p_utilisateur: NEW_USER,
      p_organisation: ORG_ID,
      p_role: 'responsable'
    });
    expect(events.indexOf('send')).toBeGreaterThan(
      events.indexOf('rpc:attribuer_role')
    );
  });

  it('l’envoi n’a lieu qu’après la fin de la RPC', async () => {
    let finish: () => void = () => undefined;
    rpc.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          finish = () => resolve(null);
        })
    );
    const pending = call();
    await vi.waitFor(() => expect(events).toContain('rpc:attribuer_role'));
    // La RPC n'est pas terminée : aucun e-mail.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sendMail).not.toHaveBeenCalled();
    finish();
    expect(await pending).toEqual({ status: 'invited' });
    expect(sendMail).toHaveBeenCalledTimes(1);
  });

  it('compte inexistant : créé avant la RPC', async () => {
    findUserId.mockResolvedValue(null);
    expect(await call()).toEqual({ status: 'invited' });
    expect(events).toEqual([
      'loadOrgPage',
      'findUserId',
      'createUser',
      'rpc:attribuer_role',
      'send'
    ]);
    expect(createUser).toHaveBeenCalledWith(EMAIL, 'fr');
  });

  it('création concurrente du compte : relecture une fois, puis suite', async () => {
    findUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(NEW_USER);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    expect(await call()).toEqual({ status: 'invited' });
    expect(rpc).toHaveBeenCalledWith(
      'attribuer_role',
      expect.objectContaining({ p_utilisateur: NEW_USER })
    );
  });

  it('compte existant ou non : même statut et même e-mail', async () => {
    expect(await call()).toEqual({ status: 'invited' });
    const existing = sendMail.mock.calls[0]?.[0];
    sendMail.mockClear();
    findUserId.mockResolvedValue(null);
    expect(await call()).toEqual({ status: 'invited' });
    expect(sendMail.mock.calls[0]?.[0]).toEqual(existing);
    expect(JSON.stringify(existing)).not.toMatch(/créé|created/i);
  });

  it('e-mail : destinataire, lien constant vers la connexion, sans jeton', async () => {
    await call({ langue: 'en', role: 'consultant' });
    const mail = sendMail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(mail.to).toBe(EMAIL);
    expect(mail.text).toContain('https://tenga.test/connexion');
    expect(mail.subject).toContain('Acme');
  });

  it('envoi refusé : invited_mail_failed, accès conservé, revalidation faite', async () => {
    sendMail.mockResolvedValue(false);
    expect(await call()).toEqual({ status: 'invited_mail_failed' });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledTimes(1);
  });

  it('clé d’envoi absente : invited_mail_failed', async () => {
    sendMail.mockRejectedValue(new MailConfigError());
    expect(await call()).toEqual({ status: 'invited_mail_failed' });
  });
});

describe('inviteMember : compte orphelin', () => {
  it('refus définitif de la base après création : le compte créé par l’appel est supprimé', async () => {
    findUserId.mockResolvedValue(null);
    rpc.mockRejectedValue(new GatewayError(400, '22023'));
    expect(await call()).toEqual({ status: 'error' });
    expect(deleteUser).toHaveBeenCalledTimes(1);
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER);
  });

  it.each([
    ['5xx', new GatewayError(500, 'XX000')],
    ['panne réseau', new TypeError('fetch failed')],
    ['délai dépassé', new DOMException('timeout', 'TimeoutError')]
  ])(
    'panne (%s) après création : le compte est gardé (les droits ont pu être accordés)',
    async (_label, failure) => {
      findUserId.mockResolvedValue(null);
      rpc.mockRejectedValue(failure);
      expect(await call()).toEqual({ status: 'error' });
      expect(deleteUser).not.toHaveBeenCalled();
    }
  );

  it('refus 42501 après création : compte supprimé aussi', async () => {
    findUserId.mockResolvedValue(null);
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await call()).toEqual({ status: 'forbidden' });
    expect(deleteUser).toHaveBeenCalledWith(NEW_USER);
  });

  it('compte préexistant : jamais supprimé, même si la RPC échoue', async () => {
    rpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    expect(await call()).toEqual({ status: 'error' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('course sur la création : le compte de l’autre appel n’est jamais supprimé', async () => {
    findUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(NEW_USER);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    rpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    expect(await call()).toEqual({ status: 'error' });
    expect(deleteUser).not.toHaveBeenCalled();
  });
});

describe('inviteMember : refus et pannes', () => {
  it('42501 (auto-attribution, droit refusé) : forbidden unique, aucun envoi', async () => {
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await call()).toEqual({ status: 'forbidden' });
    expect(sendMail).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('autre erreur de la base : error, aucun envoi', async () => {
    rpc.mockRejectedValue(new GatewayError(500, 'XX000'));
    expect(await call()).toEqual({ status: 'error' });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('recherche du compte en panne : error, aucune RPC', async () => {
    findUserId.mockRejectedValue(new Error('réseau'));
    expect(await call()).toEqual({ status: 'error' });
    expect(rpc).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('lecture de l’organisation en panne : error, aucun effet', async () => {
    loadOrgPage.mockRejectedValue(new Error('réseau'));
    expect(await call()).toEqual({ status: 'error' });
    noEffect();
  });

  it('21e invitation de l’heure : rate_limited, aucun effet', async () => {
    for (let i = 0; i < 20; i += 1) {
      expect((await call()).status).toBe('invited');
    }
    rpc.mockClear();
    findUserId.mockClear();
    sendMail.mockClear();
    expect(await call()).toEqual({ status: 'rate_limited' });
    expect(rpc).not.toHaveBeenCalled();
    expect(findUserId).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('le plafond est propre à chaque personne connectée', async () => {
    for (let i = 0; i < 20; i += 1) await call();
    requireViewer.mockResolvedValue({
      ...VIEWER,
      id: '55555555-5555-4555-8555-555555555555'
    });
    expect((await call()).status).toBe('invited');
  });
});

describe('inviteMember : journaux', () => {
  it('aucune adresse ni identifiant dans les journaux, quelle que soit la panne', async () => {
    sendMail.mockResolvedValueOnce(false);
    await call();
    rpc.mockRejectedValueOnce(new Error(`échec pour ${EMAIL}`));
    await call();
    findUserId.mockRejectedValueOnce(new Error(`introuvable ${EMAIL}`));
    await call();
    loadOrgPage.mockRejectedValueOnce(new Error(`boum ${EMAIL}`));
    await call();
    const text = logged();
    expect(text).not.toContain(EMAIL);
    expect(text).not.toContain('nadia');
    expect(text).not.toContain(NEW_USER);
    expect(text).not.toContain(VIEWER.email);
    expect(text).not.toContain(VIEWER.accessToken);
  });

  it('l’état retourné ne contient ni adresse ni identifiant', async () => {
    const state = await call();
    expect(JSON.stringify(state)).not.toContain('nadia');
    expect(JSON.stringify(state)).not.toContain(NEW_USER);
  });
});
