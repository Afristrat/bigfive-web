import { z } from 'zod';
import { lireScores, type ScoresTenga } from '@/lib/moteur';
import type { Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Chargeurs du binôme : deux fonctions de la base, et rien d'autre.
//   - app.mes_binomes()    : les propositions qui concernent la personne ;
//   - app.lire_binome(id)  : les scores des deux participations, SEULEMENT si
//     les deux accords existent, la proposition n'étant pas retirée. La base
//     vérifie le droit (les deux personnes, le consultant de l'organisation,
//     l'administrateur Tenga, jamais le responsable) et écrit la ligne de
//     journal avant de répondre.
// Aucune table (résultats, participations, binômes) n'est lue ici et la clé de
// service n'est jamais utilisée : lecture avec l'identité de la personne.

const uuid = z.string().uuid();

/** Identifiant de binôme d'URL sous sa forme canonique, ou null s'il est hors format. */
export const parseBinomeId = (value: unknown): string | null => {
  const parsed = uuid.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const statut = z.enum(['en_attente', 'actif', 'retire']);
export type StatutBinome = z.infer<typeof statut>;

const mesRows = z.array(
  z.object({
    binome_id: uuid,
    organisation_nom: z.string(),
    ma_participation: uuid,
    propose_le: z.string(),
    statut,
    mon_accord_le: z.string().nullable(),
    autre_nom: z.string().nullable()
  })
);

export type MonBinome = {
  binomeId: string;
  organisationNom: string;
  maParticipation: string;
  proposeLe: string;
  statut: StatutBinome;
  /** Mon accord seulement : celui de l'autre personne n'est jamais montré. */
  monAccordLe: string | null;
  /** Nom de profil de l'autre personne tant que la proposition n'est pas retirée. */
  autreNom: string | null;
};

/** Les propositions de binôme qui concernent la personne connectée, de la plus récente à la plus ancienne. */
export async function loadMesBinomes(viewer: Viewer): Promise<MonBinome[]> {
  const lignes = await userClient(viewer.accessToken).rpc(
    'mes_binomes',
    {},
    mesRows
  );
  return lignes.map((ligne) => ({
    binomeId: ligne.binome_id,
    organisationNom: ligne.organisation_nom,
    maParticipation: ligne.ma_participation,
    proposeLe: ligne.propose_le,
    statut: ligne.statut,
    monAccordLe: ligne.mon_accord_le,
    autreNom: ligne.autre_nom
  }));
}

// Les réponses brutes que la base ne renvoie pas (et que le schéma écarterait
// de toute façon) ne sont pas décrites : zod les retire.
const lectureRows = z.array(
  z.object({
    participation_id: uuid,
    cote: z.enum(['a', 'b']),
    est_la_mienne: z.boolean(),
    scores: z.unknown()
  })
);

export type PersonneBinome = {
  participationId: string;
  estLaMienne: boolean;
  /** Null quand la forme enregistrée n'est pas lisible par le moteur. */
  scores: ScoresTenga | null;
};

export type BinomeLu = {
  binomeId: string;
  /** Les deux personnes, dans l'ordre de la base. */
  personnes: PersonneBinome[];
};

// La base retire la facette O6 de toute ligne qui n'est pas celle de la
// personne (opinions, donnée sensible). Le schéma des scores exige les trente
// facettes : pour lire le reste sans erreur, O6 reçoit une valeur neutre SANS
// SIGNIFICATION (le milieu de l'échelle). Elle n'est jamais lue : la
// construction du rapport écarte O6 et le domaine O pour les deux personnes.
const O6_NEUTRE = { score: 12, count: 4, moyenne: 3 } as const;

const objet = z.record(z.string(), z.unknown());

function completerO6(json: unknown): unknown {
  const racine = objet.safeParse(json);
  if (!racine.success) return json;
  const ouverture = objet.safeParse(racine.data.O);
  if (!ouverture.success) return json;
  const facettes = objet.safeParse(ouverture.data.facettes);
  if (!facettes.success || '6' in facettes.data) return json;
  return {
    ...racine.data,
    O: { ...ouverture.data, facettes: { ...facettes.data, '6': O6_NEUTRE } }
  };
}

// 42501 : lecture interdite ou binôme inexistant (même réponse) ; 55000 : un
// accord manque, proposition retirée ou résultat purgé ; P0002 : introuvable.
// Tous donnent « introuvable » : on ne dit pas pourquoi.
const CODES_DE_REFUS = new Set(['42501', '55000', 'P0002']);

const estRefus = (error: unknown): boolean =>
  error instanceof GatewayError &&
  ((error.code !== null && CODES_DE_REFUS.has(error.code)) ||
    error.status === 401 ||
    error.status === 403);

/**
 * Un binôme, lu par la fonction journalisée de la base. `null` quand la base
 * refuse (personne non concernée, un seul accord, proposition retirée) ou ne
 * rend pas exactement deux résultats. Lève si l'identifiant est hors format ou
 * si la passerelle tombe.
 */
export async function loadBinome(
  viewer: Viewer,
  binomeId: string
): Promise<BinomeLu | null> {
  const p_binome = uuid.parse(binomeId);
  try {
    const lignes = await userClient(viewer.accessToken).rpc(
      'lire_binome',
      { p_binome },
      lectureRows
    );
    if (lignes.length !== 2) return null;
    return {
      binomeId: p_binome,
      personnes: lignes.map((ligne) => ({
        participationId: ligne.participation_id,
        estLaMienne: ligne.est_la_mienne,
        scores: lireScores(
          ligne.est_la_mienne ? ligne.scores : completerO6(ligne.scores)
        )
      }))
    };
  } catch (error) {
    if (estRefus(error)) return null;
    throw error;
  }
}
