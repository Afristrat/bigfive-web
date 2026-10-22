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

// Bouton icône de 44 px (critère 2.5.8). Le pictogramme montre le thème courant
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
      className='appui grid size-11 flex-none cursor-pointer place-items-center rounded-controle border border-trait bg-surface text-encre hover:bg-creux'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <SunIcon className='dark:hidden' />
      <MoonIcon className='hidden dark:block' />
    </button>
  );
};
