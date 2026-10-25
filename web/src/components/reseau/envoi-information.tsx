'use client';

import { useState, useTransition, type FormEvent } from 'react';
import {
  informerLesMembresReseau,
  type InformationReseauEtat
} from '@/actions/reseau-information';
import { MessageBox, type MessageTon } from '@/components/live-message';
import { boutonPrincipal } from '@/components/primitives';
import { appelSansRejet } from '@/lib/appel-sans-rejet';
import { formatNombre } from '@/lib/format';

export type EnvoiInformationLabels = {
  bouton: string;
  envoi: string;
  aide: string;
  aucun: string;
  termine: string;
  echecs: string;
  restants: string;
  nonTraces: string;
  ferme: string;
  interdit: string;
  plafond: string;
  reconnexion: string;
  erreur: string;
};

const idle: InformationReseauEtat = { status: 'idle' };

const remplir = (modele: string, valeurs: Record<string, string>): string =>
  Object.entries(valeurs).reduce(
    (texte, [cle, valeur]) => texte.replaceAll(`{${cle}}`, valeur),
    modele
  );

/**
 * Bouton d'envoi du courriel d'information (art. 5 de la loi 09-08) aux
 * personnes du groupe qui n'ont pas encore pris connaissance de l'information.
 * Le compte rendu donne des nombres seulement : jamais une adresse ni un nom.
 * Pendant un envoi, une seconde soumission est ignorée.
 */
export function EnvoiInformation({
  campagne,
  locale,
  labels
}: {
  campagne: string;
  locale: string;
  labels: EnvoiInformationLabels;
}) {
  const [state, setState] = useState<InformationReseauEtat>(idle);
  const [pending, startTransition] = useTransition();

  const envoyer = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    startTransition(async () => {
      setState(
        await appelSansRejet(() => informerLesMembresReseau(campagne), {
          status: 'erreur'
        })
      );
    });
  };

  const n = (valeur: number): string => formatNombre(valeur, locale);
  let texte: string | null = null;
  let ton: MessageTon = 'info';
  if (pending) {
    texte = labels.envoi;
  } else if (state.status === 'termine') {
    const lignes: string[] = [];
    if (state.envoyes === 0 && state.echecs === 0 && state.restants === 0) {
      lignes.push(labels.aucun);
    }
    if (state.envoyes > 0) {
      lignes.push(remplir(labels.termine, { n: n(state.envoyes) }));
    }
    if (state.echecs > 0) {
      lignes.push(remplir(labels.echecs, { n: n(state.echecs) }));
      ton = 'avis';
    }
    if (state.restants > 0) {
      lignes.push(remplir(labels.restants, { n: n(state.restants) }));
    }
    if (state.nonTraces > 0) {
      lignes.push(remplir(labels.nonTraces, { n: n(state.nonTraces) }));
      ton = 'erreur';
    }
    texte = lignes.join(' ');
  } else if (state.status !== 'idle') {
    texte = labels[state.status];
    ton = state.status === 'ferme' || state.status === 'plafond' ? 'avis' : 'erreur';
  }

  return (
    <form noValidate onSubmit={envoyer} className='flex flex-col gap-3'>
      <p className='colonne-lecture text-petit text-texte-2'>{labels.aide}</p>
      <div>
        <button
          type='submit'
          aria-disabled={pending ? true : undefined}
          className={boutonPrincipal()}
        >
          {labels.bouton}
        </button>
      </div>
      <div role='status' aria-live='polite'>
        {texte ? (
          <MessageBox ton={ton}>
            <p>{texte}</p>
          </MessageBox>
        ) : null}
      </div>
    </form>
  );
}
