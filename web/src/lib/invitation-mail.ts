import { hasLinkOrInvisible } from '@/lib/access-rules';
import { FUSEAU_MAROC } from '@/lib/format';
import { buildLinkMail } from '@/lib/mailer';
import type { MailLocale } from '@/lib/login-mail';
import { localizedPath } from '@/lib/safe-path';

// Gabarits des e-mails d'invitation, en français, arabe (de droite à gauche) et
// anglais. Purs et testables ; ils vivent ici plutôt que dans les fichiers de
// messages parce qu'ils partent hors du rendu d'une page. Le type
// Record<MailLocale, …> garantit la parité des trois langues à la compilation.
// Espaces insécables (U+00A0) avant « : », « ? » et à l'intérieur des guillemets
// en français. Voix de marque : docs/design/voix-de-marque.md.

export type InvitationMailInput = {
  locale: MailLocale;
  url: string;
  organisation: string;
  campagne: string;
  groupe: string | null;
  firstName: string | null;
  message: string | null;
  /** Nombre de questions du questionnaire. */
  total: number;
  /** Date d'expiration renvoyée par la base (horodatage ISO). */
  expire: string;
  /** Adresse de contact ; vide si elle n'est pas configurée. */
  contactEmail: string;
};

type Texts = {
  subject: string;
  greeting: string;
  greetingNeutral: string;
  intro: string;
  introSansGroupe: string;
  whatYouDo: string;
  privacy: string;
  groups: string;
  noDiagnosis: string;
  messageTitle: string;
  action: string;
  validity: string;
  question: string;
  closing: string;
};

const texts: Record<MailLocale, Texts> = {
  fr: {
    subject: 'Une invitation de {organisation}, en confiance',
    greeting: 'Bonjour {firstName},',
    greetingNeutral: 'Bonjour,',
    intro:
      '{organisation} a demandé à Tenga Conseil d’organiser un questionnaire de personnalité pour {group}. Une invitation à y répondre vous est adressée.',
    // À VALIDER PAR AMINE : variante sans groupe (aucun groupe n'est passé dans ce lot).
    introSansGroupe:
      '{organisation} a demandé à Tenga Conseil d’organiser un questionnaire de personnalité, dans le cadre de la campagne « {campagne} ». Une invitation à y répondre vous est adressée.',
    whatYouDo:
      'Ce que vous allez faire : lire {total} affirmations et dire dans quelle mesure elles vous décrivent. Il n’y a pas de bonne réponse et pas de limite de temps. Vous pouvez vous arrêter et reprendre.',
    privacy:
      'Ce que nous tenons à vous dire d’abord : votre résultat individuel n’est visible que de vous, du consultant Tenga affecté à {organisation} et de l’équipe d’administration de Tenga Conseil.',
    // À VALIDER PAR AMINE : vraie côté base, mais aucun écran de synthèse n'existe encore dans web/.
    groups: '{organisation} ne reçoit que des synthèses de groupe.',
    noDiagnosis:
      'Le questionnaire n’est ni un test de compétences, ni un diagnostic.',
    messageTitle: 'Message rédigé par {organisation}',
    action: 'Commencer le questionnaire',
    validity: 'Cette invitation est valable jusqu’au {expire}.',
    question:
      'Une question avant de commencer ? Écrivez-nous à {contactEmail}. Nous vous répondrons.',
    closing: 'Cordialement, Tenga Conseil.'
  },
  ar: {
    subject: 'دعوة من {organisation}، في كنف الثقة',
    greeting: 'مرحبًا {firstName}،',
    greetingNeutral: 'مرحبًا،',
    intro:
      'طلبت {organisation} من Tenga Conseil تنظيم استبيان للشخصية لفائدة {group}. وهذه دعوة موجهة إليكم للمشاركة فيه.',
    // À VALIDER PAR AMINE, puis à relire par un natif : variante sans groupe.
    introSansGroupe:
      'طلبت {organisation} من Tenga Conseil تنظيم استبيان للشخصية ضمن الحملة «{campagne}». وهذه دعوة موجهة إليكم للمشاركة فيه.',
    whatYouDo:
      'ما ستفعلونه: قراءة {total} عبارة وبيان مدى انطباقها عليكم. لا توجد إجابة صحيحة ولا حدّ للوقت. ويمكنكم التوقف ثم المتابعة.',
    privacy:
      'ما نود قوله لكم أولًا: نتيجتكم الفردية لا يراها إلا أنتم، والمستشار من Tenga المكلف بـ {organisation}، وفريق الإدارة في Tenga Conseil.',
    // À VALIDER PAR AMINE : voir la version française.
    groups: 'ولا تتلقى {organisation} إلا خلاصات جماعية.',
    noDiagnosis: 'والاستبيان ليس اختبارًا للكفاءات، وليس تشخيصًا.',
    messageTitle: 'رسالة كتبتها {organisation}',
    action: 'بدء الاستبيان',
    validity: 'هذه الدعوة صالحة إلى غاية {expire}.',
    question:
      'عندكم سؤال قبل أن تبدؤوا؟ راسلونا على {contactEmail}، وسنردّ عليكم.',
    closing: 'مع أطيب التحيات، Tenga Conseil.'
  },
  en: {
    subject: 'An invitation from {organisation}, in confidence',
    greeting: 'Hello {firstName},',
    greetingNeutral: 'Hello,',
    intro:
      '{organisation} has asked Tenga Conseil to run a personality questionnaire for {group}. You are invited to take part.',
    // À VALIDER PAR AMINE : variante sans groupe.
    introSansGroupe:
      '{organisation} has asked Tenga Conseil to run a personality questionnaire as part of the campaign “{campagne}”. You are invited to take part.',
    whatYouDo:
      'What you will do: read {total} statements and say how well each describes you. There is no right answer and no time limit. You can stop and resume.',
    privacy:
      'What we want to tell you first: your individual result is visible only to you, to the Tenga consultant assigned to {organisation} and to the Tenga Conseil administration team.',
    // À VALIDER PAR AMINE : voir la version française.
    groups: '{organisation} receives only group summaries.',
    noDiagnosis:
      'The questionnaire is neither a test of skills nor a diagnosis.',
    messageTitle: 'Message written by {organisation}',
    action: 'Start the questionnaire',
    validity: 'This invitation is valid until {expire}.',
    question:
      'A question before you start? Write to us at {contactEmail}. We will answer.',
    closing: 'Kind regards, Tenga Conseil.'
  }
};

