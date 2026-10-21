import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { locales } from '@/config/site';
import { DEFAULT_AFTER_LOGIN } from '@/lib/route-guard';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { applyCookies } from '@/lib/session';
import {
  NEXT_COOKIE,
  type CookieSpec,
  clearedNextCookie,
  resolveNext,
  sessionCookies
} from '@/lib/session-cookies';
import { GatewayError, serviceClient } from '@/lib/supabase/server';

// Ouverture de session partagée par la connexion (lien, code) et l'acceptation
// d'une invitation. Ce fichier n'est PAS 'use server' : ses exports ne sont pas
// des points d'entrée appelables par le navigateur.

/**
 * Raison journalisée : le nom de l'erreur (et le code HTTP de la passerelle),
 * jamais son message ni son corps, qui pourraient citer une adresse.
 */
export const reasonOf = (error: unknown): string =>
  error instanceof GatewayError
    ? `${error.name}:${error.status}`
    : error instanceof Error
      ? error.name
      : 'unknown';

export type StartSessionOptions = {
  /** Événement journalisé si la session ne s'ouvre pas. */
  failureEvent: 'login.link_failed' | 'invitation.accept_failed';
  /** Attente appelée avant tout retour (durée minimale de la connexion). */
  hold?: () => Promise<void>;
  /** Destination constante (chemin sans langue) ; absente : le cookie « next ». */
  destination?: string;
};

/**
 * Ouvre la session GoTrue du compte validé par la base, pose les cookies puis
 * redirige. Ne revient que sur échec d'ouverture (`failed`) ; sur succès,
 * `redirect` lève.
 */
export async function startSession(
  userId: string,
  locale: string,
  ip: string,
  options: StartSessionOptions
): Promise<{ status: 'failed' }> {
  const hold = options.hold ?? (async () => undefined);
  let specs: CookieSpec[];
  try {
    specs = sessionCookies(await serviceClient().openSession(userId));
  } catch (error) {
    logSecurityEvent(options.failureEvent, { ip, reason: reasonOf(error) });
    await hold();
    return { status: 'failed' };
  }
  const path =
    options.destination ??
    resolveNext((await cookies()).get(NEXT_COOKIE)?.value, DEFAULT_AFTER_LOGIN);
  // Langue venue d'un champ de formulaire : inconnue = langue par défaut.
  const known = locales.includes(locale) ? locale : 'en';
  await hold();
  await applyCookies([...specs, clearedNextCookie()]);
  redirect(safeInternalPath(localizedPath(known, path), '/'));
}
