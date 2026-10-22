'use client';

import { useState } from 'react';

interface CopyIdProps {
  id: string;
  title: string;
  hint: string;
  copyLabel: string;
  copiedLabel: string;
}

// Identifiant du résultat et bouton de copie. Le retour « copié » est annoncé
// (role="status") et affiché ; en cas d'échec du presse-papiers, rien ne change.
export function CopyId({
  id,
  title,
  hint,
  copyLabel,
  copiedLabel
}: CopyIdProps) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-labelledby='identifiant' className='carte mt-4'>
      <h2 id='identifiant' className='text-titre-3 text-encre'>
        {title}
      </h2>
      <p className='mt-1 text-petit text-texte-2'>{hint}</p>
      <div className='mt-4 flex flex-wrap items-center gap-3'>
        <code
          dir='ltr'
          className='min-h-11 select-all break-all rounded-controle bg-creux px-4 py-2.5 font-mono text-petit text-encre'
        >
          {id}
        </code>
        <button
          type='button'
          onClick={copy}
          className='appui inline-flex min-h-11 items-center justify-center rounded-controle border border-trait-fort bg-transparent px-5 font-medium text-encre hover:bg-creux print:hidden'
        >
          {copied ? copiedLabel : copyLabel}
        </button>
        <span role='status' className='sr-only'>
          {copied ? copiedLabel : ''}
        </span>
      </div>
    </section>
  );
}
