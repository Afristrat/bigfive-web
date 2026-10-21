'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { basePath } from '@/config/site';
import {
  loadTengaAdmins,
  notificationRecipients,
  type TengaAdmin
} from '@/lib/admin-data';
import {
  buildAdminChangeMail,
  buildAdminGrantMail,
  type AdminChange
} from '@/lib/admin-grant-mail';
import { connexionUrl } from '@/lib/invitation-mail';
import { localeOf } from '@/lib/locale-field';
import { toMailLocale } from '@/lib/login-mail';
import { sendMail } from '@/lib/mailer';
import { getClientIp, isRateLimited } from '@/lib/rate-limit';
import { localizedPath } from '@/lib/safe-path';
import { logSecurityEvent } from '@/lib/security-log';
import { requireAdmin } from '@/lib/session';
import type { Limit } from '@/lib/sliding-window';
import { GatewayError, serviceClient, userClient } from '@/lib/supabase/server';
import {
  discardCreatedAccount,
  findOrCreateUser,
  isDefiniteRefusal
} from '@/lib/user-accounts';
import {
  adminGrantSchema,
  organizationSchema,
  roleAssignmentSchema
} from '@/schemas';

export type RemoveState = {
  status:
    | 'idle'
    | 'removed'
    | 'invalid'
    | 'self'
    | 'absent'
    | 'forbidden'
    | 'error';
};

export type AdminState = {
  status:
    | 'idle'
    | 'created'
    | 'assigned'
    | 'granted'
    | 'invalid'
    | 'exists'
    | 'error';
};

const HOUR_MS = 60 * 60 * 1000;
// Par administrateur et par heure : l'ajout d'un super administrateur est
// rare, l'attribution d'un rôle plus fréquente (intégration d'une équipe).
const adminGrantLimit: Limit = { max: 10, windowMs: HOUR_MS };
const roleAssignLimit: Limit = { max: 30, windowMs: HOUR_MS };
const adminRemoveLimit: Limit = { max: 10, windowMs: HOUR_MS };

const failure = (error: unknown): AdminState => {
  if (error instanceof GatewayError && error.code === '23505') {
    return { status: 'exists' };
  }
  if (error instanceof GatewayError && error.status === 400) {
    return { status: 'invalid' };
  }
  // Journal sans adresse ni identifiant : seul le code HTTP.
  console.warn(
    JSON.stringify({
      event: 'admin.action_failed',
      status: error instanceof GatewayError ? error.status : 0
    })
  );
  return { status: 'error' };
};

