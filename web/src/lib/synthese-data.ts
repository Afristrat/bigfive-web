import { z } from 'zod';
import type { OrgRole } from '@/lib/access-rules';
import { DOMAINES, type DomainCode } from '@/lib/moteur/types';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

// Chargeur de la synthèse de groupe. Il lit TROIS tables et aucune autre :
// `campaigns` (titre et statut), `groups` (nom et ordre) et `group_aggregates`
// (photographie posée à la clôture). Les règles de lecture et le seuil
// d'anonymat sont ceux de la base : ici, rien n'est recalculé ni filtré par un
// seuil. Une ligne absente veut dire « non publié », jamais « zéro ».
// Les domaines sont les seuls niveaux de détail que la base conserve.

const uuid = z.string().uuid();

/** Identifiant de campagne d'URL sous sa forme canonique, ou null s'il est hors format. */
export const parseCampaignId = (value: unknown): string | null => {
  const parsed = uuid.safeParse(value);
  return parsed.success ? parsed.data : null;
};

/**
 * Qui lit la synthèse : le responsable, le consultant de l'organisation et
 * l'administrateur Tenga (miroir de la règle de lecture de la base, qui reste
 * l'autorité). Un participant n'a rien à y voir.
 */
export const peutLireSynthese = (viewer: {
  isAdmin: boolean;
  role: OrgRole | null;
}): boolean =>
  viewer.isAdmin ||
  viewer.role === 'responsable' ||
  viewer.role === 'consultant';

// PostgREST renvoie `numeric` en nombre JSON ; une chaîne décimale est tolérée.
const nombre = z.union([
  z.number(),
  z
    .string()
    .regex(/^-?\d+(\.\d+)?$/)
    .transform(Number)
]);

const campaignRows = z.array(
  z.object({
    id: uuid,
    titre: z.string(),
    statut: z.enum(['brouillon', 'ouverte', 'close'])
  })
);
const groupRows = z.array(
  z.object({ id: uuid, nom: z.string(), ordre: z.number().int() })
);
const aggregateRows = z.array(
  z.object({
    group_id: uuid,
    portee: z.enum(['groupe', 'complement']),
    domaine: z.enum(['O', 'C', 'E', 'A', 'N']),
    effectif: z.number().int(),
    moyenne: nombre.nullable(),
    ecart_type: nombre.nullable()
  })
);

export type LigneDomaine = {
  domaine: DomainCode;
  effectif: number;
  moyenne: number | null;
  ecartType: number | null;
};

export type GroupeSynthese = {
  id: string;
  nom: string;
  /** Vrai si la base a publié au moins une ligne `groupe` : sinon, aucun effectif n'est connu. */
  publie: boolean;
  groupe: LigneDomaine[];
  complement: LigneDomaine[];
};

export type CampagneSynthese = { id: string; titre: string };

export type Synthese =
  | { etat: 'non_close'; campagne: CampagneSynthese }
  | { etat: 'prete'; campagne: CampagneSynthese; groupes: GroupeSynthese[] };

const ordreDomaine = (code: DomainCode): number => DOMAINES.indexOf(code);

/**
 * Synthèse d'une campagne de l'organisation. `null` si la campagne est absente,
 * d'une autre organisation ou invisible pour la personne. Lève si un
 * identifiant est hors format (aucune requête n'est alors émise).
 */
export async function loadSynthese(
  viewer: Viewer,
  organizationId: string,
  campaignId: string
): Promise<Synthese | null> {
  const org = uuid.parse(organizationId);
  const camp = uuid.parse(campaignId);
  const client = userClient(viewer.accessToken);

  const campagnes = await client.select(
    'campaigns',
    `id=eq.${camp}&organization_id=eq.${org}&select=id,titre,statut`,
    campaignRows
  );
  const found = campagnes[0];
  if (!found) return null;
  const campagne: CampagneSynthese = { id: found.id, titre: found.titre };
  // Avant la clôture, la photographie n'existe pas : on ne la cherche pas.
  if (found.statut !== 'close') return { etat: 'non_close', campagne };

  const [groups, aggregates] = await Promise.all([
    client.select(
      'groups',
      `campaign_id=eq.${camp}&select=id,nom,ordre&order=ordre.asc,nom.asc`,
      groupRows
    ),
    client.select(
      'group_aggregates',
      `campaign_id=eq.${camp}&select=group_id,portee,domaine,effectif,moyenne,ecart_type`,
      aggregateRows
    )
  ]);

  const lignesDe = (
    groupId: string,
    portee: 'groupe' | 'complement'
  ): LigneDomaine[] =>
    aggregates
      .filter((a) => a.group_id === groupId && a.portee === portee)
      .map((a) => ({
        domaine: a.domaine,
        effectif: a.effectif,
        moyenne: a.moyenne,
        ecartType: a.ecart_type
      }))
      .sort((a, b) => ordreDomaine(a.domaine) - ordreDomaine(b.domaine));

  const groupes = [...groups]
    .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'))
    .map((g): GroupeSynthese => {
      const groupe = lignesDe(g.id, 'groupe');
      return {
        id: g.id,
        nom: g.nom,
        publie: groupe.length > 0,
        groupe,
        complement: lignesDe(g.id, 'complement')
      };
    });

  return { etat: 'prete', campagne, groupes };
}
