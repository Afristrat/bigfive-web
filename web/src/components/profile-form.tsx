'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { saveProfile, type ProfileState } from '@/actions/account';
import {
  inputClassNames,
  labelClass,
  selectClass,
  submitButtonClass
} from '@/components/form-styles';
import { Notice } from '@/components/notice';

export type ProfileLabels = {
  nameLabel: string;
  nameHelp: string;
  languageLabel: string;
  languages: Record<'fr' | 'ar' | 'en', string>;
  save: string;
  saving: string;
  saved: string;
  invalid: string;
  error: string;
};

interface ProfileFormProps {
  locale: string;
  nom: string;
  langue: 'fr' | 'ar' | 'en';
  labels: ProfileLabels;
}

export function ProfileForm({ locale, nom, langue, labels }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(saveProfile, {
    status: 'idle'
  } as ProfileState);

  return (
    <form action={formAction} className='mt-5 flex flex-col gap-5'>
      <input type='hidden' name='locale' value={locale} />
      <Input
        name='nom'
        label={labels.nameLabel}
        description={labels.nameHelp}
        labelPlacement='outside'
        placeholder=' '
        defaultValue={nom}
        maxLength={120}
        autoComplete='name'
        variant='bordered'
        classNames={inputClassNames}
      />
      <div className='max-w-md'>
        <label htmlFor='profil-langue' className={labelClass}>
          {labels.languageLabel}
        </label>
        <select
          id='profil-langue'
          name='langue'
          defaultValue={langue}
          className={selectClass}
        >
          {(['fr', 'ar', 'en'] as const).map((code) => (
            <option key={code} value={code} lang={code}>
              {labels.languages[code]}
            </option>
          ))}
        </select>
      </div>
      {state.status !== 'idle' && (
        <div className='max-w-md'>
          <Notice ton={state.status === 'saved' ? 'info' : 'erreur'}>
            <p>
              {state.status === 'saved'
                ? labels.saved
                : state.status === 'invalid'
                  ? labels.invalid
                  : labels.error}
            </p>
          </Notice>
        </div>
      )}
      <div>
        <Button
          type='submit'
          color='primary'
          isLoading={pending}
          className={submitButtonClass}
        >
          {pending ? labels.saving : labels.save}
        </Button>
      </div>
    </form>
  );
}
