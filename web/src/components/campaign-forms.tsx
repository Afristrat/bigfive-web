'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Input } from '@nextui-org/input';
import {
  closeCampaign,
  createCampaign,
  openCampaign,
  type CampaignState
} from '@/actions/campaigns';
import { useAnnounce } from '@/components/campaign-announcer';
import { inputClassNames } from '@/components/form-styles';
import { LanguageSelect } from '@/components/language-select';
import {
  LiveMessage,
  MessageBox,
  type MessageTon
} from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';
import { CAMPAIGN_TITLE_MAX, type InvitationLocale } from '@/lib/access-rules';

export type CampaignFeedback = {
  invalid: string;
  forbidden: string;
  conflict: string;
  error: string;
};

const idle: CampaignState = { status: 'idle' };

const SUCCESS: readonly CampaignState['status'][] = [
  'created',
  'opened',
  'closed'
];

const tonOf = (state: CampaignState): MessageTon =>
  SUCCESS.includes(state.status) ? 'info' : 'erreur';

/** Texte d'un refus ; les succès portent leur propre texte (`done`). */
const failureText = (state: CampaignState, labels: CampaignFeedback): string =>
  state.status === 'invalid'
    ? labels.invalid
    : state.status === 'forbidden'
      ? labels.forbidden
      : state.status === 'conflict'
        ? labels.conflict
        : labels.error;

const legendClass = 'text-petit text-texte-2';

export type CampaignCreateLabels = CampaignFeedback & {
  requiredLegend: string;
  titleLabel: string;
  titleHelp: string;
  /** Dit quoi corriger quand le titre est refusé. */
  titleInvalid: string;
  languageLabel: string;
  languages: Record<InvitationLocale, string>;
  submit: string;
  working: string;
  done: string;
};

export function CampaignCreateForm({
  locale,
  slug,
  organisationId,
  defaultLanguage,
  labels
}: {
  locale: string;
  slug: string;
  organisationId: string;
  defaultLanguage: InvitationLocale;
  labels: CampaignCreateLabels;
}) {
  const base = useId();
  const resultId = `${base}-resultat`;
  const [state, formAction, pending] = useActionState(createCampaign, idle);
  // Champs contrôlés, envoyés par `onSubmit` et non par `action` : sans prop
  // `action`, React ne réinitialise pas le formulaire (le titre refusé reste).
  const [titre, setTitre] = useState('');
  const [language, setLanguage] = useState<InvitationLocale>(defaultLanguage);

  useEffect(() => {
    if (state.status === 'created') setTitre('');
  }, [state]);

  const invalid = state.status === 'invalid';
  const message = pending
    ? labels.working
    : state.status === 'idle'
      ? null
      : state.status === 'created'
        ? labels.done
        : invalid
          ? labels.titleInvalid
          : failureText(state, labels);

  return (
    <form
      onSubmit={transitionSubmit(pending, formAction)}
      noValidate
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <input type='hidden' name='slug' value={slug} />
      <input type='hidden' name='organisation' value={organisationId} />
      <p className={legendClass}>{labels.requiredLegend}</p>
      <Input
        name='titre'
        label={labels.titleLabel}
        description={labels.titleHelp}
        labelPlacement='outside'
        placeholder=' '
        isRequired
        maxLength={CAMPAIGN_TITLE_MAX}
        dir='auto'
        value={titre}
        onValueChange={setTitre}
        isInvalid={invalid && !pending}
        aria-describedby={invalid && !pending ? resultId : undefined}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <LanguageSelect
        id={`${base}-langue`}
        label={labels.languageLabel}
        value={language}
        onChange={setLanguage}
        languages={labels.languages}
      />
      <LiveMessage
        id={resultId}
        ton={pending ? 'info' : tonOf(state)}
        className='max-w-md'
      >
        {message ? <p>{message}</p> : null}
      </LiveMessage>
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.working : labels.submit}
        />
      </div>
    </form>
  );
}

export type CampaignRowLabels = CampaignFeedback & {
  working: string;
  open: { submit: string; ariaLabel: string; done: string };
  close: {
    warning: string;
    confirm: string;
    submit: string;
    ariaLabel: string;
    done: string;
  };
};

