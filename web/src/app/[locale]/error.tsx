'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { PentagoneTrace } from '@/components/cadre/pentagone-trace';
import { MotsCinetiques } from '@/components/mots-cinetiques';
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
  // Le pentagone s'interrompt à mi-parcours : le chemin reprendra au nouvel essai.
  return (
    <section className='grid items-center gap-x-12 gap-y-10 py-10 lg:grid-cols-12 lg:py-16'>
      <PentagoneTrace
        part={0.6}
        className='mx-auto max-w-[220px] lg:order-last lg:col-span-5 lg:max-w-[340px]'
      />
      <div className='lg:col-span-7'>
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p
          style={{ ['--i' as string]: 0 }}
          className={subtitle({ class: 'apparait-tard' })}
        >
          {t('text')}
        </p>
        <div
          style={{ ['--i' as string]: 1 }}
          className='apparait-tard mt-8 flex flex-wrap items-center gap-4'
        >
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
          <p
            style={{ ['--i' as string]: 2 }}
            className='apparait-tard mt-4 text-legende text-texte-3 chiffres'
          >
            <bdi dir='ltr'>{error.digest}</bdi>
          </p>
        )}
      </div>
    </section>
  );
}
