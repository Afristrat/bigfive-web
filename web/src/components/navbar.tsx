'use client';

import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem
} from '@nextui-org/navbar';
import clsx from 'clsx';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';

import { LanguageMenu } from '@/components/language-menu';
import { ThemeSwitch } from '@/components/theme-switch';
import { Wordmark } from '@/components/icons';
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

export const Navbar = ({ navItems, navMenuItems, labels }: NavbarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const pathname = usePathname();
  const locale = useLocale();

  const isCurrentPath = (link: string): boolean => {
    if (link === '/') {
      return pathname === '/' || pathname === `/${locale}`;
    }
    return pathname.includes(link);
  };

  const themeLabels = { toDark: labels.toDark, toLight: labels.toLight };

  return (
    <NextUINavbar
      as='header'
      position='sticky'
      isBordered={false}
      isBlurred
      shouldHideOnScroll={false}
      onScrollPositionChange={(position) => setHasScrolled(position > 0)}
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      classNames={{
        base: clsx(
          'border-b bg-fond/90 backdrop-blur-sm data-[menu-open=true]:bg-fond print:hidden',
          hasScrolled ? 'border-trait' : 'border-transparent'
        ),
        wrapper: 'conteneur max-w-6xl h-16 px-5 sm:px-8',
        item: 'data-[active=true]:text-encre'
      }}
    >
      <NavbarContent className='basis-1/5 sm:basis-full' justify='start'>
        <NavbarBrand as='li' className='max-w-fit'>
          <NextLink
            className='flex items-center rounded-petit'
            href='/'
            aria-label={labels.home}
          >
            <Wordmark />
          </NextLink>
        </NavbarBrand>
        <li className='hidden md:flex'>
          <nav aria-label={labels.mainNav} className='ms-8'>
            <ul className='flex gap-6'>
              {navItems.map((item) => {
                const isActive = isCurrentPath(item.href);
                return (
                  <li key={item.href}>
                    <NextLink
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={clsx(
                        'relative inline-flex min-h-6 items-center whitespace-nowrap text-[0.9375rem] font-medium transition-colors duration-courte hover:text-encre',
                        isActive
                          ? 'text-encre after:absolute after:inset-x-0 after:-bottom-[21px] after:h-0.5 after:bg-accent'
                          : 'text-texte-2'
                      )}
                    >
                      {item.label}
                    </NextLink>
                  </li>
                );
              })}
            </ul>
          </nav>
        </li>
      </NavbarContent>

      <NavbarContent
        className='hidden basis-1/5 gap-2 sm:basis-full md:flex'
        justify='end'
      >
        <NavbarItem>
          <LanguageMenu label={labels.language} />
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch labels={themeLabels} />
        </NavbarItem>
        {/* Lot 1 : connexion ou menu du compte. */}
      </NavbarContent>

      <NavbarContent className='basis-1 gap-1 ps-4 md:hidden' justify='end'>
        <NavbarItem>
          <LanguageMenu label={labels.language} />
        </NavbarItem>
        <NavbarItem>
          <ThemeSwitch labels={themeLabels} />
        </NavbarItem>
        <NavbarItem className='h-full w-10'>
          <NavbarMenuToggle
            aria-label={isMenuOpen ? labels.closeMenu : labels.openMenu}
          />
        </NavbarItem>
      </NavbarContent>

      <NavbarMenu className='bg-fond'>
        <div className='mt-2 flex flex-col'>
          {navMenuItems.map((item) => {
            const isActive = isCurrentPath(item.href);
            return (
              <NavbarMenuItem key={item.href}>
                <NextLink
                  onClick={() => setIsMenuOpen(false)}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'block border-s-2 py-3 text-titre-3',
                    isActive
                      ? 'border-accent ps-3 font-semibold text-accent'
                      : 'border-transparent ps-3 text-encre'
                  )}
                >
                  {item.label}
                </NextLink>
              </NavbarMenuItem>
            );
          })}
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
