'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { z } from 'zod';
import { basePath, locales } from '@/config/site';
import { deliverLoginLink, type IssuedLink } from '@/lib/login-delivery';
import { localeOf } from '@/lib/locale-field';
import { isLoginToken } from '@/lib/login-format';
import { requestMagicLink } from '@/lib/magic-link-request';
import { sendMail } from '@/lib/mailer';
import { holdUntil } from '@/lib/min-duration';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { DEFAULT_AFTER_LOGIN } from '@/lib/route-guard';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { applyCookies } from '@/lib/session';
import {
  ACCESS_COOKIE,
  NEXT_COOKIE,
  REFRESH_COOKIE,
  type CookieSpec,
  clearedNextCookie,
  clearedSessionCookies,
  nextCookie,
  resolveNext,
  sessionCookies
} from '@/lib/session-cookies';
import { codeLimits } from '@/lib/sliding-window';
import { GatewayError, serviceClient, userClient } from '@/lib/supabase/server';
import { loginCodeSchema, loginRequestSchema } from '@/schemas';

export type LoginState =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'sent'; email: string };

export type AuthFormState = { status: 'idle' | 'invalid' | 'failed' };

// La réponse à la demande de lien est rendue après une durée minimale fixe,
// mesurée depuis la réception : ni le contenu ni la durée ne trahissent
// l'existence de l'adresse (revue du lot 1).
const MIN_REQUEST_MS = 800;

const issuedRows = z.array(
  z.object({
    envoyer: z.boolean(),
    jeton: z.string().nullable(),
    code: z.string().nullable(),
    langue: z.string().nullable()
  })
);

const issue = async (address: string): Promise<IssuedLink | null> => {
  const rows = await serviceClient().rpc(
    'demander_lien_connexion',
    { p_email: address },
    issuedRows
  );
  return rows[0] ?? null;
};

// Raison journalisée : le nom de l'erreur (et le code HTTP de la passerelle),
// jamais son message ni son corps, qui pourraient citer une adresse.
const reasonOf = (error: unknown): string =>
  error instanceof GatewayError
    ? `${error.name}:${error.status}`
    : error instanceof Error
      ? error.name
      : 'unknown';

/**
 * Demande de lien. Tout le travail variable (lecture en base, envoi) part après
 * la réponse ; la valeur « envoyer » de la base n'est jamais lue ici.
 */
export async function requestLoginLink(
  _previous: LoginState,
  formData: FormData
): Promise<LoginState> {
  const startedAt = Date.now();
  const ip = await getClientIp();
  const parsed = loginRequestSchema.safeParse({
    email: formData.get('email'),
    locale: formData.get('locale'),
    next: formData.get('next') ?? undefined
  });

  let result: LoginState = { status: 'invalid' };
  if (parsed.success) {
    const { email, locale, next } = parsed.data;
    const outcome = requestMagicLink(
      {
        limiter: sharedLimiter,
        deliver: (address, requestedLocale) =>
          deliverLoginLink(
            {
              issue,
              send: sendMail,
              siteUrl: process.env.SITE_URL || basePath
            },
            address,
            requestedLocale
          ),
        defer: (task) => after(task),
        reportError: (error) =>
          logSecurityEvent('login.delivery_failed', {
            ip,
            reason: reasonOf(error)
          })
      },
      { email, locale, ip }
    );
    // Plafond atteint : même réponse neutre, seulement visible dans le journal.
    if (outcome.status === 'rate_limited') {
      logSecurityEvent('login.rate_limited', { ip, scope: outcome.scope });
    }
    const wanted = nextCookie(next);
    if (wanted) await applyCookies([wanted]);
    result = { status: 'sent', email };
  }
  await holdUntil(startedAt, MIN_REQUEST_MS);
  return result;
}

/** Ouvre la session GoTrue du compte validé par la base, puis va à la destination. */
async function startSession(
  userId: string,
  locale: string,
  ip: string,
  hold: () => Promise<void> = async () => undefined
): Promise<AuthFormState> {
  let specs: CookieSpec[];
  try {
    specs = sessionCookies(await serviceClient().openSession(userId));
  } catch (error) {
    logSecurityEvent('login.link_failed', { ip, reason: reasonOf(error) });
    await hold();
    return { status: 'failed' };
  }
  const wanted = (await cookies()).get(NEXT_COOKIE)?.value;
  // Langue venue d'un champ de formulaire : inconnue = langue par défaut.
  const known = locales.includes(locale) ? locale : 'en';
  await hold();
  await applyCookies([...specs, clearedNextCookie()]);
  redirect(
    safeInternalPath(
      localizedPath(known, resolveNext(wanted, DEFAULT_AFTER_LOGIN)),
      '/'
    )
  );
}

