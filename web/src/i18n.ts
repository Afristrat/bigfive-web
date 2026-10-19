import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { locales } from './config/site';

type Messages = { [key: string]: string | Messages };

// Les fichiers de langue n'ont pas tous les mêmes clés : l'anglais sert de
// repli clé par clé, pour qu'aucun libellé ne s'affiche sous forme de clé brute.
function withFallback(base: Messages, override: Messages): Messages {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const fallback = base[key];
    merged[key] =
      typeof value === 'object' && typeof fallback === 'object'
        ? withFallback(fallback, value)
        : value;
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  if (!locale || !locales.includes(locale)) notFound();

  const english: Messages = (await import('./messages/en.js')).default;
  const messages: Messages =
    locale === 'en'
      ? english
      : withFallback(
          english,
          (await import(`./messages/${locale}.js`)).default
        );

  return { locale, messages };
});
