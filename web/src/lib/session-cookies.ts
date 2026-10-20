import { safeInternalPath } from '@/lib/safe-path';

// Le préfixe __Host- impose Secure, Path=/ et l'absence de Domain : le cookie ne
// peut ni être posé par un sous-domaine, ni voyager hors HTTPS.
export const ACCESS_COOKIE = '__Host-tenga_at';
export const REFRESH_COOKIE = '__Host-tenga_rt';
export const NEXT_COOKIE = '__Host-tenga_next';

/** Inactivité tolérée : le cookie de renouvellement est reposé à chaque renouvellement. */
export const SESSION_IDLE_SECONDS = 30 * 24 * 60 * 60;
const NEXT_SECONDS = 15 * 60;

export type CookieSpec = {
  name: string;
  value: string;
  options: {
    httpOnly: true;
    secure: true;
    sameSite: 'lax';
    path: '/';
    maxAge: number;
  };
};

const spec = (name: string, value: string, maxAge: number): CookieSpec => ({
  name,
  value,
  options: { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge }
});

export type GateSession = {
  accessToken: string;
  refreshToken: string;
  /** Durée de vie du jeton d'accès, en secondes (champ expires_in de GoTrue). */
  expiresIn: number;
};

/** Cookies d'une session ouverte ou renouvelée. */
export function sessionCookies(session: GateSession): CookieSpec[] {
  // Le cookie d'accès meurt un peu avant son jeton : jamais de jeton expiré envoyé.
  const accessAge = Math.max(60, Math.floor(session.expiresIn) - 30);
  return [
    spec(ACCESS_COOKIE, session.accessToken, accessAge),
    spec(REFRESH_COOKIE, session.refreshToken, SESSION_IDLE_SECONDS)
  ];
}

export const clearedSessionCookies = (): CookieSpec[] => [
  spec(ACCESS_COOKIE, '', 0),
  spec(REFRESH_COOKIE, '', 0)
];

/** Destination demandée avant la connexion, gardée le temps de lire l'e-mail. */
export function nextCookie(path: unknown): CookieSpec | null {
  const safe = safeInternalPath(path, '');
  // Seul un chemin privé ou une page utile est mémorisé : jamais la racine seule.
  return safe === '' || safe === '/'
    ? null
    : spec(NEXT_COOKIE, safe, NEXT_SECONDS);
}

export const clearedNextCookie = (): CookieSpec => spec(NEXT_COOKIE, '', 0);

/** Destination après connexion : le cookie relu avec le même contrôle. */
export const resolveNext = (cookieValue: unknown, fallback: string): string =>
  safeInternalPath(cookieValue, fallback);
