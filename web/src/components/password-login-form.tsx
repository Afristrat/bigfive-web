'use client';

import { useActionState, useState } from 'react';
import { Input } from '@nextui-org/input';
import {
  signInWithPassword,
  verifyLoginTotp,
  type PasswordLoginState
} from '@/actions/password-login';
import { inputClassNames } from '@/components/form-styles';
import styles from '@/components/formulaires.module.css';
import { ChevronRightLinearIcon } from '@/components/icons';
import { LoginForm, type LoginLabels } from '@/components/login-form';
import { Notice } from '@/components/notice';
import { PendingButton } from '@/components/pending-button';

export type PasswordLoginLabels = {
  summary: string;
  intro: string;
  stepOne: string;
  stepTwo: string;
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
  restart: string;
  forgot: {
    open: string;
    title: string;
    intro: string;
    lock: string;
    submit: string;
    back: string;
  };
};

interface Props {
  locale: string;
  /** Destination après connexion (chemin interne sans langue), déjà contrôlée. */
  next?: string;
  labels: PasswordLoginLabels;
  /** Textes de la demande de lien, repris par « mot de passe oublié ». */
  link: LoginLabels;
}

/**
 * Destination du lien demandé par « mot de passe oublié » : la rubrique mot de
 * passe de Mon compte, où le nouveau mot de passe se choisit sans l'ancien,
 * avec le code TOTP (actions/security.ts). Mémorisée par le cookie de
 * destination de l'appareil qui fait la demande ; ailleurs, la connexion mène
 * de toute façon à Mon compte (DEFAULT_AFTER_LOGIN).
 */
export const FORGOT_NEXT = '/mon-compte#mot-de-passe';

const idle: PasswordLoginState = { status: 'idle' };

const linkClass =
  'inline-flex min-h-11 items-center font-medium text-accent underline underline-offset-4 hover:text-accent-survol';

const codeInputClassNames = {
  ...inputClassNames,
  input: 'text-corps text-encre tracking-[0.3em] tabular-nums'
} as const;

function TotpStep({
  locale,
  labels,
  onRestart
}: {
  locale: string;
  labels: PasswordLoginLabels;
  onRestart: () => void;
}) {
  const [state, formAction, pending] = useActionState(verifyLoginTotp, idle);
  return (
    <section aria-labelledby='totp-titre' className={styles.etape}>
      <p className='text-legende font-semibold text-texte-2'>
        {labels.stepTwo}
      </p>
      <h2 id='totp-titre' className='mt-1 text-titre-3 text-encre'>
        {labels.totpTitle}
      </h2>
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
          classNames={codeInputClassNames}
        />
        {state.status !== 'idle' && !pending && (
          <Notice ton='erreur'>
            <p>
              {state.status === 'invalid' ? labels.invalid : labels.totpFailed}
            </p>
          </Notice>
        )}
        <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
          <PendingButton
            pending={pending}
            label={pending ? labels.checking : labels.totpSubmit}
          />
          <button type='button' onClick={onRestart} className={linkClass}>
            {labels.restart}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordStep({
  locale,
  next,
  labels,
  autoFocus,
  onForgot,
  onRestart
}: {
  locale: string;
  next?: string;
  labels: PasswordLoginLabels;
  autoFocus: boolean;
  onForgot: () => void;
  onRestart: () => void;
}) {
  const [state, formAction, pending] = useActionState(signInWithPassword, idle);

  if (state.status === 'totp') {
    return <TotpStep locale={locale} labels={labels} onRestart={onRestart} />;
  }

  return (
    <div>
      <p className='text-legende font-semibold text-texte-2'>
        {labels.stepOne}
      </p>
      <form action={formAction} className='mt-3 flex flex-col gap-5'>
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
          autoFocus={autoFocus}
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
        {state.status !== 'idle' && !pending && (
          <Notice ton='erreur'>
            <p>{state.status === 'invalid' ? labels.invalid : labels.failed}</p>
          </Notice>
        )}
        <div className='flex flex-wrap items-center gap-x-5 gap-y-2'>
          <PendingButton
            pending={pending}
            label={pending ? labels.checking : labels.submit}
          />
          <button type='button' onClick={onForgot} className={linkClass}>
            {labels.forgot.open}
          </button>
        </div>
      </form>
    </div>
  );
}

function ForgotStep({
  locale,
  labels,
  link,
  onBack
}: {
  locale: string;
  labels: PasswordLoginLabels['forgot'];
  link: LoginLabels;
  onBack: () => void;
}) {
  return (
    <section aria-labelledby='oubli-titre' className={styles.etape}>
      <h2 id='oubli-titre' className='text-titre-3 text-encre'>
        {labels.title}
      </h2>
      <p className='mt-2 text-texte-2'>{labels.intro}</p>
      <p className='mt-2 text-petit text-texte-3'>{labels.lock}</p>
      <div className='mt-5'>
        <LoginForm
          locale={locale}
          next={FORGOT_NEXT}
          labels={{ ...link, submit: labels.submit }}
          codeHeading='h3'
        />
      </div>
      <button type='button' onClick={onBack} className={`mt-4 ${linkClass}`}>
        {labels.back}
      </button>
    </section>
  );
}

// Connexion par mot de passe des administrateurs Tenga, repliée sous le lien :
// mot de passe (étape 1), puis code TOTP (étape 2). « Mot de passe oublié »
// demande un lien de connexion qui mène au choix d'un nouveau mot de passe.
// « Recommencer » remonte l'étape 1 à neuf (l'étape du code expire en 5 min).
export function PasswordLoginForm({ locale, next, labels, link }: Props) {
  const [cycle, setCycle] = useState(0);
  const [forgot, setForgot] = useState(false);
  // Au retour depuis « mot de passe oublié », le focus revient sur l'adresse.
  const [returned, setReturned] = useState(false);

  return (
    <details className={`max-w-md ${styles.repli}`}>
      <summary className='inline-flex min-h-11 cursor-pointer items-center gap-2 font-semibold text-encre'>
        <ChevronRightLinearIcon size={18} className={styles.chevron} />
        <span className='underline underline-offset-4'>{labels.summary}</span>
      </summary>
      <div className={`mt-4 ${styles.contenu}`}>
        <p className='mb-5 text-texte-2'>{labels.intro}</p>
        {forgot ? (
          <ForgotStep
            locale={locale}
            labels={labels.forgot}
            link={link}
            onBack={() => {
              setForgot(false);
              setReturned(true);
            }}
          />
        ) : (
          <PasswordStep
            key={cycle}
            locale={locale}
            next={next}
            labels={labels}
            autoFocus={returned}
            onForgot={() => setForgot(true)}
            onRestart={() => {
              setCycle((value) => value + 1);
              setReturned(true);
            }}
          />
        )}
      </div>
    </details>
  );
}
