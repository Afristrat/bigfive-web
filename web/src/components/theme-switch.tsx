'use client';

import { Button } from '@nextui-org/button';
import { useTheme } from 'next-themes';
import { useIsSSR } from '@react-aria/ssr';

import { SunFilledIcon, MoonFilledIcon } from '@/components/icons';

export type ThemeSwitchLabels = {
  toDark: string;
  toLight: string;
};

interface ThemeSwitchProps {
  labels: ThemeSwitchLabels;
}

export const ThemeSwitch = ({ labels }: ThemeSwitchProps) => {
  const { resolvedTheme, setTheme } = useTheme();
  const isSSR = useIsSSR();
  // Le thème par défaut suit le système : seul le thème résolu dit ce qui est affiché.
  const isDark = !isSSR && resolvedTheme === 'dark';

  return (
    <Button
      isIconOnly
      variant='light'
      size='md'
      aria-label={isDark ? labels.toLight : labels.toDark}
      className='text-texte-2 data-[hover=true]:bg-creux data-[hover=true]:text-encre'
      onPress={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <SunFilledIcon /> : <MoonFilledIcon />}
    </Button>
  );
};
