'use server';

import { after } from 'next/server';
import { connectToDatabase } from '@/db';
import { holdUntil } from '@/lib/min-duration';
import { sendMail } from '@/lib/mailer';
import { readFields, type FieldErrors } from '@/lib/presentation-fields';
import {
  MIN_RESPONSE_MS,
  PRESENTATION_COLLECTION,
  RETENTION_SECONDS,
  processPresentation,
  type PresentationEvent,
  type PresentationRecord
} from '@/lib/presentation-request';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { ipTag } from '@/lib/security-log';

export type PresentationFormValues = Partial<
  Record<
    | 'name'
    | 'organisation'
    | 'role'
    | 'email'
    | 'size'
    | 'objective'
    | 'exchangeLocale'
    | 'message',
    string
  >
>;

export type PresentationState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'invalid'; fields: FieldErrors; values: PresentationFormValues }
  | { status: 'retry'; values: PresentationFormValues }
  | { status: 'failed'; values: PresentationFormValues };

// Index TTL créé à la première demande (idempotent). Un échec n'est pas mis en
// cache : la demande suivante réessaie, et l'échec est journalisé.
let indexReady: Promise<void> | undefined;

async function ensureRetentionIndex(): Promise<void> {
  indexReady ??= connectToDatabase()
    .then((db) =>
      db
        .collection(PRESENTATION_COLLECTION)
        .createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: RETENTION_SECONDS }
        )
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      indexReady = undefined;
      console.error(
        JSON.stringify({
          event: 'presentation.index_failed',
          reason: error instanceof Error ? error.name : 'unknown'
        })
      );
    });
  await indexReady;
}

async function save(record: PresentationRecord): Promise<void> {
  await ensureRetentionIndex();
  const db = await connectToDatabase();
  await db.collection(PRESENTATION_COLLECTION).insertOne({ ...record });
}

// Journal d'exploitation : le type d'événement et, au plus, une étiquette
// d'IP non réversible ; jamais d'adresse, de nom ni de contenu.
const report = (ip: string) => (event: PresentationEvent) =>
  console.warn(JSON.stringify({ ...event, ip: ipTag(ip) }));

const valuesOf = (formData: FormData): PresentationFormValues => {
  const text = (name: string): string | undefined => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.slice(0, 2000) : undefined;
  };
  return {
    name: text('name'),
    organisation: text('organisation'),
    role: text('role'),
    email: text('email'),
    size: text('size'),
    objective: text('objective'),
    exchangeLocale: text('exchangeLocale'),
    message: text('message')
  };
};

/**
 * Demande de présentation. La base fait foi : la demande est enregistrée avant
 * tout envoi, et les e-mails partent après la réponse (`after`). Plafond atteint
 * et piège à robots déclenché reçoivent la même réponse de succès ; la réponse
 * est rendue après une durée minimale fixe, que l'envoi réussisse ou non.
 */
export async function requestPresentation(
  _previous: PresentationState,
  formData: FormData
): Promise<PresentationState> {
  const startedAt = Date.now();
  const ip = await getClientIp();
  const pageLocale = formData.get('locale');

  const outcome = await processPresentation(
    {
      limiter: sharedLimiter,
      save,
      send: sendMail,
      defer: (task) => after(task),
      report: report(ip),
      env: process.env
    },
    {
      raw: readFields(formData),
      website: formData.get('website'),
      elapsedMs: formData.get('elapsed'),
      pageLocale: typeof pageLocale === 'string' ? pageLocale : 'en',
      ip
    }
  );

  let state: PresentationState;
  switch (outcome.status) {
    case 'success':
      state = { status: 'success' };
      break;
    case 'invalid':
      state = {
        status: 'invalid',
        fields: outcome.fields,
        values: valuesOf(formData)
      };
      break;
    case 'too_fast':
      state = { status: 'retry', values: valuesOf(formData) };
      break;
    case 'failed':
      state = { status: 'failed', values: valuesOf(formData) };
      break;
  }
  await holdUntil(startedAt, MIN_RESPONSE_MS);
  return state;
}
