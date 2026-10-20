// Réceptacle de test des e-mails (préproduction uniquement, MAIL_SINK=true) :
// les messages sont gardés en mémoire au lieu de partir chez Resend, pour que
// les parcours Playwright lisent le lien et le code. L'autorisation d'activer
// le réceptacle se vérifie au démarrage (startup-check.ts) et à chaque envoi.

export type SinkMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  receivedAt: string;
};

const MAX_MAILS = 50;

const store = globalThis as typeof globalThis & {
  __tengaMailSink?: SinkMail[];
};
const mails = (store.__tengaMailSink ??= []);

export function recordSinkMail(mail: Omit<SinkMail, 'receivedAt'>): void {
  mails.push({ ...mail, receivedAt: new Date().toISOString() });
  if (mails.length > MAX_MAILS) mails.splice(0, mails.length - MAX_MAILS);
}

export const readSink = (): readonly SinkMail[] => mails.slice();

export function clearSink(): void {
  mails.length = 0;
}
