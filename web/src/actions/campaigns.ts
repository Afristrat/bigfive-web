'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseOrgSlug } from '@/lib/campaign-data';
import { localeOf } from '@/lib/locale-field';
import { localizedPath } from '@/lib/safe-path';
import { requireViewer } from '@/lib/session';
import { sqlOutcome } from '@/lib/sql-errors';
import {
  GatewayError,
  userClient,
  type UserClient
} from '@/lib/supabase/server';
import {
  campaignCloseSchema,
  campaignCreateSchema,
  campaignIdSchema
} from '@/schemas/campaigns';

export type CampaignState = {
  status:
    | 'idle'
    | 'created'
    | 'opened'
    | 'closed'
    | 'invalid'
    | 'forbidden'
    | 'conflict'
    | 'error';
};

type Done = Exclude<CampaignState['status'], 'idle'>;

// Page de retour de la connexion : l'identifiant d'URL n'est repris que s'il a
// le bon format, jamais tel que saisi.
const returnPath = (raw: FormDataEntryValue | null): string => {
  const slug = parseOrgSlug(raw);
  return slug ? `/o/${slug}` : '/mon-compte';
};

// Journal d'exploitation : l'action et le code HTTP, ni identifiant, ni
// adresse, ni titre.
const failure = (action: string, error: unknown): CampaignState => {
  const outcome = sqlOutcome(error);
  if (outcome === 'forbidden') return { status: 'forbidden' };
  if (outcome === 'conflict') return { status: 'conflict' };
  if (outcome === 'invalid') return { status: 'invalid' };
  console.warn(
    JSON.stringify({
      event: 'campaign.action_failed',
      action,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
  return { status: 'error' };
};

type Parsed =
  | { ok: false }
  | { ok: true; slug: string; call: (client: UserClient) => Promise<unknown> };

// Squelette commun : personne connectée, saisie validée, appel de la fonction
// SQL avec l'identité de la personne, revalidation de la page.
async function run(
  action: string,
  formData: FormData,
  parse: (data: FormData) => Parsed,
  done: Done
): Promise<CampaignState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireViewer(locale, returnPath(formData.get('slug')));
  const input = parse(formData);
  if (!input.ok) return { status: 'invalid' };
  try {
    await input.call(userClient(viewer.accessToken));
  } catch (error) {
    return failure(action, error);
  }
  revalidatePath(localizedPath(locale, `/o/${input.slug}`));
  return { status: done };
}

/** Création d'une campagne en brouillon (fonction SQL creer_campagne, journalisée). */
export async function createCampaign(
  _previous: CampaignState,
  formData: FormData
): Promise<CampaignState> {
  return run(
    'create',
    formData,
    (data) => {
      const parsed = campaignCreateSchema.safeParse({
        organisation: data.get('organisation'),
        slug: data.get('slug'),
        titre: data.get('titre'),
        langue: data.get('langue')
      });
      if (!parsed.success) return { ok: false };
      const { organisation, titre, langue, slug } = parsed.data;
      return {
        ok: true,
        slug,
        call: (client) =>
          client.rpc(
            'creer_campagne',
            { p_organisation: organisation, p_titre: titre, p_langue: langue },
            z.string().uuid()
          )
      };
    },
    'created'
  );
}

/** Ouverture d'une campagne en brouillon (fonction SQL ouvrir_campagne). */
export async function openCampaign(
  _previous: CampaignState,
  formData: FormData
): Promise<CampaignState> {
  return run(
    'open',
    formData,
    (data) => {
      const parsed = campaignIdSchema.safeParse({
        campagne: data.get('campagne'),
        slug: data.get('slug')
      });
      if (!parsed.success) return { ok: false };
      const { campagne, slug } = parsed.data;
      return {
        ok: true,
        slug,
        call: (client) =>
          client.rpc('ouvrir_campagne', { p_campagne: campagne }, z.unknown())
      };
    },
    'opened'
  );
}

/**
 * Clôture d'une campagne ouverte (fonction SQL clore_campagne). Irréversible :
 * les invitations en attente sont supprimées. La confirmation `confirmer=oui`
 * est exigée ICI, côté serveur, et pas seulement par la case du formulaire.
 */
export async function closeCampaign(
  _previous: CampaignState,
  formData: FormData
): Promise<CampaignState> {
  return run(
    'close',
    formData,
    (data) => {
      const parsed = campaignCloseSchema.safeParse({
        campagne: data.get('campagne'),
        slug: data.get('slug'),
        confirmer: data.get('confirmer')
      });
      if (!parsed.success) return { ok: false };
      const { campagne, slug } = parsed.data;
      return {
        ok: true,
        slug,
        call: (client) =>
          client.rpc('clore_campagne', { p_campagne: campagne }, z.unknown())
      };
    },
    'closed'
  );
}
