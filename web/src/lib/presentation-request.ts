import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import {
  MIN_FILL_MS,
  validateFields,
  type ExchangeLocale,
  type FieldErrors,
  type Objective,
  type OrganisationSize,
  type PresentationInput
} from '@/lib/presentation-fields';
import { FUSEAU_MAROC } from '@/lib/format';
import { localeOf } from '@/lib/locale-field';
import { canonicalAddress, escapeHtml } from '@/lib/mailer';
import type { Limit, RateLimiter } from '@/lib/sliding-window';

// Logique pure de la demande de présentation (page /presentation). L'horloge, le
// limiteur, la base et l'envoi sont injectés : tout est testable sans réseau.
// Le schéma de validation vit dans presentation-fields.ts, partagé avec le
// navigateur.

export type EnvLike = Readonly<Record<string, string | undefined>>;

export const PRESENTATION_COLLECTION = 'demandes_presentation';

/** Conservation de 12 mois, appliquée par un index TTL sur `createdAt`. */
export const RETENTION_SECONDS = 365 * 24 * 60 * 60;

/** Durée minimale d'une réponse, pour ne pas distinguer les issues par le temps. */
export const MIN_RESPONSE_MS = 1200;

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const presentationLimits = {
  perIp: { max: 5, windowMs: HOUR_MS },
  perAddress: { max: 3, windowMs: DAY_MS }
} as const satisfies Record<string, Limit>;

/**
 * Coupe-circuit : au plus 200 accusés par jour pour tout le site. Au-delà, la
 * demande reste enregistrée mais l'accusé n'est plus envoyé.
 */
export const acknowledgementGlobalLimit: Limit = {
  max: 200,
  windowMs: DAY_MS
};

/** Vrai si l'accusé peut partir (le compteur global avance à chaque appel). */
export const mayAcknowledge = (limiter: RateLimiter): boolean =>
  !limiter.isLimited(
    'presentationAckGlobal',
    acknowledgementGlobalLimit,
    'all'
  );

// ---------------------------------------------------------------------------
// Robots

export type BotVerdict = 'honeypot' | 'too_fast' | null;

/**
 * Piège à robots : le champ « website » est invisible pour une personne, et une
 * personne ne remplit pas ce formulaire en moins de MIN_FILL_MS.
 */
export function screenBot(
  input: { website: unknown; elapsedMs: unknown },
  minMs: number = MIN_FILL_MS
): BotVerdict {
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return 'honeypot';
  }
  const elapsed =
    typeof input.elapsedMs === 'string' ? Number(input.elapsedMs) : NaN;
  return Number.isFinite(elapsed) && elapsed >= minMs ? null : 'too_fast';
}

// ---------------------------------------------------------------------------
// Plafonds

export type LimitDecision =
  | { limited: false }
  | { limited: true; scope: 'ip' | 'address' };

/**
 * Compte la demande contre les deux plafonds (5 par IP et par heure, 3 par
 * adresse canonique et par jour). Les deux compteurs avancent toujours, pour
 * qu'un plafond atteint n'en masque pas un autre.
 */
export function checkPresentationLimits(
  limiter: RateLimiter,
  ip: string,
  address: string
): LimitDecision {
  const byIp = limiter.isLimited(
    'presentationPerIp',
    presentationLimits.perIp,
    ip
  );
  const byAddress = limiter.isLimited(
    'presentationPerAddress',
    presentationLimits.perAddress,
    canonicalAddress(address)
  );
  if (byIp) return { limited: true, scope: 'ip' };
  if (byAddress) return { limited: true, scope: 'address' };
  return { limited: false };
}

// ---------------------------------------------------------------------------
// Empreinte de l'IP

export const MIN_SALT_LENGTH = 16;

/**
 * Sel de l'empreinte : PRESENTATION_IP_SALT, d'au moins MIN_SALT_LENGTH
 * caractères. Absent ou trop court : null, et aucune empreinte n'est stockée.
 * Le sel n'est jamais dérivé d'un autre secret (mot de passe de la base, clé
 * d'API) : l'espace des adresses IPv4 est assez petit pour qu'un sel faible ou
 * partagé rende l'empreinte réversible.
 */
export function resolveIpSalt(env: EnvLike): string | null {
  const salt = env.PRESENTATION_IP_SALT?.trim() ?? '';
  return salt.length >= MIN_SALT_LENGTH ? salt : null;
}

/** HMAC-SHA-256 de l'IP, clé = sel : jamais l'IP brute. */
export const hashIp = (ip: string, salt: string): string =>
  createHmac('sha256', salt).update(ip).digest('hex');

