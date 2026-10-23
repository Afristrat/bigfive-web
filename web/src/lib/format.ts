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

/** Fuseau de lecture des dates montrées à une personne au Maroc (e-mails compris). */
export const FUSEAU_MAROC = 'Africa/Casablanca';

/** Date longue lue au fuseau du Maroc, quel que soit celui du serveur. */
export const formatDateMaroc = (
  date: Date | string | number,
  locale: string
): string => formatDate(date, locale, FUSEAU_MAROC);

/** Isole un segment latin en arabe seulement ; inchangé dans les autres langues. */
export const isolerEnArabe = (valeur: string, locale: string): string =>
  locale === 'ar' ? isoler(valeur) : valeur;

/**
 * Remplace les marques {nom} d'un message traduit. Une marque sans valeur propre
 * reste telle quelle ; une valeur n'est jamais réinterprétée.
 */
export const remplir = (
  modele: string,
  valeurs: Readonly<Record<string, string>>
): string =>
  modele.replace(/\{(\w+)\}/g, (tel, nom: string) =>
    Object.hasOwn(valeurs, nom) ? valeurs[nom] ?? tel : tel
  );
