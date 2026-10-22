import { getItems } from '@bigfive-org/questions';
import { z } from 'zod';
import type { Viewer } from '@/lib/session';
import { userClient } from '@/lib/supabase/server';
import type { Answer } from '@/types';
import type { Reprise } from '@/app/[locale]/test/survey';

// Lecture de la participation par la seule RPC app.mes_resultats, avec
// l'identité de la personne : la base ne renvoie que SES participations.

const uuid = z.string().uuid();

const rows = z.array(
  z.object({
    participation_id: uuid,
    campagne_id: uuid,
    campagne_titre: z.string(),
    campagne_statut: z.enum(['brouillon', 'ouverte', 'close']),
    organisation_nom: z.string(),
    organisation_slug: z.string(),
    statut: z.enum(['ouverte', 'en_cours', 'terminee'])
  })
);

export type StatutParticipation = 'ouverte' | 'en_cours' | 'terminee';
export type StatutCampagne = 'brouillon' | 'ouverte' | 'close';

export type ParticipationPassation = {
  participationId: string;
  campagneId: string;
  campagneTitre: string;
  campagneStatut: StatutCampagne;
  organisationNom: string;
  organisationSlug: string;
  statut: StatutParticipation;
};

async function lireParticipations(
  viewer: Viewer
): Promise<ParticipationPassation[]> {
  const lignes = await userClient(viewer.accessToken).rpc(
    'mes_resultats',
    {},
    rows
  );
  return lignes.map((ligne) => ({
    participationId: ligne.participation_id,
    campagneId: ligne.campagne_id,
    campagneTitre: ligne.campagne_titre,
    campagneStatut: ligne.campagne_statut,
    organisationNom: ligne.organisation_nom,
    organisationSlug: ligne.organisation_slug,
    statut: ligne.statut
  }));
}

/**
 * La participation de la personne connectée, quel que soit son statut (la page
 * décide : passation, redirection ou message). `null` si l'identifiant n'est
 * pas un uuid ou n'appartient pas à cette personne.
 */
export async function loadParticipationOuverte(
  viewer: Viewer,
  participationId: string
): Promise<ParticipationPassation | null> {
  if (!uuid.safeParse(participationId).success) return null;
  const toutes = await lireParticipations(viewer);
  return toutes.find((p) => p.participationId === participationId) ?? null;
}

/** Participations qu'il reste à passer : non terminées, dans une campagne ouverte. */
export async function loadParticipationsAPasser(
  viewer: Viewer
): Promise<ParticipationPassation[]> {
  const toutes = await lireParticipations(viewer);
  return toutes.filter(
    (p) => p.statut !== 'terminee' && p.campagneStatut === 'ouverte'
  );
}

export type Tentative = {
  revision: number;
  reponses: Record<string, number>;
};

const tentatives = z.array(
  z.object({
    revision: z.number().int().min(1),
    reponses: z.record(z.string(), z.number())
  })
);

/**
 * La sauvegarde en cours de la personne pour cette participation (règle
 * attempts_lecture_proprietaire : la base ne rend que SA tentative). `null`
 * si aucune sauvegarde n'existe ou si l'identifiant n'est pas un uuid.
 */
export async function loadTentative(
  viewer: Viewer,
  participationId: string
): Promise<Tentative | null> {
  const id = uuid.safeParse(participationId);
  if (!id.success) return null;
  const lignes = await userClient(viewer.accessToken).select(
    'attempts',
    `participation_id=eq.${id.data}&select=revision,reponses`,
    tentatives
  );
  return lignes[0] ?? null;
}

// Les identifiants, domaines et facettes sont identiques dans toutes les langues.
const QUESTIONS = getItems('en');

/**
 * Tentative du serveur vers l'état du questionnaire : domaine et facette
 * relus dans le questionnaire, question ou valeur inconnue ignorée, écran
 * posé sur la première question sans réponse (le dernier si tout est répondu).
 */
export function versReprise(tentative: Tentative): Reprise {
  const answers: Answer[] = [];
  for (const question of QUESTIONS) {
    const score = tentative.reponses[question.id];
    if (Number.isInteger(score) && score >= 1 && score <= 5) {
      answers.push({
        id: question.id,
        score,
        domain: question.domain,
        facet: question.facet
      });
    }
  }
  const repondues = new Set(answers.map((answer) => answer.id));
  const premiere = QUESTIONS.findIndex(
    (question) => !repondues.has(question.id)
  );
  return {
    answers,
    index: premiere === -1 ? QUESTIONS.length - 1 : premiere,
    revision: tentative.revision
  };
}
