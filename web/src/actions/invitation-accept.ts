'use server';

import { z } from 'zod';
import { invitationLimits } from '@/lib/invitation-limits';
import { loadInvitation } from '@/lib/invitation-data';
import { localeOf } from '@/lib/locale-field';
import { isLoginToken } from '@/lib/login-format';
import { getClientIp, sharedLimiter } from '@/lib/rate-limit';
import { logSecurityEvent } from '@/lib/security-log';
import { currentViewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import { reasonOf } from '@/lib/start-session';
import { serviceClient } from '@/lib/supabase/server';
import { discardCreatedAccount, findOrCreateUser } from '@/lib/user-accounts';

// Statuts seulement : la page future choisit les textes. `unavailable` regroupe
// les conflits (55000, 22023) sous un message neutre qui ne révèle ni le rôle
// ni la raison ; `invalid` regroupe jeton mal formé, inconnu, expiré, utilisé.
export type AcceptState = {
  status:
    | 'idle'
    | 'invalid'
    | 'unavailable'
    | 'other_session'
    | 'signin_required'
    | 'failed';
};

/**
 * Clic sur le bouton de /i/{jeton} : seul moment où l'invitation est consommée.
 * Ordre imposé (risque 10) : consultation, compte, puis décision de la base. Ne
 * redirige jamais et n'ouvre aucune session.
 */
export async function acceptInvitation(
  _previous: AcceptState,
  formData: FormData
): Promise<AcceptState> {
  // Un jeton mal formé est refusé AVANT le limiteur : il ne consomme aucun quota.
  const token = formData.get('token');
  if (!isLoginToken(token)) return { status: 'invalid' };

  const ip = await getClientIp();

  // Plafond par IP : la base ne voit pas l'IP. Réponse neutre, visible au journal.
  if (
    sharedLimiter.isLimited(
      'invitationAcceptPerIp',
      invitationLimits.acceptPerIp,
      ip
    )
  ) {
    logSecurityEvent('invitation.accept_rate_limited', { ip, scope: 'ip' });
    return { status: 'failed' };
  }

  let account: { id: string; created: boolean };
  try {
    const invitation = await loadInvitation(token);
    if (!invitation) return { status: 'invalid' };

    // Une session ouverte pour une AUTRE adresse n'est jamais écrasée (risque 7).
    const state = await currentViewer();
    if (
      state.status === 'ok' &&
      state.viewer.email.trim().toLowerCase() !==
        invitation.email.trim().toLowerCase()
    ) {
      return { status: 'other_session' };
    }

    account = await findOrCreateUser(
      serviceClient(),
      invitation.email,
      localeOf(invitation.langue)
    );
  } catch (error) {
    logSecurityEvent('invitation.accept_failed', {
      ip,
      reason: reasonOf(error)
    });
    return { status: 'failed' };
  }

  try {
    await serviceClient().rpc(
      'accepter_invitation',
      { p_jeton: token, p_utilisateur: account.id },
      z.string().uuid()
    );
  } catch (error) {
    const outcome = sqlOutcome(error);
    logSecurityEvent('invitation.accept_failed', {
      ip,
      reason: `${outcome}:${reasonOf(error)}`
    });
    if (outcome === 'notfound') return { status: 'invalid' };
    if (outcome === 'conflict' || outcome === 'invalid') {
      // Refus définitif de la base : le compte né de CET appel resterait sans
      // rôle. Jamais sur notfound (double clic : l'autre appel a lié ce compte)
      // ni sur une panne (l'acceptation a pu aboutir côté base).
      if (account.created) {
        await discardCreatedAccount(serviceClient(), account.id);
      }
      return { status: 'unavailable' };
    }
    return { status: 'failed' };
  }

  // Constats I1 et I-M2 : le jeton (14 jours) ne prouve pas la propriété de
  // l'adresse, qu'il y ait un compte préexistant ou non. Aucune session n'est
  // jamais ouverte ici : un lien transféré ou capturé ne doit pas permettre de
  // se connecter à la place de la personne invitée. L'invitation est acceptée ;
  // la personne ouvre son espace par un lien envoyé à son adresse.
  return { status: 'signin_required' };
}
