import { recordSinkMail } from '@/lib/mail-sink';
import { isMailSinkActive, isMailSinkAllowed } from '@/lib/startup-check';

const RESEND_TIMEOUT_MS = 8000;

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Adresse ramenée à sa forme canonique pour les plafonds par destinataire, afin
// que les alias (« a+1@ », points Gmail) ne les contournent pas.
export const canonicalAddress = (address: string): string => {
  const [local = '', domain = ''] = address.toLowerCase().split('@');
  const base = local.split('+')[0] ?? local;
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
  return `${isGmail ? base.replace(/\./g, '') : base}@${domain}`;
};

type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Adresse de réponse (en-tête Reply-To), facultative. */
  replyTo?: string;
};

/** Clé Resend absente : erreur de configuration, jamais un échec silencieux. */
export class MailConfigError extends Error {
  constructor() {
    super('RESEND_API_KEY est absente : aucun e-mail ne peut partir.');
    this.name = 'MailConfigError';
  }
}

/** Réceptacle de test actif hors préproduction : refus net, rien ne part. */
export class MailSinkForbiddenError extends Error {
  constructor() {
    super('MAIL_SINK est actif hors préproduction : envoi refusé.');
    this.name = 'MailSinkForbiddenError';
  }
}

/**
 * Envoie un e-mail via l'API REST Resend. En préproduction avec MAIL_SINK=true,
 * le message est gardé dans le réceptacle de test et ne part pas. Lève
 * MailConfigError sans clé Resend ; renvoie false si l'API répond en erreur ou est injoignable (seul le
 * code HTTP est journalisé, jamais l'adresse ni le corps).
 */
export async function sendMail({
  to,
  subject,
  text,
  html,
  replyTo
}: Mail): Promise<boolean> {
  if (isMailSinkActive(process.env)) {
    if (!isMailSinkAllowed(process.env)) throw new MailSinkForbiddenError();
    recordSinkMail({ to, subject, text, html, replyTo });
    return true;
  }
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new MailConfigError();
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Tenga <noreply@ai-mpower.com>',
        to: [to],
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {})
      })
    });
    if (!res.ok) {
      console.error(`Resend responded with HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch {
    // Délai dépassé ou réseau coupé : pas de détail, il pourrait contenir l'adresse.
    console.error('Resend request failed');
    return false;
  }
}

// Texte libre (message d'une organisation) : échappé, retours à la ligne conservés.
const multiline = (value: string): string =>
  escapeHtml(value).replace(/\r?\n/g, '<br>');

/** Gabarit commun : salutation, introduction, message facultatif, bouton-lien, note. */
export function buildLinkMail({
  greeting,
  intro,
  message,
  action,
  url,
  code,
  note,
  dir
}: {
  greeting?: string;
  intro: string;
  message?: { title: string; body: string };
  action: string;
  url: string;
  /** Code à saisir à la main (autre appareil que celui du lien). */
  code?: { label: string; value: string };
  note: string;
  dir: 'ltr' | 'rtl';
}): { html: string; text: string } {
  const html =
    `<div dir="${dir}" style="font-family:Arial,sans-serif;line-height:1.5">` +
    (greeting ? `<p>${escapeHtml(greeting)}</p>` : '') +
    `<p>${escapeHtml(intro)}</p>` +
    (message
      ? `<blockquote style="margin:12px 0;padding:8px 14px;border-inline-start:3px solid #cccccc"><strong>${escapeHtml(message.title)}</strong><br>${multiline(message.body)}</blockquote>`
      : '') +
    `<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 18px;background:#3730a3;color:#ffffff;text-decoration:none;border-radius:6px">${escapeHtml(action)}</a></p>` +
    `<p>${escapeHtml(url)}</p>` +
    (code
      ? `<p>${escapeHtml(code.label)}<br><strong dir="ltr" style="font-size:24px;letter-spacing:4px">${escapeHtml(code.value)}</strong></p>`
      : '') +
    `<p style="color:#666666">${escapeHtml(note)}</p></div>`;
  const text = [
    greeting,
    intro,
    message ? `${message.title}\n${message.body}` : undefined,
    `${action}\n${url}`,
    code ? `${code.label}\n${code.value}` : undefined,
    note
  ]
    .filter((part): part is string => part !== undefined)
    .join('\n\n');
  return { html, text };
}
