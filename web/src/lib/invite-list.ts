import { z } from 'zod';
import {
  INVITE_ADDRESS_MAX,
  INVITE_BATCH_MAX,
  INVITEE_NAME_MAX,
  hasLinkOrInvisible
} from '@/lib/access-rules';

export type InviteeLine = { email: string; prenom: string | null };

export type InviteListResult =
  | { ok: true; invitees: InviteeLine[]; duplicates: number }
  | {
      ok: false;
      reason: 'empty' | 'too_many' | 'address';
      rejected: string[];
    };

// Même contrôle que la contrainte de la base, puis celui de zod (qui refuse
// par exemple les parties locales mal formées).
const DB_ADDRESS = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const CONTROL = /\p{Cc}/u;
const REJECTED_MAX = 10;
const emailCheck = z.string().email();

const isAddress = (value: string): boolean =>
  value.length <= INVITE_ADDRESS_MAX &&
  DB_ADDRESS.test(value) &&
  emailCheck.safeParse(value).success;

const isName = (value: string): boolean =>
  value.length <= INVITEE_NAME_MAX &&
  !CONTROL.test(value) &&
  !hasLinkOrInvisible(value);

/**
 * Lit la saisie d'un lot d'invitations : une personne par ligne, `adresse` ou
 * `adresse, Prénom` (séparateur `,` ou `;`). Le lot entier est refusé si une
 * ligne l'est (aucun envoi partiel sur une saisie douteuse). Le plafond porte
 * sur les lignes saisies, doublons compris.
 */
export function parseInviteList(
  raw: string,
  max: number = INVITE_BATCH_MAX
): InviteListResult {
  const lines = raw
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  if (lines.length === 0) return { ok: false, reason: 'empty', rejected: [] };
  if (lines.length > max) {
    return { ok: false, reason: 'too_many', rejected: [] };
  }

  const invitees = new Map<string, InviteeLine>();
  const rejected: string[] = [];
  let duplicates = 0;
  for (const line of lines) {
    const cut = line.search(/[,;]/);
    const email = (cut === -1 ? line : line.slice(0, cut)).trim().toLowerCase();
    const name = cut === -1 ? '' : line.slice(cut + 1).trim();
    if (!isAddress(email) || !isName(name)) {
      rejected.push(line.slice(0, INVITE_ADDRESS_MAX + INVITEE_NAME_MAX + 2));
      continue;
    }
    if (invitees.has(email)) {
      duplicates += 1;
      continue;
    }
    invitees.set(email, { email, prenom: name === '' ? null : name });
  }
  if (rejected.length > 0) {
    return {
      ok: false,
      reason: 'address',
      rejected: rejected.slice(0, REJECTED_MAX)
    };
  }
  return { ok: true, invitees: [...invitees.values()], duplicates };
}
