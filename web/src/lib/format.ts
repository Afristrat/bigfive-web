const regions: Record<string, string> = {
  fr: 'fr-MA',
  ar: 'ar-MA',
  en: 'en-GB'
};

export const localeRegionale = (locale: string): string =>
  regions[locale] ?? locale;

// Chiffres occidentaux en arabe : usage marocain courant, indépendant de la
// version ICU. L'extension « -u-nu-latn » impose le système de numération.
const avecChiffresLatins = (locale: string): string =>
  `${localeRegionale(locale)}-u-nu-latn`;

export const formatNombre = (valeur: number, locale: string): string =>
  new Intl.NumberFormat(avecChiffresLatins(locale)).format(valeur);

// `timeZone` : fuseau IANA de lecture (« Africa/Casablanca » pour une date
// montrée à une personne au Maroc) ; sans lui, celui du serveur.
export const formatDate = (
  date: Date | string | number,
  locale: string,
  timeZone?: string
): string =>
  new Intl.DateTimeFormat(avecChiffresLatins(locale), {
    dateStyle: 'long',
    numberingSystem: 'latn',
    timeZone
  }).format(new Date(date));

export const formatDateHeure = (
  date: Date | string | number,
  locale: string,
  timeZone?: string
): string =>
  new Intl.DateTimeFormat(avecChiffresLatins(locale), {
    dateStyle: 'short',
    timeStyle: 'short',
    numberingSystem: 'latn',
    timeZone
  }).format(new Date(date));

// Isole un segment latin (adresse, identifiant) inséré dans une phrase traduite,
// pour que l'algorithme bidirectionnel ne le réordonne pas en arabe.
export const isoler = (texte: string): string =>
  String.fromCodePoint(0x2068) + texte + String.fromCodePoint(0x2069);
