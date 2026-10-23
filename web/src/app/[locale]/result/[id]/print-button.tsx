'use client';

import { boutonPrincipal } from '@/components/primitives';

interface PrintButtonProps {
  label: string;
}

export function PrintButton({ label }: PrintButtonProps) {
  return (
    <button
      type='button'
      onClick={() => window.print()}
      data-aimant=''
      className={boutonPrincipal({ className: 'print:hidden' })}
    >
      {label}
    </button>
  );
}
