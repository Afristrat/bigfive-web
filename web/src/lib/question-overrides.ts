import { getItems } from '@bigfive-org/questions';

// Adaptation au contexte marocain de questions de l'IPIP-NEO-120 (domaine
// public, ipip.ori.org). Chaque reformulation garde la facette et le sens de
// cotation de la question d'origine : le calcul des scores est inchangé.
// Validée par Tenga Conseil le 2026-10-19 ; la cohérence interne des facettes
// concernées reste à vérifier sur les passations réelles.
export const QUESTIONNAIRE_VERSION = 'b5-120-ma-2026-10';

type Override = Partial<Record<'fr' | 'ar', string>>;

// Clés : identifiants des questions dans @bigfive-org/questions (générés depuis
// le paquet, jamais saisis à la main).
const overrides: Record<string, Override> = {
  // 28, O6 Libéralisme, + : « Tend to vote for liberal political candidates »
  '79186f48-e7fa-4df4-b74b-b0627ee244e1': {
    fr: 'Je suis ouvert aux idées qui remettent en question les traditions'
  },
  // 88, O6 Libéralisme, − : « Tend to vote for conservative political candidates »
  '96ba77b2-1a44-4dfd-95f9-ae4d1f714460': {
    fr: 'Je préfère que l’on garde les façons de faire établies'
  },
  // 58, O6 Libéralisme, + : « Believe that there is no absolute right and wrong »
  'f08e1b27-3673-4898-9cae-896482d0d9f9': {
    fr: 'Je pense que ce qui est juste dépend souvent de la situation',
    ar: 'أعتقد أن ما هو صائب يتوقف في كثير من الأحيان على الموقف'
  },
  // 118, O6 Libéralisme, − : « Believe that we should be tough on crime »
  '580b08d1-3c94-46e9-9d07-d6d80c698127': {
    fr: 'Je pense que les règles doivent s’appliquer strictement, sans exception',
    ar: 'أرى أن القواعد يجب أن تُطبَّق بصرامة ودون استثناء'
  },
  // 7, E2 Grégarité, + : « Love large parties »
  '458f3957-2359-4077-ade1-34525d633063': {
    fr: 'J’aime les grands rassemblements (mariages, fêtes familiales, événements)',
    ar: 'أحب التجمعات الكبيرة (الأعراس، المناسبات العائلية، الفعاليات)'
  },
  // 37, E2 Grégarité, + : « Talk to a lot of different people at parties »
  '28ab59a0-e7cd-4fce-94e3-bba2ecc023b6': {
    fr: 'Lors des rassemblements, je parle à beaucoup de personnes différentes',
    ar: 'أتحدث مع أشخاص كثيرين ومختلفين خلال التجمعات'
  },
  // 21, N5 Immodération, + : « Go on binges »
  '481efd08-c810-43b1-a952-f8ac9052f96b': {
    fr: 'Il m’arrive de faire des excès (nourriture, achats, écrans)',
    ar: 'يحدث لي أن أُفرط في الأكل أو التسوق أو استعمال الشاشات'
  }
};

export type Item = ReturnType<typeof getItems>[number];

export function getLocalizedItems(locale: string): Item[] {
  return getItems(locale).map((item) => {
    const text =
      locale === 'fr' || locale === 'ar'
        ? overrides[item.id]?.[locale]
        : undefined;
    return text ? { ...item, text } : item;
  });
}
