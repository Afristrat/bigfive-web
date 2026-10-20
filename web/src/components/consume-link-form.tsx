'use client';

import { useActionState } from 'react';
import { Button } from '@nextui-org/button';
import { consumeLoginLink, type AuthFormState } from '@/actions/auth';
import { Notice } from '@/components/notice';
import { submitButtonClass } from '@/components/form-styles';
import { Link } from '@/navigation';

export type ConsumeLabels = {
  button: string;
  opening: string;
  error: string;
  newLink: string;
};

interface ConsumeLinkFormProps {
  token: string;
  locale: string;
  labels: ConsumeLabels;
}

// Le jeton n'est consommé qu'au clic (envoi du formulaire), jamais au chargement :
// l'ouverture du lien par un antivirus de messagerie ne l'use donc pas.
export function ConsumeLinkForm({
  token,
  locale,
  labels
}: ConsumeLinkFormProps) {
  const [state, formAction, pending] = useActionState(consumeLoginLink, {
    status: 'idle'
  } as AuthFormState);

  return (
    <form action={formAction} className='mt-8 flex flex-col gap-5'>
      <input type='hidden' name='token' value={token} />
      <input type='hidden' name='locale' value={locale} />
      {state.status !== 'idle' && (
        <div className='max-w-md'>
          <Notice ton='erreur'>
            <p>{labels.error}</p>
            <Link href='/connexion' className='font-semibold underline'>
              {labels.newLink}
            </Link>
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
          {pending ? labels.opening : labels.button}
        </Button>
      </div>
    </form>
  );
}
