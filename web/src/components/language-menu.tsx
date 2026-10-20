'use client';

import { useLocale } from 'next-intl';
import { Button } from '@nextui-org/button';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from '@nextui-org/dropdown';
import { useRouter, usePathname } from '@/navigation';

// Langues proposées dans le sélecteur ; les autres restent routables par leur
// adresse (direction § 12, point 4). Noms écrits dans leur propre langue.
const menuLanguages = [
  { code: 'fr', name: 'Français', short: 'FR', dir: 'ltr' },
  { code: 'ar', name: 'العربية', short: 'ع', dir: 'rtl' },
  { code: 'en', name: 'English', short: 'EN', dir: 'ltr' }
] as const;

interface LanguageMenuProps {
  label: string;
}

export function LanguageMenu({ label }: LanguageMenuProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const current = menuLanguages.find((language) => language.code === locale);

  return (
    <Dropdown
      placement='bottom-end'
      classNames={{
        content:
          'rounded-panneau bg-surface shadow-flottant dark:shadow-flottant-sombre'
      }}
    >
      <DropdownTrigger>
        <Button
          variant='light'
          size='sm'
          className='h-10 min-w-10 px-3 text-[0.9375rem] font-medium text-texte-2 data-[hover=true]:bg-creux data-[hover=true]:text-encre'
        >
          {/* Le nom visible fait partie du nom accessible (critère 2.5.3). */}
          <span className='sr-only'>{label}</span>{' '}
          {current ? (
            <span lang={current.code} dir={current.dir}>
              <span className='md:hidden'>{current.short}</span>
              <span className='max-md:sr-only'>{current.name}</span>
            </span>
          ) : (
            <span lang={locale}>{locale}</span>
          )}
        </Button>
      </DropdownTrigger>
      <DropdownMenu
        aria-label={label}
        selectionMode='single'
        disallowEmptySelection
        selectedKeys={current ? [current.code] : []}
        onAction={(key) => router.replace(pathname, { locale: String(key) })}
      >
        {menuLanguages.map((language) => (
          <DropdownItem
            key={language.code}
            textValue={language.name}
            lang={language.code}
            dir={language.dir}
          >
            {language.name}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
}
