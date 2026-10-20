// Limiteur de débit à fenêtre glissante, pur : l'horloge est injectée et le
// sujet (IP, adresse) est fourni par l'appelant. Aucun accès à `next/headers`.

const HOUR_MS = 60 * 60 * 1000;

export type Limit = { readonly max: number; readonly windowMs: number };

// Plafonds de la demande de lien de connexion (plan § 4), identiques à ceux de
// l'ancienne branche : par IP et par adresse canonique.
export const magicLinkLimits = {
  perIp: { max: 5, windowMs: HOUR_MS },
  perAddress: { max: 3, windowMs: HOUR_MS }
} as const satisfies Record<string, Limit>;

export type RateLimiter = {
  /**
   * Renvoie true si la requête courante dépasse le plafond (elle n'est alors
   * pas comptée). Quand la table est pleine malgré le nettoyage, toute
   * nouvelle clé est refusée.
   */
  isLimited: (action: string, limit: Limit, subject: string) => boolean;
  size: () => number;
};

export function createRateLimiter({
  now = Date.now,
  maxKeys = 50_000,
  sweepThreshold = 10_000,
  sweepIntervalMs = 60_000
}: {
  now?: () => number;
  maxKeys?: number;
  sweepThreshold?: number;
  sweepIntervalMs?: number;
} = {}): RateLimiter {
  const hits = new Map<string, { stamps: number[]; windowMs: number }>();
  let lastSweep = 0;

  // Parcours complet : au plus une fois par intervalle, pour qu'un afflux de
  // clés nouvelles ne transforme pas chaque requête en balayage O(n).
  const sweep = (at: number): void => {
    if (at - lastSweep < sweepIntervalMs) return;
    lastSweep = at;
    for (const [key, entry] of hits) {
      if (entry.stamps.every((t) => at - t >= entry.windowMs)) hits.delete(key);
    }
  };

  return {
    size: () => hits.size,
    isLimited(action, { max, windowMs }, subject) {
      const at = now();
      const key = `${action}:${subject}`;

      if (!hits.has(key)) {
        if (hits.size >= sweepThreshold) sweep(at);
        if (hits.size >= maxKeys) return true;
      }

      const recent = (hits.get(key)?.stamps ?? []).filter(
        (t) => at - t < windowMs
      );
      if (recent.length >= max) {
        hits.set(key, { stamps: recent, windowMs });
        return true;
      }
      recent.push(at);
      hits.set(key, { stamps: recent, windowMs });
      return false;
    }
  };
}
