import 'server-only';
import { z } from 'zod';
import type { GateSession } from '@/lib/session-cookies';

// SEUL endroit de l'application qui lit SUPABASE_URL et SUPABASE_SECRET_KEY
// (plan § 2.3). Importable uniquement depuis src/lib, src/actions, les routes
// serveur et instrumentation.ts (règle ESLint) ; `server-only` fait échouer le
// build si un composant client l'atteint, et un test scanne les imports client.
//
// Le navigateur ne parle jamais à Supabase : ce module appelle la passerelle
// interne (tenga-sb-gw:8000 en production, tenga-sb-preprod-gw:8000 en
// préproduction), sans port publié, par de simples requêtes HTTP.
//
// Deux clients :
//   - service : clé secrète sb_secret_, réservée aux fonctions SQL accordées à
//     service_role et à l'API d'administration de GoTrue ;
//   - utilisateur : jeton de session de la personne ; PostgREST applique alors
//     les règles d'isolation avec SON identité.
// La passerelle exige une clé « apikey » pour toute requête : la clé secrète
// sert de laissez-passer, mais pour un client utilisateur elle est accompagnée
// d'un Authorization de la personne, que la passerelle laisse passer tel quel
// (kong-entrypoint.sh) : l'identité PostgREST reste celle de la personne.

const TIMEOUT_MS = 8000;
const SCHEMA = 'app';
const GATEWAY_PATTERN = /^http:\/\/tenga-sb(-preprod)?-gw:8000$/;
const SECRET_PREFIX = 'sb_secret_';

type Config = { url: string; secretKey: string };

/** Problèmes de configuration (aucune valeur citée) ; vérifiés au démarrage. */
export function supabaseConfigProblems(
  env: Readonly<Record<string, string | undefined>> = process.env
): string[] {
  const problems: string[] = [];
  const url = env.SUPABASE_URL ?? '';
  const key = env.SUPABASE_SECRET_KEY ?? '';
  if (url === '') {
    problems.push('SUPABASE_URL est absente.');
  } else if (
    env.NODE_ENV === 'production' &&
    !GATEWAY_PATTERN.test(url.replace(/\/+$/, ''))
  ) {
    problems.push(
      'SUPABASE_URL doit viser la passerelle interne (http://tenga-sb-gw:8000 ou http://tenga-sb-preprod-gw:8000).'
    );
  }
  if (key === '') {
    problems.push('SUPABASE_SECRET_KEY est absente.');
  } else if (!key.startsWith(SECRET_PREFIX)) {
    problems.push(
      `SUPABASE_SECRET_KEY doit être une clé « ${SECRET_PREFIX} ».`
    );
  }
  return problems;
}

function readConfig(): Config {
  const problems = supabaseConfigProblems();
  if (problems.length > 0) throw new Error(problems.join(' '));
  return {
    url: (process.env.SUPABASE_URL ?? '').replace(/\/+$/, ''),
    secretKey: process.env.SUPABASE_SECRET_KEY ?? ''
  };
}

/** Réponse en erreur de la passerelle : jamais le corps, il pourrait citer une adresse. */
export class GatewayError extends Error {
  readonly status: number;
  /** Code SQLSTATE de PostgREST (ex. 23505) ou code d'erreur de GoTrue. */
  readonly code: string | null;
  constructor(status: number, code: string | null) {
    super(`Réponse ${status} de la passerelle Supabase`);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
  }
}

const errorBody = z
  .object({
    code: z.union([z.string(), z.number()]).optional(),
    error_code: z.string().optional()
  })
  .passthrough();

type CallInit = {
  method: 'GET' | 'POST' | 'DELETE';
  bearer?: string;
  /** Requête PostgREST : sélectionne le schéma exposé. */
  postgrest?: boolean;
  body?: unknown;
};

async function call(path: string, init: CallInit): Promise<unknown> {
  const { url, secretKey } = readConfig();
  const headers: Record<string, string> = { apikey: secretKey };
  if (init.bearer) headers.Authorization = `Bearer ${init.bearer}`;
  if (init.postgrest) {
    headers[init.method === 'GET' ? 'Accept-Profile' : 'Content-Profile'] =
      SCHEMA;
  }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${url}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: 'no-store'
  });
  const text = await response.text();
  let json: unknown = null;
  if (text !== '') {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }
  if (!response.ok) {
    const parsed = errorBody.safeParse(json);
    const code = parsed.success
      ? String(parsed.data.code ?? parsed.data.error_code ?? '') || null
      : null;
    throw new GatewayError(response.status, code);
  }
  return json;
}

