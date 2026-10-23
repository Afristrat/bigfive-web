import { z } from 'zod';
import {
  LIENS,
  valeurValide,
  type MonReleveReseau,
  type ReleveReseau
} from '@/lib/reseau-releve';
import type { Viewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Chargeurs du relevé du réseau réel : trois fonctions de la base, et rien
// d'autre (contrat §2).
//   - app.mes_releves_reseau()      : mes participations éligibles ; aucune
//     ligne tant que l'interrupteur est fermé ;
//   - app.reseau_releve(p)          : mon état, les autres membres et mes
//     réponses, ou {"ouvert": false} ;
//   - app.reseau_lire(campagne)     : rendu brut pour le consultant de
//     l'organisation et l'administrateur Tenga, journalisé AVANT de répondre.
// Aucune table n'est lue ici et la clé de service n'est jamais utilisée. Les
// schémas sont STRICTS : une clé que le contrat ne prévoit pas fait lever, pour
// qu'aucune donnée inattendue (adresse, réponse d'autrui) ne passe à l'écran.

const uuid = z.string().uuid();

/** Identifiant de participation d'URL sous sa forme canonique, ou null s'il est hors format. */
export const parseParticipationReseau = (value: unknown): string | null => {
  const parsed = uuid.safeParse(value);
  return parsed.success ? parsed.data : null;
};

const statutCampagne = z.enum(['brouillon', 'ouverte', 'close']);
const lien = z.enum(LIENS);
const valeur = z.number().int();

// Échelle propre à chaque lien (confiance de 0 à 3, fréquence de 0 à 4).
const reponseValide = <
  T extends { lien: (typeof LIENS)[number]; valeur: number }
>(
  r: T
): boolean => valeurValide(r.lien, r.valeur);

const mesRows = z.array(
  z
    .object({
      participation_id: uuid,
      organisation_nom: z.string(),
      campagne_titre: z.string(),
      campagne_statut: statutCampagne
    })
    .strict()
);

/** Mes relevés ouverts au remplissage ; liste vide tant que l'interrupteur est fermé. */
export async function loadMesRelevesReseau(
  viewer: Viewer
): Promise<MonReleveReseau[]> {
  const lignes = await userClient(viewer.accessToken).rpc(
    'mes_releves_reseau',
    {},
    mesRows
  );
  return lignes.map((ligne) => ({
    participationId: ligne.participation_id,
    organisationNom: ligne.organisation_nom,
    campagneTitre: ligne.campagne_titre,
    campagneStatut: ligne.campagne_statut
  }));
}

const date = z.string().min(1);

const releveFerme = z.object({ ouvert: z.literal(false) }).strict();
const releveOuvert = z
  .object({
    ouvert: z.literal(true),
    campagne_ouverte: z.boolean(),
    moi: z
      .object({
        informe_le: date,
        oppose_le: date.nullable(),
        accord_repondre_le: date.nullable(),
        accord_carte_le: date.nullable()
      })
      .strict()
      .nullable(),
    membres: z.array(
      z.object({ participation_id: uuid, nom: z.string().nullable() }).strict()
    ),
    reponses: z.array(
      z.object({ cite: uuid, lien, valeur }).strict().refine(reponseValide)
    )
  })
  .strict();
const releveSchema = z.discriminatedUnion('ouvert', [
  releveFerme,
  releveOuvert
]);

// 42501 : interdit ; P0002 : participation inexistante ou pas à moi (même
// message) ; 55000 : état incompatible. Tous donnent « introuvable » : on ne
// dit pas pourquoi. 401 et 403 : session ou droit refusés par la passerelle.
const CODES_DE_REFUS = new Set(['42501', '55000', 'P0002']);

const estRefus = (error: unknown): boolean =>
  error instanceof GatewayError &&
  ((error.code !== null && CODES_DE_REFUS.has(error.code)) ||
    error.status === 401 ||
    error.status === 403);

/**
 * Mon relevé pour une participation. `null` quand l'interrupteur est fermé ou
 * que la base refuse (404 uniforme). Lève si l'identifiant est hors format, si
 * la réponse sort du contrat ou si la passerelle tombe.
 */
export async function loadReleveReseau(
  viewer: Viewer,
  participationId: string
): Promise<ReleveReseau | null> {
  const p_participation = uuid.parse(participationId);
  try {
    const lu = await userClient(viewer.accessToken).rpc(
      'reseau_releve',
      { p_participation },
      releveSchema
    );
    if (!lu.ouvert) return null;
    return {
      campagneOuverte: lu.campagne_ouverte,
      moi: lu.moi && {
        informeLe: lu.moi.informe_le,
        opposeLe: lu.moi.oppose_le,
        accordRepondreLe: lu.moi.accord_repondre_le,
        accordCarteLe: lu.moi.accord_carte_le
      },
      membres: lu.membres.map((m) => ({
        participationId: m.participation_id,
        nom: m.nom
      })),
      reponses: lu.reponses.map((r) => ({
        cite: r.cite,
        lien: r.lien,
        valeur: r.valeur
      }))
    };
  } catch (error) {
    if (estRefus(error)) return null;
    throw error;
  }
}

const lectureSchema = z
  .object({
    campagne_id: uuid,
    campagne_statut: statutCampagne,
    groupes: z.array(
      z
        .object({
          groupe_id: uuid,
          nom: z.string(),
          effectif: z.number().int().nonnegative(),
          membres: z.array(
            z
              .object({
                participation_id: uuid,
                nom: z.string().nullable(),
                informe: z.boolean(),
                oppose: z.boolean(),
                accord_repondre: z.boolean(),
                accord_carte: z.boolean(),
                a_repondu: z.boolean()
              })
              .strict()
          ),
          reponses: z.array(
            z
              .object({ de: uuid, vers: uuid, lien, valeur })
              .strict()
              .refine(reponseValide)
          )
        })
        .strict()
    )
  })
  .strict();

export type LectureReseauBrute = z.infer<typeof lectureSchema>;

/** Nombres d'un groupe, sans aucun nom de personne ni aucune réponse. */
export type DecompteGroupeReseau = {
  groupeId: string;
  nom: string;
  effectif: number;
  informes: number;
  oppositions: number;
  repondants: number;
  accordsCarte: number;
};

export type LectureReseau = {
  statut: z.infer<typeof statutCampagne>;
  groupes: DecompteGroupeReseau[];
  /** Rendu de reseau_lire, validé : réservé à l'export du consultant. */
  brut: LectureReseauBrute;
};

/**
 * Relevé d'une campagne pour le consultant de l'organisation ou
 * l'administrateur Tenga. Chaque appel est inscrit au journal par la base.
 * `null` quand la base refuse (responsable, autre organisation, campagne
 * inexistante : même réponse).
 */
export async function loadReseauCampagne(
  viewer: Viewer,
  campagneId: string
): Promise<LectureReseau | null> {
  const p_campagne = uuid.parse(campagneId);
  try {
    const brut = await userClient(viewer.accessToken).rpc(
      'reseau_lire',
      { p_campagne },
      lectureSchema
    );
    return {
      statut: brut.campagne_statut,
      groupes: brut.groupes.map((g) => ({
        groupeId: g.groupe_id,
        nom: g.nom,
        effectif: g.effectif,
        informes: g.membres.filter((m) => m.informe).length,
        oppositions: g.membres.filter((m) => m.oppose).length,
        repondants: g.membres.filter((m) => m.a_repondu).length,
        accordsCarte: g.membres.filter((m) => m.accord_carte).length
      })),
      brut
    };
  } catch (error) {
    if (estRefus(error)) return null;
    throw error;
  }
}
