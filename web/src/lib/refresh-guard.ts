import { safeInternalPath } from '@/lib/safe-path';

type HeaderReader = { get: (name: string) => string | null };

/**
 * GET /api/session/refresh change l'état (rotation du jeton de renouvellement) :
 * on refuse les requêtes déclenchées par un autre site (fetch, image, iframe).
 * Acceptés : même origine, saisie directe (« none »), client sans en-têtes
 * Fetch Metadata, et toute NAVIGATION de document de premier niveau, y compris
 * venue d'un autre site : un lien d'e-mail ouvre /mon-compte, qui redirige ici
 * dans la même chaîne, dont l'origine reste « cross-site ».
 */
export function isRefreshRequestAllowed(headers: HeaderReader): boolean {
  const site = headers.get('sec-fetch-site');
  if (site === null || site === 'same-origin' || site === 'none') return true;
  return (
    headers.get('sec-fetch-mode') === 'navigate' &&
    headers.get('sec-fetch-dest') === 'document'
  );
}

/**
 * Destination après renouvellement : un chemin interne sûr, jamais une route
 * d'API (ce qui exclut aussi la boucle sur /api/session/refresh), avec ou sans
 * préfixe de langue.
 */
export function refreshTarget(
  value: unknown,
  locales: readonly string[],
  fallback: string
): string {
  const safe = safeInternalPath(value, fallback);
  const [, first = '', ...others] = safe.split('/');
  const rest = locales.includes(first) ? `/${others.join('/')}` : safe;
  return rest === '/api' || rest.startsWith('/api/') || rest.startsWith('/api?')
    ? fallback
    : safe;
}
