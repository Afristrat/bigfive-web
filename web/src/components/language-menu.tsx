'use client';

import { ReactElement } from 'react';
import clsx from 'clsx';
import { useLocale } from 'next-intl';
import { Link, usePathname } from '@/navigation';

// Langues proposées dans le sélecteur ; les autres restent routables par leur
// adresse (direction § 12, point 4). Noms écrits dans leur propre langue.
const menuLanguages = [
  { code: 'fr', name: 'Français', short: 'FR', dir: 'ltr' },
  { code: 'ar', name: 'العربية', short: 'AR', dir: 'rtl' },
  { code: 'en', name: 'English', short: 'EN', dir: 'ltr' }
] as const;

interface LanguageMenuProps {
  label: string;
}

const item =
  'grid min-h-[38px] min-w-[38px] place-items-center rounded-petit px-2 text-petit font-medium min-[441px]:min-w-[42px]';

// Sélecteur segmenté, sans drapeau. Le texte visible (« FR ») fait partie
// du nom accessible, que complète le nom de la langue (critère 2.5.3) ; la
// langue courante est signalée par aria-current et par son fond plein.
export function LanguageMenu({ label }: LanguageMenuProps): ReactElement {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div
      role='group'
      aria-label={label}
      className='flex flex-none rounded-controle border border-trait bg-surface p-[2px]'
    >
      {menuLanguages.map((language) => {
        const contenu = (
          <>
            <span aria-hidden='true'>{language.short}</span>
            <span className='sr-only'>
              {language.short} {language.name}
            </span>
          </>
        );
        return language.code === locale ? (
          <span
            key={language.code}
            lang={language.code}
            dir={language.dir}
            aria-current='true'
            className={clsx(item, 'bg-accent-doux font-semibold text-accent')}
          >
            {contenu}
          </span>
        ) : (
          <Link
            key={language.code}
            href={pathname}
            locale={language.code}
            lang={language.code}
            dir={language.dir}
            className={clsx(
              item,
              'text-texte-2 transition-colors duration-courte ease-tenga hover:bg-creux hover:text-encre'
            )}
          >
            {contenu}
          </Link>
        );
      })}
    </div>
  );
}
