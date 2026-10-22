'use client';

import { useActionState, useId } from 'react';
import { Input } from '@nextui-org/input';
import { consumeLoginCode, type AuthFormState } from '@/actions/auth';
import { inputClassNames } from '@/components/form-styles';
import { Notice } from '@/components/notice';
import { PendingButton } from '@/components/pending-button';

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
  /** Niveau du titre, selon la place du formulaire dans la page. */
  heading?: 'h2' | 'h3' | 'h4';
}

// Saisie du code à 6 chiffres reçu dans le message (autre appareil que celui du lien).
export function CodeForm({
  locale,
  email,
  labels,
  heading: Heading = 'h2'
}: CodeFormProps) {
  const [state, formAction, pending] = useActionState(consumeLoginCode, {
    status: 'idle'
  } as AuthFormState);
  // Identifiant unique : la page peut porter deux demandes de lien (lien et
  // mot de passe oublié), donc deux formulaires de code.
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className='mt-8 max-w-md'>
      <Heading id={titleId} className='text-titre-3 text-encre'>
        {labels.title}
      </Heading>
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
        {state.status !== 'idle' && !pending && (
          <Notice ton='erreur'>
            <p>{state.status === 'invalid' ? labels.invalid : labels.error}</p>
          </Notice>
        )}
        <div>
          <PendingButton
            pending={pending}
            label={pending ? labels.checking : labels.submit}
          />
        </div>
      </form>
    </section>
  );
}
