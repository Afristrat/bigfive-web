'use client';

import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type RefObject
} from 'react';
import { inviteParticipants, type InviteState } from '@/actions/invitations';
import { labelClass } from '@/components/form-styles';
import { LanguageSelect } from '@/components/language-select';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';
import {
  INVITATION_MESSAGE_MAX,
  INVITE_LIST_MAX_CHARS,
  type InvitationLocale
} from '@/lib/access-rules';

// Seuils d'annonce du compteur, par ordre CROISSANT (le plus serré d'abord) :
// une annonce sous 50, sous 10 et à la limite, jamais à chaque frappe.
const LOW_THRESHOLDS = [10, 50] as const;

export type CounterNotice =
  | { kind: 'low'; threshold: number }
  | { kind: 'full' };

/** Annonce du compteur pour `remaining` caractères restants, ou rien. */
export function counterNotice(remaining: number): CounterNotice | null {
  if (remaining <= 0) return { kind: 'full' };
  const threshold = LOW_THRESHOLDS.find((limit) => remaining < limit);
  // « moins de N » doit être exact : on n'annonce qu'en dessous du seuil.
  // Entre 10 et 49 restants, le seuil annoncé reste 50.
  return threshold === undefined ? null : { kind: 'low', threshold };
}

const textareaClass =
  'block w-full max-w-xl rounded-controle border-[1.5px] border-trait-fort bg-surface px-3.5 py-3 text-corps text-encre transition-colors duration-normale hover:border-accent focus-visible:border-accent motion-reduce:transition-none';

export type InviteFormLabels = {
  requiredLegend: string;
  addressesLabel: string;
  addressesHelp: string;
  languageLabel: string;
  languages: Record<InvitationLocale, string>;
  messageLabel: string;
  messageHelp: string;
  /** Gabarit avec {count} et {max}. */
  counter: string;
  /** Gabarit avec {remaining} : seuil franchi (50 ou 10), « moins de N ». */
  counterLow: string;
  counterFull: string;
  submit: string;
  sending: string;
  /** Gabarit avec {sent} et {total}. */
  summary: string;
  doneNone: string;
  /** Gabarit avec {failed}. */
  summaryFailed: string;
  /** Gabarit avec {unprocessed}. */
  summaryUnprocessed: string;
  abortedError: string;
  abortedForbidden: string;
  abortedClosed: string;
  failuresTitle: string;
  outcome: Record<
    'mail_failed' | 'skipped_recent' | 'refused' | 'rate_limited',
    string
  >;
  invalid: Record<'empty' | 'too_many' | 'address' | 'message', string>;
  forbidden: string;
  closed: string;
  rateLimited: string;
  error: string;
};

type Done = Extract<InviteState, { status: 'done' }>;

const idle: InviteState = { status: 'idle' };

const LINE_BREAK = /\r\n|\n|\r/;

// Même lecture que le serveur (invite-list.ts) : adresse avant la première
// virgule ou point-virgule, en minuscules.
const addressOf = (line: string): string =>
  (line.split(/[,;]/, 1)[0] ?? '').trim().toLowerCase();

/**
 * Après un lot, ne garde dans la liste que ce qui reste à envoyer : les lignes
 * en échec et, si le lot a été interrompu, la fin non traitée. Le serveur
 * traite les adresses uniques dans l'ordre de la liste et s'arrête net : les
 * non traitées sont donc les dernières. Une adresse envoyée n'est pas gardée,
 * sinon un second clic la renverrait.
 */
export function remainingAddresses(text: string, done: Done): string {
  const seen = new Set<string>();
  const unique = text
    .split(LINE_BREAK)
    .map((line) => line.trim())
    .filter((line) => {
      if (line === '') return false;
      const address = addressOf(line);
      if (seen.has(address)) return false;
      seen.add(address);
      return true;
    });
  const failed = new Set(
    done.failures.map(({ email }) => email.trim().toLowerCase())
  );
  const unprocessed = Math.max(
    0,
    done.total - done.sent - done.failures.length
  );
  const tail = new Set(
    unique.slice(Math.max(0, unique.length - unprocessed)).map(addressOf)
  );
  return unique
    .filter((line) => {
      const address = addressOf(line);
      return failed.has(address) || (unprocessed > 0 && tail.has(address));
    })
    .join('\n');
}

const fill = (
  template: string,
  values: Record<string, string | number>
): string =>
  Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template
  );

