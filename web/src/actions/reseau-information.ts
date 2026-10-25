'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { basePath } from '@/config/site';
import { toMailLocale } from '@/lib/login-mail';
import { sendMail } from '@/lib/mailer';
import { isRateLimited } from '@/lib/rate-limit';
import {
  buildReseauInfoMail,
  politiqueUrl,
  reseauInfoUrl
} from '@/lib/reseau-info-mail';
import { currentViewer } from '@/lib/session';
import type { Limit } from '@/lib/sliding-window';
import { sqlOutcome } from '@/lib/sql-errors';
import { GatewayError, serviceClient, userClient } from '@/lib/supabase/server';

// Courriel d'information du relevé du réseau (migration 0026, art. 5 de la loi
// 09-08, art. 14 du RGPD), envoyé par le consultant de l'organisation ou un
// administrateur Tenga, relevé ouvert. La liste des personnes à informer vient
// de la base avec l'identité de la personne connectée (jamais d'adresse) ; les
// adresses ne sortent que par la clé de service, en repassant cette identité à
// la fonction, qui revérifie le rôle. Chaque envoi réussi est ensuite inscrit
// au journal d'audit : une personne déjà informée n'est plus jamais reprise.
// Journal d'exploitation : le nom de l'action et des nombres, jamais une
// adresse, un nom ou un identifiant de personne.

// ponytail: un clic envoie au plus 100 courriels, par lots de 5 en parallèle (débit de l'expéditeur et durée d'une action serveur) ; le reste se fait par un nouveau clic. Réexamen : groupes de plus de 100 personnes à informer d'un coup.
const MAX_PAR_CLIC = 100;
const TAILLE_LOT = 5;
// Par personne et par heure : un second clic n'a d'effet que pour le reste.
const envoiLimit: Limit = { max: 10, windowMs: 60 * 60 * 1000 };

const uuid = z.string().uuid();
const aInformerRows = z.array(
  z.object({ participation_id: uuid, langue: z.string() }).strict()
);
const courrielRows = z.array(
  z.object({ participation_id: uuid, courriel: z.string().email() }).strict()
);

export type InformationReseauEtat =
  | { status: 'idle' }
  | { status: 'reconnexion' | 'interdit' | 'ferme' | 'plafond' | 'erreur' }
  | {
      status: 'termine';
      /** Courriels partis ET inscrits au journal. */
      envoyes: number;
      /** Courriels refusés par l'expéditeur ou jamais partis : à renvoyer. */
      echecs: number;
      /** Personnes restant à informer après ce clic (plafond d'un clic). */
      restants: number;
      /** Courriels partis dont l'inscription au journal a échoué : risque de doublon. */
      nonTraces: number;
    };

const avertir = (action: string, error: unknown): void => {
  console.warn(
    JSON.stringify({
      event: 'reseau_information.action_failed',
      action,
      status: error instanceof GatewayError ? error.status : 0
    })
  );
};

const refus = (error: unknown): InformationReseauEtat | null => {
  if (error instanceof GatewayError && error.status === 401) {
    return { status: 'reconnexion' };
  }
  switch (sqlOutcome(error)) {
    case 'forbidden':
    case 'notfound':
      return { status: 'interdit' };
    case 'conflict':
      return { status: 'ferme' };
    default:
      return null;
  }
};

/** Envoie le courriel d'information aux personnes de la campagne qui n'ont pas encore été informées. */
export async function informerLesMembresReseau(
  campagne: string
): Promise<InformationReseauEtat> {
  const state = await currentViewer();
  if (state.status !== 'ok') return { status: 'reconnexion' };
  const id = uuid.safeParse(campagne);
  if (!id.success) return { status: 'interdit' };
  const { viewer } = state;
  if (await isRateLimited('informerReseau', envoiLimit, viewer.id)) {
    console.warn(JSON.stringify({ event: 'reseau_information.rate_limited' }));
    return { status: 'plafond' };
  }

  let aInformer: z.infer<typeof aInformerRows>;
  try {
    aInformer = await userClient(viewer.accessToken).rpc(
      'reseau_a_informer',
      { p_campagne: id.data },
      aInformerRows
    );
  } catch (error) {
    const resultat = refus(error);
    if (resultat) return resultat;
    avertir('a_informer', error);
    return { status: 'erreur' };
  }
  if (aInformer.length === 0) {
    return {
      status: 'termine',
      envoyes: 0,
      echecs: 0,
      restants: 0,
      nonTraces: 0
    };
  }

  const lot = aInformer.slice(0, MAX_PAR_CLIC);
  const restants = aInformer.length - lot.length;
  let adresses: z.infer<typeof courrielRows>;
  try {
    adresses = await serviceClient().rpc(
      'reseau_courriels',
      {
        p_acteur: viewer.id,
        p_campagne: id.data,
        p_participations: lot.map((l) => l.participation_id)
      },
      courrielRows
    );
  } catch (error) {
    const resultat = refus(error);
    if (resultat) return resultat;
    avertir('courriels', error);
    return { status: 'erreur' };
  }

  const langues = new Map(lot.map((l) => [l.participation_id, l.langue]));
  const siteUrl = process.env.SITE_URL || basePath;
  const partis: string[] = [];
  let echecs = 0;
  for (let i = 0; i < adresses.length; i += TAILLE_LOT) {
    const resultats = await Promise.allSettled(
      adresses.slice(i, i + TAILLE_LOT).map(async (a) => {
        const locale = toMailLocale(langues.get(a.participation_id));
        const mail = buildReseauInfoMail({
          locale,
          url: reseauInfoUrl(siteUrl, locale, a.participation_id),
          policyUrl: politiqueUrl(siteUrl, locale)
        });
        const parti = await sendMail({ to: a.courriel, ...mail });
        return parti ? a.participation_id : null;
      })
    );
    for (const r of resultats) {
      if (r.status === 'fulfilled' && r.value) partis.push(r.value);
      else echecs += 1;
    }
  }
  // Personnes dont l'adresse n'a pas été rendue (déjà informées entre-temps) : rien à envoyer.
  if (partis.length === 0) {
    return { status: 'termine', envoyes: 0, echecs, restants, nonTraces: 0 };
  }

  let inscrits = 0;
  try {
    inscrits = await userClient(viewer.accessToken).rpc(
      'reseau_marquer_informes',
      { p_campagne: id.data, p_participations: partis },
      z.number().int().nonnegative()
    );
  } catch (error) {
    avertir('marquer', error);
  }
  const nonTraces = partis.length - inscrits;
  if (nonTraces > 0) {
    console.warn(
      JSON.stringify({
        event: 'reseau_information.non_trace',
        nombre: nonTraces
      })
    );
  }
  revalidatePath('/[locale]/o/[slug]/campagnes/[campagne]/reseau', 'page');
  return { status: 'termine', envoyes: inscrits, echecs, restants, nonTraces };
}
