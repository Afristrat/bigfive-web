import createMiddleware from 'next-intl/middleware';
import { localePrefix } from './navigation';
import { locales } from './config/site';

export default createMiddleware({
  locales,
  localePrefix,
  defaultLocale: 'en'
});

export const config = {
  // Toutes les routes sauf api, _next et les fichiers avec extension (le point est échappé).
  matcher: ['/((?!api|_next|.*\\..*).*)']
};