/** Clic sur le bouton de /c/{jeton} : seul moment où le jeton est consommé. */
export async function consumeLoginLink(
  _previous: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const ip = await getClientIp();
  const token = formData.get('token');
  if (!isLoginToken(token)) return { status: 'invalid' };
  let userId: string | null;
  try {
    userId = await serviceClient().rpc(
      'consommer_lien_connexion',
      { p_jeton: token },
      z.string().uuid().nullable()
    );
  } catch (error) {
    logSecurityEvent('login.link_failed', { ip, reason: reasonOf(error) });
    return { status: 'failed' };
  }
  if (!userId) {
    logSecurityEvent('login.link_failed', { ip, reason: 'unknown_or_expired' });
    return { status: 'failed' };
  }
  return startSession(userId, localeOf(formData.get('locale')), ip);
}

/** Saisie du code à 6 chiffres (autre appareil que celui du lien). */
export async function consumeLoginCode(
  _previous: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  // Durée minimale fixe avant TOUT retour (échec, limite atteinte, succès) :
  // la durée ne distingue ni mauvais code, ni adresse inconnue, ni plafond.
  const startedAt = Date.now();
  const hold = (): Promise<void> => holdUntil(startedAt, MIN_REQUEST_MS);
  const settle = async (state: AuthFormState): Promise<AuthFormState> => {
    await hold();
    return state;
  };

  const ip = await getClientIp();
  const parsed = loginCodeSchema.safeParse({
    email: formData.get('email'),
    code: String(formData.get('code') ?? '').replace(/\s+/g, ''),
    locale: formData.get('locale')
  });
  if (!parsed.success) return settle({ status: 'invalid' });

  // 20 essais par IP et par heure : la base ne voit pas l'IP. Même réponse
  // qu'un mauvais code.
  if (sharedLimiter.isLimited('loginCodePerIp', codeLimits.perIp, ip)) {
    logSecurityEvent('login.code_rate_limited', { ip, scope: 'ip' });
    return settle({ status: 'failed' });
  }
  let userId: string | null;
  try {
    userId = await serviceClient().rpc(
      'consommer_code_connexion',
      { p_email: parsed.data.email, p_code: parsed.data.code },
      z.string().uuid().nullable()
    );
  } catch (error) {
    logSecurityEvent('login.code_failed', { ip, reason: reasonOf(error) });
    return settle({ status: 'failed' });
  }
  if (!userId) {
    logSecurityEvent('login.code_failed', { ip, reason: 'wrong_or_expired' });
    return settle({ status: 'failed' });
  }
  return startSession(userId, parsed.data.locale, ip, hold);
}

/**
 * Révoque la session côté GoTrue. Jeton d'accès absent ou refusé (expiré) mais
 * cookie de renouvellement présent : on renouvelle d'abord par le client de
 * service, puis on révoque avec le jeton neuf. Lève en cas d'échec : l'appelant
 * l'absorbe.
 */
async function revokeSession(
  accessToken: string | undefined,
  refreshToken: string | undefined
): Promise<void> {
  if (accessToken) {
    try {
      await userClient(accessToken).signOut();
      return;
    } catch {
      // Jeton expiré ou refusé : repli sur le renouvellement ci-dessous.
    }
  }
  if (!refreshToken) return;
  const fresh = await serviceClient().refreshSession(refreshToken);
  await userClient(fresh.accessToken).signOut();
}

/** Déconnexion : révoque la session côté GoTrue (au mieux), efface les cookies. */
export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeOf(formData.get('locale'));
  try {
    const jar = await cookies();
    await revokeSession(
      jar.get(ACCESS_COOKIE)?.value,
      jar.get(REFRESH_COOKIE)?.value
    );
  } catch {
    // Au mieux : les cookies sont effacés dans tous les cas ; GoTrue purge de toute façon les sessions inactives.
  }
  await applyCookies(clearedSessionCookies());
  redirect(localizedPath(locale, '/'));
}
