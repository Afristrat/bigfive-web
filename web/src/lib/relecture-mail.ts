import { connexionUrl } from '@/lib/invitation-mail';
import type { MailLocale } from '@/lib/login-mail';
import { buildLinkMail } from '@/lib/mailer';

// Avis envoyé à la personne désignée relectrice de la bibliothèque (même patron
// que l'avis d'accès super administrateur, lib/admin-grant-mail) : aucun nom ni
// aucune adresse de l'acteur, aucun jeton, un seul lien vers la connexion, qui
// ramène à l'atelier. Purs et testables ; Record<MailLocale, …> garantit la
// parité des trois langues.

type Texts = {
  subject: string;
  intro: string;
  details: readonly string[];
  action: string;
  note: string;
};

const texts: Record<MailLocale, Texts> = {
  // À VALIDER PAR AMINE
  fr: {
    subject: 'Accès à l’atelier de relecture de Tenga Assessments',
    intro:
      'Un accès à l’atelier de relecture de la bibliothèque de textes vient de vous être ouvert sur Tenga Assessments.',
    details: [
      'Vous pourrez y relire les textes qui interprètent les résultats et rendre un verdict sur chacun.',
      'Pour y accéder, ouvrez le lien ci-dessous et saisissez votre adresse e-mail : un lien de connexion vous sera envoyé.'
    ],
    action: 'Ouvrir l’atelier de relecture',
    note: 'Si ce message ne vous concerne pas, ignorez-le.'
  },
  // À RELIRE PAR UN NATIF
  ar: {
    subject: 'الوصول إلى ورشة المراجعة في Tenga Assessments',
    intro:
      'فُتح لكم للتو الوصول إلى ورشة مراجعة مكتبة النصوص على Tenga Assessments.',
    details: [
      'يمكنكم فيها مراجعة النصوص التي تفسّر النتائج وإصدار حكم على كل منها.',
      'للدخول، افتحوا الرابط أدناه وأدخلوا عنوان بريدكم الإلكتروني، وسيصلكم رابط لتسجيل الدخول.'
    ],
    action: 'فتح ورشة المراجعة',
    note: 'إن كانت هذه الرسالة لا تعنيكم فتجاهلوها.'
  },
  en: {
    subject: 'Access to the Tenga Assessments review workshop',
    intro:
      'Access to the text library review workshop on Tenga Assessments has just been opened to you.',
    details: [
      'There you can review the texts that interpret results and give a verdict on each one.',
      'To get in, open the link below and enter your e-mail address: a sign-in link will be sent to you.'
    ],
    action: 'Open the review workshop',
    note: 'If this message is not meant for you, ignore it.'
  }
};

const CHEMIN_ATELIER = '/admin/relecture';

/** Page de connexion de la langue, qui ramène à l'atelier une fois connecté. */
export const relecteurUrl = (siteUrl: string, locale: MailLocale): string =>
  `${connexionUrl(siteUrl, locale)}?next=${encodeURIComponent(CHEMIN_ATELIER)}`;

export function buildRelecteurMail(input: {
  locale: MailLocale;
  url: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const t = texts[input.locale];
  const { html, text } = buildLinkMail({
    intro: t.intro,
    details: t.details,
    action: t.action,
    url: input.url,
    note: t.note,
    dir: input.locale === 'ar' ? 'rtl' : 'ltr'
  });
  return { subject: t.subject, html, text };
}
