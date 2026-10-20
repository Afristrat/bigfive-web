// Garde au démarrage (plan § 7) : le serveur refuse de démarrer dans une
// configuration dangereuse. Fonctions pures : l'environnement est injecté.

export type EnvLike = Readonly<Record<string, string | undefined>>;

export const APP_ENVS = ['production', 'preproduction'] as const;

/** Le réceptacle de test est actif (valeur exacte « true »). */
export const isMailSinkActive = (env: EnvLike): boolean =>
  env.MAIL_SINK === 'true';

/** Il n'est permis qu'en préproduction déclarée. */
export const isMailSinkAllowed = (env: EnvLike): boolean =>
  isMailSinkActive(env) && env.APP_ENV === 'preproduction';

const MIN_SINK_TOKEN_LENGTH = 32;

/**
 * Liste les problèmes de configuration (vide si tout va bien). `extra` reçoit
 * les problèmes propres à d'autres modules (le module Supabase vérifie lui-même
 * ses variables). Aucune valeur de variable n'apparaît dans les messages.
 */
export function startupProblems(
  env: EnvLike,
  extra: readonly string[] = []
): string[] {
  const problems: string[] = [];
  const sink = isMailSinkActive(env);

  if (
    env.MAIL_SINK !== undefined &&
    !['', 'true', 'false'].includes(env.MAIL_SINK)
  ) {
    problems.push('MAIL_SINK doit valoir « true » ou « false ».');
  }
  if (sink && env.APP_ENV !== 'preproduction') {
    problems.push(
      'MAIL_SINK est actif hors préproduction : démarrage refusé (les e-mails ne partiraient pas).'
    );
  }
  if (sink && (env.MAIL_SINK_TOKEN ?? '').length < MIN_SINK_TOKEN_LENGTH) {
    problems.push(
      `MAIL_SINK_TOKEN doit compter au moins ${MIN_SINK_TOKEN_LENGTH} caractères quand MAIL_SINK est actif.`
    );
  }

  if (env.NODE_ENV === 'production') {
    if (!APP_ENVS.some((value) => value === env.APP_ENV)) {
      problems.push('APP_ENV doit valoir « production » ou « preproduction ».');
    }
    if (!sink && !env.RESEND_API_KEY) {
      problems.push('RESEND_API_KEY est absente (hors réceptacle de test).');
    }
    if (!env.SITE_URL || !/^https:\/\/[^\s/]+/.test(env.SITE_URL)) {
      problems.push('SITE_URL doit être une adresse https.');
    }
  }
  return [...problems, ...extra];
}

/** Lève si la configuration est dangereuse ; appelée par instrumentation.ts. */
export function assertStartup(
  env: EnvLike,
  extra: readonly string[] = []
): void {
  const problems = startupProblems(env, extra);
  if (problems.length > 0) {
    throw new Error(
      `Configuration refusée au démarrage :\n- ${problems.join('\n- ')}`
    );
  }
}
