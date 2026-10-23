'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { Input } from '@nextui-org/input';
import {
  changeAdminPassword,
  confirmTotpSetup,
  startTotpSetup,
  type PasswordChangeState,
  type TotpSetupState
} from '@/actions/security';
import { inputClassNames, submitButtonClass } from '@/components/form-styles';
import { Notice } from '@/components/notice';

export type SecurityLabels = {
  totpTitle: string;
  totpActive: string;
  totpInactive: string;
  totpStart: string;
  totpStarting: string;
  totpScan: string;
  totpQrAlt: string;
  totpSecretLabel: string;
  totpCodeLabel: string;
  totpConfirm: string;
  totpConfirming: string;
  totpEnabled: string;
  totpFailed: string;
  error: string;
  passwordTitle: string;
  passwordIntro: string;
  newLabel: string;
  confirmLabel: string;
  codeLabel: string;
  save: string;
  saving: string;
  saved: string;
  needsTotp: string;
  mismatch: string;
  invalid: string;
  codeFailed: string;
  rateLimited: string;
  weak: Record<
    'too_short' | 'too_long' | 'common' | 'repetitive' | 'contains_email',
    string
  >;
};

const codeInputClassNames = {
  ...inputClassNames,
  input: 'text-corps text-encre tracking-[0.3em] tabular-nums'
} as const;

const idleTotp: TotpSetupState = { status: 'idle' };
const idlePassword: PasswordChangeState = { status: 'idle' };

function TotpConfirm({
  locale,
  enrollment,
  labels
}: {
  locale: string;
  enrollment: Extract<TotpSetupState, { status: 'enroll' }>;
  labels: SecurityLabels;
}) {
  const [state, formAction, pending] = useActionState(
    confirmTotpSetup,
    idleTotp
  );
  if (state.status === 'enabled') {
    return (
      <div className='mt-5 max-w-md'>
        <Notice ton='info'>
          <p>{labels.totpEnabled}</p>
        </Notice>
      </div>
    );
  }
  return (
    <div className='mt-5 flex flex-col gap-5'>
      <p className='text-texte-2'>{labels.totpScan}</p>
      {/* Image SVG produite par GoTrue pour cette inscription : data URI, aucun chargement externe. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={enrollment.qrCode}
        alt={labels.totpQrAlt}
        width={192}
        height={192}
        className='h-48 w-48 rounded-controle bg-white p-2'
      />
      <p className='text-petit text-texte-2'>
        {labels.totpSecretLabel}
        <br />
        <bdi dir='ltr' className='select-all break-all font-mono text-encre'>
          {enrollment.secret}
        </bdi>
      </p>
      <form action={formAction} className='flex flex-col gap-5'>
        <input type='hidden' name='locale' value={locale} />
        <input type='hidden' name='factorId' value={enrollment.factorId} />
        <Input
          name='code'
          label={labels.totpCodeLabel}
          labelPlacement='outside'
          placeholder=' '
          inputMode='numeric'
          autoComplete='one-time-code'
          pattern='[0-9 ]{6,7}'
          maxLength={7}
          isRequired
          variant='bordered'
          classNames={codeInputClassNames}
        />
        {state.status === 'failed' && (
          <Notice ton='erreur'>
            <p>{labels.totpFailed}</p>
          </Notice>
        )}
        {(state.status === 'invalid' || state.status === 'error') && (
          <Notice ton='erreur'>
            <p>{labels.error}</p>
          </Notice>
        )}
        <div>
          <Button
            type='submit'
            color='primary'
            isLoading={pending}
            className={submitButtonClass}
          >
            {pending ? labels.totpConfirming : labels.totpConfirm}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function TotpSection({
  locale,
  active,
  labels
}: {
  locale: string;
  active: boolean;
  labels: SecurityLabels;
}) {
  const [state, formAction, pending] = useActionState(startTotpSetup, idleTotp);
  const enabled = active || state.status === 'already';
  return (
    <section aria-labelledby='totp-section-titre'>
      <h3 id='totp-section-titre' className='text-titre-3 text-encre'>
        {labels.totpTitle}
      </h3>
      {enabled ? (
        <p className='mt-2 text-texte-2'>{labels.totpActive}</p>
      ) : (
        <>
          <p className='mt-2 text-texte-2'>{labels.totpInactive}</p>
          {state.status === 'enroll' ? (
            <TotpConfirm locale={locale} enrollment={state} labels={labels} />
          ) : (
            <form action={formAction} className='mt-5'>
              <input type='hidden' name='locale' value={locale} />
              {state.status === 'error' && (
                <div className='mb-5 max-w-md'>
                  <Notice ton='erreur'>
                    <p>{labels.error}</p>
                  </Notice>
                </div>
              )}
              <Button
                type='submit'
                color='primary'
                isLoading={pending}
                className={submitButtonClass}
              >
                {pending ? labels.totpStarting : labels.totpStart}
              </Button>
            </form>
          )}
        </>
      )}
    </section>
  );
}

const passwordMessage = (
  state: PasswordChangeState,
  labels: SecurityLabels
): string | null => {
  switch (state.status) {
    case 'idle':
      return null;
    case 'saved':
      return labels.saved;
    case 'invalid':
      return labels.invalid;
    case 'mismatch':
      return labels.mismatch;
    case 'weak':
      return labels.weak[state.problem];
    case 'totp_required':
      return labels.needsTotp;
    case 'code_failed':
      return labels.codeFailed;
    case 'rate_limited':
      return labels.rateLimited;
    case 'error':
      return labels.error;
  }
};

export function PasswordSection({
  locale,
  totpActive,
  labels
}: {
  locale: string;
  totpActive: boolean;
  labels: SecurityLabels;
}) {
  const [state, formAction, pending] = useActionState(
    changeAdminPassword,
    idlePassword
  );
  const message = passwordMessage(state, labels);
  return (
    <section aria-labelledby='mdp-section-titre'>
      <h3 id='mdp-section-titre' className='text-titre-3 text-encre'>
        {labels.passwordTitle}
      </h3>
      <p className='mt-2 text-texte-2'>{labels.passwordIntro}</p>
      {!totpActive ? (
        <div className='mt-5 max-w-md'>
          <Notice ton='avis'>
            <p>{labels.needsTotp}</p>
          </Notice>
        </div>
      ) : (
        <form action={formAction} className='mt-5 flex flex-col gap-5'>
          <input type='hidden' name='locale' value={locale} />
          <Input
            name='password'
            type='password'
            label={labels.newLabel}
            labelPlacement='outside'
            placeholder=' '
            autoComplete='new-password'
            minLength={12}
            isRequired
            variant='bordered'
            classNames={inputClassNames}
          />
          <Input
            name='confirmation'
            type='password'
            label={labels.confirmLabel}
            labelPlacement='outside'
            placeholder=' '
            autoComplete='new-password'
            isRequired
            variant='bordered'
            classNames={inputClassNames}
          />
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
            classNames={codeInputClassNames}
          />
          {message && (
            <div className='max-w-md'>
              <Notice ton={state.status === 'saved' ? 'info' : 'erreur'}>
                <p>{message}</p>
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
      )}
    </section>
  );
}
