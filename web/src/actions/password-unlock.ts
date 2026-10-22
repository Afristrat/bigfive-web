'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { localeOf } from '@/lib/locale-field';
import { localizedPath } from '@/lib/safe-path';
import { requireAdmin } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Déverrouillage du mot de passe d'un compte depuis /admin (migration 0018).
export type UnlockState = { status: 'idle' | 'unlocked' | 'error' };

/**
 * Lève le verrouillage du mot de passe d'un compte (fonction SQL
 * deverrouiller_mot_de_passe, journalisée). Refus unique côté base : jamais
 * soi-même, jamais hors périmètre.
 */
export async function unlockPassword(
  _previous: UnlockState,
  formData: FormData
): Promise<UnlockState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/admin');
  const userId = z.string().uuid().safeParse(formData.get('userId'));
  if (!userId.success) return { status: 'error' };
  try {
    await userClient(viewer.accessToken).rpc(
      'deverrouiller_mot_de_passe',
      { p_utilisateur: userId.data },
      z.unknown()
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'admin.unlock_failed',
        status: error instanceof GatewayError ? error.status : 0
      })
    );
    return { status: 'error' };
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: 'unlocked' };
}
