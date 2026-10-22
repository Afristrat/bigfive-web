import { CSSProperties } from 'react';
import { title } from '@/components/primitives';
import { MotsCinetiques } from '@/components/home-sections';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { supportEmail } from '@/config/site';
import { formatNombre, isoler } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('title') };
}

// Questions fréquentes : le titre reste en marge pendant la lecture ; chaque
// question monte à son entrée, numérotée, sous un filet qui se trace.
export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const about = await getTranslations('about');
  const email = isoler(supportEmail);

  // Toutes les réponses restent visibles : une poignée de questions ne justifie pas un accordéon.
  const entries = [
    ...(supportEmail
      ? [
          {
            key: 'error',
            question: t('error.question'),
            answer: t('error.answer', { email })
          }
        ]
      : []),
    ...(
      [
        'science',
        'usefulness',
        'source',
        'answers',
        'diagnosis',
        'print'
      ] as const
    ).map((key) => ({
      key,
      question: t(`${key}.question`),
      answer: t(`${key}.answer`)
    }))
  ];

  return (
    <div className='grid gap-10 lg:grid-cols-12'>
      <header className='lg:sticky lg:top-28 lg:col-span-4 lg:self-start'>
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        {supportEmail && (
          <p style={rang(1)} className='apparait-tard mt-4 text-texte-2'>
            {about('contact_email', { email })}
          </p>
        )}
      </header>
      <ol role='list' className='lg:col-span-8'>
        {entries.map((entry, index) => (
          <li
            key={entry.key}
            data-reveal='monte'
            className='relative grid grid-cols-[2.5rem_1fr] gap-x-4 py-8 first:pt-0'
          >
            {index > 0 && (
              <span
                aria-hidden='true'
                className='barre-reglee absolute inset-x-0 top-0 block h-px bg-trait-fort'
              />
            )}
            <span
              aria-hidden='true'
              className='chiffres font-display text-titre-2 leading-none text-trait-fort'
            >
              {formatNombre(index + 1, locale)}
            </span>
            <div>
              <h2 className='text-titre-3 text-encre'>{entry.question}</h2>
              <p className='mt-2 colonne-lecture text-texte-2'>
                {entry.answer}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
