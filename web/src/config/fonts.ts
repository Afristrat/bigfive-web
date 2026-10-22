import {
  Bricolage_Grotesque,
  IBM_Plex_Sans_Arabic,
  Instrument_Sans
} from 'next/font/google';

// Identité « encre et safran » : Bricolage Grotesque (variable, taille optique
// et chasse) pour les titres, Instrument Sans pour le texte courant, IBM Plex
// Sans Arabic pour l'arabe. Fichiers servis par l'application, aucun appel à
// Google à l'exécution.
export const fontDisplay = Bricolage_Grotesque({
  subsets: ['latin', 'latin-ext'],
  axes: ['opsz', 'wdth'],
  display: 'swap',
  variable: '--font-display-latin'
});

export const fontLatin = Instrument_Sans({
  subsets: ['latin', 'latin-ext'],
  axes: ['wdth'],
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
