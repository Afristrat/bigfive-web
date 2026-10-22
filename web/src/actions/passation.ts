'use server';

import { getItems } from '@bigfive-org/questions';
import { z } from 'zod';
import { CALCUL_VERSION, calculerScores, type ScoresTenga } from '@/lib/moteur';
import { loadTentative } from '@/lib/passation-data';
import { QUESTIONNAIRE_VERSION } from '@/lib/question-overrides';
import { isRateLimited, limits } from '@/lib/rate-limit';
import { currentViewer, type Viewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import { GatewayError, userClient } from '@/lib/supabase/server';
import { testSchema } from '@/schemas';
import type { Answer, DbResult } from '@/types';

export type SubmitOutcome =
  | { status: 'ok'; href: string }
  | { status: 'closed' | 'already' | 'invalid' | 'forbidden' | 'failed' };

const participationSchema = z.string().uuid();

// 23505 : participation déjà terminée. sqlOutcome ne le distingue pas des
// autres erreurs, il est lu ici sur le code de la passerelle.
const ALREADY = '23505';

/**
 * Soumet le questionnaire d'UNE participation de la personne connectée.
 * Domaine et facette ne sont jamais pris au client : le moteur les relit dans
 * le questionnaire. Le résultat ne contient ni adresse ni jeton.
 */
export async function submitParticipation(
  participationId: string,
  result: DbResult
): Promise<SubmitOutcome> {
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'forbidden' };
  const { viewer } = state;

  const id = participationSchema.safeParse(participationId);
  const parsed = testSchema.safeParse(result);
  if (!id.success || !parsed.success) return { status: 'invalid' };

  if (await isRateLimited('saveTest', limits.saveTest, viewer.id)) {
    return { status: 'failed' };
  }

  const reponses = Object.fromEntries(
    parsed.data.answers.map((answer) => [answer.id, answer.score])
  );
  let scores: ScoresTenga;
  try {
    scores = calculerScores(reponses, parsed.data.timeElapsed);
  } catch {
    return { status: 'invalid' };
  }

  try {
    await userClient(viewer.accessToken).rpc(
      'soumettre_resultat',
      {
        p_participation: id.data,
        p_reponses: reponses,
        p_scores: scores,
        p_questionnaire_version: QUESTIONNAIRE_VERSION,
        p_calcul_version: CALCUL_VERSION
      },
      z.string().uuid()
    );
  } catch (error) {
    if (error instanceof GatewayError && error.code === ALREADY) {
      return { status: 'already' };
    }
    switch (sqlOutcome(error)) {
      case 'conflict':
        return { status: 'closed' };
      case 'invalid':
        return { status: 'invalid' };
      case 'forbidden':
      case 'notfound':
        return { status: 'forbidden' };
      default:
        return { status: 'failed' };
    }
  }
  return { status: 'ok', href: `/mes-resultats/${id.data}` };
}

export type ProgressOutcome =
  | { status: 'ok'; revision: number }
  | {
      status: 'conflict';
      revision: number;
      reponses: Record<string, number>;
    }
  | { status: 'closed' | 'invalid' | 'failed' };

const CONFLICT = '40001';
const HOUR_MS = 60 * 60 * 1000;
// Une sauvegarde par changement d'écran : 120 écrans, retours en arrière
// compris. Le plafond saveTest (60 par heure) bloquerait un parcours normal.
const PROGRESS_LIMIT = { max: 600, windowMs: HOUR_MS } as const;
const QUESTION_IDS = new Set(getItems('en').map((item) => item.id));

const progressSchema = z
  .array(
    z.object({
      id: z.string().refine((id) => QUESTION_IDS.has(id)),
      score: z.number().int().min(1).max(5)
    })
  )
  .min(1)
  .max(QUESTION_IDS.size)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length
  );

/**
 * Enregistre la progression d'UNE participation de la personne connectée
 * (app.enregistrer_progression). `revision` est la révision attendue : 0 tant
 * qu'aucune sauvegarde n'existe. Sur un conflit de révision (40001), la
 * passerelle ne transmet pas le détail de l'erreur : la révision actuelle et
 * les réponses sont relues dans la tentative de la personne.
 */
export async function saveProgress(
  participationId: string,
  revision: number,
  answers: readonly Answer[]
): Promise<ProgressOutcome> {
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'failed' };
  const { viewer } = state;

  const id = participationSchema.safeParse(participationId);
  const rev = z.number().int().min(0).safeParse(revision);
  const parsed = progressSchema.safeParse(answers);
  if (!id.success || !rev.success || !parsed.success) {
    return { status: 'invalid' };
  }

  if (await isRateLimited('saveProgress', PROGRESS_LIMIT, viewer.id)) {
    return { status: 'failed' };
  }

  try {
    const nouvelle = await userClient(viewer.accessToken).rpc(
      'enregistrer_progression',
      {
        p_participation: id.data,
        p_revision: rev.data,
        p_reponses: Object.fromEntries(
          parsed.data.map((item) => [item.id, item.score])
        ),
        p_questionnaire_version: QUESTIONNAIRE_VERSION
      },
      z.number().int().min(1)
    );
    return { status: 'ok', revision: nouvelle };
  } catch (error) {
    if (error instanceof GatewayError && error.code === CONFLICT) {
      return lireConflit(viewer, id.data);
    }
    // 23505 : participation déjà soumise, plus rien à sauvegarder.
    if (error instanceof GatewayError && error.code === ALREADY) {
      return { status: 'closed' };
    }
    switch (sqlOutcome(error)) {
      case 'conflict':
        return { status: 'closed' };
      case 'invalid':
        return { status: 'invalid' };
      default:
        return { status: 'failed' };
    }
  }
}

async function lireConflit(
  viewer: Viewer,
  participationId: string
): Promise<ProgressOutcome> {
  try {
    const tentative = await loadTentative(viewer, participationId);
    return {
      status: 'conflict',
      revision: tentative?.revision ?? 0,
      reponses: tentative?.reponses ?? {}
    };
  } catch {
    return { status: 'failed' };
  }
}
