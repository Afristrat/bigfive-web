import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance
} from 'vitest';
import type { z } from 'zod';

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));

const jar = { get: vi.fn(), has: vi.fn(), set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => jar }));

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: { isLimited: vi.fn() }
}));

const currentViewer = vi.fn();
vi.mock('@/lib/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/session')>()),
  currentViewer: () => currentViewer()
}));

const rpc = vi.fn();
const findUserId = vi.fn();
const createUser = vi.fn();
const openSession = vi.fn();
const deleteUser = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  // Comme le vrai client : la réponse passe par le schéma de l'appelant.
  serviceClient: () => ({
    rpc: async (
      fn: string,
      args: Record<string, unknown>,
      schema: z.ZodType
    ) => {
      // Migration 0013 : recherche par adresse et retrait sans appartenance
      // passent par la base ; les doublures findUserId et deleteUser en tiennent lieu.
      if (fn === 'compte_par_adresse') {
        return schema.parse(await findUserId(args.p_email));
      }
      if (fn === 'retirer_compte_sans_appartenance') {
        await deleteUser(args.p_utilisateur);
        return schema.parse(true);
      }
      return schema.parse(await rpc(fn, args));
    },
    createUser,
    openSession
  })
}));

import {
  acceptInvitation,
  type AcceptState
} from '@/actions/invitation-accept';
import { invitationLimits } from '@/lib/invitation-limits';
import { sharedLimiter } from '@/lib/rate-limit';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/session-cookies';
import { GatewayError } from '@/lib/supabase/server';

const TOKEN = `${'Zx9_-'.repeat(8)}Zx9`;
const EMAIL = 'ines.invitee@exemple.ma';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const PARTICIPATION = '22222222-2222-4222-8222-222222222222';
const SESSION = {
  accessToken: 'aaaa.bbbb.cccc',
  refreshToken: 'rt-new',
  expiresIn: 3600
};
const ROW = {
  email: EMAIL,
  prenom: 'Inès',
  langue: 'fr',
  message: null,
  campagne_titre: 'Cohorte 2026',
  organisation_nom: 'Atelier Atlas',
  expire: '2026-11-20T10:00:00+00:00'
};

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const submit = (token: string = TOKEN) =>
  acceptInvitation({ status: 'idle' }, form({ token }));

const rpcCalls = (name: string) => rpc.mock.calls.filter(([fn]) => fn === name);
const sqlError = (code: string) => new GatewayError(400, code);

let warn: MockInstance<typeof console.warn>;
let error: MockInstance<typeof console.error>;

beforeEach(() => {
  jar.get.mockReset().mockReturnValue(undefined);
  jar.set.mockReset();
  vi.mocked(sharedLimiter.isLimited).mockReset().mockReturnValue(false);
  currentViewer.mockReset().mockResolvedValue({ status: 'anonymous' });
  rpc.mockReset().mockImplementation(async (fn: string) => {
    if (fn === 'consulter_invitation') return [ROW];
    if (fn === 'accepter_invitation') return PARTICIPATION;
    throw new Error(`rpc inattendue : ${fn}`);
  });
  findUserId.mockReset().mockResolvedValue(USER_ID);
  createUser.mockReset().mockResolvedValue(USER_ID);
  deleteUser.mockReset().mockResolvedValue(undefined);
  openSession.mockReset().mockResolvedValue(SESSION);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
  error.mockRestore();
});

