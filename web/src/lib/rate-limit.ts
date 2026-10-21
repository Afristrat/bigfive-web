import { isIP } from 'node:net';
import { headers } from 'next/headers';
import {
  createRateLimiter,
  type Limit,
  type RateLimiter
} from '@/lib/sliding-window';

const HOUR_MS = 60 * 60 * 1000;
const NO_CLIENT_IP = 'no-cf-ip';

// ponytail: compteur en mémoire mono-instance, à remplacer (Redis ou base)
// dès qu'il y a plusieurs réplicas ou que les plafonds doivent survivre à un redémarrage.
// L'état vit sur globalThis pour qu'un module dupliqué entre bundles partage les mêmes compteurs.
const store = globalThis as typeof globalThis & {
  __tengaLimiter?: RateLimiter;
};

/** Limiteur unique du processus, partagé par les actions publiques et la connexion. */
export const sharedLimiter: RateLimiter = (store.__tengaLimiter ??=
  createRateLimiter());

// Plafonds par IP dimensionnés pour une équipe ou une salle qui passe le test
// derrière une seule adresse (NAT d'entreprise). Ceux de la connexion
// (magicLinkLimits, codeLimits) vivent dans sliding-window.ts.
export const limits = {
  getResult: { max: 600, windowMs: HOUR_MS },
  saveTest: { max: 60, windowMs: HOUR_MS }
} as const satisfies Record<string, Limit>;

/**
 * Seul `cf-connecting-ip` est fiable : Cloudflare le pose et écrase toute
 * valeur envoyée par le client. `x-forwarded-for` est ignoré car son premier
 * élément est fourni par le client. Sans en-tête valide (accès qui ne passe
 * pas par Cloudflare), toutes ces requêtes partagent un seul seau.
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const cloudflare = h.get('cf-connecting-ip')?.trim();
  return cloudflare && isIP(cloudflare) ? cloudflare : NO_CLIENT_IP;
}

/**
 * Fenêtre glissante par action et par sujet (IP du client par défaut, ou une
 * clé fournie). Renvoie true si la requête courante dépasse le plafond (elle
 * n'est alors pas comptée). Quand la table de l'action est pleine malgré le
 * nettoyage, la clé la plus ancienne est évincée (jamais de refus de clé nouvelle).
 */
export async function isRateLimited(
  action: string,
  limit: Limit,
  subject?: string
): Promise<boolean> {
  return sharedLimiter.isLimited(
    action,
    limit,
    subject ?? (await getClientIp())
  );
}