/** Empreinte à stocker, ou null (sel absent, ou IP inconnue ou invalide). */
export function ipFingerprint(ip: string, env: EnvLike): string | null {
  const salt = resolveIpSalt(env);
  return salt && isIP(ip) ? hashIp(ip, salt) : null;
}

// ---------------------------------------------------------------------------
// Destinataires

const EMAIL_SHAPE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;

const parseList = (value: string | undefined): string[] =>
  (value ?? '')
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter((item) => EMAIL_SHAPE.test(item));

/**
 * Destinataires de la notification : PRESENTATION_RECIPIENT si elle contient
 * au moins une adresse valide, sinon TENGA_ADMIN_EMAILS. Listes séparées par
 * des virgules, points-virgules ou espaces ; doublons retirés.
 */
export function notificationRecipients(env: EnvLike): string[] {
  const dedicated = parseList(env.PRESENTATION_RECIPIENT);
  const list =
    dedicated.length > 0 ? dedicated : parseList(env.TENGA_ADMIN_EMAILS);
  return [...new Set(list)];
}

// ---------------------------------------------------------------------------
// Enregistrement

export type PresentationRecord = {
  nom: string;
  organisation: string;
  fonction: string;
  email: string;
  tailleOrganisation: OrganisationSize;
  objectif: Objective;
  message: string;
  langueEchange: ExchangeLocale;
  languePage: string;
  ipHash: string | null;
  statut: 'nouvelle';
  createdAt: Date;
};

export function buildRecord(
  data: PresentationInput,
  context: { pageLocale: string; ipHash: string | null; now: Date }
): PresentationRecord {
  return {
    nom: data.name,
    organisation: data.organisation,
    fonction: data.role,
    email: data.email,
    tailleOrganisation: data.size,
    objectif: data.objective,
    message: data.message,
    langueEchange: data.exchangeLocale,
    languePage: localeOf(context.pageLocale),
    ipHash: context.ipHash,
    statut: 'nouvelle',
    createdAt: context.now
  };
}

// ---------------------------------------------------------------------------
// E-mails. Textes purs : ils partent hors du rendu d'une page (tâche après la
// réponse), comme l'e-mail de connexion. Espace insécable (U+00A0) avant « : »
// en français. L'arabe est à relire par un locuteur natif.

const NBSP = ' ';

export type OutgoingMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
};

type Labels = {
  name: string;
  organisation: string;
  role: string;
  email: string;
  size: string;
  objective: string;
  exchangeLocale: string;
  pageLocale: string;
  message: string;
  receivedAt: string;
};

type Vocabulary = {
  labels: Labels;
  sizes: Record<OrganisationSize, string>;
  objectives: Record<Objective, string>;
  locales: Record<ExchangeLocale, string>;
};

const french: Vocabulary = {
  labels: {
    name: 'Prénom et nom',
    organisation: 'Organisation',
    role: 'Fonction',
    email: 'Adresse e-mail professionnelle',
    size: 'Taille de l’organisation',
    objective: 'Objectif',
    exchangeLocale: 'Langue souhaitée pour l’échange',
    pageLocale: 'Langue de la page',
    message: 'Message',
    receivedAt: 'Reçue le'
  },
  sizes: {
    lt50: 'Moins de 50',
    from50to250: '50 à 250',
    from250to1000: '250 à 1000',
    gt1000: 'Plus de 1000'
  },
  objectives: {
    teamwork: 'Mieux travailler en équipe',
    change: 'Accompagner un changement',
    leaders: 'Développer des cadres',
    other: 'Autre'
  },
  locales: { fr: 'Français', ar: 'Arabe', en: 'Anglais' }
};

type Row = { label: string; value: string; multiline?: boolean };

// Texte libre : échappé, retours à la ligne conservés.
const cell = (row: Row): string => {
  const escaped = escapeHtml(row.value);
  return row.multiline ? escaped.replace(/\r?\n/g, '<br>') : escaped;
};

// `bdi` isole chaque valeur saisie : une adresse ou un nom latin ne réordonne
// pas une phrase arabe, et inversement.
const table = (rows: readonly Row[]): string =>
  `<table role="presentation" style="border-collapse:collapse">` +
  rows
    .map(
      (row) =>
        `<tr><th scope="row" style="text-align:start;vertical-align:top;padding:4px 16px 4px 0;font-weight:bold">${escapeHtml(row.label)}</th>` +
        `<td style="padding:4px 0"><bdi>${cell(row)}</bdi></td></tr>`
    )
    .join('') +
  `</table>`;

const plainRows = (rows: readonly Row[]): string =>
  rows
    .map((row) =>
      row.multiline
        ? `${row.label}\n${row.value}`
        : `${row.label} : ${row.value}`
    )
    .join('\n');

