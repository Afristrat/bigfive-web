'use client';

import { useActionState, useEffect, useRef } from 'react';
import {
  acceptInvitation,
  type AcceptState
} from '@/actions/invitation-accept';
import { LiveMessage } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';
import { Link } from '@/navigation';

export type AcceptLabels = {
  button: string;
  accepting: string;
  /** Texte neutre : jeton inconnu, expiré, utilisé, ou invitation devenue impossible. */
  unavailable: string;
  otherSession: string;
  /** Invitation acceptée, mais aucune session ouverte : connexion par lien. */
  signinRequired: string;
  signinLink: string;
  failed: string;
};

type ResultLabels = Omit<AcceptLabels, 'button'>;

// Après ces états, un nouveau clic ne peut rien changer : le bouton est retiré.
const DEFINITIVE: readonly AcceptState['status'][] = [
  'invalid',
  'unavailable',
  'signin_required'
];

/**
 * Message du statut de l'acceptation, dans une région vivante persistante
 * (vide au repos). `invalid` et `unavailable` partagent le même texte : rien
 * ne distingue un jeton inconnu d'une invitation périmée.
 */
export function AcceptResult({
  status,
  labels,
  pending = false
}: {
  status: AcceptState['status'];
  labels: ResultLabels;
  pending?: boolean;
}) {
  if (pending) {
    return (
      <LiveMessage ton='info' className='max-w-md'>
        <p>{labels.accepting}</p>
      </LiveMessage>
    );
  }
  if (status === 'idle') {
    return <LiveMessage ton='info' className='max-w-md' />;
  }
  if (status === 'signin_required') {
    return (
      <LiveMessage ton='avis' className='max-w-md'>
        <p>{labels.signinRequired}</p>
        <Link
          href='/connexion'
          className='inline-flex min-h-[44px] items-center font-semibold underline'
        >
          {labels.signinLink}
        </Link>
      </LiveMessage>
    );
  }
  const text =
    status === 'other_session'
      ? labels.otherSession
      : status === 'failed'
        ? labels.failed
        : labels.unavailable;
  return (
    <LiveMessage ton='erreur' className='max-w-md'>
      <p>{text}</p>
    </LiveMessage>
  );
}

const idle: AcceptState = { status: 'idle' };

// Le jeton n'est consommé qu'au clic (envoi du formulaire), jamais au
// chargement : l'ouverture du lien par un antivirus de messagerie ne l'use pas.
export function AcceptInvitationForm({
  token,
  labels
}: {
  token: string;
  labels: AcceptLabels;
}) {
  const [state, formAction, pending] = useActionState(acceptInvitation, idle);
  const resultRef = useRef<HTMLDivElement>(null);
  const definitive = DEFINITIVE.includes(state.status);

  // Le bouton retiré emportait le focus : il passe au message.
  useEffect(() => {
    if (definitive) resultRef.current?.focus();
  }, [definitive]);

  return (
    <form
      onSubmit={transitionSubmit(pending, formAction)}
      className='mt-6 flex flex-col gap-5'
    >
      <input type='hidden' name='token' value={token} />
      <div tabIndex={-1} ref={resultRef} className='max-w-md outline-offset-4'>
        <AcceptResult status={state.status} labels={labels} pending={pending} />
      </div>
      {!definitive && (
        <div>
          <PendingButton
            pending={pending}
            label={pending ? labels.accepting : labels.button}
          />
        </div>
      )}
    </form>
  );
}
