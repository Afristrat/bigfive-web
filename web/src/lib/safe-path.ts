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

const LOCALE_SHAPE = /^[a-z]{2}(-[a-z]+)?$/;

/**
 * Préfixe de langue de l'application (« as-needed » : aucun pour l'anglais).
 * Défensif : une langue qui n'a pas la forme d'un code de langue (« /evil.org »
 * issu d'un paramètre d'URL décodé) se replie sur la langue par défaut, sans
 * préfixe, et le résultat repasse toujours par safeInternalPath : il ne peut
 * jamais commencer par « // ».
 */
export const localizedPath = (locale: string, path: string): string =>
  safeInternalPath(
    locale !== 'en' && LOCALE_SHAPE.test(locale) ? `/${locale}${path}` : path,
    '/'
  );
