'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { locales } from '@/config/site';
import { localeOf } from '@/lib/locale-field';
import { openPending, sealPending } from '@/lib/mfa-pending';
import { holdUntil } from '@/lib/min-duration';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { DEFAULT_AFTER_LOGIN } from '@/lib/route-guard';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { applyCookies } from '@/lib/session';
import {
  NEXT_COOKIE,
  PENDING_COOKIE,
  clearedNextCookie,
  clearedPendingCookie,
  nextCookie,
  pendingCookie,
  resolveNext,
  sessionCookies,
  type GateSession
} from '@/lib/session-cookies';
import { passwordLimits } from '@/lib/sliding-window';
import { reasonOf } from '@/lib/start-session';
import { serviceClient, userClient } from '@/lib/supabase/server';
import { passwordLoginSchema, totpCodeSchema } from '@/schemas';

// « totp » : le mot de passe est bon, le code TOTP est attendu. Toute autre
// issue défavorable est « failed », sans distinguer adresse inconnue, mot de
// passe faux, compte bloqué ou verrouillé, non administrateur.
export type PasswordLoginState =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'failed' }
  | { status: 'totp' };

// Même durée minimale que la connexion par lien : la durée ne trahit rien.
const MIN_REQUEST_MS = 800;

// Réponse de app.mdp_tentative (migration 0018) : l'essai admis est DÉJÀ
// compté comme un échec (débit préalable, revue I1) ; « tentative » est son
// identifiant, NULL quand l'essai n'est pas admis ou que l'adresse n'est pas
// celle d'un administrateur.
const attemptRows = z.array(
  z.object({
    admin: z.boolean(),
    etat: z.enum(['libre', 'temporaire', 'definitif']),
    jusqu: z.string().nullable(),
    tentative: z.number().int().positive().nullable()
  })
);
type Attempt = z.infer<typeof attemptRows>[number];

/** Contrôle du blocage et débit de l'essai, en une seule opération de la base. */
async function admitAttempt(email: string): Promise<Attempt | null> {
  const [attempt] = await serviceClient().rpc(
    'mdp_tentative',
    { p_email: email },
    attemptRows
  );
  return attempt ?? null;
}

/** Révocation au mieux d'une session qu'on ne veut pas garder. */
async function discard(accessToken: string): Promise<void> {
  try {
    await userClient(accessToken).signOut();
  } catch {
    // Au mieux : GoTrue purge de toute façon les sessions inactives.
  }
}

/**
 * Étape 1 : adresse et mot de passe. Réservé aux administrateurs Tenga qui ont
 * un code TOTP vérifié ; le blocage (5 échecs en moins de 15 minutes, puis
 * verrouillage au 6e dans les 24 heures) est tenu en base (migration 0018) et
 * n'est jamais annoncé : la réponse est la même que pour un mot de passe faux.
 * L'essai est débité AVANT d'interroger GoTrue : une rafale parallèle ne fait
 * vérifier que les essais admis par la base.
 */
export async function signInWithPassword(
  _previous: PasswordLoginState,
  formData: FormData
): Promise<PasswordLoginState> {
  const startedAt = Date.now();
  const settle = async (
    state: PasswordLoginState
  ): Promise<PasswordLoginState> => {
    await holdUntil(startedAt, MIN_REQUEST_MS);
    return state;
  };

  const ip = await getClientIp();
  const parsed = passwordLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    locale: formData.get('locale'),
    next: formData.get('next') ?? undefined
  });
  if (!parsed.success) return settle({ status: 'invalid' });
  const { email, password, next } = parsed.data;

  if (sharedLimiter.isLimited('passwordPerIp', passwordLimits.perIp, ip)) {
    logSecurityEvent('login.password_rate_limited', { ip, scope: 'ip' });
    return settle({ status: 'failed' });
  }

  try {
    const attempt = await admitAttempt(email);
    // Compte bloqué ou verrouillé : GoTrue n'est pas interrogé, rien n'est
    // compté et le blocage n'est pas prolongé.
    if (!attempt || attempt.etat !== 'libre') {
      logSecurityEvent('login.password_blocked', { ip });
      return settle({ status: 'failed' });
    }

    const grant = await serviceClient().passwordGrant(email, password);
    if (!grant) {
      // Le débit préalable reste : c'est l'échec compté.
      logSecurityEvent('login.password_failed', { ip });
      return settle({ status: 'failed' });
    }

    // Mot de passe juste : l'essai n'était pas un échec, son débit est retiré.
    if (attempt.tentative !== null) {
      await serviceClient().rpc(
        'mdp_rembourser',
        { p_tentative: attempt.tentative },
        z.boolean()
      );
    }

    // Mot de passe juste mais compte non administrateur (ancien administrateur
    // retiré) ou sans TOTP vérifié : refus, session aussitôt révoquée.
    const factorId = attempt.admin
      ? await userClient(grant.session.accessToken).verifiedTotpFactor()
      : null;
    if (!factorId) {
      await discard(grant.session.accessToken);
      logSecurityEvent('login.password_rejected', {
        ip,
        reason: attempt.admin ? 'no_totp' : 'not_admin'
      });
      return settle({ status: 'failed' });
    }

    // B1 : le jeton de niveau 1 ne part au navigateur que scellé.
    const wanted = nextCookie(next);
    await applyCookies([
      pendingCookie(
        sealPending({ factorId, accessToken: grant.session.accessToken })
      ),
      ...(wanted ? [wanted] : [])
    ]);
    return settle({ status: 'totp' });
  } catch (error) {
    logSecurityEvent('login.password_failed', { ip, reason: reasonOf(error) });
    return settle({ status: 'failed' });
  }
}

