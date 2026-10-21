import { z } from 'zod';
import { isLoginToken } from '@/lib/login-format';
import { serviceClient } from '@/lib/supabase/server';

// Consultation d'une invitation avant acceptation (page /i/{jeton}). Elle ne
// consomme rien : seul `accepter_invitation` marque l'invitation acceptée.

const rows = z.array(
  z.object({
    email: z.string().min(1),
    prenom: z.string().nullable(),
    langue: z.string().min(1),
    message: z.string().nullable(),
    campagne_titre: z.string(),
    organisation_nom: z.string(),
    expire: z.string()
  })
);

export type InvitationView = z.infer<typeof rows>[number];

/**
 * Invitation encore valable (jeton connu, non expiré, non utilisé, campagne
 * ouverte), ou `null`. Une forme de jeton incorrecte est écartée AVANT toute
 * requête. Une panne de la base lève : l'appelant la distingue du « jeton
 * inconnu ». Le jeton et l'adresse ne sont jamais journalisés.
 */
export async function loadInvitation(
  token: unknown
): Promise<InvitationView | null> {
  if (!isLoginToken(token)) return null;
  const found = await serviceClient().rpc(
    'consulter_invitation',
    { p_jeton: token },
    rows
  );
  return found[0] ?? null;
}
