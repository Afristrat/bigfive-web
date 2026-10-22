import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { derivedServerKey } from '@/lib/supabase/server';

// Étape entre le mot de passe et le code TOTP (revue du 21/10, B1) : le jeton
// GoTrue de niveau 1 ne doit jamais atteindre le navigateur sous une forme
// utilisable, sinon il suffit de le recopier dans le cookie de session pour
// entrer avec le seul mot de passe. Le contenu est donc scellé (AES-256-GCM,
// clé dérivée de la clé de service) et daté : le navigateur ne garde qu'un
// paquet opaque, illisible et infalsifiable, valable 5 minutes.

export const PENDING_TTL_MS = 5 * 60 * 1000;
const PURPOSE = 'tenga-mfa-pending-v1';
const IV_BYTES = 12;
const TAG_BYTES = 16;
// Un jeton GoTrue tient en moins de 2 Ko : au-delà, la valeur est refusée sans calcul.
const MAX_SEALED_LENGTH = 4096;

export type PendingLogin = {
  factorId: string;
  accessToken: string;
};

const payloadSchema = z.object({
  f: z.string().uuid(),
  t: z.string().regex(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/),
  e: z.number().int().positive()
});

/** Scelle l'étape TOTP ; lève si la clé de service manque. */
export function sealPending(
  pending: PendingLogin,
  now: number = Date.now()
): string {
  const key = derivedServerKey(PURPOSE);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = JSON.stringify({
    f: pending.factorId,
    t: pending.accessToken,
    e: now + PENDING_TTL_MS
  });
  const sealed = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), sealed]).toString('base64url');
}

/** Rouvre l'étape TOTP ; null si absente, altérée, d'une autre clé ou expirée. */
export function openPending(
  value: unknown,
  now: number = Date.now()
): PendingLogin | null {
  if (
    typeof value !== 'string' ||
    value.length > MAX_SEALED_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return null;
  }
  const raw = Buffer.from(value, 'base64url');
  if (raw.length <= IV_BYTES + TAG_BYTES) return null;
  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      derivedServerKey(PURPOSE),
      raw.subarray(0, IV_BYTES)
    );
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES));
    const body = Buffer.concat([
      decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)),
      decipher.final()
    ]).toString('utf8');
    const parsed = payloadSchema.safeParse(JSON.parse(body));
    if (!parsed.success || parsed.data.e < now) return null;
    return {
      factorId: parsed.data.f,
      accessToken: parsed.data.t
    };
  } catch {
    // Étiquette d'authentification fausse, autre clé, contenu illisible.
    return null;
  }
}