/** Récapitulatif chiffré d'un lot : seul texte annoncé (le détail ne l'est pas). */
export function batchSummary(
  done: Done,
  labels: InviteFormLabels
): { text: string; ton: MessageTon } {
  const unprocessed = Math.max(
    0,
    done.total - done.sent - done.failures.length
  );
  const parts = [
    done.sent > 0
      ? fill(labels.summary, { sent: done.sent, total: done.total })
      : labels.doneNone
  ];
  if (done.failures.length > 0) {
    parts.push(fill(labels.summaryFailed, { failed: done.failures.length }));
  }
  if (done.aborted) {
    parts.push(
      done.aborted === 'closed'
        ? labels.abortedClosed
        : done.aborted === 'forbidden'
          ? labels.abortedForbidden
          : labels.abortedError
    );
  }
  if (unprocessed > 0) {
    parts.push(fill(labels.summaryUnprocessed, { unprocessed }));
  }
  const ton: MessageTon =
    done.sent === 0
      ? 'erreur'
      : done.failures.length > 0 || done.aborted
        ? 'avis'
        : 'info';
  return { text: parts.join(' '), ton };
}

function resultOf(
  state: InviteState,
  labels: InviteFormLabels
): { text: string; ton: MessageTon } | null {
  switch (state.status) {
    case 'idle':
      return null;
    case 'done':
      return batchSummary(state, labels);
    case 'invalid':
      return { text: labels.invalid[state.reason], ton: 'erreur' };
    case 'forbidden':
      return { text: labels.forbidden, ton: 'erreur' };
    case 'closed':
      return { text: labels.closed, ton: 'erreur' };
    case 'rate_limited':
      return { text: labels.rateLimited, ton: 'erreur' };
    case 'error':
      return { text: labels.error, ton: 'erreur' };
  }
}

const hasDetail = (state: InviteState): boolean =>
  (state.status === 'done' && state.failures.length > 0) ||
  (state.status === 'invalid' && state.rejected.length > 0);

const addressClass = 'font-semibold [overflow-wrap:anywhere]';

