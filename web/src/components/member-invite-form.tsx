'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { Input } from '@nextui-org/input';
import { inviteMember, type MemberState } from '@/actions/members';
import {
  inputClassNames,
  labelClass,
  selectClass
} from '@/components/form-styles';
import { LanguageSelect } from '@/components/language-select';
import { LiveMessage, type MessageTon } from '@/components/live-message';
import { PendingButton } from '@/components/pending-button';
import { transitionSubmit } from '@/components/transition-submit';
import type { InvitationLocale } from '@/lib/access-rules';

type MemberRole = 'responsable' | 'consultant';

export type MemberInviteLabels = {
  requiredLegend: string;
  emailLabel: string;
  confirmLabel: string;
  confirmHelp: string;
  roleLabel: string;
  /** Option vide, désactivée : le rôle est choisi, jamais présélectionné. */
  rolePlaceholder: string;
  /** Dit qu'inviter un membre existant change son rôle. */
  roleHelp: string;
  roles: Record<MemberRole, string>;
  languageLabel: string;
  languages: Record<InvitationLocale, string>;
  working: string;
  submit: string;
  invited: string;
  invitedMailFailed: string;
  invalid: string;
  forbidden: string;
  rateLimited: string;
  error: string;
};

const idle: MemberState = { status: 'idle' };

const isMemberRole = (
  value: string,
  roles: readonly MemberRole[]
): value is MemberRole => roles.some((role) => role === value);

/** Message du statut, dans une région vivante persistante (vide au repos). */
export function MemberResult({
  state,
  labels,
  id,
  pending = false
}: {
  state: MemberState;
  labels: MemberInviteLabels;
  id: string;
  pending?: boolean;
}) {
  const text = pending
    ? labels.working
    : state.status === 'idle'
      ? null
      : {
          invited: labels.invited,
          invited_mail_failed: labels.invitedMailFailed,
          invalid: labels.invalid,
          forbidden: labels.forbidden,
          rate_limited: labels.rateLimited,
          error: labels.error
        }[state.status];
  const ton: MessageTon =
    pending || state.status === 'invited'
      ? 'info'
      : state.status === 'invited_mail_failed'
        ? 'avis'
        : 'erreur';
  return (
    <LiveMessage id={id} ton={ton} className='max-w-md'>
      {text ? <p>{text}</p> : null}
    </LiveMessage>
  );
}

export function MemberInviteForm({
  locale,
  slug,
  organisationId,
  roles,
  defaultLanguage,
  labels
}: {
  locale: string;
  slug: string;
  organisationId: string;
  roles: readonly MemberRole[];
  defaultLanguage: InvitationLocale;
  labels: MemberInviteLabels;
}) {
  const base = useId();
  const roleId = `${base}-role`;
  const roleHelpId = `${base}-role-aide`;
  const languageId = `${base}-langue`;
  const resultId = `${base}-resultat`;
  const [state, formAction, pending] = useActionState(inviteMember, idle);
  // Champs contrôlés, envoyés par `onSubmit` et non par `action` : sans prop
  // `action`, React ne réinitialise pas le formulaire (saisie refusée, rôle et
  // langue restent). Le rôle part vide : aucun privilège n'est présélectionné.
  const [email, setEmail] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [role, setRole] = useState<MemberRole | ''>('');
  const [language, setLanguage] = useState<InvitationLocale>(defaultLanguage);

  useEffect(() => {
    if (state.status === 'invited' || state.status === 'invited_mail_failed') {
      setEmail('');
      setConfirmation('');
      setRole('');
    }
  }, [state]);

  const invalid = !pending && state.status === 'invalid';
  const described = invalid ? resultId : undefined;

  return (
    <form
      onSubmit={transitionSubmit(pending, formAction)}
      noValidate
      className='mt-5 flex flex-col gap-5'
    >
      <input type='hidden' name='locale' value={locale} />
      <input type='hidden' name='slug' value={slug} />
      <input type='hidden' name='organisation' value={organisationId} />
      <p className='text-petit text-texte-2'>{labels.requiredLegend}</p>
      <Input
        name='email'
        type='email'
        label={labels.emailLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        dir='ltr'
        isRequired
        value={email}
        onValueChange={setEmail}
        isInvalid={invalid}
        aria-describedby={described}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <Input
        name='emailConfirmation'
        type='email'
        label={labels.confirmLabel}
        description={labels.confirmHelp}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        dir='ltr'
        isRequired
        value={confirmation}
        onValueChange={setConfirmation}
        isInvalid={invalid}
        aria-describedby={described}
        validationBehavior='aria'
        variant='bordered'
        classNames={inputClassNames}
      />
      <div className='max-w-md'>
        <label htmlFor={roleId} className={labelClass}>
          {labels.roleLabel}
          <span aria-hidden='true'> *</span>
        </label>
        <select
          id={roleId}
          name='role'
          required
          value={role}
          onChange={(event) =>
            setRole(
              isMemberRole(event.target.value, roles) ? event.target.value : ''
            )
          }
          aria-invalid={invalid && role === '' ? true : undefined}
          aria-describedby={roleHelpId}
          className={selectClass}
        >
          <option value='' disabled>
            {labels.rolePlaceholder}
          </option>
          {roles.map((option) => (
            <option key={option} value={option}>
              {labels.roles[option]}
            </option>
          ))}
        </select>
        <p id={roleHelpId} className='mt-1.5 text-petit text-texte-2'>
          {labels.roleHelp}
        </p>
      </div>
      <LanguageSelect
        id={languageId}
        label={labels.languageLabel}
        value={language}
        onChange={setLanguage}
        languages={labels.languages}
      />
      <MemberResult
        state={state}
        labels={labels}
        id={resultId}
        pending={pending}
      />
      <div>
        <PendingButton
          pending={pending}
          label={pending ? labels.working : labels.submit}
        />
      </div>
    </form>
  );
}