type MemberRole = 'responsable' | 'consultant';

type MemberTexts = {
  subject: string;
  intro: string;
  roles: Record<MemberRole, string>;
  howTo: string;
  action: string;
  ignore: string;
  question: string;
};

// À relire par un natif en arabe avant tout envoi réel.
const memberTexts: Record<MailLocale, MemberTexts> = {
  fr: {
    subject:
      'Un accès à {organisation} vous a été accordé sur Tenga Assessments',
    intro:
      'Un accès à l’espace de {organisation} vous a été accordé sur Tenga Assessments, avec le rôle de {role}.',
    roles: { responsable: 'responsable', consultant: 'consultant' },
    howTo:
      'Pour y accéder, ouvrez le lien ci-dessous et saisissez votre adresse e-mail : un lien de connexion vous sera envoyé.',
    action: 'Accéder à Tenga Assessments',
    ignore: 'Si ce message ne vous concerne pas, ignorez-le.',
    question: 'Une question ? Écrivez-nous à {contactEmail}.'
  },
  ar: {
    subject: 'تم منحكم حق الدخول إلى {organisation} على Tenga Assessments',
    intro:
      'مُنح لكم حق الدخول إلى فضاء {organisation} على Tenga Assessments بصفة {role}.',
    roles: { responsable: 'مسؤول', consultant: 'مستشار' },
    howTo:
      'للدخول، افتحوا الرابط أدناه وأدخلوا عنوان بريدكم الإلكتروني، وسيصلكم رابط لتسجيل الدخول.',
    action: 'الدخول إلى Tenga Assessments',
    ignore: 'إن كانت هذه الرسالة لا تعنيكم فتجاهلوها.',
    question: 'عندكم سؤال؟ راسلونا على {contactEmail}.'
  },
  en: {
    subject:
      'You have been given access to {organisation} on Tenga Assessments',
    intro:
      'You have been given access to the {organisation} space on Tenga Assessments, as {role}.',
    roles: { responsable: 'a manager', consultant: 'a consultant' },
    howTo:
      'To get in, open the link below and enter your e-mail address: a sign-in link will be sent to you.',
    action: 'Go to Tenga Assessments',
    ignore: 'If this message is not meant for you, ignore it.',
    question: 'A question? Write to us at {contactEmail}.'
  }
};

// Une seule passe : une valeur insérée qui contiendrait « {link} » n'est jamais réinterprétée.
const fill = (template: string, values: Record<string, string>): string =>
  template.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

// Nom saisi par un humain : espaces et sauts de ligne ramenés à une espace,
// pour que rien ne puisse s'ajouter à l'objet (injection d'en-tête).
const oneLine = (value: string): string => value.replace(/\s+/g, ' ').trim();