const sessionSchema = z.object({
  access_token: z.string().min(20),
  refresh_token: z.string().min(1),
  expires_in: z.number().positive()
});

const toSession = (raw: unknown): GateSession => {
  const parsed = sessionSchema.parse(raw);
  return {
    accessToken: parsed.access_token,
    refreshToken: parsed.refresh_token,
    expiresIn: parsed.expires_in
  };
};

export type SessionUser = { id: string; email: string };

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email()
});

type Rpc = <S extends z.ZodTypeAny>(
  fn: string,
  args: Record<string, unknown>,
  schema: S
) => Promise<z.infer<S>>;

type Select = <S extends z.ZodTypeAny>(
  table: string,
  query: string,
  schema: S
) => Promise<z.infer<S>>;

const makeRpc =
  (bearer?: string): Rpc =>
  async (fn, args, schema) =>
    schema.parse(
      await call(`/rest/v1/rpc/${encodeURIComponent(fn)}`, {
        method: 'POST',
        postgrest: true,
        bearer,
        body: args
      })
    );

const makeSelect =
  (bearer: string): Select =>
  async (table, query, schema) =>
    schema.parse(
      await call(`/rest/v1/${encodeURIComponent(table)}?${query}`, {
        method: 'GET',
        postgrest: true,
        bearer
      })
    );

export type ServiceClient = {
  /** Fonction SQL accordée à service_role (connexion par lien et par code). */
  rpc: Rpc;
  /**
   * Ouvre une session GoTrue pour un compte dont la base vient de valider le
   * lien ou le code : lecture du compte, génération d'un lien interne, échange
   * immédiat contre une session. Aucun e-mail n'est envoyé par GoTrue.
   */
  openSession: (userId: string) => Promise<GateSession>;
  refreshSession: (refreshToken: string) => Promise<GateSession>;
  /** Crée un compte confirmé (inscription fermée : seule voie de naissance). */
  createUser: (email: string, langue: string) => Promise<string>;
};

const generatedLink = z.object({
  hashed_token: z.string().min(1),
  verification_type: z.string().optional()
});

export function serviceClient(): ServiceClient {
  return {
    rpc: makeRpc(),
    async openSession(userId) {
      const user = userSchema.parse(
        await call(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
          method: 'GET'
        })
      );
      const link = generatedLink.parse(
        await call('/auth/v1/admin/generate_link', {
          method: 'POST',
          body: { type: 'magiclink', email: user.email }
        })
      );
      return toSession(
        await call('/auth/v1/verify', {
          method: 'POST',
          body: {
            type: link.verification_type ?? 'magiclink',
            token_hash: link.hashed_token
          }
        })
      );
    },
    async refreshSession(refreshToken) {
      return toSession(
        await call('/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          body: { refresh_token: refreshToken }
        })
      );
    },
    async createUser(email, langue) {
      const created = z.object({ id: z.string().uuid() }).parse(
        await call('/auth/v1/admin/users', {
          method: 'POST',
          body: {
            email: email.trim().toLowerCase(),
            email_confirm: true,
            user_metadata: { langue }
          }
        })
      );
      return created.id;
    }
  };
}

export type UserClient = {
  /** Fonction SQL exécutée avec l'identité de la personne (rôle authenticated). */
  rpc: Rpc;
  /** Lecture d'une table de app : les règles d'isolation s'appliquent. */
  select: Select;
  /** Vérifie le jeton auprès de GoTrue (révocation comprise) ; null s'il est refusé. */
  getUser: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
};

// Un jeton de session GoTrue est un JWT (trois segments base64url). Tout autre
// contenu (chaîne vide, clé « sb_… ») ferait retomber l'appel sur la clé de
// service : on refuse avant d'émettre la moindre requête.
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

export function userClient(accessToken: string): UserClient {
  if (!JWT_SHAPE.test(accessToken)) {
    throw new Error("Jeton de session invalide : ce n'est pas un JWT.");
  }
  return {
    rpc: makeRpc(accessToken),
    select: makeSelect(accessToken),
    async getUser() {
      try {
        return userSchema.parse(
          await call('/auth/v1/user', { method: 'GET', bearer: accessToken })
        );
      } catch (error) {
        if (
          error instanceof GatewayError &&
          (error.status === 401 || error.status === 403)
        ) {
          return null;
        }
        throw error;
      }
    },
    async signOut() {
      await call('/auth/v1/logout', { method: 'POST', bearer: accessToken });
    }
  };
}