/** Création d'une organisation (fonction SQL creer_organisation, journalisée). */
export async function createOrganization(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/admin');
  const parsed = organizationSchema.safeParse({
    nom: formData.get('nom'),
    slug: formData.get('slug')
  });
  if (!parsed.success) return { status: 'invalid' };
  try {
    await userClient(viewer.accessToken).rpc(
      'creer_organisation',
      { p_slug: parsed.data.slug, p_nom: parsed.data.nom },
      z.string().uuid()
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: 'created' };
}

/**
 * Attribution d'un rôle (fonction SQL attribuer_role, journalisée). Le compte
 * est retrouvé par adresse ou créé par l'API d'administration de GoTrue
 * (inscription fermée : c'est la seule voie de naissance d'un compte).
 */
export async function assignRole(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/admin');
  const parsed = roleAssignmentSchema.safeParse({
    email: formData.get('email'),
    organisation: formData.get('organisation'),
    role: formData.get('role'),
    langue: formData.get('langue')
  });
  if (!parsed.success) return { status: 'invalid' };
  if (await isRateLimited('assignRole', roleAssignLimit, viewer.id)) {
    logSecurityEvent('admin.role_rate_limited', { ip: await getClientIp() });
    return { status: 'error' };
  }
  const service = serviceClient();
  let createdId: string | null = null;
  try {
    const account = await findOrCreateUser(
      service,
      parsed.data.email,
      parsed.data.langue
    );
    if (account.created) createdId = account.id;
    await userClient(viewer.accessToken).rpc(
      'attribuer_role',
      {
        p_utilisateur: account.id,
        p_organisation: parsed.data.organisation,
        p_role: parsed.data.role
      },
      z.unknown()
    );
  } catch (error) {
    if (createdId !== null && isDefiniteRefusal(error)) {
      await discardCreatedAccount(service, createdId);
    }
    return failure(error);
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: 'assigned' };
}

/**
 * Avis à la personne promue, après l'ajout : un échec d'envoi ne l'annule
 * jamais (seul le nom de l'erreur est journalisé, jamais l'adresse).
 */
const notifyGrantedAdmin = async (
  address: string,
  langue: string
): Promise<void> => {
  const locale = toMailLocale(langue);
  const mail = buildAdminGrantMail({
    locale,
    url: connexionUrl(process.env.SITE_URL || basePath, locale)
  });
  let reason: string | null = null;
  try {
    if (!(await sendMail({ to: address, ...mail }))) reason = 'refused';
  } catch (error) {
    reason = error instanceof Error ? error.name : 'unknown';
  }
  if (reason !== null) {
    logSecurityEvent('admin.grant_notice_failed', {
      ip: await getClientIp(),
      reason
    });
  }
};

const noticeFailed = async (reason: string): Promise<void> =>
  logSecurityEvent('admin.grant_notice_failed', {
    ip: await getClientIp(),
    scope: 'others',
    reason
  });

/**
 * Avis aux AUTRES super administrateurs (ni l'acteur ni la personne concernée),
 * à partir de la liste lue avec la session de l'acteur (fonction SQL 0010).
 * Aucun échec (liste, cible inconnue, envoi) ne remonte : l'ajout ou le retrait
 * est déjà fait. Journal : cause seule, jamais d'adresse. Langue : celle de la
 * page de l'acteur (la langue des autres n'est pas connue).
 */
const notifyOtherAdmins = async (input: {
  admins: TengaAdmin[] | null;
  targetId: string;
  change: AdminChange;
  locale: string;
}): Promise<void> => {
  if (input.admins === null) return noticeFailed('list_failed');
  const target = input.admins.find((a) => a.userId === input.targetId);
  if (!target) return noticeFailed('unknown_target');
  const locale = toMailLocale(input.locale);
  const mail = buildAdminChangeMail({
    locale,
    change: input.change,
    address: target.adresse,
    url: connexionUrl(process.env.SITE_URL || basePath, locale)
  });
  for (const to of notificationRecipients(input.admins, input.targetId)) {
    let reason: string | null = null;
    try {
      if (!(await sendMail({ to, ...mail }))) reason = 'refused';
    } catch (error) {
      reason = error instanceof Error ? error.name : 'unknown';
    }
    if (reason !== null) await noticeFailed(reason);
  }
};

/**
 * Ajout d'un super administrateur (fonction SQL ajouter_admin_tenga,
 * journalisée, migration 0008). Le compte est retrouvé par adresse ou créé par
 * l'API d'administration de GoTrue ; la base décide qui a le droit d'ajouter.
 */
export async function addTengaAdmin(
  _previous: AdminState,
  formData: FormData
): Promise<AdminState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/admin');
  const parsed = adminGrantSchema.safeParse({
    email: formData.get('email'),
    confirmation: formData.get('confirmation'),
    langue: formData.get('langue')
  });
  if (!parsed.success) return { status: 'invalid' };
  if (await isRateLimited('addTengaAdmin', adminGrantLimit, viewer.id)) {
    logSecurityEvent('admin.grant_rate_limited', { ip: await getClientIp() });
    return { status: 'error' };
  }
  const service = serviceClient();
  let createdId: string | null = null;
  let added: boolean;
  let createdOrFoundId = '';
  try {
    const account = await findOrCreateUser(
      service,
      parsed.data.email,
      parsed.data.langue
    );
    if (account.created) createdId = account.id;
    createdOrFoundId = account.id;
    added = await userClient(viewer.accessToken).rpc(
      'ajouter_admin_tenga',
      { p_utilisateur: account.id },
      z.boolean()
    );
  } catch (error) {
    if (createdId !== null && isDefiniteRefusal(error)) {
      await discardCreatedAccount(service, createdId);
    }
    return failure(error);
  }
  if (added) {
    await notifyGrantedAdmin(parsed.data.email, parsed.data.langue);
    await notifyOtherAdmins({
      admins: await loadTengaAdmins(viewer),
      targetId: createdOrFoundId,
      change: 'added',
      locale
    });
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: added ? 'granted' : 'exists' };
}

const removalSchema = z.object({
  userId: z.string().uuid(),
  confirmer: z.literal('oui')
});

/**
 * Retrait d'un super administrateur (fonction SQL retirer_admin_tenga, 0008 et
 * 0009, journalisée sans adresse). La base décide : jamais soi-même, jamais le
 * dernier. Le refus « soi-même » est aussi répondu ici, sans appel, pour un
 * texte clair. Confirmation exigée (`confirmer=oui`). La liste est lue AVANT le
 * retrait pour connaître l'adresse de la cible, puis les autres sont prévenus.
 */
export async function removeTengaAdmin(
  _previous: RemoveState,
  formData: FormData
): Promise<RemoveState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireAdmin(locale, '/admin');
  const parsed = removalSchema.safeParse({
    userId: formData.get('userId'),
    confirmer: formData.get('confirmer')
  });
  if (!parsed.success) return { status: 'invalid' };
  if (parsed.data.userId === viewer.id) return { status: 'self' };
  if (await isRateLimited('removeTengaAdmin', adminRemoveLimit, viewer.id)) {
    logSecurityEvent('admin.grant_rate_limited', {
      ip: await getClientIp(),
      scope: 'remove'
    });
    return { status: 'error' };
  }
  const admins = await loadTengaAdmins(viewer);
  let removed: boolean;
  try {
    removed = await userClient(viewer.accessToken).rpc(
      'retirer_admin_tenga',
      { p_utilisateur: parsed.data.userId },
      z.boolean()
    );
  } catch (error) {
    if (
      error instanceof GatewayError &&
      (error.status === 403 || error.code === '42501')
    ) {
      return { status: 'forbidden' };
    }
    console.warn(
      JSON.stringify({
        event: 'admin.remove_failed',
        status: error instanceof GatewayError ? error.status : 0
      })
    );
    return { status: 'error' };
  }
  if (removed) {
    await notifyOtherAdmins({
      admins,
      targetId: parsed.data.userId,
      change: 'removed',
      locale
    });
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: removed ? 'removed' : 'absent' };
}
