// Libellés des domaines et des facettes, lexique de docs/design/voix-de-marque.md
// (§ 4.1 et § 4.3). Les titres du paquet de résultats d’origine contiennent des
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

// Facettes 1 à 6 de chaque domaine. Les libellés français sont ceux de la
// bibliothèque de textes (docs/design/bibliotheque-textes/facettes.json, champ
// libelle.fr) : un test les compare au fichier. Les libellés anglais et arabes
// en sont des traductions NON RELUES (défaut non validé ; l'arabe est à faire
// relire par un locuteur natif). Pas de forme courte : la forme longue sert aux
// deux.
const facets: Record<DomainCode, Record<LabelLocale, readonly string[]>> = {
  N: {
    fr: [
      'Inquiétude et appréhension',
      'Irritabilité',
      'Tristesse et doute sur soi',
      'Gêne en situation sociale',
      'Tendance à céder aux envies',
      'Vulnérabilité au stress'
    ],
    ar: [
      'القلق والتوجّس',
      'سرعة الغضب',
      'الحزن والشك في الذات',
      'الحرج في المواقف الاجتماعية',
      'الميل إلى الاستسلام للرغبات',
      'الهشاشة أمام الضغط'
    ],
    en: [
      'Worry and apprehension',
      'Irritability',
      'Sadness and self-doubt',
      'Discomfort in social situations',
      'Tendency to give in to urges',
      'Vulnerability to stress'
    ]
  },
  E: {
    fr: [
      'Aisance à nouer des liens',
      'Goût de la compagnie et des foules',
      'Affirmation de soi',
      'Niveau d’activité',
      'Goût de l’aventure et du risque',
      'Joie de vivre et regard positif'
    ],
    ar: [
      'سهولة بناء العلاقات',
      'حبّ الصحبة والتجمعات',
      'توكيد الذات',
      'مستوى النشاط',
      'حبّ المغامرة والمخاطرة',
      'بهجة الحياة والنظرة الإيجابية'
    ],
    en: [
      'Ease in forming connections',
      'Enjoyment of company and crowds',
      'Assertiveness',
      'Activity level',
      'Taste for adventure and risk',
      'Zest for life and positive outlook'
    ]
  },
  O: {
    fr: [
      'Imagination et rêverie',
      'Sensibilité artistique',
      'Intensité et écoute des émotions',
      'Goût de la variété',
      'Curiosité intellectuelle',
      'Ouverture aux positions non conventionnelles'
    ],
    ar: [
      'الخيال وأحلام اليقظة',
      'الحساسية الفنية',
      'شدّة المشاعر والإصغاء إليها',
      'حبّ التنوّع',
      'الفضول الفكري',
      'الانفتاح على المواقف غير التقليدية'
    ],
    en: [
      'Imagination and daydreaming',
      'Artistic sensitivity',
      'Intensity and awareness of emotions',
      'Taste for variety',
      'Intellectual curiosity',
      'Openness to unconventional positions'
    ]
  },
  A: {
    fr: [
      'Confiance accordée aux autres',
      'Absence d’usage des autres à ses propres fins',
      'Souci d’aider les autres',
      'Coopération',
      'Retenue dans l’opinion de soi et sa mise en avant',
      'Compassion envers les personnes en difficulté'
    ],
    ar: [
      'الثقة بالآخرين',
      'عدم استغلال الآخرين لتحقيق مصالح شخصية',
      'الحرص على مساعدة الآخرين',
      'التعاون',
      'التحفّظ في تقدير الذات وإبرازها',
      'الرحمة بمن هم في ضيق'
    ],
    en: [
      'Trust in others',
      'Not using others for one’s own ends',
      'Concern for helping others',
      'Cooperation',
      'Restraint in self-regard and self-promotion',
      'Compassion for people in difficulty'
    ]
  },
  C: {
    fr: [
      'Confiance déclarée dans sa maîtrise des tâches',
      'Organisation et rangement',
      'Respect des engagements et des règles',
      'Effort et engagement au travail',
      'Autodiscipline',
      'Réflexion avant d’agir'
    ],
    ar: [
      'الثقة المعلنة في إتقان المهام',
      'التنظيم والترتيب',
      'احترام الالتزامات والقواعد',
      'الجهد والالتزام في العمل',
      'الانضباط الذاتي',
      'التفكير قبل التصرّف'
    ],
    en: [
      'Stated confidence in mastering tasks',
      'Organisation and tidiness',
      'Keeping commitments and following rules',
      'Effort and commitment at work',
      'Self-discipline',
      'Thinking before acting'
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
