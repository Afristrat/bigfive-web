import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

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

const tengaAdminRows = z.array(
  z.object({
    user_id: z.string().uuid(),
    adresse: z.string().email(),
    ajoute_le: z.string(),
    est_moi: z.boolean()
  })
);

export type TengaAdmin = {
  userId: string;
  adresse: string;
  ajouteLe: string;
  estMoi: boolean;
};

/**
 * Super administrateurs (fonction SQL app.lister_administrateurs_tenga, 0010).
 * Appel `rpc` en POST (la fonction est volatile : elle journalise la lecture)
 * AVEC LA SESSION de l'administrateur : la base refuse tout autre appelant, et
 * le service role n'intervient jamais. En cas d'échec, `null` : l'écran dit que
 * la liste est indisponible et le reste de la page continue de fonctionner.
 * Journal : code HTTP seul, jamais d'adresse.
 */
export async function loadTengaAdmins(
  viewer: Viewer
): Promise<TengaAdmin[] | null> {
  try {
    const rows = await userClient(viewer.accessToken).rpc(
      'lister_administrateurs_tenga',
      {},
      tengaAdminRows
    );
    return rows.map((row) => ({
      userId: row.user_id,
      adresse: row.adresse,
      ajouteLe: row.ajoute_le,
      estMoi: row.est_moi
    }));
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'admin.list_failed',
        status: error instanceof GatewayError ? error.status : 0
      })
    );
    return null;
  }
}

/**
 * Adresses à prévenir d'un ajout ou d'un retrait : les AUTRES super
 * administrateurs, c'est-à-dire ni l'acteur (il le sait) ni la personne
 * concernée (elle a son propre avis, ou n'a plus d'accès).
 */
export const notificationRecipients = (
  admins: readonly TengaAdmin[],
  targetId: string
): string[] =>
  admins
    .filter((admin) => !admin.estMoi && admin.userId !== targetId)
    .map((admin) => admin.adresse);

/** Journal d'audit (fonction SQL lire_journal, réservée aux administrateurs). */
export const loadJournal = (viewer: Viewer): Promise<JournalEntry[]> =>
  userClient(viewer.accessToken).rpc(
    'lire_journal',
    { p_limite: JOURNAL_LIMIT },
    journalRows
  );
