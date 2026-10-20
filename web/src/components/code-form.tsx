'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { consumeLoginCode, type AuthFormState } from '@/actions/auth';
import { Notice } from '@/components/notice';
import { inputClassNames, submitButtonClass } from '@/components/form-styles';

export type CodeFormLabels = {
  title: string;
  intro: string;
  emailLabel: string;
  codeLabel: string;
  submit: string;
  checking: string;
  error: string;
  invalid: string;
};

interface CodeFormProps {
  locale: string;
  /** Adresse déjà saisie sur la page de connexion ; sinon le champ est affiché. */
  email?: string;
  labels: CodeFormLabels;
}

// Saisie du code à 6 chiffres reçu dans le message (autre appareil que celui du lien).
export function CodeForm({ locale, email, labels }: CodeFormProps) {
  const [state, formAction, pending] = useActionState(consumeLoginCode, {
    status: 'idle'
  } as AuthFormState);

  return (
    <section aria-labelledby='code-titre' className='mt-10 max-w-md'>
      <h2 id='code-titre' className='text-titre-3 text-encre'>
        {labels.title}
      </h2>
      <p className='mt-2 text-texte-2'>{labels.intro}</p>
      <form action={formAction} className='mt-5 flex flex-col gap-5'>
        <input type='hidden' name='locale' value={locale} />
        {email ? (
          <input type='hidden' name='email' value={email} />
        ) : (
          <Input
            name='email'
            type='email'
            label={labels.emailLabel}
            labelPlacement='outside'
            placeholder=' '
            autoComplete='email'
            isRequired
            variant='bordered'
            classNames={inputClassNames}
          />
        )}
        <Input
          name='code'
          label={labels.codeLabel}
          labelPlacement='outside'
          placeholder=' '
          inputMode='numeric'
          autoComplete='one-time-code'
          pattern='[0-9 ]{6,7}'
          maxLength={7}
          isRequired
          variant='bordered'
          classNames={{
            ...inputClassNames,
            input: 'text-corps text-encre tracking-[0.3em] tabular-nums'
          }}
        />
        {state.status !== 'idle' && (
          <Notice ton='erreur'>
            <p>{state.status === 'invalid' ? labels.invalid : labels.error}</p>
          </Notice>
        )}
        <div>
          <Button
            type='submit'
            color='primary'
            isLoading={pending}
            className={submitButtonClass}
          >
            {pending ? labels.checking : labels.submit}
          </Button>
        </div>
      </form>
    </section>
  );
}
