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

// Page courante : texte en encre et filet d'accent de 2 px sous le libellé, pour
// que la couleur ne soit jamais le seul signal (direction § 8.1).
const lienActif =
  'text-encre after:absolute after:inset-x-3 after:bottom-2 after:h-0.5 after:bg-accent';
const lienInactif = 'text-texte-2 hover:text-encre';

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
    <header className='sticky top-0 z-entete border-b border-trait bg-fond/[0.86] backdrop-blur-md backdrop-saturate-150 print:hidden'>
      <div className='conteneur flex min-h-16 items-center gap-2 max-[440px]:px-3.5'>
        <NextLink
          className='flex items-center gap-2.5 rounded-petit'
          href='/'
          aria-label={labels.home}
        >
          {/* Marque pentagonale : son contour safran se referme au fil du
              défilement de la page, fil conducteur du site. */}
          <svg
            aria-hidden='true'
            viewBox='0 0 24 24'
            className='size-6 flex-none overflow-visible'
          >
            <polygon
              points='12,2 21.5,8.9 17.9,20 6.1,20 2.5,8.9'
              className='fill-none stroke-trait'
              strokeWidth='2'
              strokeLinejoin='round'
            />
            <polygon
              points='12,2 21.5,8.9 17.9,20 6.1,20 2.5,8.9'
              pathLength={1}
              className='marque-trace fill-none stroke-safran'
              strokeWidth='2.25'
              strokeLinejoin='round'
            />
            <polygon
              points='12,8.2 16,10.6 14.4,15.6 9.4,15.2 8.3,11'
              className='fill-encre'
            />
          </svg>
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
                      'relative inline-flex min-h-11 items-center whitespace-nowrap rounded-petit px-3 text-[0.9375rem] font-medium transition-colors duration-courte ease-tenga',
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
            className='grid size-11 cursor-pointer list-none place-items-center rounded-controle border border-trait bg-surface text-encre transition-colors duration-courte ease-tenga hover:bg-creux [&::-webkit-details-marker]:hidden'
          >
            <MenuIcon />
          </summary>
          <nav
            aria-label={labels.mainNav}
            className='absolute end-0 top-14 z-menu grid w-[min(300px,calc(100vw-32px))] origin-top-right gap-0.5 rounded-panneau border border-trait bg-surface p-2 shadow-flottant motion-safe:animate-apparaitre rtl:origin-top-left dark:shadow-flottant-sombre'
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
                    'relative flex min-h-12 items-center rounded-controle px-3.5 text-titre-3 font-medium',
                    isActive
                      ? 'bg-accent-doux text-encre after:absolute after:inset-y-3 after:start-0 after:w-0.5 after:bg-accent'
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
      <span
        aria-hidden='true'
        className='rail absolute inset-x-0 -bottom-px h-0.5 bg-safran'
      />
    </header>
  );
};
