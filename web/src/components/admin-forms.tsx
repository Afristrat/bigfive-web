'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import {
  assignRole,
  createOrganization,
  type AdminState
} from '@/actions/admin';
import {
  inputClassNames,
  labelClass,
  selectClass,
  submitButtonClass
} from '@/components/form-styles';
import { Notice } from '@/components/notice';

type Feedback = {
  invalid: string;
  exists: string;
  error: string;
};

function StatusNotice({
  state,
  success,
  labels
}: {
  state: AdminState;
  success: 'created' | 'assigned';
  labels: Feedback & { done: string };
}) {
  if (state.status === 'idle') return null;
  const text =
    state.status === success
      ? labels.done
      : state.status === 'exists'
        ? labels.exists
        : state.status === 'invalid'
          ? labels.invalid
          : labels.error;
  return (
    <div className='max-w-md'>
      <Notice ton={state.status === success ? 'info' : 'erreur'}>
        <p>{text}</p>
      </Notice>
    </div>
  );
}

export type OrganizationFormLabels = Feedback & {
  nameLabel: string;
  slugLabel: string;
  slugHelp: string;
  submit: string;
  done: string;
};

export function OrganizationForm({
  locale,
  labels
}: {
  locale: string;
  labels: OrganizationFormLabels;
}) {
  const [state, formAction, pending] = useActionState(createOrganization, {
    status: 'idle'
  } as AdminState);
  return (
    <form action={formAction} className='mt-5 flex flex-col gap-5'>
      <input type='hidden' name='locale' value={locale} />
      <Input
        name='nom'
        label={labels.nameLabel}
        labelPlacement='outside'
        placeholder=' '
        isRequired
        maxLength={160}
        variant='bordered'
        classNames={inputClassNames}
      />
      <Input
        name='slug'
        label={labels.slugLabel}
        description={labels.slugHelp}
        labelPlacement='outside'
        placeholder=' '
        isRequired
        minLength={3}
        maxLength={40}
        pattern='[a-z0-9][a-z0-9\-]{1,38}[a-z0-9]'
        autoCapitalize='none'
        spellCheck={false}
        variant='bordered'
        classNames={inputClassNames}
      />
      <StatusNotice state={state} success='created' labels={labels} />
      <div>
        <Button
          type='submit'
          color='primary'
          isLoading={pending}
          className={submitButtonClass}
        >
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}

export type RoleFormLabels = Feedback & {
  emailLabel: string;
  organizationLabel: string;
  roleLabel: string;
  languageLabel: string;
  roles: Record<'responsable' | 'consultant' | 'participant', string>;
  languages: Record<'fr' | 'ar' | 'en', string>;
  submit: string;
  done: string;
};

export function RoleForm({
  locale,
  organizations,
  labels
}: {
  locale: string;
  organizations: { id: string; nom: string }[];
  labels: RoleFormLabels;
}) {
  const [state, formAction, pending] = useActionState(assignRole, {
    status: 'idle'
  } as AdminState);
  return (
    <form action={formAction} className='mt-5 flex flex-col gap-5'>
      <input type='hidden' name='locale' value={locale} />
      <Input
        name='email'
        type='email'
        label={labels.emailLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='off'
        isRequired
        variant='bordered'
        classNames={inputClassNames}
      />
      <div className='max-w-md'>
        <label htmlFor='role-organisation' className={labelClass}>
          {labels.organizationLabel}
        </label>
        <select
          id='role-organisation'
          name='organisation'
          required
          className={selectClass}
        >
          {organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nom}
            </option>
          ))}
        </select>
      </div>
      <div className='max-w-md'>
        <label htmlFor='role-role' className={labelClass}>
          {labels.roleLabel}
        </label>
        <select id='role-role' name='role' required className={selectClass}>
          {(['responsable', 'consultant', 'participant'] as const).map((r) => (
            <option key={r} value={r}>
              {labels.roles[r]}
            </option>
          ))}
        </select>
      </div>
      <div className='max-w-md'>
        <label htmlFor='role-langue' className={labelClass}>
          {labels.languageLabel}
        </label>
        <select
          id='role-langue'
          name='langue'
          defaultValue={locale === 'ar' || locale === 'en' ? locale : 'fr'}
          className={selectClass}
        >
          {(['fr', 'ar', 'en'] as const).map((code) => (
            <option key={code} value={code} lang={code}>
              {labels.languages[code]}
            </option>
          ))}
        </select>
      </div>
      <StatusNotice state={state} success='assigned' labels={labels} />
      <div>
        <Button
          type='submit'
          color='primary'
          isLoading={pending}
          isDisabled={organizations.length === 0}
          className={submitButtonClass}
        >
          {labels.submit}
        </Button>
      </div>
    </form>
  );
}
