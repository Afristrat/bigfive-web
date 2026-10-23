import { z } from 'zod';
import { orgRoles } from '@/lib/access-rules';
import { parseOrgSlug } from '@/lib/campaign-data';
import {
  rolesAvecCampagnes,
  type AppartenanceRapports,
  type FaitsRapports
} from '@/lib/rapports-menu';
import { isTengaAdmin, type Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

// Faits du menu « Rapports », lus avec l'identité de la personne (règles
// d'isolation de la base) : rôle d'administrateur Tenga, appartenances et
// campagnes des organisations où elle est responsable ou consultant. Aucun
// résultat n'est lu ici. Les identifiants passent par zod avant d'entrer dans
// une requête (`select` concatène la chaîne brute) ou dans un lien.

const uuid = z.string().uuid();

const membershipRows = z.array(
  z.object({ organization_id: uuid, role: z.enum(orgRoles) })
);
const organizationRows = z.array(
  z.object({ id: uuid, nom: z.string(), slug: z.string() })
);
const campaignRows = z.array(
  z.object({
    id: uuid,
    titre: z.string(),
    statut: z.enum(['brouillon', 'ouverte', 'close']),
    organization_id: uuid
  })
);

export async function loadFaitsRapports(
  viewer: Viewer
): Promise<FaitsRapports> {
  const client = userClient(viewer.accessToken);
  const [admin, memberships] = await Promise.all([
    isTengaAdmin(viewer),
    client.select(
      'memberships',
      `select=organization_id,role&user_id=eq.${uuid.parse(viewer.id)}`,
      membershipRows
    )
  ]);
  if (memberships.length === 0) {
    return { admin, appartenances: [], campagnes: [] };
  }

  const ids = [...new Set(memberships.map((m) => m.organization_id))];
  const organizations = await client.select(
    'organizations',
    `select=id,nom,slug&id=in.(${ids.join(',')})`,
    organizationRows
  );
  const parId = new Map(organizations.map((o) => [o.id, o]));
  const appartenances: AppartenanceRapports[] = memberships.flatMap((m) => {
    const org = parId.get(m.organization_id);
    const slug = org ? parseOrgSlug(org.slug) : null;
    return org && slug
      ? [{ organisationId: org.id, nom: org.nom, slug, role: m.role }]
      : [];
  });

  const pilotees = appartenances
    .filter((a) => rolesAvecCampagnes.includes(a.role))
    .map((a) => a.organisationId);
  const campagnes =
    pilotees.length === 0
      ? []
      : await client.select(
          'campaigns',
          `select=id,titre,statut,organization_id&organization_id=in.(${pilotees.join(',')})&statut=neq.brouillon&order=cree_le.desc`,
          campaignRows
        );

  return {
    admin,
    appartenances,
    campagnes: campagnes.map((c) => ({
      id: c.id,
      titre: c.titre,
      statut: c.statut,
      organisationId: c.organization_id
    }))
  };
}
