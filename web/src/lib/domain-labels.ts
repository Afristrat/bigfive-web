// Libellés des domaines et des facettes, lexique de docs/design/voix-de-marque.md
// (§ 4.1 et § 4.3). Les titres du paquet @bigfive-org/results contiennent des
// contresens (« Conscience », « Convivialité ») : aucun composant ne les affiche.

export type DomainCode = 'O' | 'C' | 'E' | 'A' | 'N';
export type LabelLocale = 'fr' | 'ar' | 'en';
export type LabelForm = 'long' | 'short';

type Label = { long: string; short: string };

const domains: Record<DomainCode, Record<LabelLocale, Label>> = {
  O: {
    fr: { long: 'Ouverture à l’expérience', short: 'Ouverture' },
    ar: { long: 'الانفتاح على الخبرة', short: 'الانفتاح' },
    en: { long: 'Openness to experience', short: 'Openness' }
  },
  C: {
    fr: { long: 'Conscienciosité', short: 'Conscienciosité' },
    ar: { long: 'يقظة الضمير', short: 'يقظة الضمير' },
    en: { long: 'Conscientiousness', short: 'Conscientiousness' }
  },
  E: {
    fr: { long: 'Extraversion', short: 'Extraversion' },
    ar: { long: 'الانبساطية', short: 'الانبساطية' },
    en: { long: 'Extraversion', short: 'Extraversion' }
  },
  A: {
    fr: { long: 'Agréabilité', short: 'Agréabilité' },
    ar: { long: 'المقبولية', short: 'المقبولية' },
    en: { long: 'Agreeableness', short: 'Agreeableness' }
  },
  N: {
    fr: { long: 'Névrosisme', short: 'Névrosisme' },
    ar: { long: 'العُصابية', short: 'العُصابية' },
    en: { long: 'Neuroticism', short: 'Neuroticism' }
  }
};

// Facettes 1 à 6 de chaque domaine, dans l'ordre de l'IPIP-NEO-120. Les
// libellés de facette n'ont pas de forme courte : la forme longue sert aux deux.
const facets: Record<DomainCode, Record<LabelLocale, readonly string[]>> = {
  N: {
    fr: [
      'Anxiété',
      'Colère',
      'Humeur dépressive',
      'Timidité sociale',
      'Impulsivité',
      'Vulnérabilité au stress'
    ],
    ar: [
      'القلق',
      'الغضب',
      'المزاج الاكتئابي',
      'الحرج الاجتماعي',
      'الاندفاعية',
      'الهشاشة أمام الضغط'
    ],
    en: [
      'Anxiety',
      'Anger',
      'Depressive mood',
      'Self-consciousness',
      'Immoderation',
      'Vulnerability to stress'
    ]
  },
  E: {
    fr: [
      'Chaleur relationnelle',
      'Sociabilité',
      'Affirmation de soi',
      'Niveau d’activité',
      'Recherche de sensations',
      'Gaieté'
    ],
    ar: [
      'الودّ',
      'الاجتماعية',
      'توكيد الذات',
      'مستوى النشاط',
      'البحث عن الإثارة',
      'البهجة'
    ],
    en: [
      'Friendliness',
      'Gregariousness',
      'Assertiveness',
      'Activity level',
      'Excitement-seeking',
      'Cheerfulness'
    ]
  },
  O: {
    fr: [
      'Imagination',
      'Sensibilité artistique',
      'Ouverture aux émotions',
      'Goût de la nouveauté',
      'Curiosité intellectuelle',
      'Ouverture aux valeurs'
    ],
    ar: [
      'الخيال',
      'الاهتمامات الفنية',
      'الانفتاح على المشاعر',
      'حبّ التجديد',
      'الفضول الفكري',
      'الانفتاح على القيم'
    ],
    en: [
      'Imagination',
      'Artistic interests',
      'Emotionality',
      'Adventurousness',
      'Intellect',
      'Openness to values'
    ]
  },
  A: {
    fr: [
      'Confiance',
      'Franchise',
      'Altruisme',
      'Coopération',
      'Modestie',
      'Compassion'
    ],
    ar: ['الثقة', 'الصراحة', 'الإيثار', 'التعاون', 'التواضع', 'التعاطف'],
    en: [
      'Trust',
      'Straightforwardness',
      'Altruism',
      'Cooperation',
      'Modesty',
      'Sympathy'
    ]
  },
  C: {
    fr: [
      'Sentiment d’efficacité',
      'Sens de l’organisation',
      'Sens du devoir',
      'Recherche de réussite',
      'Autodiscipline',
      'Prudence'
    ],
    ar: [
      'الإحساس بالكفاءة',
      'التنظيم',
      'الشعور بالواجب',
      'السعي إلى الإنجاز',
      'الانضباط الذاتي',
      'الحذر'
    ],
    en: [
      'Self-efficacy',
      'Orderliness',
      'Dutifulness',
      'Achievement-striving',
      'Self-discipline',
      'Cautiousness'
    ]
  }
};

export const domainCodes: readonly DomainCode[] = ['N', 'E', 'O', 'A', 'C'];

export const isDomainCode = (code: string): code is DomainCode =>
  (domainCodes as readonly string[]).includes(code);

// Les autres langues routables retombent sur l'anglais (direction § 12, point 4).
const labelLocale = (locale: string): LabelLocale =>
  locale === 'fr' || locale === 'ar' ? locale : 'en';

export function domainLabel(
  code: DomainCode,
  locale: string,
  form: LabelForm = 'long'
): string {
  return domains[code][labelLocale(locale)][form];
}

export function facetLabel(
  code: DomainCode,
  facet: number,
  locale: string
): string {
  const label = facets[code][labelLocale(locale)][facet - 1];
  if (label === undefined) {
    throw new RangeError(`Facette inconnue : ${code}${facet}`);
  }
  return label;
}
