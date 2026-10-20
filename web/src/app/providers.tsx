'use client';

import * as React from 'react';
import { NextUIProvider } from '@nextui-org/system';
import { useRouter } from '../navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { ThemeProviderProps } from 'next-themes/dist/types';
import { localeRegionale } from '@/lib/format';

export interface ProvidersProps {
  children: React.ReactNode;
  locale: string;
  themeProps?: Omit<ThemeProviderProps, 'children'>;
}

export function Providers({ children, locale, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <NextUIProvider navigate={router.push} locale={localeRegionale(locale)}>
      <NextThemesProvider {...themeProps}>{children}</NextThemesProvider>
    </NextUIProvider>
  );
}
