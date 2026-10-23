'use client';

import { useActionState, useState } from 'react';
import { Input } from '@nextui-org/input';
import { requestLoginLink, type LoginState } from '@/actions/auth';
import { CodeForm, type CodeFormLabels } from '@/components/code-form';
import {
  inputClassNames,
  secondaryButtonClass
} from '@/components/form-styles';
import styles from '@/components/formulaires.module.css';
import { Notice } from '@/components/notice';
import { PendingButton } from '@/components/pending-button';

export type LoginLabels = {
  emailLabel: string;
  submit: string;
  sending: string;
  invalid: string;
  sent: string;
  sentHelp: string;
  retry: string;
  code: CodeFormLabels;
};

interface LoginFormProps {
  locale: string;
  /** Destination après connexion (chemin interne sans langue), déjà contrôlée. */
  next?: string;
  labels: LoginLabels;
  /** Focus sur l'adresse au montage (faux si la page porte d'autres champs avant). */
  autoFocus?: boolean;
  /** Niveau du titre de l'étape du code. */
  codeHeading?: 'h2' | 'h3' | 'h4';
}

function LoginFlow({
  locale,
  next,
  labels,
  autoFocus = true,
  codeHeading,
  onRetry
}: LoginFormProps & { onRetry: () => void }) {
  const [state, formAction, pending] = useActionState(requestLoginLink, {
    status: 'idle'
  } as LoginState);

  // Lien envoyé : l'étape du code prend la place du formulaire, en montant.
  // La réponse est la même que l'adresse existe ou non.
  if (state.status === 'sent') {
    return (
      <div className={styles.etape}>
        <div className='max-w-md'>
          <Notice ton='info'>
            <p>{labels.sent}</p>
            <p className='text-texte-2'>{labels.sentHelp}</p>
          </Notice>
          <button
            type='button'
            onClick={onRetry}
            className={`mt-4 ${secondaryButtonClass}`}
          >
            {labels.retry}
          </button>
        </div>
        <CodeForm
          locale={locale}
          email={state.email}
          labels={labels.code}
          heading={codeHeading}
        />
      </div>
    );
  }

  return (
    <form action={formAction} className='flex flex-col gap-5'>
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
        autoFocus={autoFocus}
        variant='bordered'
        classNames={inputClassNames}
      />
      {/* Retiré pendant l'envoi : un refus répété réapparaît et se secoue. */}
      {state.status === 'invalid' && !pending && (
        <div className='max-w-md'>
          <Notice ton='erreur'>
            <p>{labels.invalid}</p>
          </Notice>
        </div>
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

/**
 * Demande d'un lien de connexion, puis saisie du code reçu. « Demander un
 * nouveau lien » remonte le formulaire à neuf (les plafonds d'envoi restent
 * ceux de la demande, côté serveur).
 */
export function LoginForm(props: LoginFormProps) {
  const [cycle, setCycle] = useState(0);
  return (
    <LoginFlow
      key={cycle}
      {...props}
      onRetry={() => setCycle((value) => value + 1)}
    />
  );
}