/**
 * Étape 2 : code TOTP. La session n'est ouverte qu'ici, au niveau d'assurance
 * 2. Le code est débité comme un essai de mot de passe avant sa vérification
 * (même blocage) ; la connexion réussie est liée à cet essai.
 */
export async function verifyLoginTotp(
  _previous: PasswordLoginState,
  formData: FormData
): Promise<PasswordLoginState> {
  const startedAt = Date.now();
  const settle = async (
    state: PasswordLoginState
  ): Promise<PasswordLoginState> => {
    await holdUntil(startedAt, MIN_REQUEST_MS);
    return state;
  };

  const ip = await getClientIp();
  const jar = await cookies();
  const pending = openPending(jar.get(PENDING_COOKIE)?.value);
  const parsed = totpCodeSchema.safeParse({
    code: String(formData.get('code') ?? '').replace(/\s+/g, ''),
    locale: formData.get('locale')
  });
  if (!parsed.success) return settle({ status: 'invalid' });
  if (!pending) {
    logSecurityEvent('login.totp_expired', { ip });
    return settle({ status: 'failed' });
  }
  if (sharedLimiter.isLimited('totpPerIp', passwordLimits.perIp, ip)) {
    logSecurityEvent('login.totp_rate_limited', { ip, scope: 'ip' });
    return settle({ status: 'failed' });
  }

  const abandon = async (): Promise<void> => {
    await applyCookies([clearedPendingCookie()]);
    await discard(pending.accessToken);
  };

  let destination: string;
  try {
    const client = userClient(pending.accessToken);
    const user = await client.getUser();
    if (!user) {
      await applyCookies([clearedPendingCookie()]);
      logSecurityEvent('login.totp_expired', { ip, reason: 'token' });
      return settle({ status: 'failed' });
    }

    const attempt = await admitAttempt(user.email);
    if (
      !attempt ||
      !attempt.admin ||
      attempt.etat !== 'libre' ||
      attempt.tentative === null
    ) {
      await abandon();
      logSecurityEvent('login.password_blocked', { ip, reason: 'totp_step' });
      return settle({ status: 'failed' });
    }

    const session: GateSession | null = await client.verifyTotp(
      pending.factorId,
      parsed.data.code
    );
    if (!session) {
      // Le débit préalable reste : c'est l'échec compté. Si cet échec a posé
      // un blocage, l'essai suivant sera refusé et l'étape abandonnée.
      logSecurityEvent('login.totp_failed', { ip });
      return settle({ status: 'failed' });
    }

    const accepted = await serviceClient().rpc(
      'mdp_succes',
      { p_utilisateur: user.id, p_tentative: attempt.tentative },
      z.boolean()
    );
    if (!accepted) {
      await discard(session.accessToken);
      await abandon();
      logSecurityEvent('login.password_blocked', { ip, reason: 'success' });
      return settle({ status: 'failed' });
    }

    const wanted = jar.get(NEXT_COOKIE)?.value;
    const known = locales.includes(parsed.data.locale)
      ? parsed.data.locale
      : localeOf(formData.get('locale'));
    await holdUntil(startedAt, MIN_REQUEST_MS);
    await applyCookies([
      ...sessionCookies(session),
      clearedPendingCookie(),
      clearedNextCookie()
    ]);
    destination = safeInternalPath(
      localizedPath(known, resolveNext(wanted, DEFAULT_AFTER_LOGIN)),
      '/'
    );
  } catch (error) {
    logSecurityEvent('login.totp_failed', { ip, reason: reasonOf(error) });
    return settle({ status: 'failed' });
  }
  // redirect() lève : appelé hors du try pour ne pas être intercepté.
  redirect(destination);
}
