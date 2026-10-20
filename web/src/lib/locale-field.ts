/** Langue lue dans un champ de formulaire : forme contrôlée, « en » à défaut. */
export const localeOf = (value: unknown): string =>
  typeof value === 'string' && /^[a-z]{2}(-[a-z]+)?$/.test(value)
    ? value
    : 'en';
