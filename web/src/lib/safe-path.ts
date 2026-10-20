/**
 * Chemin interne sûr (anti redirection ouverte). Les navigateurs suppriment les
 * tabulations et retours à la ligne d'une URL : « /<tab>/exemple.org » deviendrait
 * « //exemple.org ». On refuse donc tout caractère de contrôle et toute barre
 * oblique inverse, puis on vérifie que le chemin se résout sur la même origine.
 */
export function safeInternalPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return fallback;
  // eslint-disable-next-line no-control-regex -- on cherche précisément ces caractères
  if (/[\u0000-\u001F\u007F\\]/.test(value) || value.startsWith('//')) {
    return fallback;
  }
  try {
    const base = 'http://internal.invalid';
    const url = new URL(value, base);
    const out = url.pathname + url.search + url.hash;
    // La normalisation peut recréer « // » (« /.//x » devient « //x ») : on
    // revalide donc le résultat, pas seulement l'entrée.
    return url.origin === base && out.startsWith('/') && !out.startsWith('//')
      ? out
      : fallback;
  } catch {
    return fallback;
  }
}

/** Préfixe de langue de l'application (« as-needed » : aucun pour l'anglais). */
export const localizedPath = (locale: string, path: string): string =>
  locale === 'en' ? path : `/${locale}${path}`;
