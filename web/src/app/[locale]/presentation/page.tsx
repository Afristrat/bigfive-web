import { CSSProperties } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale
} from 'next-intl/server';
import { PentagoneTrace } from '@/components/cadre/pentagone-trace';
import { MotsCinetiques } from '@/components/mots-cinetiques';
import { PresentationForm } from '@/components/presentation-form';
import { subtitle, title } from '@/components/primitives';
import { basePath } from '@/config/site';

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

// Deux temps dès les grands écrans : en début de ligne, le titre qui monte mot
// à mot, le chapeau et le pentagone refermé, collés sous l'en-tête ; en fin de
// ligne, le formulaire, qui entre après eux.
export default async function PresentationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('presentation');
  const messages = await getMessages({ locale });

  return (
    <article className='grid gap-x-12 lg:grid-cols-12'>
      <header className='lg:sticky lg:top-24 lg:col-span-5 lg:self-start'>
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p style={rang(0)} className={subtitle({ class: 'apparait-tard' })}>
          {t('intro')}
        </p>
        <span
          aria-hidden='true'
          style={rang(1)}
          className='apparait-tard mt-8 hidden h-[3px] w-24 bg-safran lg:block'
        />
        <PentagoneTrace
          formes
          className='mt-10 hidden max-w-[260px] lg:block'
        />
      </header>
      <div style={rang(1)} className='apparait-tard lg:col-span-7'>
        {/* Le formulaire lit ses libellés côté navigateur : seul son espace de noms lui est transmis. */}
        <NextIntlClientProvider
          locale={locale}
          messages={{ presentation: messages.presentation }}
        >
          <PresentationForm locale={locale} />
        </NextIntlClientProvider>
      </div>
    </article>
  );
}
