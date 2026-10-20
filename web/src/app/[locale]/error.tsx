'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { boutonPrincipal, subtitle, title } from '@/components/primitives';

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');
  const n = useTranslations('notFound');

  useEffect(() => {
    console.error(error);
  }, [error]);

  // Le message technique n'est jamais montré ; seul le digest aide le support.
  return (
    <section className='colonne-lecture py-16'>
      <h1 className={title()}>{t('title')}</h1>
      <p className={subtitle()}>{t('text')}</p>
      <div className='mt-8 flex flex-wrap items-center gap-4'>
        <button
          type='button'
          onClick={() => reset()}
          className={boutonPrincipal()}
        >
          {t('retry')}
        </button>
        <Link
          href='/'
          className='inline-flex min-h-11 items-center text-petit font-medium text-accent hover:text-accent-survol hover:underline'
        >
          {n('home')}
        </Link>
      </div>
      {error.digest && (
        <p className='mt-4 text-legende text-texte-3 chiffres'>
          <bdi dir='ltr'>{error.digest}</bdi>
        </p>
      )}
    </section>
  );
}
