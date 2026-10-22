import { IBM_Plex_Sans_Arabic, Instrument_Sans } from 'next/font/google';

// Direction « règle graduée » : Instrument Sans (variable, graisse 400 à 700,
// chasse 75 à 100) pour le latin ; IBM Plex Sans Arabic (400, 500, 600) pour
// l'arabe. Fichiers servis par l'application, aucun appel à Google à l'exécution.
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
