'use client';

import { useActionState } from 'react';
import { unlockPassword, type UnlockState } from '@/actions/password-unlock';
import { secondaryButtonClass } from '@/components/form-styles';

export function UnlockButton({
  locale,
  userId,
  label,
  done,
  error
}: {
  locale: string;
  userId: string;
  label: string;
  done: string;
  error: string;
}) {
  const [state, formAction, pending] = useActionState(unlockPassword, {
    status: 'idle'
  } as UnlockState);
  if (state.status === 'unlocked') return <span role='status'>{done}</span>;
  return (
    <form action={formAction} className='flex flex-wrap items-center gap-3'>
      <input type='hidden' name='locale' value={locale} />
      <input type='hidden' name='userId' value={userId} />
      <button
        type='submit'
        disabled={pending}
        className={`${secondaryButtonClass} !min-h-[44px] !px-4`}
      >
        {label}
      </button>
      {state.status === 'error' && (
        <span role='alert' className='text-erreur'>
          {error}
        </span>
      )}
    </form>
  );
}
