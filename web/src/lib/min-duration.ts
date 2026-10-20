const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Attend que `minMs` se soient écoulées depuis `startedAt`. La réponse de la
 * demande de lien ne dépend ainsi ni de l'adresse ni du travail réel : elle est
 * rendue après une durée fixe.
 */
export async function holdUntil(
  startedAt: number,
  minMs: number,
  clock: {
    now: () => number;
    sleep: (ms: number) => Promise<void>;
  } = { now: Date.now, sleep: wait }
): Promise<void> {
  const remaining = minMs - (clock.now() - startedAt);
  if (remaining > 0) await clock.sleep(remaining);
}
