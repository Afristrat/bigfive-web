import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GatewayError,
  serviceClient,
  supabaseConfigProblems,
  userClient
} from '@/lib/supabase/server';
import { z } from 'zod';

const SECRET = 'sb_secret_testtesttesttesttest_abcd1234';
const URL = 'http://tenga-sb-gw:8000';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1In0.c2lnbmF0dXJl';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const reply = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body))
  }) as Response;

let fetchMock: ReturnType<typeof vi.fn>;
const lastCall = (index = 0) => {
  const [url, init] = fetchMock.mock.calls[index] as [string, RequestInit];
  return {
    url,
    init,
    headers: init.headers as Record<string, string>
  };
};

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', URL);
  vi.stubEnv('SUPABASE_SECRET_KEY', SECRET);
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('supabaseConfigProblems', () => {
  it('accepte la passerelle interne et une clé secrète sb_secret_', () => {
    expect(
      supabaseConfigProblems({
        NODE_ENV: 'production',
        SUPABASE_URL: 'http://tenga-sb-preprod-gw:8000/',
        SUPABASE_SECRET_KEY: SECRET
      })
    ).toEqual([]);
  });

  it('signale les variables absentes sans citer de valeur', () => {
    const problems = supabaseConfigProblems({});
    expect(problems).toHaveLength(2);
  });

  it('refuse en production une URL qui n’est pas la passerelle interne', () => {
    const problems = supabaseConfigProblems({
      NODE_ENV: 'production',
      SUPABASE_URL: 'https://exemple.supabase.co',
      SUPABASE_SECRET_KEY: SECRET
    });
    expect(problems.join(' ')).toContain('passerelle interne');
    expect(problems.join(' ')).not.toContain('exemple');
  });

  it('refuse une clé qui n’est pas une clé secrète opaque', () => {
    const problems = supabaseConfigProblems({
      SUPABASE_URL: URL,
      SUPABASE_SECRET_KEY: 'sb_publishable_xxx'
    });
    expect(problems.join(' ')).toContain('sb_secret_');
    expect(problems.join(' ')).not.toContain('sb_publishable_xxx');
  });
});

describe('client service', () => {
  it('appelle une fonction SQL avec la clé secrète et le schéma app', async () => {
    fetchMock.mockResolvedValue(reply(USER_ID));
    const id = await serviceClient().rpc(
      'consommer_lien_connexion',
      { p_jeton: 'x' },
      z.string().uuid().nullable()
    );
    expect(id).toBe(USER_ID);
    const call = lastCall();
    expect(call.url).toBe(`${URL}/rest/v1/rpc/consommer_lien_connexion`);
    expect(call.init.method).toBe('POST');
    expect(call.headers.apikey).toBe(SECRET);
    expect(call.headers['Content-Profile']).toBe('app');
    expect(call.headers.Authorization).toBeUndefined();
    expect(JSON.parse(String(call.init.body))).toEqual({ p_jeton: 'x' });
  });

  it('accepte une réponse null (jeton refusé)', async () => {
    fetchMock.mockResolvedValue(reply(null));
    await expect(
      serviceClient().rpc(
        'consommer_lien_connexion',
        { p_jeton: 'x' },
        z.string().nullable()
      )
    ).resolves.toBeNull();
  });

  it('rejette une réponse qui n’a pas la forme attendue', async () => {
    fetchMock.mockResolvedValue(reply({ inattendu: true }));
    await expect(
      serviceClient().rpc('f', {}, z.string())
    ).rejects.toBeInstanceOf(z.ZodError);
  });

  it('ouvre une session : lecture du compte, lien interne, échange', async () => {
    fetchMock
      .mockResolvedValueOnce(reply({ id: USER_ID, email: 'a@tenga.ma' }))
      .mockResolvedValueOnce(
        reply({ hashed_token: 'hash', verification_type: 'magiclink' })
      )
      .mockResolvedValueOnce(
        reply({
          access_token: 'a'.repeat(30),
          refresh_token: 'refresh',
          expires_in: 3600
        })
      );
    const session = await serviceClient().openSession(USER_ID);
    expect(session).toEqual({
      accessToken: 'a'.repeat(30),
      refreshToken: 'refresh',
      expiresIn: 3600
    });
    expect(lastCall(0).url).toBe(`${URL}/auth/v1/admin/users/${USER_ID}`);
    expect(lastCall(1).url).toBe(`${URL}/auth/v1/admin/generate_link`);
    expect(JSON.parse(String(lastCall(1).init.body))).toEqual({
      type: 'magiclink',
      email: 'a@tenga.ma'
    });
    expect(lastCall(2).url).toBe(`${URL}/auth/v1/verify`);
    expect(JSON.parse(String(lastCall(2).init.body))).toEqual({
      type: 'magiclink',
      token_hash: 'hash'
    });
  });

  it('retrouve un compte par adresse (minuscules) sur plusieurs pages', async () => {
    const page = Array.from({ length: 200 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
      email: `u${i}@x.ma`
    }));
    fetchMock
      .mockResolvedValueOnce(reply({ users: page }))
      .mockResolvedValueOnce(
        reply({ users: [{ id: USER_ID, email: 'Cible@Tenga.ma' }] })
      );
    await expect(serviceClient().findUserId('  cible@TENGA.ma ')).resolves.toBe(
      USER_ID
    );
    expect(lastCall(1).url).toContain('page=2');
  });

  it('renvoie null quand l’adresse n’a pas de compte', async () => {
    fetchMock.mockResolvedValue(reply({ users: [] }));
    await expect(serviceClient().findUserId('absent@x.ma')).resolves.toBeNull();
  });

  it('crée un compte confirmé, adresse en minuscules, langue en métadonnées', async () => {
    fetchMock.mockResolvedValue(reply({ id: USER_ID }));
    await expect(
      serviceClient().createUser(' Nouveau@Tenga.MA ', 'ar')
    ).resolves.toBe(USER_ID);
    expect(JSON.parse(String(lastCall().init.body))).toEqual({
      email: 'nouveau@tenga.ma',
      email_confirm: true,
      user_metadata: { langue: 'ar' }
    });
  });
});

