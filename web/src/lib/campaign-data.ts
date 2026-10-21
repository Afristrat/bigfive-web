import { z } from 'zod';
import { orgRoles, type OrgRole } from '@/lib/access-rules';
import { isTengaAdmin, type Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';
import { campaignCreateSchema } from '@/schemas/campaigns';

// Chargeurs de la page d'une organisation (/o/[slug]). Lecture avec l'identité
// de la personne : les règles d'isolation de la base s'appliquent, ce qui est
// lu ici n'est jamais plus que ce qu'elle a le droit de voir. Tout slug ou
// uuid inséré dans une requête `select` passe d'abord par zod (`makeSelect`
// concatène la chaîne brute).

const orgSlug = campaignCreateSchema.shape.slug;
const uuid = z.string().uuid();

/** Identifiant d'URL d'organisation sous sa forme canonique, ou null s'il est hors format. */
export const parseOrgSlug = (value: unknown): string | null => {
  const parsed = orgSlug.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const organizationRows = z.array(
  z.object({
    id: uuid,
    nom: z.string(),
    slug: z.string(),
    statut: z.string()
  })
);
const roleRows = z.array(z.object({ role: z.enum(orgRoles) }));
const campaignRows = z.array(
  z.object({
    id: uuid,
    titre: z.string(),
    langue: z.enum(['fr', 'ar', 'en']),
    statut: z.enum(['brouillon', 'ouverte', 'close']),
    cree_le: z.string()
  })
);
const statsRows = z.array(
  z.object({
    statut_campagne: z.string(),
    participants: z.number().int(),
    en_cours: z.number().int(),
    termines: z.number().int(),
    invitations_en_attente: z.number().int()
  })
);

export type OrgPage = {
  org: { id: string; nom: string; slug: string; statut: string };
  isAdmin: boolean;
  role: OrgRole | null;
};

export type CampaignRow = z.infer<typeof campaignRows>[number];

export type CampaignStats = {
  participants: number;
  enCours: number;
  termines: number;
  enAttente: number;
};

/**
 * Organisation de la page, le rôle de la personne dans cette organisation et
 * son statut d'administrateur Tenga. `null` si l'organisation est absente ou
 * invisible pour elle. L'appartenance est lue AVEC le filtre sur
 * l'utilisateur : un administrateur lit toutes les lignes `memberships`, sans
 * ce filtre le premier rôle venu serait pris pour le sien. Lève si le slug est
 * hors format.
 */
export async function loadOrgPage(
  viewer: Viewer,
  slug: string
): Promise<OrgPage | null> {
  const wanted = orgSlug.parse(slug);
  const client = userClient(viewer.accessToken);
  const organizations = await client.select(
    'organizations',
    `slug=eq.${wanted}&select=id,nom,slug,statut`,
    organizationRows
  );
  const org = organizations[0];
  if (!org) return null;
  const memberships = await client.select(
    'memberships',
    `organization_id=eq.${org.id}&user_id=eq.${uuid.parse(viewer.id)}&select=role`,
    roleRows
  );
  return {
    org,
    isAdmin: await isTengaAdmin(viewer),
    role: memberships[0]?.role ?? null
  };
}

/** Campagnes de l'organisation, de la plus récente à la plus ancienne. */
export async function loadCampaigns(
  viewer: Viewer,
  organizationId: string
): Promise<CampaignRow[]> {
  return userClient(viewer.accessToken).select(
    'campaigns',
    `organization_id=eq.${uuid.parse(organizationId)}&select=id,titre,langue,statut,cree_le&order=cree_le.desc`,
    campaignRows
  );
}

/** Effectifs d'une campagne, sans identité (fonction SQL informer_responsable). */
export async function loadCampaignStats(
  viewer: Viewer,
  campaignId: string
): Promise<CampaignStats | null> {
  const rows = await userClient(viewer.accessToken).rpc(
    'informer_responsable',
    { p_campagne: uuid.parse(campaignId) },
    statsRows
  );
  const row = rows[0];
  return row
    ? {
        participants: row.participants,
        enCours: row.en_cours,
        termines: row.termines,
        enAttente: row.invitations_en_attente
      }
    : null;
}
