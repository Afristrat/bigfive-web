import { CSSProperties } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale
} from 'next-intl/server';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { PresentationForm } from '@/components/presentation-form';
import { subtitle, title } from '@/components/primitives';
import { basePath } from '@/config/site';
import { formatNombre } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'presentation' });
  const localePath = locale === 'en' ? '' : `/${locale}`;
  return {
    title: t('seo.title'),
    description: t('seo.description'),
    robots: { index: true, follow: true },
    alternates: {
      canonical: `${basePath}${localePath}/presentation`,
      languages: servedLocales.reduce(
        (a, v) => ({ ...a, [v]: `${basePath}/${v}/presentation` }),
        {}
      )
    }
  };
}

// Composition asymétrique dès les grands écrans : en début de ligne, le titre
// qui monte mot à mot, le chapeau, puis la suite de la demande en trois temps
// reliés par un filet safran ; en fin de ligne, le formulaire. Sur mobile, le
// formulaire vient avant la suite, pour être atteint sans détour.
export default async function PresentationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('presentation');
  const messages = await getMessages({ locale });
  // Les deux derniers temps reprennent le texte affiché après l'envoi.
  const etapes = [t('stepSend'), t('success.step1'), t('success.step2')];

  return (
    <article className='grid gap-x-12 gap-y-14 lg:grid-cols-12'>
      <header className='lg:col-span-5 lg:col-start-1 lg:row-start-1'>
        <h1 className={title({ size: 'display' })}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p style={rang(0)} className={subtitle({ class: 'apparait-tard' })}>
          {t('intro')}
        </p>
      </header>

      <div
        style={rang(1)}
        className='apparait-tard lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:pt-4'
      >
        {/* Le formulaire lit ses libellés côté navigateur : seul son espace de noms lui est transmis. */}
        <NextIntlClientProvider
          locale={locale}
          messages={{ presentation: messages.presentation }}
        >
          <PresentationForm locale={locale} />
        </NextIntlClientProvider>
      </div>

      <section
        aria-labelledby='presentation-suite'
        className='lg:col-span-5 lg:col-start-1 lg:row-start-2 lg:self-start'
      >
        <h2
          id='presentation-suite'
          data-reveal='monte'
          className='text-petit font-medium text-texte-3 [font-family:var(--font-texte)]'
        >
          {t('success.nextTitle')}
        </h2>
        <div data-reveal='trace' className='relative mt-6'>
          <span
            aria-hidden='true'
            className='barre-verticale absolute start-[7px] top-2 block h-[calc(100%-1.5rem)] w-0.5 bg-safran'
          />
          <ol role='list'>
            {etapes.map((etape, index) => (
              <li
                key={etape}
                data-reveal='monte'
                style={rang(index + 1)}
                className='relative grid grid-cols-[auto_1fr] gap-x-4 pb-8 ps-8 last:pb-0'
              >
                <span
                  aria-hidden='true'
                  className='absolute start-0 top-1.5 block size-4 rotate-45 border-2 border-safran bg-fond'
                />
                <span
                  aria-hidden='true'
                  className='chiffres font-display text-titre-2 leading-none text-trait-fort'
                >
                  {formatNombre(index + 1, locale)}
                </span>
                <p className='text-texte-2'>{etape}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </article>
  );
}
