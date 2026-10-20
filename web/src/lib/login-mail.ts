import { buildLinkMail } from '@/lib/mailer';
import { LOGIN_VALIDITY_MINUTES } from '@/lib/login-format';
import { localizedPath } from '@/lib/safe-path';

// Gabarits de l'e-mail de connexion, en français, arabe (de droite à gauche) et
// anglais. Purs et testables ; ils vivent ici plutôt que dans les fichiers de
// messages parce qu'ils partent hors du rendu d'une page (tâche après réponse).
// Espaces insécables (U+00A0) avant « : » en français.

export const mailLocales = ['fr', 'ar', 'en'] as const;
export type MailLocale = (typeof mailLocales)[number];

export const toMailLocale = (
  value: unknown,
  fallback: MailLocale = 'fr'
): MailLocale => mailLocales.find((locale) => locale === value) ?? fallback;

type Texts = {
  subject: string;
  intro: string;
  action: string;
  codeLabel: string;
  note: string;
};

const texts: Record<MailLocale, Texts> = {
  fr: {
    subject: 'Votre lien de connexion à Tenga Assessments',
    intro:
      'Utilisez le bouton ci-dessous pour vous connecter à Tenga Assessments.',
    action: 'Me connecter',
    codeLabel:
      'Si vous ouvrez ce message sur un autre appareil, saisissez ce code sur la page de connexion :',
    note: `Le lien et le code sont valables ${LOGIN_VALIDITY_MINUTES} minutes et ne servent qu’une seule fois. Si vous n’avez pas fait cette demande, ignorez ce message.`
  },
  ar: {
    subject: 'رابط الدخول إلى Tenga Assessments',
    intro: 'استعملوا الزر أدناه لتسجيل الدخول إلى Tenga Assessments.',
    action: 'تسجيل الدخول',
    codeLabel:
      'إن فتحتم هذه الرسالة على جهاز آخر، فأدخلوا هذا الرمز في صفحة تسجيل الدخول:',
    note: `الرابط والرمز صالحان لمدة ${LOGIN_VALIDITY_MINUTES} دقيقة ولا يُستعملان إلا مرة واحدة. إن لم تطلبوا ذلك فتجاهلوا هذه الرسالة.`
  },
  en: {
    subject: 'Your Tenga Assessments sign-in link',
    intro: 'Use the button below to sign in to Tenga Assessments.',
    action: 'Sign in',
    codeLabel:
      'If you open this message on another device, enter this code on the sign-in page:',
    note: `The link and the code are valid for ${LOGIN_VALIDITY_MINUTES} minutes and can be used only once. If you did not make this request, ignore this message.`
  }
};

/** Adresse du lien : le jeton se consomme au clic sur la page, jamais à l'ouverture. */
export const loginUrl = (
  siteUrl: string,
  locale: MailLocale,
  token: string
): string =>
  `${siteUrl.replace(/\/+$/, '')}${localizedPath(locale, `/c/${token}`)}`;

export function buildLoginMail(input: {
  locale: MailLocale;
  url: string;
  code: string;
}): { subject: string; html: string; text: string } {
  const t = texts[input.locale];
  const { html, text } = buildLinkMail({
    intro: t.intro,
    action: t.action,
    url: input.url,
    code: { label: t.codeLabel, value: input.code },
    note: t.note,
    dir: input.locale === 'ar' ? 'rtl' : 'ltr'
  });
  return { subject: t.subject, html, text };
}
