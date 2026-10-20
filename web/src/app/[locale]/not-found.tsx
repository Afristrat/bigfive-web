'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/navigation';
import { boutonPrincipal, subtitle, title } from '@/components/primitives';

export default function NotFound() {
  const t = useTranslations('notFound');

  return (
    <section className='colonne-lecture py-16'>
      <h1 className={title()}>{t('title')}</h1>
      <p className={subtitle()}>{t('text')}</p>
      <Link href='/' className={boutonPrincipal({ class: 'mt-8' })}>
        {t('home')}
      </Link>
    </section>
  );
}
