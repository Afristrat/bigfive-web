'use client';

import { ReactElement, useEffect, useState } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { LanguageMenu } from '@/components/language-menu';
import { ThemeSwitch } from '@/components/theme-switch';
import { MenuIcon, Wordmark } from '@/components/icons';
import { Link as NextLink } from '../navigation';

export type NavbarLabels = {
  home: string;
  openMenu: string;
  closeMenu: string;
  mainNav: string;
  language: string;
  toDark: string;
  toLight: string;
};

interface NavbarProps {
  navItems: { label: string; href: string }[];
  navMenuItems: { label: string; href: string }[];
  labels: NavbarLabels;
}

// Page courante : fond teinté, couleur d'accent et trait souligné, pour que la
// couleur ne soit jamais le seul signal.
const lienActif =
  'bg-accent-doux text-accent after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-accent';
const lienInactif = 'text-texte-2 hover:bg-creux hover:text-encre';

export const Navbar = ({
  navItems,
  navMenuItems,
  labels
}: NavbarProps): ReactElement => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();

  // Le menu natif se referme à chaque navigation et sur Échap.
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  const isCurrentPath = (link: string): boolean => {
    if (link === '/') {
      return pathname === '/' || pathname === `/${locale}`;
    }
    return pathname.includes(link);
  };

  return (
    <header className='sticky top-0 z-entete border-b border-trait bg-fond/85 backdrop-blur-md backdrop-saturate-150 print:hidden'>
      <div className='conteneur flex min-h-16 items-center gap-2.5 max-[440px]:px-3.5'>
        <NextLink
          className='flex items-center rounded-petit'
          href='/'
          aria-label={labels.home}
        >
          <Wordmark />
        </NextLink>
        <nav
          aria-label={labels.mainNav}
          className='ms-[18px] hidden min-[1240px]:block'
        >
          <ul className='flex gap-1'>
            {navItems.map((item) => {
              const isActive = isCurrentPath(item.href);
              return (
                <li key={item.href}>
                  <NextLink
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'relative inline-flex min-h-11 items-center whitespace-nowrap rounded-[12px] px-3.5 text-petit font-semibold transition-colors duration-normale',
                      isActive ? lienActif : lienInactif
                    )}
                  >
                    {item.label}
                  </NextLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <span className='flex-1' />
        <LanguageMenu label={labels.language} />
        <ThemeSwitch
          labels={{ toDark: labels.toDark, toLight: labels.toLight }}
        />
        <details
          className='relative min-[1240px]:hidden'
          open={isMenuOpen}
          onToggle={(event) => setIsMenuOpen(event.currentTarget.open)}
        >
          <summary
            aria-label={isMenuOpen ? labels.closeMenu : labels.openMenu}
            className='grid size-12 cursor-pointer list-none place-items-center rounded-[14px] border border-trait bg-surface text-encre transition hover:bg-creux [&::-webkit-details-marker]:hidden'
          >
            <MenuIcon />
          </summary>
          <nav
            aria-label={labels.mainNav}
            className='absolute end-0 top-14 z-menu grid w-[min(300px,calc(100vw-32px))] gap-0.5 rounded-[20px] border border-trait bg-surface p-2.5 shadow-carte'
          >
            {navMenuItems.map((item) => {
              const isActive = isCurrentPath(item.href);
              return (
                <NextLink
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setIsMenuOpen(false)}
                  className={clsx(
                    'relative flex min-h-12 items-center rounded-[12px] px-3.5 font-semibold',
                    isActive
                      ? 'bg-accent-doux text-accent after:absolute after:inset-y-3 after:start-0 after:w-0.5 after:rounded-full after:bg-accent'
                      : 'text-encre hover:bg-creux'
                  )}
                >
                  {item.label}
                </NextLink>
              );
            })}
          </nav>
        </details>
      </div>
    </header>
  );
};
