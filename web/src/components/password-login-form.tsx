'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import {
  signInWithPassword,
  verifyLoginTotp,
  type PasswordLoginState
} from '@/actions/password-login';
import { inputClassNames, submitButtonClass } from '@/components/form-styles';
import { Notice } from '@/components/notice';

export type PasswordLoginLabels = {
  summary: string;
  emailLabel: string;
  passwordLabel: string;
  submit: string;
  checking: string;
  failed: string;
  invalid: string;
  totpTitle: string;
  totpIntro: string;
  totpLabel: string;
  totpSubmit: string;
  totpFailed: string;
};

interface Props {
  locale: string;
  /** Destination après connexion (chemin interne sans langue), déjà contrôlée. */
  next?: string;
  labels: PasswordLoginLabels;
}

const idle: PasswordLoginState = { status: 'idle' };

function TotpStep({
  locale,
  labels
}: {
  locale: string;
  labels: PasswordLoginLabels;
}) {
  const [state, formAction, pending] = useActionState(verifyLoginTotp, idle);
  return (
    <section aria-labelledby='totp-titre' className='mt-5 max-w-md'>
      <h3 id='totp-titre' className='text-titre-3 text-encre'>
        {labels.totpTitle}
      </h3>
      <p className='mt-2 text-texte-2'>{labels.totpIntro}</p>
      <form action={formAction} className='mt-5 flex flex-col gap-5'>
        <input type='hidden' name='locale' value={locale} />
        <Input
          name='code'
          label={labels.totpLabel}
          labelPlacement='outside'
          placeholder=' '
          inputMode='numeric'
          autoComplete='one-time-code'
          pattern='[0-9 ]{6,7}'
          maxLength={7}
          isRequired
          autoFocus
          variant='bordered'
          classNames={{
            ...inputClassNames,
            input: 'text-corps text-encre tracking-[0.3em] tabular-nums'
          }}
        />
        {state.status !== 'idle' && (
          <Notice ton='erreur'>
            <p>
              {state.status === 'invalid' ? labels.invalid : labels.totpFailed}
            </p>
          </Notice>
        )}
        <div>
          <Button
            type='submit'
            color='primary'
            isLoading={pending}
            className={submitButtonClass}
          >
            {pending ? labels.checking : labels.totpSubmit}
          </Button>
        </div>
      </form>
    </section>
  );
}

// Connexion par mot de passe des administrateurs Tenga : adresse et mot de
// passe, puis code TOTP. Replié par défaut : le lien reste la voie ordinaire.
export function PasswordLoginForm({ locale, next, labels }: Props) {
  const [state, formAction, pending] = useActionState(signInWithPassword, idle);

  return (
    <details className='mt-10 max-w-md'>
      <summary className='cursor-pointer font-semibold text-encre underline underline-offset-4'>
        {labels.summary}
      </summary>
      {state.status === 'totp' ? (
        <TotpStep locale={locale} labels={labels} />
      ) : (
        <form action={formAction} className='mt-5 flex flex-col gap-5'>
          <input type='hidden' name='locale' value={locale} />
          {next && <input type='hidden' name='next' value={next} />}
          <Input
            name='email'
            type='email'
            label={labels.emailLabel}
            labelPlacement='outside'
            placeholder=' '
            autoComplete='username'
            inputMode='email'
            isRequired
            variant='bordered'
            classNames={inputClassNames}
          />
          <Input
            name='password'
            type='password'
            label={labels.passwordLabel}
            labelPlacement='outside'
            placeholder=' '
            autoComplete='current-password'
            isRequired
            variant='bordered'
            classNames={inputClassNames}
          />
          {state.status !== 'idle' && (
            <Notice ton='erreur'>
              <p>
                {state.status === 'invalid' ? labels.invalid : labels.failed}
              </p>
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
      )}
    </details>
  );
}
