import { isoler } from '@/lib/format';
import { buildLinkMail } from '@/lib/mailer';
import type { MailLocale } from '@/lib/login-mail';

// Avis envoyé à la personne promue super administrateur : aucun nom ni aucune
// adresse de l'acteur, aucun jeton, un seul lien vers la connexion. Purs et
// testables ; le type Record<MailLocale, …> garantit la parité des trois langues.

type Texts = {
  subject: string;
  intro: string;
  details: string;
  action: string;
  note: string;
};

const texts: Record<MailLocale, Texts> = {
  // À VALIDER PAR AMINE
  fr: {
    subject: 'Un accès super administrateur vous a été accordé',
    intro:
      'Un accès super administrateur vient de vous être accordé sur Tenga Assessments.',
    details:
      'Pour y accéder, ouvrez le lien ci-dessous et saisissez votre adresse e-mail : un lien de connexion vous sera envoyé.',
    action: 'Accéder à Tenga Assessments',
    note: 'Si ce message ne vous concerne pas, ignorez-le.'
  },
  // À RELIRE PAR UN NATIF
  ar: {
    subject: 'تم منحكم صلاحية مشرف عام',
    intro: 'تم للتو منحكم صلاحية مشرف عام على Tenga Assessments.',
    details:
      'للدخول، افتحوا الرابط أدناه وأدخلوا عنوان بريدكم الإلكتروني، وسيصلكم رابط لتسجيل الدخول.',
    action: 'الدخول إلى Tenga Assessments',
    note: 'إن كانت هذه الرسالة لا تعنيكم فتجاهلوها.'
  },
  en: {
    subject: 'Super administrator access has been granted to you',
    intro:
      'Super administrator access to Tenga Assessments has just been granted to you.',
    details:
      'To get in, open the link below and enter your e-mail address: a sign-in link will be sent to you.',
    action: 'Go to Tenga Assessments',
    note: 'If this message is not meant for you, ignore it.'
  }
};

// Avis aux AUTRES super administrateurs lors d'un ajout ou d'un retrait : il
// nomme la personne concernée (signal de sécurité) mais jamais l'acteur.
// {adresse} est remplacée par l'adresse isolée (ordre de lecture en arabe).
type ChangeTexts = {
  subject: string;
  intro: string;
  details: string[];
  action: string;
  note: string;
};
export type AdminChange = 'added' | 'removed';

const changeTexts: Record<MailLocale, Record<AdminChange, ChangeTexts>> = {
  // À VALIDER PAR AMINE
  fr: {
    added: {
      subject: 'Un super administrateur a été ajouté sur Tenga Assessments',
      intro:
        'Un accès super administrateur vient d’être accordé à {adresse} sur Tenga Assessments.',
      details: [
        'Vous recevez cet avis parce que vous êtes super administrateur de Tenga Assessments.',
        'Si cet ajout n’est pas attendu, connectez-vous pour consulter la liste des super administrateurs et retirer cet accès.'
      ],
      action: 'Ouvrir Tenga Assessments',
      note: 'Aucune action n’est requise si cet ajout est attendu.'
    },
    removed: {
      subject: 'Un super administrateur a été retiré de Tenga Assessments',
      intro:
        'L’accès super administrateur de {adresse} à Tenga Assessments vient d’être retiré.',
      details: [
        'Vous recevez cet avis parce que vous êtes super administrateur de Tenga Assessments.',
        'Si ce retrait n’est pas attendu, connectez-vous pour consulter la liste des super administrateurs.'
      ],
      action: 'Ouvrir Tenga Assessments',
      note: 'Aucune action n’est requise si ce retrait est attendu.'
    }
  },
  // À RELIRE PAR UN NATIF
  ar: {
    added: {
      subject: 'تمت إضافة مشرف عام إلى Tenga Assessments',
      intro: 'تم للتو منح صلاحية مشرف عام إلى {adresse} على Tenga Assessments.',
      details: [
        'تصلكم هذه الرسالة لأنكم مشرفون عامون على Tenga Assessments.',
        'إن لم تكن هذه الإضافة متوقعة، فسجّلوا الدخول للاطلاع على قائمة المشرفين العامين وسحب هذه الصلاحية.'
      ],
      action: 'فتح Tenga Assessments',
      note: 'لا يلزم أي إجراء إن كانت هذه الإضافة متوقعة.'
    },
    removed: {
      subject: 'تم سحب صلاحية مشرف عام من Tenga Assessments',
      intro: 'تم للتو سحب صلاحية مشرف عام على Tenga Assessments من {adresse}.',
      details: [
        'تصلكم هذه الرسالة لأنكم مشرفون عامون على Tenga Assessments.',
        'إن لم يكن هذا السحب متوقعًا، فسجّلوا الدخول للاطلاع على قائمة المشرفين العامين.'
      ],
      action: 'فتح Tenga Assessments',
      note: 'لا يلزم أي إجراء إن كان هذا السحب متوقعًا.'
    }
  },
  en: {
    added: {
      subject: 'A super administrator has been added to Tenga Assessments',
      intro:
        'Super administrator access to Tenga Assessments has just been granted to {adresse}.',
      details: [
        'You are receiving this notice because you are a super administrator of Tenga Assessments.',
        'If you did not expect this addition, sign in to review the list of super administrators and remove this access.'
      ],
      action: 'Open Tenga Assessments',
      note: 'No action is needed if this addition was expected.'
    },
    removed: {
      subject: 'A super administrator has been removed from Tenga Assessments',
      intro:
        'Super administrator access to Tenga Assessments has just been removed from {adresse}.',
      details: [
        'You are receiving this notice because you are a super administrator of Tenga Assessments.',
        'If you did not expect this removal, sign in to review the list of super administrators.'
      ],
      action: 'Open Tenga Assessments',
      note: 'No action is needed if this removal was expected.'
    }
  }
};

export function buildAdminChangeMail(input: {
  locale: MailLocale;
  change: AdminChange;
  address: string;
  url: string;
}): { subject: string; html: string; text: string } {
  const t = changeTexts[input.locale][input.change];
  const { html, text } = buildLinkMail({
    intro: t.intro.replace(
      '{adresse}',
      input.locale === 'ar' ? isoler(input.address) : input.address
    ),
    details: t.details,
    action: t.action,
    url: input.url,
    note: t.note,
    dir: input.locale === 'ar' ? 'rtl' : 'ltr'
  });
  return { subject: t.subject, html, text };
}

export function buildAdminGrantMail(input: {
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
    details: [t.details],
    action: t.action,
    url: input.url,
    note: t.note,
    dir: input.locale === 'ar' ? 'rtl' : 'ltr'
  });
  return { subject: t.subject, html, text };
}
