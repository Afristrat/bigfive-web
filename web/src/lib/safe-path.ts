/** Chemin interne sûr (anti redirection ouverte) : « /… » mais jamais « // » ni « /\ ». */
export function safeInternalPath(value: unknown, fallback = '/'): string {
  return typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.startsWith('/\\')
    ? value
    : fallback;
}

/** Préfixe de langue de l'application (« as-needed » : aucun pour l'anglais). */
export const localizedPath = (locale: string, path: string): string =>
  locale === 'en' ? path : `/${locale}${path}`;