/** Détail d'un résultat : hors région vivante (non annoncé), focalisable. */
function Detail({
  state,
  labels,
  detailRef,
  id,
  resultId
}: {
  state: InviteState;
  labels: InviteFormLabels;
  detailRef: RefObject<HTMLDivElement | null>;
  id: string;
  /** Région qui porte le texte d'introduction des lignes refusées. */
  resultId: string;
}) {
  if (state.status === 'done' && state.failures.length > 0) {
    return (
      <div
        tabIndex={-1}
        ref={detailRef}
        id={id}
        role='group'
        aria-labelledby={`${id}-titre`}
        className='max-w-xl rounded-controle p-1 text-petit text-encre'
      >
        <p id={`${id}-titre`} className='font-semibold'>
          {labels.failuresTitle}
        </p>
        <ul className='mt-1 list-disc ps-5'>
          {state.failures.map((failure) => (
            <li key={failure.email}>
              <bdi dir='ltr' className={addressClass}>
                {failure.email}
              </bdi>
              <span className='block'>{labels.outcome[failure.outcome]}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  if (state.status === 'invalid' && state.rejected.length > 0) {
    return (
      <div
        tabIndex={-1}
        ref={detailRef}
        id={id}
        role='group'
        aria-labelledby={resultId}
        className='max-w-xl rounded-controle p-1 text-petit text-encre'
      >
        <ul className='list-disc ps-5'>
          {state.rejected.map((line, index) => (
            // Une même ligne peut être saisie deux fois : la position départage.
            <li key={`${index}-${line}`}>
              <bdi dir='ltr' className={addressClass}>
                {line}
              </bdi>
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
}

export function InviteForm({
  locale,
  slug,
  campaignId,
  defaultLanguage,
  labels
}: {
  locale: string;
  slug: string;
  campaignId: string;
  defaultLanguage: InvitationLocale;
  labels: InviteFormLabels;
}) {
  const base = useId();
  const addressesId = `${base}-adresses`;
  const helpId = `${base}-aide`;
  const resultId = `${base}-resultat`;
  const detailId = `${base}-detail`;
  const languageId = `${base}-langue`;
  const messageId = `${base}-message`;
  const messageHelpId = `${base}-message-aide`;
  const counterId = `${base}-compteur`;
  const detailRef = useRef<HTMLDivElement>(null);
  const [state, formAction, pending] = useActionState(inviteParticipants, idle);
  // Champs contrôlés, envoyés par `onSubmit` et non par `action` : sans prop
  // `action`, React ne réinitialise pas le formulaire (liste, message et
  // langue restent après un refus).
  const [addresses, setAddresses] = useState('');
  const [message, setMessage] = useState('');
  const [language, setLanguage] = useState<InvitationLocale>(defaultLanguage);

  useEffect(() => {
    if (state.status !== 'done') return;
    if (state.failures.length === 0 && state.aborted === null) {
      setAddresses('');
      setMessage('');
    } else {
      // Un second clic ne doit renvoyer que ce qui n'est pas parti.
      setAddresses((current) => remainingAddresses(current, state));
    }
  }, [state]);

  useEffect(() => {
    if (hasDetail(state)) detailRef.current?.focus();
  }, [state]);

  const shown = pending ? null : state;
  const result = pending
    ? { text: labels.sending, ton: 'info' as const }
    : resultOf(state, labels);
  const addressesInvalid =
    shown?.status === 'invalid' && shown.reason !== 'message';
  const messageInvalid =
    shown?.status === 'invalid' && shown.reason === 'message';
  const detailed = shown !== null && hasDetail(shown);

  // Le serveur compte un saut de ligne pour 1 caractère (CRLF et CR en LF).
  const length = message.replace(/\r\n?/g, '\n').length;
  const remaining = INVITATION_MESSAGE_MAX - length;
  const notice = counterNotice(remaining);
  const counterAnnouncement =
    notice === null
      ? ''
      : notice.kind === 'full'
        ? labels.counterFull
        : fill(labels.counterLow, { remaining: notice.threshold });

  return (
    <form
      onSubmit={transitionSubmit(pending, formAction)}
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <input type='hidden' name='slug' value={slug} />
      <input type='hidden' name='campagne' value={campaignId} />
      <p className='text-petit text-texte-2'>{labels.requiredLegend}</p>
      <div>
        <label htmlFor={addressesId} className={labelClass}>
          {labels.addressesLabel}
          <span aria-hidden='true'> *</span>
        </label>
        <textarea
          id={addressesId}
          name='adresses'
          required
          rows={6}
          maxLength={INVITE_LIST_MAX_CHARS}
          value={addresses}
          onChange={(event) => setAddresses(event.target.value)}
          autoComplete='off'
          autoCapitalize='none'
          spellCheck={false}
          dir='ltr'
          aria-invalid={addressesInvalid ? true : undefined}
          aria-describedby={
            addressesInvalid
              ? `${helpId} ${resultId}${detailed ? ` ${detailId}` : ''}`
              : helpId
          }
          className={textareaClass}
        />
        <p id={helpId} className='mt-1.5 text-petit text-texte-2'>
          {labels.addressesHelp}
        </p>
      </div>
      <LanguageSelect
        id={languageId}
        label={labels.languageLabel}
        value={language}
        onChange={setLanguage}
        languages={labels.languages}
      />
      <div>
        <label htmlFor={messageId} className={labelClass}>
          {labels.messageLabel}
        </label>
        <textarea
          id={messageId}
          name='message'
          rows={4}
          maxLength={INVITATION_MESSAGE_MAX}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          dir='auto'
          aria-invalid={messageInvalid ? true : undefined}
          aria-describedby={
            messageInvalid
              ? `${messageHelpId} ${counterId} ${resultId}`
              : `${messageHelpId} ${counterId}`
          }
          className={textareaClass}
        />
        <p id={messageHelpId} className='mt-1.5 text-petit text-texte-2'>
          {labels.messageHelp}
        </p>
        <p
          id={counterId}
          aria-hidden='true'
          className='mt-1 text-petit text-texte-2'
        >
          {fill(labels.counter, {
            count: length,
            max: INVITATION_MESSAGE_MAX
          })}
        </p>
        {/* Région persistante, vide tant qu'un seuil n'est pas franchi. */}
        <p role='status' className='sr-only'>
          {counterAnnouncement}
        </p>
      </div>
      <LiveMessage
        id={resultId}
        ton={result?.ton ?? 'info'}
        className='max-w-xl'
      >
        {result ? <p>{result.text}</p> : null}
      </LiveMessage>
      {shown && (
        <Detail
          state={shown}
          labels={labels}
          detailRef={detailRef}
          id={detailId}
          resultId={resultId}
        />
      )}
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.sending : labels.submit}
        />
      </div>
    </form>
  );
}
