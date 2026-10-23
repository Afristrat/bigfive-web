'use client';

import { useId, useRef, useState, useTransition, type FormEvent } from 'react';
import { relireBloc, type RelectureState } from '@/actions/relecture';
import { secondaryButtonClass } from '@/components/form-styles';
import { MessageBox, type MessageTon } from '@/components/live-message';
import { boutonPrincipal } from '@/components/primitives';
import { useAnnoncesRelecture } from '@/components/relecture/annonces-relecture';
import { voisinDuBloc } from '@/lib/relecture-focus';

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
  plafond: string;
  erreur: string;
};

const idle: RelectureState = { status: 'idle' };

const champ =
  'block w-full rounded-controle border border-trait-fort bg-surface px-3 py-2.5 text-corps text-encre transition-colors duration-courte ease-tenga hover:border-encre focus-visible:border-accent motion-reduce:transition-none';

const texteDe = (
  state: RelectureState,
  labels: VerdictFormLabels
): string | null => {
  switch (state.status) {
    case 'idle':
      return null;
    case 'relu':
      return labels.reluFait;
    case 'a_corriger':
      return labels.corrigerFait;
    case 'perime':
      return labels.perime;
    case 'interdit':
      return labels.interdit;
    case 'plafond':
      return labels.plafond;
    case 'erreur':
      return labels.erreur;
    case 'invalide':
      return state.champ === 'commentaire'
        ? labels.commentaireRequis
        : labels.invalide;
  }
};

/**
 * Verdict sur un bloc : un commentaire (obligatoire pour une correction) et
 * deux boutons d'envoi dont le nom porte le verdict, dans un groupe légendé
 * (le formulaire n'est pas un repère nommé : 150 blocs, 150 repères sinon).
 * L'envoi passe par une transition : un refus laisse la saisie en place ; un
 * verdict enregistré la vide. Le résultat s'affiche ici et s'annonce par la
 * région vivante de la page, qui survit à la sortie du bloc de la sélection ;
 * le focus passe alors au titre du bloc voisin. Pendant un envoi, une seconde
 * soumission est ignorée.
 */
export function VerdictForm({
  locale,
  bloc,
  empreinte,
  titreId,
  labels
}: {
  locale: string;
  bloc: string;
  empreinte: string;
  /** Titre du bloc (cible de focus de ses voisins). */
  titreId: string;
  labels: VerdictFormLabels;
}) {
  const id = useId();
  const champId = `${id}-commentaire`;
  const aideId = `${id}-aide`;
  const resultatId = `${id}-resultat`;
  const [state, setState] = useState<RelectureState>(idle);
  const [pending, startTransition] = useTransition();
  const [commentaire, setCommentaire] = useState('');
  const signaler = useAnnoncesRelecture();
  // Bouton qui a soumis (clic ou Entrée sur le bouton) : plus sûr que le
  // `submitter` de FormData, absent des navigateurs anciens.
  const verdict = useRef<'relu' | 'a_corriger'>('relu');

  const envoyer = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    data.set('verdict', verdict.current);
    // Voisin relevé à l'envoi : après le verdict, ce bloc peut avoir disparu.
    const ordre = Array.from(
      document.querySelectorAll<HTMLElement>('[data-bloc] h2[id]'),
      (titre) => titre.id
    );
    const suivantId = voisinDuBloc(ordre, titreId);
    startTransition(async () => {
      const resultat = await relireBloc(state, data);
      setState(resultat);
      const reussi =
        resultat.status === 'relu' || resultat.status === 'a_corriger';
      if (reussi) setCommentaire('');
      const message = texteDe(resultat, labels);
      if (message) {
        signaler({ message, titreId, suivantId, suivre: reussi });
      }
    });
  };

  const etat: RelectureState = pending ? idle : state;
  const champInvalide =
    etat.status === 'invalide' && etat.champ === 'commentaire';
  const texte = pending ? labels.envoi : texteDe(etat, labels);
  const ton: MessageTon =
    pending || etat.status === 'relu' || etat.status === 'a_corriger'
      ? 'info'
      : etat.status === 'perime' || etat.status === 'plafond'
        ? 'avis'
        : 'erreur';

  return (
    <form noValidate onSubmit={envoyer}>
      <fieldset className='flex flex-col gap-3'>
        <legend className='sr-only'>{labels.groupe}</legend>
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
            dir='auto'
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
            aria-describedby={
              champInvalide ? `${aideId} ${resultatId}` : aideId
            }
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
        {/* Affichage seul : l'annonce passe par la région vivante de la page. */}
        <div id={resultatId}>
          {texte ? (
            <MessageBox ton={ton}>
              <p>{texte}</p>
            </MessageBox>
          ) : null}
        </div>
      </fieldset>
    </form>
  );
}