// Nom d'organisation à l'envoi. Un nom portant un lien, une adresse ou un
// caractère invisible (valeur ancienne, antérieure au filtre de saisie) est
// remplacé en entier par un libellé neutre : retirer seulement le lien laisserait
// un texte choisi par l'attaquant, et refuser l'envoi priverait un participant
// légitime de son invitation. Le contrôle porte sur la valeur brute, avant
// toute normalisation des espaces. Libellés à relire par un natif en arabe.
const neutralOrganisation: Record<MailLocale, string> = {
  fr: 'Organisation cliente',
  ar: 'المؤسسة العميلة',
  en: 'Client organisation'
};

const safeOrganisation = (value: string, locale: MailLocale): string =>
  hasLinkOrInvisible(value) ? neutralOrganisation[locale] : oneLine(value);

const dirOf = (locale: MailLocale): 'ltr' | 'rtl' =>
  locale === 'ar' ? 'rtl' : 'ltr';

const dateTags: Record<MailLocale, string> = {
  fr: 'fr',
  en: 'en',
  ar: 'ar-MA-u-nu-latn'
};

// Date longue, au fuseau du Maroc ; une valeur illisible est gardée telle quelle.
const formatExpire = (expire: string, locale: MailLocale): string => {
  const date = new Date(expire);
  if (Number.isNaN(date.getTime())) return expire;
  return new Intl.DateTimeFormat(dateTags[locale], {
    dateStyle: 'long',
    timeZone: FUSEAU_MAROC
  }).format(date);
};

const siteBase = (siteUrl: string): string => siteUrl.replace(/\/+$/, '');

/** Adresse du lien d'invitation : la page consulte sans consommer, le bouton consomme. */
export const invitationUrl = (
  siteUrl: string,
  locale: MailLocale,
  token: string
): string => `${siteBase(siteUrl)}${localizedPath(locale, `/i/${token}`)}`;

/** Adresse de la page de connexion, pour l'avis d'accès d'un membre. */
export const connexionUrl = (siteUrl: string, locale: MailLocale): string =>
  `${siteBase(siteUrl)}${localizedPath(locale, '/connexion')}`;

export function buildInvitationMail(i: InvitationMailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const t = texts[i.locale];
  const organisation = safeOrganisation(i.organisation, i.locale);
  const groupe = i.groupe === null ? '' : oneLine(i.groupe);
  const firstName = i.firstName === null ? '' : oneLine(i.firstName);
  const body = i.message?.trim() ?? '';
  const contactEmail = i.contactEmail.trim();
  const values = {
    organisation,
    firstName,
    group: groupe,
    campagne: oneLine(i.campagne),
    total: String(i.total),
    expire: formatExpire(i.expire, i.locale),
    contactEmail
  };
  const note = [
    fill(t.validity, values),
    contactEmail ? fill(t.question, values) : undefined,
    t.closing
  ]
    .filter((part): part is string => part !== undefined)
    .join(' ');
  const { html, text } = buildLinkMail({
    greeting: fill(firstName ? t.greeting : t.greetingNeutral, values),
    intro: fill(groupe ? t.intro : t.introSansGroupe, values),
    details: [t.whatYouDo, t.privacy, t.groups, t.noDiagnosis].map((part) =>
      fill(part, values)
    ),
    message: body ? { title: fill(t.messageTitle, values), body } : undefined,
    action: t.action,
    url: i.url,
    note,
    dir: dirOf(i.locale)
  });
  return { subject: fill(t.subject, values), html, text };
}

/**
 * Avis d'accès accordé à un consultant ou à un responsable : aucun jeton, un
 * seul lien vers la connexion, et un texte identique que le compte existe ou non.
 */
export function buildMemberNoticeMail(i: {
  locale: MailLocale;
  url: string;
  organisation: string;
  role: MemberRole;
  contactEmail: string;
}): { subject: string; html: string; text: string } {
  const t = memberTexts[i.locale];
  const contactEmail = i.contactEmail.trim();
  const values = {
    organisation: safeOrganisation(i.organisation, i.locale),
    role: t.roles[i.role],
    contactEmail
  };
  const note = [t.ignore, contactEmail ? fill(t.question, values) : undefined]
    .filter((part): part is string => part !== undefined)
    .join(' ');
  const { html, text } = buildLinkMail({
    intro: fill(t.intro, values),
    details: [t.howTo],
    action: t.action,
    url: i.url,
    note,
    dir: dirOf(i.locale)
  });
  return { subject: fill(t.subject, values), html, text };
}
