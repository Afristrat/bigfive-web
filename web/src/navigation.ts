import { createNavigation } from 'next-intl/navigation';
import { locales } from './config/site';

export const localePrefix = 'as-needed';
// next-intl 4 exige la locale par défaut dès que le préfixe est « as-needed » ;
// le middleware lit la même constante.
export const defaultLocale = 'en';

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales,
  localePrefix,
  defaultLocale
});
