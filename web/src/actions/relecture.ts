'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { empreinteBloc, rafraichirEtatRelecture } from '@/lib/bibliotheque';
import { localeOf } from '@/lib/locale-field';
import { isRateLimited } from '@/lib/rate-limit';
import { localizedPath } from '@/lib/safe-path';
import { currentViewer, requireAdmin } from '@/lib/session';
import type { Limit } from '@/lib/sliding-window';
import { sqlOutcome } from '@/lib/sql-errors';
import { GatewayError, serviceClient, userClient } from '@/lib/supabase/server';
import {
  discardCreatedAccount,
  findOrCreateUser,
  isDefiniteRefusal
} from '@/lib/user-accounts';

// Actions de l'atelier de relecture (migration 0022). Le verdict passe par la
// SESSION de la personne : la base décide qui est relecteur. La gestion des
// relecteurs désignés est réservée aux super administrateurs (vérifié ici,
// puis par la base). Journal d'exploitation : code HTTP seul, jamais
// d'adresse, de bloc ni de texte.

const CHEMIN = '/admin/relecture';
const HOUR_MS = 60 * 60 * 1000;
// Par personne et par heure : 150 blocs, quelques allers-retours chacun.
// Défaut non validé par Amine.
const verdictLimit: Limit = { max: 600, windowMs: HOUR_MS };
const relecteurLimit: Limit = { max: 20, windowMs: HOUR_MS };

export type RelectureState =
  | { status: 'idle' | 'relu' | 'a_corriger' | 'perime' | 'interdit' }
  | { status: 'erreur' }
  | { status: 'invalide'; champ?: 'commentaire' };

export type RelecteurState = {
  status: 'idle' | 'ajoute' | 'deja' | 'inconnu' | 'invalide' | 'erreur';
};

export type RetraitRelecteurState = {
  status: 'idle' | 'retire' | 'absent' | 'invalide' | 'interdit' | 'erreur';
};

const avertir = (action: string, error: unknown): void => {
  console.warn(
    JSON.stringify({
      event: 'relecture.action_failed',
      action,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
};

const plafondAtteint = (action: string): void => {
  console.warn(JSON.stringify({ event: 'relecture.rate_limited', action }));
};

const verdictSchema = z.object({
  bloc: z
    .string()
    .regex(/^[NEOAC][1-6]\/(bas|plutot_bas|milieu|plutot_haut|haut)$/),
  empreinte: z.string().regex(/^[0-9a-f]{64}$/),
  verdict: z.enum(['relu', 'a_corriger'])
});
const commentaireSchema = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(2000));

/**
 * Verdict sur un bloc (fonction SQL relire_bloc). Refusé sans appel si le
 * texte a changé depuis l'affichage (empreinte différente de celle servie) :
 * un verdict ne vaut que pour le texte relu. Après un verdict, l'état servi
 * aux personnes est relu aussitôt dans ce processus.
 */
export async function relireBloc(
  _previous: RelectureState,
  formData: FormData
): Promise<RelectureState> {
  const locale = localeOf(formData.get('locale'));
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'interdit' };

  const parsed = verdictSchema.safeParse({
    bloc: formData.get('bloc'),
    empreinte: formData.get('empreinte'),
    verdict: formData.get('verdict')
  });
  if (!parsed.success) return { status: 'invalide' };
  const commentaire = commentaireSchema.safeParse(
    formData.get('commentaire') ?? ''
  );
  if (!commentaire.success) return { status: 'invalide', champ: 'commentaire' };
  const texte = commentaire.data === '' ? null : commentaire.data;
  if (parsed.data.verdict === 'a_corriger' && texte === null) {
    return { status: 'invalide', champ: 'commentaire' };
  }
  if (empreinteBloc(parsed.data.bloc) !== parsed.data.empreinte) {
    return { status: 'perime' };
  }
  if (await isRateLimited('relireBloc', verdictLimit, state.viewer.id)) {
    plafondAtteint('relire');
    return { status: 'erreur' };
  }

  try {
    await userClient(state.viewer.accessToken).rpc(
      'relire_bloc',
      {
        p_bloc: parsed.data.bloc,
        p_empreinte: parsed.data.empreinte,
        p_verdict: parsed.data.verdict,
        p_commentaire: texte
      },
      z.string().uuid()
    );
  } catch (error) {
    switch (sqlOutcome(error)) {
      case 'forbidden':
        return { status: 'interdit' };
      case 'invalid':
        return { status: 'invalide' };
      default:
        avertir('relire', error);
        return { status: 'erreur' };
    }
  }
  await rafraichirEtatRelecture();
  revalidatePath(localizedPath(locale, CHEMIN));
  return { status: parsed.data.verdict };
}

const designationSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200)
});

/**
 * Désigne un relecteur (fonction SQL designer_relecteur). Le compte est
 * retrouvé par adresse ou créé (langue : celle de la page) ; s'il a été créé
 * par cet appel et que la base refuse, il est retiré.
 */
export async function designerRelecteur(
  _previous: RelecteurState,
  formData: FormData
): Promise<RelecteurState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, CHEMIN);
  const parsed = designationSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { status: 'invalide' };
  if (await isRateLimited('designerRelecteur', relecteurLimit, viewer.id)) {
    plafondAtteint('designer');
    return { status: 'erreur' };
  }
  const service = serviceClient();
  let createdId: string | null = null;
  let ajoute: boolean;
  try {
    const account = await findOrCreateUser(
      service,
      parsed.data.email,
      ['fr', 'ar', 'en'].includes(locale) ? locale : 'fr'
    );
    if (account.created) createdId = account.id;
    ajoute = await userClient(viewer.accessToken).rpc(
      'designer_relecteur',
      { p_utilisateur: account.id },
      z.boolean()
    );
  } catch (error) {
    if (createdId !== null && isDefiniteRefusal(error)) {
      await discardCreatedAccount(service, createdId);
    }
    if (sqlOutcome(error) === 'invalid') return { status: 'inconnu' };
    avertir('designer', error);
    return { status: 'erreur' };
  }
  revalidatePath(localizedPath(locale, CHEMIN));
  return { status: ajoute ? 'ajoute' : 'deja' };
}

const retraitSchema = z.object({
  userId: z.string().uuid(),
  confirmer: z.literal('oui')
});

/** Retire un relecteur désigné (fonction SQL retirer_relecteur), après confirmation. */
export async function retirerRelecteur(
  _previous: RetraitRelecteurState,
  formData: FormData
): Promise<RetraitRelecteurState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, CHEMIN);
  const parsed = retraitSchema.safeParse({
    userId: formData.get('userId'),
    confirmer: formData.get('confirmer')
  });
  if (!parsed.success) return { status: 'invalide' };
  let retire: boolean;
  try {
    retire = await userClient(viewer.accessToken).rpc(
      'retirer_relecteur',
      { p_utilisateur: parsed.data.userId },
      z.boolean()
    );
  } catch (error) {
    if (sqlOutcome(error) === 'forbidden') return { status: 'interdit' };
    avertir('retirer', error);
    return { status: 'erreur' };
  }
  revalidatePath(localizedPath(locale, CHEMIN));
  return { status: retire ? 'retire' : 'absent' };
}
