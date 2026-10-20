'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import { requestLoginLink, type LoginState } from '@/actions/auth';
import { CodeForm, type CodeFormLabels } from '@/components/code-form';
import { inputClassNames, submitButtonClass } from '@/components/form-styles';
import { Notice } from '@/components/notice';

export type LoginLabels = {
  emailLabel: string;
  submit: string;
  sending: string;
  invalid: string;
  sent: string;
  sentHelp: string;
  code: CodeFormLabels;
};

interface LoginFormProps {
  locale: string;
  /** Destination après connexion (chemin interne sans langue), déjà contrôlée. */
  next?: string;
  labels: LoginLabels;
}

export function LoginForm({ locale, next, labels }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(requestLoginLink, {
    status: 'idle'
  } as LoginState);

  if (state.status === 'sent') {
    return (
      <>
        <div className='mt-8 max-w-md'>
          <Notice ton='info'>
            <p>{labels.sent}</p>
            <p className='text-texte-2'>{labels.sentHelp}</p>
          </Notice>
        </div>
        <CodeForm locale={locale} email={state.email} labels={labels.code} />
      </>
    );
  }

  return (
    <form action={formAction} className='mt-8 flex flex-col gap-5'>
      <input type='hidden' name='locale' value={locale} />
      {next && <input type='hidden' name='next' value={next} />}
      <Input
        name='email'
        type='email'
        label={labels.emailLabel}
        labelPlacement='outside'
        placeholder=' '
        autoComplete='email'
        inputMode='email'
        isRequired
        autoFocus
        variant='bordered'
        classNames={inputClassNames}
      />
      {state.status === 'invalid' && (
        <div className='max-w-md'>
          <Notice ton='erreur'>
            <p>{labels.invalid}</p>
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
          {pending ? labels.sending : labels.submit}
        </Button>
      </div>
    </form>
  );
}