describe('acceptInvitation : succès (compte créé par cet appel)', () => {
  beforeEach(() => {
    findUserId.mockResolvedValue(null);
  });

  it('accepte avec le jeton et l’identifiant, mais n’ouvre aucune session : signin_required, openSession non appelé, aucun cookie', async () => {
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(createUser).toHaveBeenCalledWith(EMAIL, 'fr');
    expect(rpc).toHaveBeenCalledWith('accepter_invitation', {
      p_jeton: TOKEN,
      p_utilisateur: USER_ID
    });
    expect(openSession).not.toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('aucune redirection, même avec un cookie « next » posé', async () => {
    jar.get.mockImplementation((name: string) =>
      name === '__Host-tenga_next' ? { name, value: '/admin' } : undefined
    );
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(openSession).not.toHaveBeenCalled();
  });

  it('l’état retourné ne contient ni jeton ni adresse', async () => {
    const state = await submit();
    expect(JSON.stringify(state)).not.toContain(TOKEN);
    expect(JSON.stringify(state)).not.toContain(EMAIL);
  });
});

describe('acceptInvitation : compte orphelin (revue sécurité MIN-4)', () => {
  const refuse = (code: string | Error) =>
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw typeof code === 'string' ? sqlError(code) : code;
    });

  it.each([['55000'], ['22023']])(
    'compte créé par l’appel puis refus %s : compte supprimé, unavailable',
    async (code) => {
      findUserId.mockResolvedValue(null);
      refuse(code);
      await expect(submit()).resolves.toEqual({ status: 'unavailable' });
      expect(deleteUser).toHaveBeenCalledTimes(1);
      expect(deleteUser).toHaveBeenCalledWith(USER_ID);
    }
  );

  it('compte préexistant puis refus 55000 : jamais supprimé', async () => {
    refuse('55000');
    await expect(submit()).resolves.toEqual({ status: 'unavailable' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('P0002 (double clic, jeton déjà consommé) : le compte créé n’est PAS supprimé', async () => {
    findUserId.mockResolvedValue(null);
    refuse('P0002');
    await expect(submit()).resolves.toEqual({ status: 'invalid' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('panne réseau ou autre erreur (acceptation peut-être faite) : pas de suppression', async () => {
    findUserId.mockResolvedValue(null);
    refuse(new TypeError('fetch failed'));
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('course : compte créé par l’autre appel, refus 55000 : jamais supprimé', async () => {
    findUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(USER_ID);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    refuse('55000');
    await submit();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('échec de la suppression : avalé, le statut reste unavailable', async () => {
    findUserId.mockResolvedValue(null);
    deleteUser.mockRejectedValue(new GatewayError(500, null));
    refuse('55000');
    await expect(submit()).resolves.toEqual({ status: 'unavailable' });
  });
});

describe('acceptInvitation : compte préexistant (constat I1)', () => {
  it('compte existant : acceptée, signin_required, openSession non appelé, aucun cookie', async () => {
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(rpcCalls('accepter_invitation')).toHaveLength(1);
    expect(openSession).not.toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('course : le compte créé par l’autre appel ne donne pas de session non plus', async () => {
    findUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(USER_ID);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(openSession).not.toHaveBeenCalled();
  });
});

describe('acceptInvitation : compte et ordre des effets (risque 10)', () => {
  it('compte inexistant : createUser AVANT accepter_invitation', async () => {
    findUserId.mockResolvedValue(null);
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(createUser).toHaveBeenCalledWith(EMAIL, 'fr');
    const created = createUser.mock.invocationCallOrder[0] ?? 0;
    const accepted =
      rpc.mock.invocationCallOrder[
        rpc.mock.calls.findIndex(([fn]) => fn === 'accepter_invitation')
      ];
    expect(created).toBeGreaterThan(0);
    expect(accepted).toBeGreaterThan(created);
    expect(rpc).toHaveBeenCalledWith('accepter_invitation', {
      p_jeton: TOKEN,
      p_utilisateur: USER_ID
    });
  });

  it('compte existant : aucun createUser', async () => {
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('la consultation précède toute création de compte', async () => {
    findUserId.mockResolvedValue(null);
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    const consulted = rpc.mock.invocationCallOrder[0] ?? 0;
    expect(consulted).toBeLessThan(createUser.mock.invocationCallOrder[0] ?? 0);
    expect(rpc.mock.calls[0]?.[0]).toBe('consulter_invitation');
  });

  it('doublon par course : relit findUserId une fois et poursuit', async () => {
    findUserId.mockResolvedValueOnce(null).mockResolvedValueOnce(USER_ID);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(findUserId).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenCalledWith('accepter_invitation', {
      p_jeton: TOKEN,
      p_utilisateur: USER_ID
    });
  });

  it('création en échec et compte toujours introuvable : failed, aucune acceptation', async () => {
    findUserId.mockResolvedValue(null);
    createUser.mockRejectedValue(new GatewayError(500, null));
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(rpcCalls('accepter_invitation')).toHaveLength(0);
    expect(openSession).not.toHaveBeenCalled();
  });
});

describe('acceptInvitation : refus avant tout effet', () => {
  it.each([
    ['vide', ''],
    ['42 caractères', TOKEN.slice(0, 42)],
    ['44 caractères', `${TOKEN}a`],
    ['avec une barre oblique', `${TOKEN.slice(0, 42)}/`],
    ['avec un plus', `${TOKEN.slice(0, 42)}+`],
    ['avec un égal', `${TOKEN.slice(0, 42)}=`]
  ])('jeton %s : invalid, aucun appel réseau', async (_label, token) => {
    await expect(submit(token)).resolves.toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
    expect(findUserId).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(openSession).not.toHaveBeenCalled();
  });

  it('jeton absent du formulaire : invalid', async () => {
    await expect(
      acceptInvitation({ status: 'idle' }, form({}))
    ).resolves.toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('loadInvitation null (inconnu, expiré, utilisé, campagne close) : invalid, sans createUser ni acceptation', async () => {
    findUserId.mockResolvedValue(null);
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consulter_invitation' ? [] : PARTICIPATION
    );
    await expect(submit()).resolves.toEqual({ status: 'invalid' });
    expect(findUserId).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(rpcCalls('accepter_invitation')).toHaveLength(0);
  });

  it('panne de la consultation : failed, aucun compte créé', async () => {
    rpc.mockRejectedValue(new GatewayError(503, null));
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(createUser).not.toHaveBeenCalled();
  });
});

describe('acceptInvitation : plafond par IP', () => {
  it('jeton mal formé : invalid sans consulter ni consommer le limiteur', async () => {
    await expect(submit('court')).resolves.toEqual({ status: 'invalid' });
    expect(sharedLimiter.isLimited).not.toHaveBeenCalled();
  });

  it('jeton mal formé alors que le plafond est atteint : invalid, aucun quota consommé', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    await expect(submit('court')).resolves.toEqual({ status: 'invalid' });
  });

  it('au-delà du plafond : failed neutre, aucun appel à la base, journalisé', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(rpc).not.toHaveBeenCalled();
    expect(findUserId).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(sharedLimiter.isLimited).toHaveBeenCalledWith(
      expect.any(String),
      invitationLimits.acceptPerIp,
      '203.0.113.9'
    );
    const logged = warn.mock.calls.map(([line]) => String(line)).join('\n');
    expect(logged).toContain('invitation.accept_rate_limited');
  });

  it('jeton bien formé et plafond atteint : failed, le plafond reste consulté', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(sharedLimiter.isLimited).toHaveBeenCalledTimes(1);
  });
});

describe('acceptInvitation : session d’une autre adresse (risque 7)', () => {
  it('autre adresse : other_session, sans compte ni acceptation', async () => {
    findUserId.mockResolvedValue(null);
    currentViewer.mockResolvedValue({
      status: 'ok',
      viewer: {
        id: '33333333-3333-4333-8333-333333333333',
        email: 'quelquun.dautre@exemple.ma',
        accessToken: 'x.y.z'
      }
    });
    await expect(submit()).resolves.toEqual({ status: 'other_session' });
    expect(findUserId).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
    expect(rpcCalls('accepter_invitation')).toHaveLength(0);
    expect(openSession).not.toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });

  it('même adresse (casse et espaces différents) : acceptation', async () => {
    findUserId.mockResolvedValue(null);
    currentViewer.mockResolvedValue({
      status: 'ok',
      viewer: {
        id: USER_ID,
        email: ` ${EMAIL.toUpperCase()} `,
        accessToken: 'x.y.z'
      }
    });
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(rpcCalls('accepter_invitation')).toHaveLength(1);
    expect(openSession).not.toHaveBeenCalled();
  });

  it('session expirée à renouveler (aucune adresse lisible) : acceptation', async () => {
    findUserId.mockResolvedValue(null);
    currentViewer.mockResolvedValue({ status: 'refresh' });
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(openSession).not.toHaveBeenCalled();
  });

  it('lecture de la session en panne : failed, aucune acceptation', async () => {
    currentViewer.mockRejectedValue(new GatewayError(503, null));
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(rpcCalls('accepter_invitation')).toHaveLength(0);
  });
});

describe('acceptInvitation : réponses de la base', () => {
  const failWith = (code: string) =>
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw sqlError(code);
    });

  it('P0002 (jeton consommé entre-temps) : invalid', async () => {
    failWith('P0002');
    await expect(submit()).resolves.toEqual({ status: 'invalid' });
    expect(openSession).not.toHaveBeenCalled();
  });

  it.each([['55000'], ['22023']])(
    '%s : unavailable, texte neutre (aucun mot « rôle »)',
    async (code) => {
      failWith(code);
      const state = await submit();
      expect(state).toEqual({ status: 'unavailable' });
      expect(JSON.stringify(state).toLowerCase()).not.toContain('rôle');
      expect(JSON.stringify(state).toLowerCase()).not.toContain('role');
      expect(openSession).not.toHaveBeenCalled();
    }
  );

  it('55000 et 22023 donnent exactement le même état', async () => {
    failWith('55000');
    const first = await submit();
    failWith('22023');
    const second = await submit();
    expect(second).toEqual(first);
  });

  it('autre erreur de la base (42501, réseau) : failed', async () => {
    failWith('42501');
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw new TypeError('fetch failed');
    });
    await expect(submit()).resolves.toEqual({ status: 'failed' });
  });

  it('réponse de la base qui n’est pas un uuid : failed, pas de session', async () => {
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consulter_invitation' ? [ROW] : 'pas-un-uuid'
    );
    await expect(submit()).resolves.toEqual({ status: 'failed' });
    expect(openSession).not.toHaveBeenCalled();
  });
});

describe('acceptInvitation : jamais de session ouverte par le lien (constat I-M2)', () => {
  beforeEach(() => {
    findUserId.mockResolvedValue(null);
  });

  it('même si openSession réussirait ou échouerait : jamais appelé, acceptation faite, aucun cookie', async () => {
    openSession.mockRejectedValue(new GatewayError(500, null));
    await expect(submit()).resolves.toEqual({ status: 'signin_required' });
    expect(rpcCalls('accepter_invitation')).toHaveLength(1);
    expect(openSession).not.toHaveBeenCalled();
    expect(jar.set).not.toHaveBeenCalled();
  });
});

describe('acceptInvitation : double appel concurrent (risque 6)', () => {
  it('le second appel reçoit invalid, un seul compte, aucune session', async () => {
    let consumed = false;
    let created: string | null = null;
    findUserId.mockImplementation(async () => created);
    createUser.mockImplementation(async () => {
      if (created) throw new GatewayError(422, 'email_exists');
      created = USER_ID;
      return USER_ID;
    });
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      // Verrou FOR UPDATE de la base : la première acceptation consomme, la seconde ne trouve plus rien.
      if (consumed) throw sqlError('P0002');
      consumed = true;
      return PARTICIPATION;
    });

    const results = await Promise.allSettled([submit(), submit()]);
    const states = results.flatMap((r) =>
      r.status === 'fulfilled' ? [r.value as AcceptState] : []
    );
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
    expect(states.map((x) => x.status).sort()).toEqual([
      'invalid',
      'signin_required'
    ]);
    expect(openSession).not.toHaveBeenCalled();
    expect(rpcCalls('accepter_invitation')).toHaveLength(2);
  });
});

describe('acceptInvitation : journal sans jeton ni adresse (risque 9)', () => {
  const everything = (): string =>
    [...warn.mock.calls, ...error.mock.calls]
      .map((args) => args.map(String).join(' '))
      .join('\n');

  it('aucun scénario d’échec n’écrit le jeton ni l’adresse', async () => {
    // Messages d'erreur qui citeraient l'adresse et le jeton : ils ne doivent jamais sortir.
    const leaky = new Error(`échec pour ${EMAIL} avec ${TOKEN}`);
    findUserId.mockResolvedValue(null);
    createUser.mockRejectedValue(leaky);
    await submit();

    findUserId.mockResolvedValue(USER_ID);
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw sqlError('55000');
    });
    await submit();
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw leaky;
    });
    await submit();
    rpc.mockImplementation(async () => {
      throw leaky;
    });
    await submit();
    rpc.mockImplementation(async (fn: string) =>
      fn === 'consulter_invitation' ? [ROW] : PARTICIPATION
    );
    findUserId.mockResolvedValue(null);
    createUser.mockResolvedValue(USER_ID);
    await submit();
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    await submit();

    const logged = everything();
    expect(logged).toContain('invitation.accept_failed');
    expect(logged).not.toContain(TOKEN);
    expect(logged).not.toContain(EMAIL);
    expect(logged).not.toContain('Inès');
    expect(logged).not.toContain('exemple.ma');
  });

  it('l’état retourné ne contient ni jeton ni adresse', async () => {
    rpc.mockImplementation(async (fn: string) => {
      if (fn === 'consulter_invitation') return [ROW];
      throw sqlError('55000');
    });
    const state = await submit();
    expect(JSON.stringify(state)).not.toContain(TOKEN);
    expect(JSON.stringify(state)).not.toContain(EMAIL);
  });
});
