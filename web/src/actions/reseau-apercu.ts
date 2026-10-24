'use server';

import type { ReponseLien, ResultatReseau } from '@/lib/reseau-releve';

// Actions neutralisées de l'aperçu administrateur (vue « reseau ») : elles ne
// lisent ni n'écrivent rien, ne demandent aucune session et rendent toujours
// « apercu ». Elles sont serveur parce qu'une page serveur ne peut passer à un
// composant client que des actions serveur. Leurs paramètres ne sont pas lus.

const neutre: ResultatReseau = { status: 'apercu' };

export async function informerApercu(
  _participation: string,
  _opposition: boolean
): Promise<ResultatReseau> {
  return neutre;
}

export async function consentirApercu(
  _participation: string,
  _repondre: boolean,
  _carte: boolean,
  _rapport: boolean
): Promise<ResultatReseau> {
  return neutre;
}

export async function repondreApercu(
  _participation: string,
  _reponses: ReponseLien[]
): Promise<ResultatReseau> {
  return neutre;
}

export async function retirerApercu(
  _participation: string
): Promise<ResultatReseau> {
  return neutre;
}
