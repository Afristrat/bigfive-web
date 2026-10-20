import { localizedPath, safeInternalPath } from '@/lib/safe-path';

// Routes réservées aux personnes connectées (sans préfixe de langue). Le
// middleware ne fait qu'un contrôle optimiste (présence du cookie) ; la
// vérification réelle de la session se fait dans chaque page, côté serveur.
export const privatePrefixes = [
  '/admin',
  '/mon-compte',
  '/mes-resultats',
  '/o'
] as const;

export const DEFAULT_AFTER_LOGIN = '/mon-compte';

export function splitLocale(
  pathname: string,
  locales: readonly string[]
): { locale: string; rest: string } {
  const [, first = '', ...others] = pathname.split('/');
  if (locales.includes(first)) {
    return { locale: first, rest: `/${others.join('/')}` };
  }
  return { locale: 'en', rest: pathname };
}

export const isPrivatePath = (rest: string): boolean =>
  privatePrefixes.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`)
  );

export type RouteDecision =
  | { action: 'next' }
  | { action: 'redirect'; pathname: string; search: string };

export function decideRouteAccess(input: {
  pathname: string;
  search: string;
  hasSession: boolean;
  locales: readonly string[];
}): RouteDecision {
  const { locale, rest } = splitLocale(input.pathname, input.locales);
  if (input.hasSession || !isPrivatePath(rest)) return { action: 'next' };
  const wanted = safeInternalPath(rest + input.search, DEFAULT_AFTER_LOGIN);
  return {
    action: 'redirect',
    pathname: localizedPath(locale, '/connexion'),
    search: `?next=${encodeURIComponent(wanted)}`
  };
}
