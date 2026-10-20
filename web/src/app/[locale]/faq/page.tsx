import { title } from '@/components/primitives';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { supportEmail } from '@/config/site';
import { isoler } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: t('title') };
}

export default async function FaqPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const about = await getTranslations('about');
  const email = isoler(supportEmail);

  // Toutes les réponses restent visibles : cinq questions ne justifient pas un accordéon.
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
    ...(['print', 'source', 'answers', 'diagnosis'] as const).map((key) => ({
      key,
      question: t(`${key}.question`),
      answer: t(`${key}.answer`)
    }))
  ];

  return (
    <div className='grid gap-10 lg:grid-cols-12'>
      <div className='lg:col-span-4'>
        <h1 className={title()}>{t('title')}</h1>
        {supportEmail && (
          <p className='mt-4 text-texte-2'>
            {about('contact_email', { email })}
          </p>
        )}
      </div>
      <dl className='divide-y divide-trait lg:col-span-8'>
        {entries.map((entry) => (
          <div key={entry.key} className='py-6 first:pt-0'>
            <dt>
              <h2 className='text-titre-3 text-encre'>{entry.question}</h2>
            </dt>
            <dd className='mt-2 colonne-lecture text-texte-2'>
              {entry.answer}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
