import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { locales } from '@/config/site';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  type CookieSpec
} from '@/lib/session-cookies';
import { GatewayError, userClient } from '@/lib/supabase/server';

export type Viewer = { id: string; email: string; accessToken: string };

type ViewerState =
  | { status: 'ok'; viewer: Viewer }
  | { status: 'refresh' }
  | { status: 'anonymous' };

/** Pose ou efface des cookies (actions serveur et routes uniquement). */
export async function applyCookies(
  specs: readonly CookieSpec[]
): Promise<void> {
  const jar = await cookies();
  for (const { name, value, options } of specs) jar.set(name, value, options);
}

/**
 * Lit la session. Le jeton d'accès est vérifié auprès de GoTrue à chaque appel
 * (révocation immédiate). S'il manque ou est expiré alors qu'un cookie de
 * renouvellement existe, la page doit passer par /api/session/refresh : un
 * composant serveur ne peut pas poser de cookie.
 */
export async function currentViewer(): Promise<ViewerState> {
  const jar = await cookies();
  const accessToken = jar.get(ACCESS_COOKIE)?.value;
  const hasRefresh = jar.has(REFRESH_COOKIE);
  if (accessToken) {
    const user = await userClient(accessToken).getUser();
    if (user) {
      return {
        status: 'ok',
        viewer: { id: user.id, email: user.email, accessToken }
      };
    }
  }
  return hasRefresh ? { status: 'refresh' } : { status: 'anonymous' };
}

/**
 * Page privée : renvoie la personne connectée, ou redirige vers la connexion
 * (avec retour sûr) ou vers le renouvellement de session.
 * `path` est le chemin sans langue (« /mon-compte »).
 */
export async function requireViewer(
  locale: string,
  path: string
): Promise<Viewer> {
  // Le paramètre [locale] vient de l'URL : une langue inconnue est un 404, avant
  // toute redirection (anti redirection ouverte).
  if (!locales.includes(locale)) notFound();
  const state = await currentViewer();
  if (state.status === 'ok') return state.viewer;
  if (state.status === 'refresh') {
    redirect(
      safeInternalPath(
        `/api/session/refresh?next=${encodeURIComponent(localizedPath(locale, path))}`,
        '/'
      )
    );
  }
  redirect(
    safeInternalPath(
      `${localizedPath(locale, '/connexion')}?next=${encodeURIComponent(path)}`,
      '/'
    )
  );
}

/** La personne connectée est-elle dans private.tenga_admins ? (lu en base) */
export async function isTengaAdmin(viewer: Viewer): Promise<boolean> {
  try {
    return await userClient(viewer.accessToken).rpc(
      'suis_admin_tenga',
      {},
      z.boolean()
    );
  } catch (error) {
    if (error instanceof GatewayError && error.status < 500) return false;
    throw error;
  }
}

/** Page d'administration : 404 pour quiconque n'est pas administrateur Tenga. */
export async function requireAdmin(
  locale: string,
  path: string
): Promise<Viewer> {
  const viewer = await requireViewer(locale, path);
  if (!(await isTengaAdmin(viewer))) notFound();
  return viewer;
}
