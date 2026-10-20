import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { localePrefix } from './navigation';
import { locales } from './config/site';
import { decideRouteAccess } from './lib/route-guard';
import { REFRESH_COOKIE } from './lib/session-cookies';

const intlMiddleware = createMiddleware({
  locales,
  localePrefix,
  defaultLocale: 'en'
});

// Contrôle optimiste des routes privées : seule la présence du cookie de
// session est vue ici. La vérification réelle (jeton valide, rôle lu en base)
// se fait dans chaque page, côté serveur.
export default function middleware(request: NextRequest): NextResponse {
  const decision = decideRouteAccess({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasSession: request.cookies.has(REFRESH_COOKIE),
    locales
  });
  if (decision.action === 'redirect') {
    const url = request.nextUrl.clone();
    url.pathname = decision.pathname;
    url.search = decision.search;
    return NextResponse.redirect(url);
  }
  return intlMiddleware(request);
}

export const config = {
  // Toutes les routes sauf api, _next et les fichiers avec extension (le point est échappé).
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
