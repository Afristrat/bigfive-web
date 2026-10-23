'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import {
  proposerBinome,
  repondreBinome,
  retirerBinome,
  type PropositionState,
  type ReponseBinome
} from '@/actions/binome';
import {
  labelClass,
  secondaryButtonClass,
  selectClass
} from '@/components/form-styles';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { boutonPrincipal } from '@/components/primitives';
import { transitionSubmit } from '@/components/transition-submit';
import { Link, useRouter } from '@/navigation';

// Consentement au binôme : accepter, refuser, retirer. Le serveur décide de
// tout (la base vérifie qui répond) ; ce composant ne fait qu'envoyer la
// réponse, dire ce qui s'est passé dans une région vivante, puis rafraîchir la
// page pour que la liste et le lien vers le rapport suivent l'état réel.

export type BinomeConsentLabels = {
  accepter: string;
  refuser: string;
  retirer: string;
  working: string;
  explication: string;
  messages: Record<
    | 'en_attente'
    | 'actif'
    | 'retire'
    | 'forbidden'
    | 'closed'
    | 'notfound'
    | 'invalid'
    | 'failed',
    string
  >;
};

type BinomeConsentProps = {
  binomeId: string;
  statut: 'en_attente' | 'actif' | 'retire';
  /** Vrai quand la personne a déjà donné son accord. */
  aDonneAccord: boolean;
  labels: BinomeConsentLabels;
  /** Texte qui explique ce que l'on accepte, au-dessus des boutons de décision. */
  avecExplication?: boolean;
};

const SUCCES: readonly ReponseBinome['status'][] = [
  'en_attente',
  'actif',
  'retire'
];

// Après ces réponses l'état de la proposition a changé, ou n'est plus tel
// qu'affiché : la page se rafraîchit.
const RAFRAICHIR: readonly ReponseBinome['status'][] = [
  ...SUCCES,
  'closed',
  'notfound'
];

export function BinomeConsent({
  binomeId,
  statut,
  aDonneAccord,
  labels,
  avecExplication = false
}: BinomeConsentProps) {
  const router = useRouter();
  const [pending, demarrer] = useTransition();
  const [reponse, setReponse] = useState<ReponseBinome['status'] | null>(null);

  const envoyer = (action: () => Promise<ReponseBinome>): void => {
    if (pending) return;
    demarrer(async () => {
      const retour = await action();
      setReponse(retour.status);
      if (RAFRAICHIR.includes(retour.status)) router.refresh();
    });
  };

  if (statut === 'retire') return null;

  const ton: MessageTon =
    reponse !== null && SUCCES.includes(reponse) ? 'info' : 'erreur';
  const message = pending
    ? labels.working
    : reponse === null
      ? null
      : labels.messages[reponse];

  return (
    <div className='flex flex-col gap-3'>
      {!aDonneAccord && avecExplication && (
        <p className='max-w-[44em] text-petit text-texte-2'>
          {labels.explication}
        </p>
      )}
      <div className='flex flex-wrap gap-3'>
        {aDonneAccord ? (
          <button
            type='button'
            className={secondaryButtonClass}
            aria-disabled={pending ? true : undefined}
            onClick={() => envoyer(() => retirerBinome(binomeId))}
          >
            {labels.retirer}
          </button>
        ) : (
          <>
            <button
              type='button'
              className={boutonPrincipal()}
              aria-disabled={pending ? true : undefined}
              onClick={() => envoyer(() => repondreBinome(binomeId, true))}
            >
              {labels.accepter}
            </button>
            <button
              type='button'
              className={secondaryButtonClass}
              aria-disabled={pending ? true : undefined}
              onClick={() => envoyer(() => repondreBinome(binomeId, false))}
            >
              {labels.refuser}
            </button>
          </>
        )}
      </div>
      <LiveMessage ton={pending ? 'info' : ton} className='max-w-md'>
        {message ? <p>{message}</p> : null}
      </LiveMessage>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Proposition par le consultant.

export type BinomePropositionLabels = {
  choixA: string;
  choixB: string;
  choisir: string;
  envoyer: string;
  working: string;
  proposed: string;
  lienRapport: string;
  messages: Record<'invalid' | 'forbidden' | 'already' | 'error', string>;
};

type BinomePropositionProps = {
  /** Résultats proposés au choix, par identifiant opaque : jamais une identité. */
  options: readonly { id: string; label: string }[];
  labels: BinomePropositionLabels;
};

const idle: PropositionState = { status: 'idle' };

export function BinomeProposition({ options, labels }: BinomePropositionProps) {
  const base = useId();
  const [state, formAction, pending] = useActionState(proposerBinome, idle);
  // Champs contrôlés, envoyés par `onSubmit` et non par `action` : sans prop
  // `action`, React ne réinitialise pas le formulaire (un choix refusé reste).
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  const message = pending
    ? labels.working
    : state.status === 'idle'
      ? null
      : state.status === 'proposed'
        ? labels.proposed
        : labels.messages[state.status];
  const ton: MessageTon =
    pending || state.status === 'proposed' ? 'info' : 'erreur';

  const choix = (
    id: string,
    nom: 'a' | 'b',
    libelle: string,
    valeur: string,
    changer: (valeur: string) => void
  ) => (
    <div className='max-w-md'>
      <label htmlFor={id} className={labelClass}>
        {libelle}
      </label>
      <select
        id={id}
        name={nom}
        value={valeur}
        onChange={(event) => changer(event.target.value)}
        className={selectClass}
      >
        <option value=''>{labels.choisir}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <form
      onSubmit={transitionSubmit(pending, formAction)}
      noValidate
      className='mt-5 flex flex-col gap-5'
    >
      {choix(`${base}-a`, 'a', labels.choixA, a, setA)}
      {choix(`${base}-b`, 'b', labels.choixB, b, setB)}
      <LiveMessage ton={ton} className='max-w-md'>
        {message ? <p>{message}</p> : null}
        {state.status === 'proposed' && !pending ? (
          <Link
            href={`/mes-resultats/binomes/${state.binome}`}
            className='font-semibold text-accent underline'
          >
            {labels.lienRapport}
          </Link>
        ) : null}
      </LiveMessage>
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.working : labels.envoyer}
        />
      </div>
    </form>
  );
}
