'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { localeOf } from '@/lib/locale-field';
import { passwordProblem, type PasswordProblem } from '@/lib/password-policy';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { localizedPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { applyCookies, requireAdmin } from '@/lib/session';
import { sessionCookies } from '@/lib/session-cookies';
import { passwordLimits } from '@/lib/sliding-window';
import { GatewayError, userClient } from '@/lib/supabase/server';
import { passwordChangeSchema, totpCodeSchema } from '@/schemas';

// Sécurité du compte d'un administrateur Tenga : code TOTP, puis mot de passe.
// Le mot de passe n'est accepté qu'avec un TOTP vérifié, et son changement
// exige un code TOTP (GoTrue exige d'ailleurs une session de niveau 2 pour
// modifier le mot de passe d'un compte qui a un facteur vérifié).

export type TotpSetupState =
  | { status: 'idle' }
  | { status: 'enroll'; factorId: string; qrCode: string; secret: string }
  | { status: 'already' }
  | { status: 'invalid' }
  | { status: 'failed' }
  | { status: 'enabled' }
  | { status: 'error' };

export type PasswordChangeState =
  | { status: 'idle' }
  | { status: 'invalid' }
  | { status: 'mismatch' }
  | { status: 'weak'; problem: PasswordProblem }
  | { status: 'totp_required' }
  | { status: 'code_failed' }
  | { status: 'rate_limited' }
  | { status: 'saved' }
  | { status: 'error' };

const reasonOf = (error: unknown): string =>
  error instanceof GatewayError
    ? `${error.name}:${error.status}`
    : error instanceof Error
      ? error.name
      : 'unknown';

/** Plafond par compte : 10 opérations de sécurité par heure. */
const limited = (userId: string): boolean =>
  sharedLimiter.isLimited('securityPerUser', passwordLimits.perUser, userId);

/** Commence l'inscription d'un TOTP : renvoie le QR code et la clé de saisie manuelle. */
export async function startTotpSetup(
  _previous: TotpSetupState,
  formData: FormData
): Promise<TotpSetupState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/mon-compte');
  const ip = await getClientIp();
  if (limited(viewer.id)) return { status: 'error' };
  try {
    const client = userClient(viewer.accessToken);
    if (await client.verifiedTotpFactor()) return { status: 'already' };
    const enrollment = await client.enrollTotp();
    return { status: 'enroll', ...enrollment };
  } catch (error) {
    logSecurityEvent('account.security_failed', {
      ip,
      scope: 'totp_start',
      reason: reasonOf(error)
    });
    return { status: 'error' };
  }
}

/** Confirme l'inscription par un premier code : le facteur devient vérifié. */
export async function confirmTotpSetup(
  _previous: TotpSetupState,
  formData: FormData
): Promise<TotpSetupState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/mon-compte');
  const ip = await getClientIp();
  const parsed = totpCodeSchema.safeParse({
    code: String(formData.get('code') ?? '').replace(/\s+/g, ''),
    locale: formData.get('locale')
  });
  const factorId = z.string().uuid().safeParse(formData.get('factorId'));
  if (!parsed.success || !factorId.success) return { status: 'invalid' };
  if (limited(viewer.id)) return { status: 'error' };
  try {
    const session = await userClient(viewer.accessToken).verifyTotp(
      factorId.data,
      parsed.data.code
    );
    if (!session) return { status: 'failed' };
    // La session de niveau 2 remplace la session courante.
    await applyCookies(sessionCookies(session));
    revalidatePath(localizedPath(locale, '/mon-compte'));
    return { status: 'enabled' };
  } catch (error) {
    logSecurityEvent('account.security_failed', {
      ip,
      scope: 'totp_confirm',
      reason: reasonOf(error)
    });
    return { status: 'error' };
  }
}

/** Définit ou change le mot de passe : politique, puis code TOTP, puis GoTrue. */
export async function changeAdminPassword(
  _previous: PasswordChangeState,
  formData: FormData
): Promise<PasswordChangeState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/mon-compte');
  const ip = await getClientIp();
  const password = formData.get('password');
  const parsed = passwordChangeSchema.safeParse({
    password,
    confirmation: formData.get('confirmation'),
    code: String(formData.get('code') ?? '').replace(/\s+/g, ''),
    locale: formData.get('locale')
  });
  if (!parsed.success) {
    const mismatch = parsed.error.issues.some(
      (issue) => issue.path[0] === 'confirmation'
    );
    return { status: mismatch ? 'mismatch' : 'invalid' };
  }
  if (limited(viewer.id)) return { status: 'rate_limited' };

  const problem = passwordProblem(parsed.data.password, viewer.email);
  if (problem) return { status: 'weak', problem };

  try {
    const client = userClient(viewer.accessToken);
    const factorId = await client.verifiedTotpFactor();
    if (!factorId) return { status: 'totp_required' };
    const session = await client.verifyTotp(factorId, parsed.data.code);
    if (!session) return { status: 'code_failed' };
    await applyCookies(sessionCookies(session));
    await userClient(session.accessToken).setPassword(parsed.data.password);
    revalidatePath(localizedPath(locale, '/mon-compte'));
    return { status: 'saved' };
  } catch (error) {
    // 422 de GoTrue : mot de passe refusé (faible ou identique à l'actuel).
    if (error instanceof GatewayError && error.status === 422) {
      return { status: 'weak', problem: 'common' };
    }
    logSecurityEvent('account.security_failed', {
      ip,
      scope: 'password_change',
      reason: reasonOf(error)
    });
    return { status: 'error' };
  }
}
