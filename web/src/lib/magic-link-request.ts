import { canonicalAddress } from '@/lib/mailer';
import { magicLinkLimits, type RateLimiter } from '@/lib/sliding-window';

export type MagicLinkOutcome = { status: 'sent' } | { status: 'rate_limited' };

export type MagicLinkDeps = {
  limiter: RateLimiter;
  /** Faits en base + règle `decideSignInEligibility` : l'adresse peut-elle obtenir un lien ? */
  isEligible: (address: string) => Promise<boolean>;
  /** Crée le jeton `/c/{jeton}` et le code à 6 chiffres, puis envoie l'e-mail. Lève en cas d'échec. */
  deliver: (address: string, locale: string) => Promise<void>;
  /** Exécute le travail après la réponse (par exemple `after` de Next.js). */
  defer: (task: () => Promise<void>) => void;
  /** Journal d'exploitation : un échec d'envoi doit être visible, jamais silencieux. */
  reportError: (error: unknown) => void;
};

/**
 * Demande de lien de connexion. La réponse ne dépend pas de l'existence de
 * l'adresse : mêmes plafonds comptés pour toute adresse, même résultat, et
 * tout le travail variable (lecture en base, envoi) part après la réponse, donc
 * la durée ne trahit pas non plus l'éligibilité. Un échec d'envoi pour une
 * adresse éligible est remonté à `reportError` (jamais à la personne).
 */
export function requestMagicLink(
  deps: MagicLinkDeps,
  input: { email: string; locale: string; ip: string }
): MagicLinkOutcome {
  const address = canonicalAddress(input.email.trim());
  const limited = [
    deps.limiter.isLimited('magicLinkPerIp', magicLinkLimits.perIp, input.ip),
    deps.limiter.isLimited(
      'magicLinkPerAddress',
      magicLinkLimits.perAddress,
      address
    )
  ];
  if (limited.some(Boolean)) return { status: 'rate_limited' };

  deps.defer(async () => {
    try {
      if (await deps.isEligible(input.email.trim().toLowerCase())) {
        await deps.deliver(input.email.trim().toLowerCase(), input.locale);
      }
    } catch (error) {
      deps.reportError(error);
    }
  });
  return { status: 'sent' };
}
