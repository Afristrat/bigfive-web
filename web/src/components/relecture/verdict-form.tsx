'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { relireBloc, type RelectureState } from '@/actions/relecture';
import { secondaryButtonClass } from '@/components/form-styles';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { boutonPrincipal } from '@/components/primitives';

export type VerdictFormLabels = {
  groupe: string;
  commentaire: string;
  commentaireAide: string;
  relu: string;
  aCorriger: string;
  envoi: string;
  reluFait: string;
  corrigerFait: string;
  perime: string;
  invalide: string;
  commentaireRequis: string;
  interdit: string;
  erreur: string;
};

const idle: RelectureState = { status: 'idle' };

const champ =
  'block w-full rounded-controle border border-trait-fort bg-surface px-3 py-2.5 text-corps text-encre transition-colors duration-courte ease-tenga hover:border-encre focus-visible:border-accent motion-reduce:transition-none';

/**
 * Verdict sur un bloc : un commentaire (obligatoire pour une correction) et
 * deux boutons d'envoi dont le nom porte le verdict. Le champ est contrôlé et
 * l'envoi passe par une transition (pas de `action` sur le formulaire) : un
 * refus laisse la saisie en place ; un verdict enregistré la vide. Pendant un
 * envoi, une seconde soumission est ignorée.
 */
export function VerdictForm({
  locale,
  bloc,
  empreinte,
  labels
}: {
  locale: string;
  bloc: string;
  empreinte: string;
  labels: VerdictFormLabels;
}) {
  const id = useId();
  const champId = `${id}-commentaire`;
  const aideId = `${id}-aide`;
  const resultatId = `${id}-resultat`;
  const [state, formAction, pending] = useActionState(relireBloc, idle);
  const [commentaire, setCommentaire] = useState('');
  // Bouton qui a soumis (clic ou Entrée sur le bouton) : plus sûr que le
  // `submitter` de FormData, absent des navigateurs anciens.
  const verdict = useRef<'relu' | 'a_corriger'>('relu');

  useEffect(() => {
    if (state.status === 'relu' || state.status === 'a_corriger') {
      setCommentaire('');
    }
  }, [state]);

  const envoyer = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.set('verdict', verdict.current);
    startTransition(() => formAction(data));
  };

  const etat = pending ? 'idle' : state.status;
  const champInvalide =
    !pending && state.status === 'invalide' && state.champ === 'commentaire';
  const texte = pending
    ? labels.envoi
    : {
        idle: null,
        relu: labels.reluFait,
        a_corriger: labels.corrigerFait,
        perime: labels.perime,
        interdit: labels.interdit,
        erreur: labels.erreur,
        invalide: champInvalide ? labels.commentaireRequis : labels.invalide
      }[etat];
  const ton: MessageTon =
    pending || etat === 'relu' || etat === 'a_corriger'
      ? 'info'
      : etat === 'perime'
        ? 'avis'
        : 'erreur';

  return (
    <form
      noValidate
      onSubmit={envoyer}
      aria-label={labels.groupe}
      className='flex flex-col gap-3'
    >
      <input type='hidden' name='locale' value={locale} />
      <input type='hidden' name='bloc' value={bloc} />
      <input type='hidden' name='empreinte' value={empreinte} />
      <div>
        <label
          htmlFor={champId}
          className='mb-1.5 block font-medium text-encre'
        >
          {labels.commentaire}
        </label>
        <textarea
          id={champId}
          name='commentaire'
          rows={3}
          maxLength={2000}
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          aria-describedby={champInvalide ? `${aideId} ${resultatId}` : aideId}
          aria-invalid={champInvalide ? true : undefined}
          className={champ}
        />
        <p id={aideId} className='mt-1.5 text-legende text-texte-3'>
          {labels.commentaireAide}
        </p>
      </div>
      <div className='flex flex-wrap gap-3'>
        <button
          type='submit'
          name='verdict'
          value='relu'
          onClick={() => {
            verdict.current = 'relu';
          }}
          aria-disabled={pending ? true : undefined}
          className={boutonPrincipal()}
        >
          {labels.relu}
        </button>
        <button
          type='submit'
          name='verdict'
          value='a_corriger'
          onClick={() => {
            verdict.current = 'a_corriger';
          }}
          aria-disabled={pending ? true : undefined}
          className={secondaryButtonClass}
        >
          {labels.aCorriger}
        </button>
      </div>
      <LiveMessage id={resultatId} ton={ton}>
        {texte ? <p>{texte}</p> : null}
      </LiveMessage>
    </form>
  );
}
