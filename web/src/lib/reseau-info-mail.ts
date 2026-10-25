import { connexionUrl } from '@/lib/invitation-mail';
import type { MailLocale } from '@/lib/login-mail';
import { buildLinkMail } from '@/lib/mailer';
import { localizedPath } from '@/lib/safe-path';

// Courriel d'information (art. 5 de la loi 09-08, art. 14 du RGPD) envoyé par le
// consultant, relevé du réseau ouvert, aux membres d'un groupe qui n'ont pas pris
// connaissance de l'information dans l'application. Texte validé par Amine le
// 25/10/2026 (courriel-information-art14-projet.md) ; l'arabe suit la validation
// de l'arabe du relevé, la relecture juridique reste à faire. Aucun nom ni aucune
// adresse de l'acteur ou d'un autre membre, aucun jeton : un seul lien vers la
// connexion, qui ramène à l'écran du relevé de la participation. Purs et
// testables ; Record<MailLocale, …> garantit la parité des trois langues.

const NBSP = ' ';

type Texts = {
  subject: string;
  greeting: string;
  intro: string;
  details: readonly string[];
  action: string;
  policy: string;
  note: string;
};

const texts: Record<MailLocale, Texts> = {
  fr: {
    subject: 'Vous pouvez être cité dans un relevé du réseau de votre équipe',
    greeting: 'Bonjour,',
    intro:
      'Les membres de votre équipe vont être invités, sur Tenga Assessments, à décrire leurs échanges de travail avec leurs collègues' +
      `${NBSP}: conseil, information, confiance, dépendance. Vous pouvez donc être cité dans leurs réponses.`,
    details: [
      `Ces réponses servent à un atelier de restitution de l’équipe et, pour les seules personnes ayant donné leur accord distinct, à un rapport nominatif remis à Tenga Conseil${NBSP}; aucune n’est communiquée à votre hiérarchie ni utilisée pour une décision vous concernant.`,
      `Vous pouvez vous opposer à être cité${NBSP}: vos liens sont alors retirés de la carte et vous ne répondez pas au relevé${NBSP}; aucune autre conséquence. Pour le faire, ouvrez le lien ci-dessous, connectez-vous, puis cochez «${NBSP}Je m’oppose à être cité dans ce relevé${NBSP}».`,
      `Responsable du traitement${NBSP}: Tenga Conseil. Droits d’accès, de rectification et d’opposition${NBSP}: adressez-vous à Tenga Conseil. Vos choix enregistrés sont supprimés automatiquement trois ans après leur dernier enregistrement. Déclaration à la CNDP${NBSP}: en cours.`
    ],
    action: 'Prendre connaissance et choisir',
    policy: `Politique de confidentialité${NBSP}:`,
    note: 'Si ce message ne vous concerne pas, ignorez-le.'
  },
  // Arabe validé par Amine ; relecture juridique en attente.
  ar: {
    subject: 'قد يُذكر اسمك في استبيان شبكة فريقك',
    greeting: 'مرحبًا،',
    intro:
      'سيُدعى أعضاء فريقك، على Tenga Assessments، إلى وصف تبادلاتهم في العمل مع زملائهم: المشورة، والمعلومة، والثقة، والاعتماد. لذلك قد يُذكر اسمك في إجاباتهم.',
    details: [
      'تُستعمل هذه الإجابات في ورشة لعرض النتائج على الفريق، وكذلك، لدى من أعطى موافقته المنفصلة وحدهم، في تقرير اسمي يُسلَّم إلى Tenga Conseil، ولا يُبلَّغ أيٌّ منها إلى رؤسائك في العمل ولا يُستعمل في أي قرار يخصّك.',
      'يمكنك الاعتراض على ذكر اسمك: تُحذف حينئذ روابطك من الخريطة ولا تجيب عن الاستبيان، دون أي أثر آخر. للاعتراض، افتح الرابط أدناه وسجّل الدخول ثم حدّد «أعترض على ذكر اسمي في هذا الاستبيان.»',
      'المسؤول عن المعالجة: Tenga Conseil. حقوق الاطلاع والتصحيح والاعتراض: توجّه إلى Tenga Conseil. تُحذف اختياراتك المسجّلة تلقائيًا بعد ثلاث سنوات من آخر تسجيل لها. التصريح لدى CNDP: قيد الإنجاز.'
    ],
    action: 'الاطلاع والاختيار',
    policy: 'سياسة الخصوصية:',
    note: 'إن كانت هذه الرسالة لا تعنيكم فتجاهلوها.'
  },
  en: {
    subject: 'You may be named in your team’s network survey',
    greeting: 'Hello,',
    intro:
      'The members of your team will be invited, on Tenga Assessments, to describe their working exchanges with their colleagues: advice, information, trust, dependence. You may therefore be named in their answers.',
    details: [
      'These answers are used in a feedback workshop with the team and, only for the people who gave their separate consent, in a named report delivered to Tenga Conseil; none of them is passed on to your management or used in any decision about you.',
      'You may object to being named: your links are then removed from the map and you do not answer the survey; no other consequence. To do so, open the link below, sign in, then tick “I object to being named in this survey”.',
      'Data controller: Tenga Conseil. Rights of access, rectification and objection: contact Tenga Conseil. Your recorded choices are deleted automatically three years after they were last recorded. CNDP declaration: in progress.'
    ],
    action: 'Review and choose',
    policy: 'Privacy policy:',
    note: 'If this message is not meant for you, ignore it.'
  }
};

const siteBase = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

/** Page de confidentialité de la langue. */
export const politiqueUrl = (siteUrl: string, locale: MailLocale): string =>
  `${siteBase(siteUrl)}${localizedPath(locale, '/privacy')}`;

/** Connexion de la langue, qui ramène à l'écran du relevé de la participation. */
export const reseauInfoUrl = (
  siteUrl: string,
  locale: MailLocale,
  participation: string
): string =>
  `${connexionUrl(siteUrl, locale)}?next=${encodeURIComponent(`/mes-resultats/reseau/${participation}`)}`;

export function buildReseauInfoMail(input: {
  locale: MailLocale;
  url: string;
  policyUrl: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const t = texts[input.locale];
  const { html, text } = buildLinkMail({
    greeting: t.greeting,
    intro: t.intro,
    details: [...t.details, `${t.policy} ${input.policyUrl}`],
    action: t.action,
    url: input.url,
    note: t.note,
    dir: input.locale === 'ar' ? 'rtl' : 'ltr'
  });
  return { subject: t.subject, html, text };
}
