import { z } from 'zod';
import type { OrgRole } from '@/lib/access-rules';
import { lireScores, type ScoresTenga } from '@/lib/moteur';
import type { Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Chargeurs du consultant et de l'administrateur Tenga : liste des résultats
// d'une campagne et lecture d'un résultat individuel. Les résultats ne se lisent
// QUE par deux fonctions de la base, qui vérifient le droit et écrivent le
// journal : app.lister_resultats_campagne et app.lire_resultat_individuel.
// Aucune table de résultats ni de participations n'est lue ici ; la seule table
// lue est `campaigns`, pour vérifier qu'une campagne appartient à l'organisation
// de l'URL. Les identifiants passent par zod avant toute requête (`makeSelect`
// concatène la chaîne brute). Lecture avec l'identité de la personne, jamais
// avec la clé de service.
//
// Les réponses brutes que la fonction de lecture renvoie aussi ne sont pas
// décrites dans le schéma : zod les écarte, elles ne sortent pas du chargeur.

const uuid = z.string().uuid();

/**
 * Qui lit les résultats : le consultant de l'organisation et l'administrateur
 * Tenga (miroir de la règle de la base, qui reste l'autorité). Le responsable
 * et le participant n'ont rien à y voir.
 */
export const peutLireResultats = (viewer: {
  isAdmin: boolean;
  role: OrgRole | null;
}): boolean => viewer.isAdmin || viewer.role === 'consultant';

// 401 et 403 : refus de la base (connexion ou droit), traité comme « introuvable ».
const estRefus = (error: unknown): boolean =>
  error instanceof GatewayError &&
  (error.status === 401 || error.status === 403);

const listeRows = z.array(
  z.object({ participation_id: uuid, soumis_le: z.string() })
);

// Aucune identité : l'identifiant de participation est opaque.
export type ResultatListe = { participationId: string; soumisLe: string };

/**
 * Résultats terminés d'une campagne (identifiant opaque et date), triés par la
 * base. `null` si la base refuse (campagne inconnue ou interdite : même
 * réponse). Lève si l'identifiant est hors format ou si la passerelle tombe.
 */
export async function loadResultatsCampagne(
  viewer: Viewer,
  campagneId: string
): Promise<ResultatListe[] | null> {
  const p_campagne = uuid.parse(campagneId);
  try {
    const lignes = await userClient(viewer.accessToken).rpc(
      'lister_resultats_campagne',
      { p_campagne },
      listeRows
    );
    return lignes.map((ligne) => ({
      participationId: ligne.participation_id,
      soumisLe: ligne.soumis_le
    }));
  } catch (error) {
    if (estRefus(error)) return null;
    throw error;
  }
}

const lectureRows = z.array(
  z.object({
    participation_id: uuid,
    campaign_id: uuid,
    organization_id: uuid,
    scores: z.unknown(),
    questionnaire_version: z.string().nullable(),
    calcul_version: z.string().nullable(),
    soumis_le: z.string()
  })
);

export type ResultatIndividuel = {
  participationId: string;
  campagneId: string;
  organisationId: string;
  /** Null quand la forme enregistrée n'est pas lisible par le moteur. */
  scores: ScoresTenga | null;
  questionnaireVersion: string | null;
  calculVersion: string | null;
  soumisLe: string;
};

/**
 * Un résultat individuel, lu par la fonction journalisée de la base (la ligne
 * de journal est écrite avant le renvoi). `null` si la base refuse ou ne rend
 * rien. Lève si l'identifiant est hors format ou si la passerelle tombe.
 */
export async function loadResultatIndividuel(
  viewer: Viewer,
  participationId: string
): Promise<ResultatIndividuel | null> {
  const p_participation = uuid.parse(participationId);
  try {
    const lignes = await userClient(viewer.accessToken).rpc(
      'lire_resultat_individuel',
      { p_participation },
      lectureRows
    );
    const ligne = lignes[0];
    if (!ligne) return null;
    const present = ligne.scores !== null && ligne.scores !== undefined;
    return {
      participationId: ligne.participation_id,
      campagneId: ligne.campaign_id,
      organisationId: ligne.organization_id,
      scores: present ? lireScores(ligne.scores) : null,
      questionnaireVersion: ligne.questionnaire_version,
      calculVersion: ligne.calcul_version,
      soumisLe: ligne.soumis_le
    };
  } catch (error) {
    if (estRefus(error)) return null;
    throw error;
  }
}

const campagneRows = z.array(
  z.object({
    id: uuid,
    titre: z.string(),
    statut: z.enum(['brouillon', 'ouverte', 'close'])
  })
);

export type CampagneResultats = { id: string; titre: string };

/**
 * La campagne, si elle appartient à l'organisation de l'URL et si les règles de
 * lecture de la base la montrent à la personne ; sinon `null`.
 */
export async function loadCampagneOrganisation(
  viewer: Viewer,
  organizationId: string,
  campagneId: string
): Promise<CampagneResultats | null> {
  const org = uuid.parse(organizationId);
  const camp = uuid.parse(campagneId);
  const lignes = await userClient(viewer.accessToken).select(
    'campaigns',
    `id=eq.${camp}&organization_id=eq.${org}&select=id,titre,statut`,
    campagneRows
  );
  const trouvee = lignes[0];
  return trouvee ? { id: trouvee.id, titre: trouvee.titre } : null;
}