/**
 * Actions d'une ligne de campagne : UN composant par ligne, qui porte les deux
 * `useActionState`. « Ouvrir » ou « Clôturer » re-rend la page
 * (`revalidatePath`) et change le formulaire affiché ; si chaque formulaire
 * avait son propre état, il serait démonté avec son message. Ici l'état
 * survit, le résultat est écrit dans la région d'annonce persistante de la
 * page (lecteurs d'écran) et affiché dans la ligne (vue). Après un succès, le
 * focus va à l'intitulé de la ligne, sinon il tomberait sur le corps de la page.
 */
export function CampaignRowActions({
  locale,
  slug,
  campaignId,
  statut,
  titleId,
  labels
}: {
  locale: string;
  slug: string;
  campaignId: string;
  statut: 'brouillon' | 'ouverte' | 'close';
  /** Identifiant de l'en-tête de ligne (titre de la campagne). */
  titleId: string;
  labels: CampaignRowLabels;
}) {
  const base = useId();
  const confirmId = `${base}-confirmer`;
  const warningId = `${base}-avertissement`;
  const announce = useAnnounce();
  const [openState, openAction, openPending] = useActionState(
    openCampaign,
    idle
  );
  const [closeState, closeAction, closePending] = useActionState(
    closeCampaign,
    idle
  );
  const pending = openPending || closePending;

  // La dernière tentative de clôture prime sur l'ouverture qui l'a précédée.
  const closing = closeState.status !== 'idle';
  const result = closing ? closeState : openState;
  const text = pending
    ? labels.working
    : result.status === 'idle'
      ? null
      : result.status === 'opened'
        ? labels.open.done
        : result.status === 'closed'
          ? labels.close.done
          : failureText(result, labels);
  const ton: MessageTon = pending ? 'info' : tonOf(result);

  useEffect(() => {
    if (text) announce(text, ton);
  }, [announce, text, ton, result]);

  // Un effet par état : une clôture refusée après une ouverture réussie ne
  // doit pas refocaliser l'en-tête et retirer le focus du bouton.
  useEffect(() => {
    if (openState.status === 'opened') {
      document.getElementById(titleId)?.focus();
    }
  }, [openState, titleId]);

  useEffect(() => {
    if (closeState.status === 'closed') {
      document.getElementById(titleId)?.focus();
    }
  }, [closeState, titleId]);

  return (
    <div className='flex max-w-xs flex-col gap-3'>
      {statut === 'brouillon' && (
        <form
          onSubmit={transitionSubmit(pending, openAction)}
          className='flex flex-col gap-3'
        >
          <input type='hidden' name='locale' value={locale} />
          <input type='hidden' name='slug' value={slug} />
          <input type='hidden' name='campagne' value={campaignId} />
          <div>
            <PendingButton
              pending={pending}
              label={labels.open.submit}
              ariaLabel={labels.open.ariaLabel}
            />
          </div>
        </form>
      )}
      {statut === 'ouverte' && (
        // La clôture est irréversible : la case est obligatoire dans le
        // navigateur, et l'action serveur exige elle aussi `confirmer=oui`.
        <form
          onSubmit={transitionSubmit(pending, closeAction)}
          className='flex flex-col gap-3'
        >
          <input type='hidden' name='locale' value={locale} />
          <input type='hidden' name='slug' value={slug} />
          <input type='hidden' name='campagne' value={campaignId} />
          <p id={warningId} className='text-petit text-texte-2'>
            {labels.close.warning}
          </p>
          {/* Toute la ligne est cliquable (cible d'au moins 44 px). */}
          <label className='flex min-h-[44px] cursor-pointer items-start gap-3 text-petit text-encre'>
            <input
              type='checkbox'
              name='confirmer'
              value='oui'
              required
              aria-labelledby={`${confirmId} ${titleId}`}
              aria-describedby={warningId}
              className='mt-1 size-6 shrink-0 accent-accent'
            />
            <span id={confirmId}>{labels.close.confirm}</span>
          </label>
          <div>
            <PendingButton
              pending={pending}
              color='danger'
              variant='bordered'
              label={labels.close.submit}
              ariaLabel={labels.close.ariaLabel}
            />
          </div>
        </form>
      )}
      {text && (
        // Vue seulement : la région d'annonce de la page porte la lecture.
        <div aria-hidden='true'>
          <MessageBox ton={ton}>
            <p>{text}</p>
          </MessageBox>
        </div>
      )}
    </div>
  );
}
