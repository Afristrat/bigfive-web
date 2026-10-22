import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

// Lot mot de passe (migration 0018, non publiable) : fichier propre au lot.
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

/** Comptes dont le mot de passe est bloqué ou verrouillé (périmètre de l'appelant). */
export async function loadLockedAccounts(
  viewer: Viewer
): Promise<LockedAccount[]> {
  return userClient(viewer.accessToken).rpc(
    'mdp_comptes_a_surveiller',
    {},
    lockedRows
  );
}
