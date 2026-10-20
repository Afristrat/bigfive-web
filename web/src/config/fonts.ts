import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';

// Direction B2 : Plus Jakarta Sans pour le latin (graisses 400 à 800), IBM Plex
// Sans Arabic pour l'arabe (400 à 700).
export const fontLatin = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-latin'
});

// Téléchargée seulement quand un glyphe arabe est affiché.
export const fontArabe = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  preload: false,
  variable: '--font-arabe'
});
