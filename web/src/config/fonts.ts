import { IBM_Plex_Sans_Arabic, Instrument_Sans } from 'next/font/google';

export const fontLatin = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
  display: 'swap',
  variable: '--font-latin'
});

// Téléchargée seulement quand un glyphe arabe est affiché.
export const fontArabe = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  display: 'swap',
  preload: false,
  variable: '--font-arabe'
});
