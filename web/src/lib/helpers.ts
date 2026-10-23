export const formatId = (id: string): string => {
  return id
    .replace(/^https?:\/\/.+\/result\//, '')
    .toLowerCase()
    .replaceAll(' ', '');
};

export const validId: (id: string) => boolean = (id: string) =>
  /^[0-9a-fA-F]{24}$/.test(id);

export const formatAndValidateId = (id: string): boolean => {
  const formattedId = formatId(id);
  return validId(formattedId);
};

// Une adresse électronique saisie à la place d'un identifiant : la page
// publique ne cherche jamais par adresse (tout le monde pourrait lire le profil
// d'autrui), elle renvoie vers « Mes résultats ».
export const ressembleCourriel = (saisie: string): boolean =>
  /^[^\s@/]+@[^\s@/]+$/.test(saisie.trim());

export const isDev: boolean = process.env.NEXT_PUBLIC_ENV === 'development';

export function calculateReadingTime(content: string) {
  // Define the average reading speed (words per minute)
  const wordsPerMinute = 200;

  // Strip MDX/HTML tags and count the words
  const markdownRegex =
    /(\[.*?\]\(.*?\)|#+\s|```.*?```|`.*?`|\*\*.*?\*\*|\*\*|__.*?__|_.*?_|!\[.*?\]\(.*?\))/gs;
  const text = content
    .replace(markdownRegex, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const wordCount = text.split(/\s+/).filter((word) => word.length > 0).length;

  // Calculate reading time
  const readingTime = Math.ceil(wordCount / wordsPerMinute);

  return readingTime;
}

const translatedLanguages = ['no'];

// Langue des articles : seul le norvégien a ses propres articles en plus de
// l'anglais, qui sert de repli.
export function getTranslationLocale(locale: string): string {
  return translatedLanguages.includes(locale) ? locale : 'en';
}
