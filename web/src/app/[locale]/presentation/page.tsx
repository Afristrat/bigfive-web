import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale
} from 'next-intl/server';
import { PresentationForm } from '@/components/presentation-form';
import { subtitle, title } from '@/components/primitives';
import { basePath } from '@/config/site';

interface Props {
  params: Promise<{ locale: string }>;
}

const servedLocales = ['fr', 'ar', 'en'];

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

export default async function PresentationPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('presentation');
  const messages = await getMessages({ locale });

  return (
    <article>
      <h1 className={title()}>{t('title')}</h1>
      <p className={subtitle()}>{t('intro')}</p>
      {/* Le formulaire lit ses libellés côté navigateur : seul son espace de noms lui est transmis. */}
      <NextIntlClientProvider
        locale={locale}
        messages={{ presentation: messages.presentation }}
      >
        <PresentationForm locale={locale} />
      </NextIntlClientProvider>
    </article>
  );
}
