'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { localeOf } from '@/lib/locale-field';
import { localizedPath } from '@/lib/safe-path';
import { requireViewer } from '@/lib/session';
import { GatewayError, userClient } from '@/lib/supabase/server';
import { profileSchema } from '@/schemas';
import { z } from 'zod';

export type ProfileState = { status: 'idle' | 'saved' | 'invalid' | 'error' };

/** Mise à jour du profil par son titulaire (fonction SQL mettre_a_jour_profil). */
export async function saveProfile(
  _previous: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const locale = localeOf(formData.get('locale'));
  const viewer = await requireViewer(locale, '/mon-compte');
  const parsed = profileSchema.safeParse({
    nom: formData.get('nom') ?? '',
    langue: formData.get('langue')
  });
  if (!parsed.success) return { status: 'invalid' };
  try {
    await userClient(viewer.accessToken).rpc(
      'mettre_a_jour_profil',
      { p_nom: parsed.data.nom, p_langue: parsed.data.langue },
      z.unknown()
    );
  } catch (error) {
    if (error instanceof GatewayError && error.status === 400) {
      return { status: 'invalid' };
    }
    console.warn(JSON.stringify({ event: 'account.save_failed' }));
    return { status: 'error' };
  }
  // La langue choisie devient celle de la page.
  if (parsed.data.langue !== locale) {
    redirect(localizedPath(parsed.data.langue, '/mon-compte'));
  }
  revalidatePath(localizedPath(locale, '/mon-compte'));
  return { status: 'saved' };
}
