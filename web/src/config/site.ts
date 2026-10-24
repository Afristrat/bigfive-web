import { getTranslations } from 'next-intl/server';

export type SiteConfig = typeof siteConfig;

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

// Pas de repli silencieux sur localhost en production : URLs canoniques fausses.
if (process.env.NODE_ENV === 'production' && !siteUrl) {
  throw new Error('NEXT_PUBLIC_SITE_URL must be set for production builds');
}

export const basePath = (siteUrl || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

// Adresse de contact affichée sur le site ; absente si non configurée.
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';

export type Language = {
  code: string;
  name: string;
  countryCode?: string;
  map?: string[];
};

export const languages: Language[] = [
  { code: 'en', name: 'English', countryCode: 'us', map: ['en-GB'] },
  { code: 'ar', name: 'Arabic', map: ['ar-sa'] },
  { code: 'ur', name: 'Urdu' },
  { code: 'hy', name: 'Armenian', countryCode: 'am' },
  { code: 'sq', name: 'Albanian', countryCode: 'al' },
  { code: 'de', name: 'Deutsch', countryCode: 'de', map: ['de-DE'] },
  {
    code: 'es',
    name: 'Spanish',
    countryCode: 'es',
    map: ['es-ES', 'es-US', 'es-MX']
  },
  { code: 'et', name: 'Estonian', countryCode: 'ee' },
  { code: 'ca', name: 'Catalan', countryCode: 'es-ct' },
  { code: 'hr', name: 'Croatian', countryCode: 'hr' },
  { code: 'fr', name: 'French', countryCode: 'fr', map: ['fr-FR', 'fr-CA'] },
  { code: 'id', name: 'Indonesian', countryCode: 'id' },
  { code: 'hu', name: 'Hungarian', countryCode: 'hu' },
  { code: 'it', name: 'Italian', countryCode: 'it', map: ['it-IT'] },
  { code: 'no', name: 'Norwegian', countryCode: 'no', map: ['nb', 'nn'] },
  { code: 'pt-br', name: 'Brazilian Portuguese', countryCode: 'br' },
  { code: 'pt', name: 'Portuguese', countryCode: 'pt' },
  { code: 'he', name: 'Hebrew', countryCode: 'il' },
  { code: 'sv', name: 'Swedish', countryCode: 'se' },
  { code: 'bg', name: 'Bulgarian', countryCode: 'bg' },
  { code: 'uk', name: 'Ukrainian', countryCode: 'ua' },
  { code: 'nl', name: 'Dutch', countryCode: 'nl' },
  { code: 'fa', name: 'Persian', countryCode: 'ir' },
  { code: 'da', name: 'Danish', countryCode: 'dk' },
  { code: 'ro', name: 'Romanian', countryCode: 'ro' },
  { code: 'ko', name: 'Korean', countryCode: 'kr' },
  { code: 'fi', name: 'Finnish', countryCode: 'fi' },
  { code: 'hi', name: 'Hindi', countryCode: 'in' },
  { code: 'tr', name: 'Turkish', countryCode: 'tr' },
  { code: 'is', name: 'Icelandic', countryCode: 'is' },
  { code: 'ja', name: 'Japanese', countryCode: 'jp' },
  { code: 'pl', name: 'Polish', countryCode: 'pl' },
  { code: 'sr', name: 'Serbian', countryCode: 'rs' },
  { code: 'ss', name: 'Siswati', countryCode: 'sz' },
  { code: 'sl', name: 'Slovenian', countryCode: 'si' },
  { code: 'ru', name: 'Russian', countryCode: 'ru' },
  { code: 'th', name: 'Thai', countryCode: 'th' },
  { code: 'cs', name: 'Czech', countryCode: 'cz' },
  { code: 'vi', name: 'Vietnamese', countryCode: 'vn' },
  {
    code: 'zh-cn',
    name: 'Chinese (Simplified)',
    countryCode: 'cn'
  },
  {
    code: 'zh-hant',
    name: 'Chinese (Traditional)',
    countryCode: 'cn'
  },
  { code: 'bn', name: 'Bengali', countryCode: 'bd' }
].sort((a, b) => a.name.localeCompare(b.name));

export const locales = languages.map((lang) => lang.code) as string[];

// ponytail: rubrique occultée le 24/10/2026 (articles en anglais seulement, de 2024) ; à rétablir quand les articles sont traduits et relus.
// Interrupteur unique : navigation, routes /articles et sitemap le lisent.
// Les contenus restent dans le dépôt (posts/).
export const ARTICLES_PUBLICS: boolean = false;

const lienArticles = ARTICLES_PUBLICS
  ? [{ label: 'articles', href: '/articles' }]
  : [];

// ponytail: parcours anonyme fermé le 24/10/2026 (résultat lu dans MongoDB par identifiant, sans connexion) ; à rouvrir seulement si Amine le décide.
// Interrupteur unique : /test et /result exigent une session, la navigation,
// le sitemap et les appels à l'action des pages publiques le lisent. Aucun code
// ni aucune donnée MongoDB n'est supprimé.
export const PARCOURS_ANONYME_OUVERT: boolean = false;

const lienResultat = (label: string) =>
  PARCOURS_ANONYME_OUVERT ? [{ label, href: '/result' }] : [];

export const siteConfig = {
  name: 'Tenga Assessments',
  description: 'Questionnaire de personnalité de Tenga Conseil',
  navItems: [
    {
      label: 'home',
      href: '/'
    },
    ...lienResultat('result'),
    ...lienArticles,
    {
      label: 'about',
      href: '/about'
    },
    {
      label: 'account',
      href: '/mon-compte'
    }
  ],
  navMenuItems: [
    {
      label: 'home',
      href: '/'
    },
    ...lienResultat('see_results'),
    ...lienArticles,
    {
      label: 'privacy',
      href: '/privacy'
    },
    {
      label: 'about',
      href: '/about'
    },
    {
      label: 'faq',
      href: '/faq'
    },
    {
      label: 'account',
      href: '/mon-compte'
    }
  ],
  footerLinks: [
    {
      label: 'home',
      href: '/'
    },
    ...lienArticles,
    {
      label: 'privacy',
      href: '/privacy'
    },
    {
      label: 'about',
      href: '/about'
    },
    {
      label: 'faq',
      href: '/faq'
    },
    {
      label: 'method',
      href: '/methode'
    },
    {
      label: 'presentation',
      href: '/presentation'
    }
  ]
};

export const getNavItems = async ({
  locale,
  linkType
}: {
  locale: string;
  linkType: 'navItems' | 'navMenuItems' | 'footerLinks';
}) => {
  const t = await getTranslations({ locale, namespace: 'toolbar' });
  return siteConfig[linkType].map((link) => ({
    label: t(`${link.label}`),
    href: link.href
  }));
};
