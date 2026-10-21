import { NextRequest, NextResponse } from 'next/server';
import { basePath, locales } from '@/config/site';
import { isRefreshRequestAllowed, refreshTarget } from '@/lib/refresh-guard';
import { splitLocale } from '@/lib/route-guard';
import { localizedPath } from '@/lib/safe-path';
import {
  REFRESH_COOKIE,
  clearedSessionCookies,
  sessionCookies
} from '@/lib/session-cookies';
import { serviceClient, userClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Derrière le proxy, `request.url` porte l'adresse INTERNE du conteneur
 * (http://0.0.0.0:3000) : une redirection absolue bâtie dessus envoie le
 * navigateur vers une adresse qui n'existe pas, et la session n'est jamais
 * renouvelée. La redirection part donc toujours de l'adresse publique.
 */
function publicUrl(pathname: string, search: string): URL {
  const url = new URL(process.env.SITE_URL || basePath);
  url.pathname = pathname;
  url.search = search;
  return url;
}

function withCookies(
  response: NextResponse,
  specs: ReturnType<typeof sessionCookies>
): NextResponse {
  for (const { name, value, options } of specs) {
    response.cookies.set(name, value, options);
  }
  return response;
}

/**
 * Renouvelle la session (jeton d'accès expiré) puis revient à la page demandée.
 * Chaque renouvellement repose le cookie de 30 jours : la session expire après
 * 30 jours d'INACTIVITÉ. Un échec efface les cookies et renvoie à la connexion,
 * sans boucle.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Requête déclenchée par un autre site : aucune rotation, aucun cookie touché.
  if (!isRefreshRequestAllowed(request.headers)) {
    return new NextResponse(null, { status: 403 });
  }
  const next = refreshTarget(
    request.nextUrl.searchParams.get('next'),
    locales,
    '/mon-compte'
  );
  const { locale, rest } = splitLocale(next, locales);
  const toLogin = (): NextResponse => {
    const url = publicUrl(
      localizedPath(locale, '/connexion'),
      `?next=${encodeURIComponent(rest)}`
    );
    return withCookies(NextResponse.redirect(url), clearedSessionCookies());
  };

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return toLogin();
  try {
    const session = await serviceClient().refreshSession(refreshToken);
    // Contrôle de bout en bout : un jeton neuf que GoTrue refuse ferait boucler.
    if (!(await userClient(session.accessToken).getUser())) return toLogin();
    // `next` a passé safeInternalPath : il se résout sur la même origine.
    const target = new URL(next, 'http://internal.invalid');
    const url = publicUrl(target.pathname, target.search);
    return withCookies(NextResponse.redirect(url), sessionCookies(session));
  } catch {
    console.warn(JSON.stringify({ event: 'session.refresh_failed' }));
    return toLogin();
  }
}
