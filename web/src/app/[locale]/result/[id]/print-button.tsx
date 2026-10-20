'use client';

import { Button } from '@nextui-org/button';

interface PrintButtonProps {
  label: string;
}

export function PrintButton({ label }: PrintButtonProps) {
  return (
    <Button
      variant='bordered'
      onPress={() => window.print()}
      className='h-auto min-h-11 self-start border-trait-fort py-2 text-encre data-[hover=true]:bg-creux print:hidden md:self-auto'
    >
      {label}
    </Button>
  );
}
