'use server';

import { z } from 'zod';
import { currentViewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Actions du binôme. Toutes passent par une fonction de la base, avec
// l'identité de la personne : la base décide (titulaire d'une des deux
// participations pour répondre, consultant de l'organisation ou administrateur
// Tenga pour proposer). Les statuts rendus ne contiennent ni jeton, ni adresse,
// ni identifiant de personne.

const uuid = z.string().uuid();
const statutBinome = z.enum(['en_attente', 'actif', 'retire']);

// 23505 : une proposition est déjà en cours pour ces deux personnes.
// sqlOutcome ne le distingue pas des autres erreurs, il est lu sur le code.
const DEJA_EN_COURS = '23505';

export type ReponseBinome =
  | { status: 'en_attente' | 'actif' | 'retire' }
  | { status: 'closed' | 'forbidden' | 'notfound' | 'invalid' | 'failed' };

// Journal d'exploitation : le code de statut seulement, ni identifiant ni nom.
const avertir = (action: string, error: unknown): void => {
  console.warn(
    JSON.stringify({
      event: 'binome.action_failed',
      action,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
};

async function repondre(
  action: string,
  binomeId: unknown,
  accord: unknown
): Promise<ReponseBinome> {
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'forbidden' };

  const id = uuid.safeParse(binomeId);
  const reponse = z.boolean().safeParse(accord);
  if (!id.success || !reponse.success) return { status: 'invalid' };

  try {
    const status = await userClient(state.viewer.accessToken).rpc(
      'repondre_binome',
      { p_binome: id.data, p_accord: reponse.data },
      statutBinome
    );
    return { status };
  } catch (error) {
    switch (sqlOutcome(error)) {
      case 'conflict':
        return { status: 'closed' };
      case 'invalid':
        return { status: 'invalid' };
      case 'forbidden':
        return { status: 'forbidden' };
      case 'notfound':
        return { status: 'notfound' };
      default:
        avertir(action, error);
        return { status: 'failed' };
    }
  }
}

/**
 * Accepte (accord vrai) ou refuse (accord faux) une proposition de binôme. Un
 * refus, ou un retrait après un accord, est définitif pour cette proposition.
 * Rend l'état de la proposition : en attente de l'autre personne, active
 * (les deux accords) ou retirée.
 */
export async function repondreBinome(
  binomeId: string,
  accord: boolean
): Promise<ReponseBinome> {
  return repondre('repondre', binomeId, accord);
}

/** Retire son accord : le rapport cesse d'être lisible, définitivement pour cette proposition. */
export async function retirerBinome(binomeId: string): Promise<ReponseBinome> {
  return repondre('retirer', binomeId, false);
}

export type PropositionState =
  | { status: 'idle' }
  | { status: 'proposed'; binome: string }
  | { status: 'invalid' | 'forbidden' | 'already' | 'error' };

const propositionSchema = z
  .object({ a: uuid, b: uuid })
  .refine((choix) => choix.a !== choix.b);

/**
 * Proposition d'un binôme par le consultant (ou l'administrateur Tenga) : deux
 * résultats terminés de la même organisation. Les deux personnes doivent encore
 * accepter ; rien n'est lisible avant.
 */
export async function proposerBinome(
  _previous: PropositionState,
  formData: FormData
): Promise<PropositionState> {
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'forbidden' };

  const choix = propositionSchema.safeParse({
    a: formData.get('a'),
    b: formData.get('b')
  });
  if (!choix.success) return { status: 'invalid' };

  try {
    const binome = await userClient(state.viewer.accessToken).rpc(
      'proposer_binome',
      { p_a: choix.data.a, p_b: choix.data.b },
      uuid
    );
    return { status: 'proposed', binome };
  } catch (error) {
    if (error instanceof GatewayError && error.code === DEJA_EN_COURS) {
      return { status: 'already' };
    }
    const outcome = sqlOutcome(error);
    if (outcome === 'forbidden') return { status: 'forbidden' };
    if (outcome === 'invalid') return { status: 'invalid' };
    avertir('proposer', error);
    return { status: 'error' };
  }
}
