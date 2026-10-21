import { z } from 'zod';
import { GatewayError, type ServiceClient } from '@/lib/supabase/server';

// Ce fichier n'est PAS 'use server' : ses exports ne sont pas des points
// d'entrée appelables par le navigateur (contrairement à ceux de actions/*).

const accountId = z.string().uuid().nullable();
const removed = z.boolean();

/**
 * Compte d'une adresse, lu PAR ADRESSE en base (app.compte_par_adresse,
 * migration 0013, index partiel d'adresse) : aucun parcours de la liste
 * d'administration, donc aucune limite au nombre de comptes. L'adresse voyage
 * dans le corps de la requête, jamais dans l'URL.
 */
const findUserId = (
  service: Pick<ServiceClient, 'rpc'>,
  email: string
): Promise<string | null> =>
  service.rpc('compte_par_adresse', { p_email: email }, accountId);

/**
 * Retrouve le compte d'une adresse ou le crée (inscription fermée : l'API
 * d'administration de GoTrue est la seule voie de naissance d'un compte).
 * `created` vaut true UNIQUEMENT si cet appel a créé le compte : c'est la seule
 * condition pour le supprimer ensuite (orphelin) ou lui ouvrir une session.
 * Deux appels simultanés : celui qui perd la course relit le compte de l'autre
 * (created false) ; si la relecture ne trouve rien, l'erreur d'origine remonte.
 */
export async function findOrCreateUser(
  service: Pick<ServiceClient, 'rpc' | 'createUser'>,
  email: string,
  langue: string
): Promise<{ id: string; created: boolean }> {
  const known = await findUserId(service, email);
  if (known !== null) return { id: known, created: false };
  try {
    return { id: await service.createUser(email, langue), created: true };
  } catch (error) {
    const raced = await findUserId(service, email);
    if (raced === null) throw error;
    return { id: raced, created: false };
  }
}

/**
 * Refus définitif de la base ou de la passerelle (4xx) : la RPC n'a rien écrit,
 * le compte né de l'appel peut être retiré. Panne réseau, délai dépassé, 5xx,
 * 408 et 429 : l'écriture a pu aboutir (suppressions en cascade), on le garde.
 */
export function isDefiniteRefusal(error: unknown): boolean {
  return (
    error instanceof GatewayError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

/**
 * Retire un compte que l'appel en cours vient de créer et que la suite a
 * laissé orphelin, par app.retirer_compte_sans_appartenance (migration 0013) :
 * la base refuse (false) si le compte a entre-temps une appartenance, une
 * participation ou un rôle d'administrateur, il est alors conservé. L'échec de
 * la suppression est journalisé (code HTTP seul) et avalé : l'erreur d'origine
 * reste celle que la personne voit.
 */
export async function discardCreatedAccount(
  service: Pick<ServiceClient, 'rpc'>,
  userId: string
): Promise<void> {
  try {
    const done = await service.rpc(
      'retirer_compte_sans_appartenance',
      { p_utilisateur: userId },
      removed
    );
    if (!done) console.warn(JSON.stringify({ event: 'account.orphan_kept' }));
  } catch (error) {
    console.warn(
      JSON.stringify({
        event: 'account.orphan_cleanup_failed',
        status: error instanceof GatewayError ? error.status : 0
      })
    );
  }
}
