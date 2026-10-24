import 'server-only';
import { redirect } from 'next/navigation';
import { localizedPath } from '@/lib/safe-path';
import { requireViewer } from '@/lib/session';

/**
 * Parcours anonyme fermé : une route de résultat public (/result, /result/[id])
 * ne lit plus rien. Sans session, connexion avec retour sûr sur « Mes
 * résultats » ; avec session, « Mes résultats » directement.
 */
export async function versMesResultats(locale: string): Promise<never> {
  await requireViewer(locale, '/mes-resultats');
  redirect(localizedPath(locale, '/mes-resultats'));
}
