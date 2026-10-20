import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

const organizationRows = z.array(
  z.object({
    id: z.string().uuid(),
    slug: z.string(),
    nom: z.string(),
    statut: z.string(),
    cree_le: z.string()
  })
);
const membershipRows = z.array(
  z.object({
    organization_id: z.string().uuid(),
    role: z.enum(['responsable', 'consultant', 'participant'])
  })
);
const journalRows = z.array(
  z.object({
    id: z.number(),
    cree_le: z.string(),
    acteur: z.string().uuid().nullable(),
    action: z.string(),
    ressource_type: z.string().nullable(),
    ressource_id: z.string().uuid().nullable(),
    organization_id: z.string().uuid().nullable(),
    quantite: z.number().nullable()
  })
);

export type AdminOrganization = {
  id: string;
  slug: string;
  nom: string;
  statut: string;
  creeLe: string;
  responsables: number;
  consultants: number;
  participants: number;
};

export type JournalEntry = z.infer<typeof journalRows>[number];

const JOURNAL_LIMIT = 100;

/** Organisations avec le décompte des rôles, lues avec l'identité de l'administrateur. */
export async function loadOrganizations(
  viewer: Viewer
): Promise<AdminOrganization[]> {
  const client = userClient(viewer.accessToken);
  const [organizations, memberships] = await Promise.all([
    client.select(
      'organizations',
      'select=id,slug,nom,statut,cree_le&order=cree_le.desc',
      organizationRows
    ),
    client.select('memberships', 'select=organization_id,role', membershipRows)
  ]);
  return organizations.map((o) => {
    const mine = memberships.filter((m) => m.organization_id === o.id);
    const count = (role: string): number =>
      mine.filter((m) => m.role === role).length;
    return {
      id: o.id,
      slug: o.slug,
      nom: o.nom,
      statut: o.statut,
      creeLe: o.cree_le,
      responsables: count('responsable'),
      consultants: count('consultant'),
      participants: count('participant')
    };
  });
}

/** Journal d'audit (fonction SQL lire_journal, réservée aux administrateurs). */
export const loadJournal = (viewer: Viewer): Promise<JournalEntry[]> =>
  userClient(viewer.accessToken).rpc(
    'lire_journal',
    { p_limite: JOURNAL_LIMIT },
    journalRows
  );
