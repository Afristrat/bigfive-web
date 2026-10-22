import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Comptes dont le mot de passe est bloqué ou verrouillé (migration 0018).
const lockedRows = z.array(
  z.object({
    utilisateur: z.string().uuid(),
    nom: z.string().nullable(),
    email: z.string().nullable(),
    etat: z.enum(['temporaire', 'definitif']),
    jusqu: z.string().nullable()
  })
);

export type LockedAccount = z.infer<typeof lockedRows>[number];

/**
 * Comptes dont le mot de passe est bloqué ou verrouillé, que l'appelant peut
 * déverrouiller (administrateur Tenga, son propre compte excepté). null si la
 * liste ne peut pas être lue : la page /admin l'annonce et reste utilisable.
 */
export async function loadLockedAccounts(
  viewer: Viewer
): Promise<LockedAccount[] | null> {
  try {
    return await userClient(viewer.accessToken).rpc(
      'mdp_comptes_a_surveiller',
      {},
      lockedRows
    );
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'admin.locked_list_failed',
        status: error instanceof GatewayError ? error.status : 0
      })
    );
    return null;
  }
}
