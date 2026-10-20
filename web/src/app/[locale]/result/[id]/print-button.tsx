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
      className={boutonPrincipal({ className: 'print:hidden' })}
    >
      {label}
    </button>
  );
}