const recapRows = (
  record: PresentationRecord,
  vocabulary: Vocabulary,
  withContext: boolean,
  receivedAt?: string
): Row[] => [
  { label: vocabulary.labels.name, value: record.nom },
  { label: vocabulary.labels.organisation, value: record.organisation },
  { label: vocabulary.labels.role, value: record.fonction },
  { label: vocabulary.labels.email, value: record.email },
  {
    label: vocabulary.labels.size,
    value: vocabulary.sizes[record.tailleOrganisation]
  },
  {
    label: vocabulary.labels.objective,
    value: vocabulary.objectives[record.objectif]
  },
  {
    label: vocabulary.labels.exchangeLocale,
    value: vocabulary.locales[record.langueEchange]
  },
  ...(withContext
    ? [
        { label: vocabulary.labels.pageLocale, value: record.languePage },
        ...(receivedAt
          ? [{ label: vocabulary.labels.receivedAt, value: receivedAt }]
          : [])
      ]
    : []),
  ...(record.message
    ? [
        {
          label: vocabulary.labels.message,
          value: record.message,
          multiline: true
        }
      ]
    : [])
];

const casablancaDate = (date: Date): string =>
  new Intl.DateTimeFormat('fr-MA-u-nu-latn', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: FUSEAU_MAROC
  }).format(date);

/** Notification à Tenga : en français, toutes les informations, réponse en Reply-To. */
export function buildNotificationMail(
  record: PresentationRecord
): Omit<OutgoingMail, 'to'> {
  const rows = recapRows(
    record,
    french,
    true,
    casablancaDate(record.createdAt)
  );
  const intro = 'Nouvelle demande de présentation de Tenga Assessments.';
  const hint = 'Répondre à ce message écrit directement à la personne.';
  return {
    subject: `Demande de présentation${NBSP}: ${record.organisation}`,
    replyTo: record.email,
    html:
      `<div dir="ltr" lang="fr" style="font-family:Arial,sans-serif;line-height:1.5">` +
      `<p>${intro}</p>${table(rows)}` +
      `<p style="color:#666666">${hint}</p></div>`,
    text: [intro, plainRows(rows), hint].join('\n\n')
  };
}

type AckTexts = {
  subject: string;
  greeting: string;
  body: string;
  ignore: string;
  regards: string;
};

// Contenu FIXE : l'accusé part vers une adresse non vérifiée, il ne reprend donc
// aucune saisie (ni nom, ni message, ni récapitulatif) et ne porte ni lien ni
// Reply-To. Sinon le formulaire servirait à envoyer un texte choisi, au nom de
// Tenga, à n'importe quelle adresse.
const ackTexts: Record<ExchangeLocale, AckTexts> = {
  fr: {
    subject: 'Nous avons bien reçu votre demande de présentation',
    greeting: 'Bonjour,',
    body: 'Nous avons bien reçu votre demande de présentation de Tenga Assessments. Un membre de Tenga Conseil vous répondra.',
    ignore:
      'Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer ce message.',
    regards: 'Cordialement,'
  },
  ar: {
    subject: 'تلقّينا طلبكم للحصول على عرض تقديمي',
    greeting: 'مرحبًا،',
    body: 'تلقّينا طلبكم للحصول على عرض تقديمي لـ Tenga Assessments. سيردّ عليكم أحد أعضاء Tenga Conseil.',
    ignore: 'إن لم تكونوا أنتم من أرسل هذا الطلب، يمكنكم تجاهل هذه الرسالة.',
    regards: 'مع أطيب التحيات،'
  },
  en: {
    subject: 'We have received your request for a presentation',
    greeting: 'Hello,',
    body: 'We have received your request for a presentation of Tenga Assessments. A member of Tenga Conseil will reply to you.',
    ignore: 'If you did not make this request, you can ignore this message.',
    regards: 'Kind regards,'
  }
};

