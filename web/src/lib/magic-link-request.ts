import { canonicalAddress } from '@/lib/mailer';
import { magicLinkLimits, type RateLimiter } from '@/lib/sliding-window';

export type MagicLinkOutcome =
  | { status: 'sent' }
  | { status: 'rate_limited'; scope: 'ip' | 'address' };

export type MagicLinkDeps = {
  limiter: RateLimiter;
  /**
   * Demande le lien à la base (qui décide seule de l'éligibilité), puis envoie
   * l'e-mail s'il y a lieu. Lève en cas d'échec d'envoi.
   */
  deliver: (address: string, locale: string) => Promise<void>;
  /** Exécute le travail après la réponse (par exemple `after` de Next.js). */
  defer: (task: () => Promise<void>) => void;
  /** Journal d'exploitation : un échec d'envoi doit être visible, jamais silencieux. */
  reportError: (error: unknown) => void;
};

/**
 * Demande de lien de connexion. La réponse ne dépend pas de l'existence de
 * l'adresse : mêmes plafonds comptés pour toute adresse, même résultat, et
 * tout le travail variable (lecture en base, envoi) part après la réponse. Le
 * résultat de la base n'est jamais lu ici. L'adresse est mise en minuscules
 * avant tout appel. Un échec d'envoi est remonté à `reportError` (jamais à la
 * personne). L'appelant présente `rate_limited` comme `sent` (réponse neutre)
 * et ne s'en sert que pour journaliser.
 */
export function requestMagicLink(
  deps: MagicLinkDeps,
  input: { email: string; locale: string; ip: string }
): MagicLinkOutcome {
  const address = input.email.trim().toLowerCase();
  const perIp = deps.limiter.isLimited(
    'magicLinkPerIp',
    magicLinkLimits.perIp,
    input.ip
  );
  const perAddress = deps.limiter.isLimited(
    'magicLinkPerAddress',
    magicLinkLimits.perAddress,
    canonicalAddress(address)
  );
  if (perIp) return { status: 'rate_limited', scope: 'ip' };
  if (perAddress) return { status: 'rate_limited', scope: 'address' };

  deps.defer(async () => {
    try {
      await deps.deliver(address, input.locale);
    } catch (error) {
      deps.reportError(error);
    }
  });
  return { status: 'sent' };
}
