import { z } from 'zod';
import { lireScores, type ScoresTenga } from '@/lib/moteur';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';

// Chargeurs de « Mes résultats ». Lecture par app.mes_resultats() avec
// l'identité de la personne (rôle authenticated) : la fonction ne renvoie que
// ses propres participations. Aucun `select` n'est concaténé ici : la
// participation demandée est retrouvée dans la liste, après validation uuid.

const uuid = z.string().uuid();

const statutParticipation = z.enum(['ouverte', 'en_cours', 'terminee']);
const statutCampagne = z.enum(['brouillon', 'ouverte', 'close']);

const rows = z.array(
  z.object({
    participation_id: uuid,
    campagne_id: uuid,
    campagne_titre: z.string(),
    organisation_nom: z.string(),
    organisation_slug: z.string(),
    statut: statutParticipation,
    ouverte_le: z.string(),
    terminee_le: z.string().nullable(),
    scores: z.unknown(),
    questionnaire_version: z.string().nullable(),
    calcul_version: z.string().nullable(),
    campagne_statut: statutCampagne
  })
);

export type StatutParticipation = z.infer<typeof statutParticipation>;
export type StatutCampagne = z.infer<typeof statutCampagne>;

export type MaParticipation = {
  participationId: string;
  campagneId: string;
  campagneTitre: string;
  campagneStatut: StatutCampagne;
  organisationNom: string;
  organisationSlug: string;
  statut: StatutParticipation;
  ouverteLe: string;
  termineeLe: string | null;
  scores: ScoresTenga | null;
  /** Vrai quand un résultat existe mais que sa forme n'est pas lisible par le moteur. */
  scoresIllisibles: boolean;
  questionnaireVersion: string | null;
  calculVersion: string | null;
};

/** Identifiant de participation d'URL sous sa forme canonique, ou null s'il est hors format. */
export const parseParticipationId = (value: unknown): string | null => {
  const parsed = uuid.safeParse(value);
  return parsed.success ? parsed.data : null;
};

type Row = z.infer<typeof rows>[number];

const enParticipation = (row: Row): MaParticipation => {
  const present = row.scores !== null && row.scores !== undefined;
  const scores = present ? lireScores(row.scores) : null;
  return {
    participationId: row.participation_id,
    campagneId: row.campagne_id,
    campagneTitre: row.campagne_titre,
    campagneStatut: row.campagne_statut,
    organisationNom: row.organisation_nom,
    organisationSlug: row.organisation_slug,
    statut: row.statut,
    ouverteLe: row.ouverte_le,
    termineeLe: row.terminee_le,
    scores,
    scoresIllisibles: present && scores === null,
    questionnaireVersion: row.questionnaire_version,
    calculVersion: row.calcul_version
  };
};

/** Toutes les participations de la personne connectée, de la plus récente à la plus ancienne. */
export async function loadMesParticipations(
  viewer: Viewer
): Promise<MaParticipation[]> {
  const lignes = await userClient(viewer.accessToken).rpc(
    'mes_resultats',
    {},
    rows
  );
  return lignes.map(enParticipation);
}

/**
 * Une participation de la personne connectée, ou null si elle n'en a aucune de
 * cet identifiant (inexistante ou d'autrui : même réponse). Lève si
 * l'identifiant n'est pas un uuid, avant toute requête.
 */
export async function loadMaParticipation(
  viewer: Viewer,
  participationId: string
): Promise<MaParticipation | null> {
  const id = uuid.parse(participationId);
  const toutes = await loadMesParticipations(viewer);
  return toutes.find((p) => p.participationId === id) ?? null;
}
