import { headers } from 'next/headers';

const HOUR_MS = 60 * 60 * 1000;
const SWEEP_THRESHOLD = 10_000;

// ponytail: compteur en mémoire mono-instance, à remplacer si plusieurs réplicas
const hits = new Map<string, number[]>();

export const limits = {
  saveTest: { max: 20, windowMs: HOUR_MS },
  saveFeedback: { max: 5, windowMs: HOUR_MS },
  translation: { max: 5, windowMs: HOUR_MS },
  sendEmailPerIp: { max: 5, windowMs: HOUR_MS },
  sendEmailPerRecipient: { max: 3, windowMs: HOUR_MS }
} as const;

type Limit = (typeof limits)[keyof typeof limits];

async function getClientIp(): Promise<string> {
  const h = await headers();
  const cloudflare = h.get('cf-connecting-ip');
  if (cloudflare) return cloudflare.trim();
  const forwarded = h.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}

function sweep(now: number) {
  for (const [key, stamps] of hits) {
    if (stamps.every((t) => now - t >= HOUR_MS)) hits.delete(key);
  }
}

/**
 * Fenêtre glissante par action et par sujet (IP du client par défaut, ou une
 * clé fournie, par exemple l'adresse destinataire). Renvoie true si la requête
 * courante dépasse le plafond (elle n'est alors pas comptée).
 */
export async function isRateLimited(
  action: string,
  { max, windowMs }: Limit,
  subject?: string
): Promise<boolean> {
  const now = Date.now();
  const key = `${action}:${subject ?? (await getClientIp())}`;
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);

  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  if (hits.size > SWEEP_THRESHOLD) sweep(now);
  return false;
}
