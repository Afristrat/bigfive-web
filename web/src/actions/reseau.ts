'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  LIENS,
  SUCCES_RESEAU,
  valeurValide,
  type ReponseLien,
  type ResultatReseau
} from '@/lib/reseau-releve';
import { currentViewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import { GatewayError, userClient } from '@/lib/supabase/server';

// Actions du relevé du réseau réel (contrat §2). Toutes passent par une
// fonction de la base, avec l'identité de la personne : la base vérifie que la
// participation est la sienne, que l'interrupteur et la campagne le permettent,
// et que chaque personne citée est un autre membre informé et non opposé du
// même groupe. Les statuts rendus ne contiennent ni jeton, ni adresse, ni
// identifiant.

const uuid = z.string().uuid();
const booleen = z.boolean();

// ponytail: plafond de garde avant l'appel (aucune liste réelle n'en approche) ; la base applique la vraie borne, 4 × (taille du groupe − 1). Réexamen : groupes de plus de 250 personnes.
const MAX_REPONSES = 1000;

const reponsesSchema = (participation: string) =>
  z
    .array(
      z.object({ cite: uuid, lien: z.enum(LIENS), valeur: z.number().int() })
    )
    .min(1)
    .max(MAX_REPONSES)
    .superRefine((liste, ctx) => {
      const vues = new Set<string>();
      for (const r of liste) {
        const cle = `${r.cite}:${r.lien}`;
        if (
          r.cite === participation ||
          !valeurValide(r.lien, r.valeur) ||
          vues.has(cle)
        ) {
          ctx.addIssue({ code: z.ZodIssueCode.custom });
          return;
        }
        vues.add(cle);
      }
    });

// Journal d'exploitation : le nom de l'action et le code de statut seulement.
const avertir = (action: string, error: unknown): void => {
  console.warn(
    JSON.stringify({
      event: 'reseau.action_failed',
      action,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
};

// Page du relevé, toutes langues et toutes participations : chaque page est
// propre à sa personne (force-dynamic), seul le cache du routeur est à vider.
const PAGE_RELEVE = '/[locale]/mes-resultats/reseau/[participation]';

/**
 * Statuts après lesquels la base a changé (écriture faite, ou état modifié
 * ailleurs : clôture, liste de l'équipe) : la page est revalidée, et la
 * réponse de l'action porte son nouvel état. Jamais sur « reconnexion » (le
 * rendu renverrait vers la connexion et effacerait le brouillon), ni sur un
 * refus ou une panne (rien n'a changé, la saisie reste à l'écran).
 */
const aRevalider = (status: ResultatReseau['status']): boolean =>
  SUCCES_RESEAU.includes(status) || status === 'closed' || status === 'invalid';

async function appeler<S extends z.ZodTypeAny>(
  accessToken: string,
  action: string,
  fn: string,
  args: Record<string, unknown>,
  schema: S,
  succes: (valeur: z.infer<S>) => ResultatReseau['status']
): Promise<ResultatReseau> {
  const resultat = await executer(
    accessToken,
    action,
    fn,
    args,
    schema,
    succes
  );
  if (aRevalider(resultat.status)) revalidatePath(PAGE_RELEVE, 'page');
  return resultat;
}

async function executer<S extends z.ZodTypeAny>(
  accessToken: string,
  action: string,
  fn: string,
  args: Record<string, unknown>,
  schema: S,
  succes: (valeur: z.infer<S>) => ResultatReseau['status']
): Promise<ResultatReseau> {
  try {
    const valeur = await userClient(accessToken).rpc(fn, args, schema);
    return { status: succes(valeur) };
  } catch (error) {
    // Jeton refusé en cours d'action (expiré ou révoqué) : se reconnecter.
    if (error instanceof GatewayError && error.status === 401) {
      return { status: 'reconnexion' };
    }
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
 * Jeton de la personne connectée, ou null : session absente ou à renouveler.
 * Dans les deux cas l'écran propose de se reconnecter (statut « reconnexion »),
 * la personne étant déjà sur sa page de relevé.
 */
const jeton = async (): Promise<string | null> => {
  const state = await currentViewer();
  return state.status === 'ok' ? state.viewer.accessToken : null;
};

/**
 * Prise de connaissance de l'information préalable (art. 5 §3), avec ou sans
 * opposition à être cité. Une opposition retire mes accords et toutes les
 * réponses où je figure ; la lever est permis. Possible campagne ouverte ou
 * close.
 */
export async function informerReseau(
  participation: string,
  opposition: boolean
): Promise<ResultatReseau> {
  const accessToken = await jeton();
  if (!accessToken) return { status: 'reconnexion' };
  const id = uuid.safeParse(participation);
  const choix = booleen.safeParse(opposition);
  if (!id.success || !choix.success) return { status: 'invalid' };
  return appeler(
    accessToken,
    'informer',
    'reseau_informer',
    { p_participation: id.data, p_opposition: choix.data },
    z.enum(['informe', 'oppose']),
    (statut) => statut
  );
}

/**
 * Les deux accords, indépendants : répondre, et montrer la carte de l'équipe en
 * atelier. Retirer l'accord de répondre supprime mes réponses.
 */
export async function consentirReseau(
  participation: string,
  repondre: boolean,
  carte: boolean
): Promise<ResultatReseau> {
  const accessToken = await jeton();
  if (!accessToken) return { status: 'reconnexion' };
  const id = uuid.safeParse(participation);
  const r = booleen.safeParse(repondre);
  const c = booleen.safeParse(carte);
  if (!id.success || !r.success || !c.success) return { status: 'invalid' };
  return appeler(
    accessToken,
    'consentir',
    'reseau_consentir',
    { p_participation: id.data, p_repondre: r.data, p_carte: c.data },
    z.literal('enregistre'),
    () => 'enregistre'
  );
}

/** Enregistrement unique : remplace atomiquement toutes mes réponses. */
export async function repondreReseau(
  participation: string,
  reponses: ReponseLien[]
): Promise<ResultatReseau> {
  const accessToken = await jeton();
  if (!accessToken) return { status: 'reconnexion' };
  const id = uuid.safeParse(participation);
  if (!id.success) return { status: 'invalid' };
  const liste = reponsesSchema(id.data).safeParse(reponses);
  if (!liste.success) return { status: 'invalid' };
  return appeler(
    accessToken,
    'repondre',
    'reseau_repondre',
    { p_participation: id.data, p_reponses: liste.data },
    z.number().int().nonnegative(),
    () => 'repondu'
  );
}

/** Retrait à tout moment : mes réponses et mes deux accords sont supprimés. */
export async function retirerReseau(
  participation: string
): Promise<ResultatReseau> {
  const accessToken = await jeton();
  if (!accessToken) return { status: 'reconnexion' };
  const id = uuid.safeParse(participation);
  if (!id.success) return { status: 'invalid' };
  return appeler(
    accessToken,
    'retirer',
    'reseau_retirer',
    { p_participation: id.data },
    z.number().int().nonnegative(),
    () => 'retire'
  );
}
