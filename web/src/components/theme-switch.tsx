'use client';

import { ReactElement } from 'react';
import { useTheme } from 'next-themes';
import { useIsSSR } from '@react-aria/ssr';

import { MoonIcon, SunIcon } from '@/components/icons';

export type ThemeSwitchLabels = {
  toDark: string;
  toLight: string;
};

interface ThemeSwitchProps {
  labels: ThemeSwitchLabels;
}

// Bouton carré de la direction B2. Le pictogramme montre le thème courant
// (soleil en clair, lune en sombre) par CSS, donc sans clignotement au
// chargement ; le nom accessible dit l'action.
export const ThemeSwitch = ({ labels }: ThemeSwitchProps): ReactElement => {
  const { resolvedTheme, setTheme } = useTheme();
  const isSSR = useIsSSR();
  // Le thème par défaut suit le système : seul le thème résolu dit ce qui est affiché.
  const isDark = !isSSR && resolvedTheme === 'dark';

  return (
    <button
      type='button'
      aria-label={isDark ? labels.toLight : labels.toDark}
      className='grid size-12 flex-none cursor-pointer place-items-center rounded-[14px] border border-trait bg-surface text-encre transition duration-normale ease-tenga hover:bg-creux active:scale-95'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <SunIcon className='dark:hidden' />
      <MoonIcon className='hidden dark:block' />
    </button>
  );
};
