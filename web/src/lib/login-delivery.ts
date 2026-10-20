import { isLoginCode, isLoginToken } from '@/lib/login-format';
import { buildLoginMail, loginUrl, toMailLocale } from '@/lib/login-mail';

/** Ligne renvoyée par la fonction SQL demander_lien_connexion. */
export type IssuedLink = {
  envoyer: boolean;
  jeton: string | null;
  code: string | null;
  langue: string | null;
};

export type DeliveryDeps = {
  /** Appelle la base (clé de service) ; la base décide seule de l'éligibilité. */
  issue: (address: string) => Promise<IssuedLink | null>;
  send: (mail: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }) => Promise<boolean>;
  siteUrl: string;
};

/** Échec d'envoi : visible dans le journal d'exploitation, jamais pour la personne. */
export class LoginMailError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'LoginMailError';
  }
}

/**
 * Demande le lien à la base puis envoie l'e-mail si la base le demande. La
 * langue du message est celle du profil, à défaut celle de la page.
 */
export async function deliverLoginLink(
  deps: DeliveryDeps,
  address: string,
  requestedLocale: string
): Promise<void> {
  const issued = await deps.issue(address);
  if (!issued || !issued.envoyer) return;
  if (!isLoginToken(issued.jeton) || !isLoginCode(issued.code)) {
    throw new LoginMailError('réponse de la base inattendue');
  }
  const locale = toMailLocale(issued.langue, toMailLocale(requestedLocale));
  const mail = buildLoginMail({
    locale,
    url: loginUrl(deps.siteUrl, locale, issued.jeton),
    code: issued.code
  });
  if (!(await deps.send({ to: address, ...mail }))) {
    throw new LoginMailError('envoi refusé par le fournisseur');
  }
}
