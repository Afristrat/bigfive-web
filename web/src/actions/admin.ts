'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { localeOf } from '@/lib/locale-field';
import { localizedPath } from '@/lib/safe-path';
import { requireAdmin } from '@/lib/session';
import { GatewayError, serviceClient, userClient } from '@/lib/supabase/server';
import { organizationSchema, roleAssignmentSchema } from '@/schemas';

export type AdminState = {
  status: 'idle' | 'created' | 'assigned' | 'invalid' | 'exists' | 'error';
};

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
  try {
    const service = serviceClient();
    const userId =
      (await service.findUserId(parsed.data.email)) ??
      (await service.createUser(parsed.data.email, parsed.data.langue));
    await userClient(viewer.accessToken).rpc(
      'attribuer_role',
      {
        p_utilisateur: userId,
        p_organisation: parsed.data.organisation,
        p_role: parsed.data.role
      },
      z.unknown()
    );
  } catch (error) {
    return failure(error);
  }
  revalidatePath(localizedPath(locale, '/admin'));
  return { status: 'assigned' };
}