describe('client utilisateur', () => {
  it('transmet le jeton de la personne, pas celui du service', async () => {
    fetchMock.mockResolvedValue(reply(true));
    await userClient(JWT).rpc('suis_admin_tenga', {}, z.boolean());
    const call = lastCall();
    expect(call.headers.Authorization).toBe(`Bearer ${JWT}`);
    expect(call.headers.apikey).toBe(SECRET);
  });

  it('lit une table de app avec le profil de lecture', async () => {
    fetchMock.mockResolvedValue(reply([{ id: USER_ID }]));
    await userClient(JWT).select(
      'organizations',
      'select=id',
      z.array(z.object({ id: z.string() }))
    );
    const call = lastCall();
    expect(call.url).toBe(`${URL}/rest/v1/organizations?select=id`);
    expect(call.init.method).toBe('GET');
    expect(call.headers['Accept-Profile']).toBe('app');
  });

  it('renvoie null quand GoTrue refuse le jeton (expiré ou révoqué)', async () => {
    fetchMock.mockResolvedValue(reply({ error_code: 'bad_jwt' }, 401));
    await expect(userClient(JWT).getUser()).resolves.toBeNull();
  });

  it('renvoie la personne quand le jeton est valide', async () => {
    fetchMock.mockResolvedValue(reply({ id: USER_ID, email: 'a@tenga.ma' }));
    await expect(userClient(JWT).getUser()).resolves.toEqual({
      id: USER_ID,
      email: 'a@tenga.ma'
    });
  });

  it('laisse remonter une panne de la passerelle', async () => {
    fetchMock.mockResolvedValue(reply({}, 502));
    await expect(userClient(JWT).getUser()).rejects.toBeInstanceOf(
      GatewayError
    );
  });
});

describe('forme du jeton utilisateur', () => {
  it('refuse tout ce qui n’est pas un JWT, sans jamais appeler la passerelle', () => {
    for (const bad of [
      '',
      'sb_secret_testtesttesttesttest_abcd1234',
      'sb_publishable_abc',
      'jeton-personne',
      'a.b',
      'a.b.c.d',
      'a..c',
      'a.b.c ',
      'a.b.c\n'
    ]) {
      expect(() => userClient(bad)).toThrow(/JWT/);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepte un JWT', () => {
    expect(() => userClient(JWT)).not.toThrow();
  });
});

describe('erreurs de la passerelle', () => {
  it('portent le code SQLSTATE et le statut, jamais le corps', async () => {
    fetchMock.mockResolvedValue(
      reply({ code: '23505', message: 'Key (email)=(secret@x.ma) exists' }, 409)
    );
    const error = await serviceClient()
      .rpc('f', {}, z.unknown())
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GatewayError);
    if (error instanceof GatewayError) {
      expect(error.status).toBe(409);
      expect(error.code).toBe('23505');
      expect(error.message).not.toContain('secret@x.ma');
    }
  });

  it('refusent d’appeler sans configuration valide', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    await expect(serviceClient().rpc('f', {}, z.unknown())).rejects.toThrow(
      /SUPABASE_SECRET_KEY/
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
