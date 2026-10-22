import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

const profileRows = z.array(
  z.object({ nom: z.string().nullable(), langue: z.enum(['fr', 'ar', 'en']) })
);
const membershipRows = z.array(
  z.object({
    organization_id: z.string().uuid(),
    role: z.enum(['responsable', 'consultant', 'participant'])
  })
);
const organizationRows = z.array(
  z.object({ id: z.string().uuid(), nom: z.string() })
);

export type Account = {
  nom: string | null;
  langue: 'fr' | 'ar' | 'en';
  roles: { organisation: string; role: string }[];
};

/** Profil et rôles de la personne connectée, lus avec SON identité (règles d'isolation). */
export async function loadAccount(viewer: Viewer): Promise<Account> {
  const client = userClient(viewer.accessToken);
  const [profiles, memberships, organizations] = await Promise.all([
    client.select(
      'profiles',
      `select=nom,langue&user_id=eq.${viewer.id}`,
      profileRows
    ),
    client.select(
      'memberships',
      `select=organization_id,role&user_id=eq.${viewer.id}`,
      membershipRows
    ),
    client.select('organizations', 'select=id,nom', organizationRows)
  ]);
  const names = new Map(organizations.map((o) => [o.id, o.nom]));
  return {
    nom: profiles[0]?.nom ?? null,
    langue: profiles[0]?.langue ?? 'fr',
    roles: memberships.flatMap((m) => {
      const organisation = names.get(m.organization_id);
      return organisation ? [{ organisation, role: m.role }] : [];
    })
  };
}

/** Un code TOTP est-il vérifié sur le compte de la personne connectée ? */
export async function hasVerifiedTotp(viewer: Viewer): Promise<boolean> {
  return (await userClient(viewer.accessToken).verifiedTotpFactor()) !== null;
}