/** Accusé de réception à contenu fixe, dans la langue choisie pour l'échange. */
export function buildAcknowledgementMail(
  locale: ExchangeLocale
): Omit<OutgoingMail, 'to' | 'replyTo'> {
  const texts = ackTexts[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  return {
    subject: texts.subject,
    html:
      `<div dir="${dir}" lang="${locale}" style="font-family:Arial,sans-serif;line-height:1.5">` +
      `<p>${escapeHtml(texts.greeting)}</p>` +
      `<p>${escapeHtml(texts.body)}</p>` +
      `<p style="color:#666666">${escapeHtml(texts.ignore)}</p>` +
      `<p>${escapeHtml(texts.regards)}<br>Tenga Conseil</p></div>`,
    text: [
      texts.greeting,
      texts.body,
      texts.ignore,
      `${texts.regards}\nTenga Conseil`
    ].join('\n\n')
  };
}

// ---------------------------------------------------------------------------
// Traitement d'une demande

export type PresentationEvent =
  | { event: 'presentation.rate_limited'; scope: 'ip' | 'address' }
  | { event: 'presentation.honeypot' }
  | { event: 'presentation.ack_suppressed' }
  | { event: 'presentation.save_failed'; reason: string }
  | { event: 'presentation.notification_unconfigured' }
  | {
      event: 'presentation.send_failed';
      kind: 'notification' | 'acknowledgement';
      reason: string;
    }
  | { event: 'presentation.salt_missing' };

export type PresentationDeps = {
  limiter: RateLimiter;
  /** Enregistre la demande : source de vérité, avant tout envoi. */
  save: (record: PresentationRecord) => Promise<void>;
  /** Renvoie false si l'envoi est refusé ; peut lever (clé absente). */
  send: (mail: OutgoingMail) => Promise<boolean>;
  /** Exécute le travail après la réponse (`after` de Next.js). */
  defer: (task: () => Promise<void>) => void;
  /** Journal d'exploitation : jamais d'adresse, de nom ni de contenu. */
  report: (event: PresentationEvent) => void;
  env: EnvLike;
  now?: () => Date;
};

export type PresentationOutcome =
  | { status: 'success'; detail: 'stored' | 'honeypot' | 'rate_limited' }
  | { status: 'invalid'; fields: FieldErrors }
  | { status: 'too_fast' }
  | { status: 'failed' };

const reasonOf = (error: unknown): string =>
  error instanceof Error ? error.name : 'unknown';

async function attempt(
  deps: PresentationDeps,
  kind: 'notification' | 'acknowledgement',
  mail: OutgoingMail
): Promise<void> {
  try {
    if (!(await deps.send(mail))) {
      deps.report({
        event: 'presentation.send_failed',
        kind,
        reason: 'refused'
      });
    }
  } catch (error) {
    deps.report({
      event: 'presentation.send_failed',
      kind,
      reason: reasonOf(error)
    });
  }
}

/**
 * Traite une demande : robots, validation, plafonds, enregistrement, puis envois
 * après la réponse. Un plafond atteint et un piège déclenché reçoivent la même
 * réponse de succès (neutre) ; seul le journal les distingue. L'enregistrement
 * fait foi : un échec d'envoi n'y change rien et n'est jamais montré.
 */
export async function processPresentation(
  deps: PresentationDeps,
  input: {
    raw: Record<string, unknown>;
    website: unknown;
    elapsedMs: unknown;
    pageLocale: string;
    ip: string;
  }
): Promise<PresentationOutcome> {
  const verdict = screenBot(input);
  if (verdict === 'honeypot') {
    deps.report({ event: 'presentation.honeypot' });
    return { status: 'success', detail: 'honeypot' };
  }
  if (verdict === 'too_fast') return { status: 'too_fast' };

  const checked = validateFields(input.raw);
  if (!checked.ok) return { status: 'invalid', fields: checked.fields };

  const limit = checkPresentationLimits(
    deps.limiter,
    input.ip,
    checked.data.email
  );
  if (limit.limited) {
    deps.report({ event: 'presentation.rate_limited', scope: limit.scope });
    return { status: 'success', detail: 'rate_limited' };
  }

  const ipHash = ipFingerprint(input.ip, deps.env);
  if (ipHash === null && resolveIpSalt(deps.env) === null) {
    deps.report({ event: 'presentation.salt_missing' });
  }
  const record = buildRecord(checked.data, {
    pageLocale: input.pageLocale,
    ipHash,
    now: (deps.now ?? (() => new Date()))()
  });

  try {
    await deps.save(record);
  } catch (error) {
    deps.report({ event: 'presentation.save_failed', reason: reasonOf(error) });
    return { status: 'failed' };
  }

  deps.defer(async () => {
    const recipients = notificationRecipients(deps.env);
    const notification = buildNotificationMail(record);
    const acknowledgement = buildAcknowledgementMail(record.langueEchange);
    if (recipients.length === 0) {
      deps.report({ event: 'presentation.notification_unconfigured' });
    }
    await Promise.all([
      ...recipients.map((to) =>
        attempt(deps, 'notification', { ...notification, to })
      ),
      mayAcknowledge(deps.limiter)
        ? attempt(deps, 'acknowledgement', {
            ...acknowledgement,
            to: record.email
          })
        : Promise.resolve(deps.report({ event: 'presentation.ack_suppressed' }))
    ]);
  });
  return { status: 'success', detail: 'stored' };
}
