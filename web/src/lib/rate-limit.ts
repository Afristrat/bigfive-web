import { isIP } from 'node:net';
import { headers } from 'next/headers';

const HOUR_MS = 60 * 60 * 1000;
const SWEEP_THRESHOLD = 10_000;
const MAX_KEYS = 50_000;
const NO_CLIENT_IP = 'no-cf-ip';

// ponytail: compteur en mémoire mono-instance, à remplacer (Redis ou MongoDB)
// dès qu'il y a plusieurs réplicas ou que les plafonds doivent survivre à un redémarrage.
// L'état vit sur globalThis pour qu'un module dupliqué entre bundles partage les mêmes compteurs.
const store = globalThis as typeof globalThis & {
  __tengaRateLimitHits?: Map<string, number[]>;
  __tengaRateLimitLastSweep?: number;
};
const hits = (store.__tengaRateLimitHits ??= new Map<string, number[]>());
const SWEEP_INTERVAL_MS = 60 * 1000;

export const limits = {
  getResult: { max: 120, windowMs: HOUR_MS },
  saveTest: { max: 20, windowMs: HOUR_MS },
  saveFeedback: { max: 5, windowMs: HOUR_MS },
  translation: { max: 5, windowMs: HOUR_MS },
  sendEmailPerIp: { max: 5, windowMs: HOUR_MS },
  sendEmailPerRecipient: { max: 3, windowMs: HOUR_MS },
  sendEmailGlobal: { max: 100, windowMs: HOUR_MS }
} as const;

type Limit = (typeof limits)[keyof typeof limits];

/**
 * Seul `cf-connecting-ip` est fiable : Cloudflare le pose et écrase toute
 * valeur envoyée par le client. `x-forwarded-for` est ignoré car son premier
 * élément est fourni par le client. Sans en-tête valide (accès qui ne passe
 * pas par Cloudflare), toutes ces requêtes partagent un seul seau.
 */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const cloudflare = h.get('cf-connecting-ip')?.trim();
  return cloudflare && isIP(cloudflare) ? cloudflare : NO_CLIENT_IP;
}

// Parcours complet de la table : au plus une fois par minute, pour qu'un afflux
// de clés nouvelles ne transforme pas chaque requête en balayage O(n).
function sweep(now: number): void {
  if (now - (store.__tengaRateLimitLastSweep ?? 0) < SWEEP_INTERVAL_MS) return;
  store.__tengaRateLimitLastSweep = now;
  for (const [key, stamps] of hits) {
    if (stamps.every((t) => now - t >= HOUR_MS)) hits.delete(key);
  }
}

/**
 * Fenêtre glissante par action et par sujet (IP du client par défaut, ou une
 * clé fournie, par exemple l'adresse destinataire). Renvoie true si la requête
 * courante dépasse le plafond (elle n'est alors pas comptée). Quand la table
 * est pleine malgré le nettoyage, toute nouvelle clé est refusée.
 */
export async function isRateLimited(
  action: string,
  { max, windowMs }: Limit,
  subject?: string
): Promise<boolean> {
  const now = Date.now();
  const key = `${action}:${subject ?? (await getClientIp())}`;

  if (!hits.has(key)) {
    if (hits.size >= SWEEP_THRESHOLD) sweep(now);
    if (hits.size >= MAX_KEYS) return true;
  }

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return true;
  }

  recent.push(now);
  hits.set(key, recent);
  return false;
}
