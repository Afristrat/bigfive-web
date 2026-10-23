import 'server-only';
import { z } from 'zod';
import type { LigneEtatRelecture } from '@/lib/bibliotheque';
import { serviceClient } from '@/lib/supabase/server';

// État de relecture servi (migration 0022, app.etat_relecture_blocs, accordée à
// service_role seul) : dernier verdict de chaque couple (bloc, empreinte), sans
// relecteur, commentaire ni date. Lu par la bibliothèque pour décider si un
// bloc s'affiche à la personne, quelle que soit la personne qui consulte.

const lignes = z.array(
  z.object({
    bloc: z.string(),
    empreinte: z.string(),
    verdict: z.enum(['relu', 'a_corriger'])
  })
);

export const chargerEtatRelecture = (): Promise<LigneEtatRelecture[]> =>
  serviceClient().rpc('etat_relecture_blocs', {}, lignes);
