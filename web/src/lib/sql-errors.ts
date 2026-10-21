import { GatewayError } from '@/lib/supabase/server';

export type SqlOutcome =
  | 'forbidden'
  | 'conflict'
  | 'invalid'
  | 'notfound'
  | 'error';

/**
 * Classe une erreur de la passerelle d'après son code SQLSTATE : 42501 (droit
 * refusé), 55000 (état incompatible), 22023 et 23514 (valeur refusée), P0002
 * (introuvable). Tout le reste, y compris une erreur réseau, est `error`.
 */
export function sqlOutcome(error: unknown): SqlOutcome {
  if (!(error instanceof GatewayError)) return 'error';
  switch (error.code) {
    case '42501':
      return 'forbidden';
    case '55000':
      return 'conflict';
    case '22023':
    case '23514':
      return 'invalid';
    case 'P0002':
      return 'notfound';
    default:
      return 'error';
  }
}
