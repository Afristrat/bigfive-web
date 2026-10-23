import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import { fontArabe, fontDisplay, fontLatin } from '@/config/fonts';
import { MotionRuntime } from '@/components/home/motion-runtime';
import { Providers } from '../providers';
import { Navbar } from '@/components/navbar';
import clsx from 'clsx';
import Footer from '@/components/footer';
import { ThemeProviderProps } from 'next-themes/dist/types';
import { basePath, getNavItems, locales } from '@/config/site';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale
} from 'next-intl/server';
import { isRtlLang } from 'rtl-detect';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type LayoutProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params
}: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'frontpage' });
  const s = await getTranslations({ locale, namespace: 'seo' });
  return {
    title: {
      default: t('seo.title'),
      template: `%s - ${t('seo.title')}`
    },
    description: t('seo.description'),
    keywords: s('keywords'),
    authors: [{ name: 'Tenga Conseil' }],
    icons: {
      icon: '/favicon.ico',
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png'
    },
    metadataBase: new URL(basePath),
    openGraph: {
      type: 'website',
      url: basePath,
      title: t('seo.title'),
      description: t('seo.description'),
      images: {
        url: `${basePath}/og-image.png`,
        alt: t('seo.image_alt')
      }
    },
    twitter: {
      title: t('seo.title'),
      card: 'summary_large_image',
      description: t('seo.description'),
      site: basePath,
      images: {
        url: `${basePath}/og-image.png`,
        alt: t('seo.image_alt')
      }
    }
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#EEF0F3' },
    { media: '(prefers-color-scheme: dark)', color: '#0D1121' }
  ]
};

const themeProps: Omit<ThemeProviderProps, 'children'> = {
  attribute: 'class',
  defaultTheme: 'system',
  enableSystem: true,
  disableTransitionOnChange: true
};

export default async function RootLayout({
  children,
  params
}: LayoutProps & { children: React.ReactNode }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const direction = isRtlLang(locale) ? 'rtl' : 'ltr';

  const navItems = await getNavItems({ locale, linkType: 'navItems' });
  const navMenuItems = await getNavItems({ locale, linkType: 'navMenuItems' });
  const footerLinks = await getNavItems({ locale, linkType: 'footerLinks' });

  const t = await getTranslations({ locale });
  const messages = await getMessages({ locale });

  return (
    // Variables de police sur <html> : --font-texte est défini sur :root.
    <html
      lang={locale}
      dir={direction}
      className={clsx(
        fontLatin.variable,
        fontDisplay.variable,
        fontArabe.variable
      )}
      suppressHydrationWarning
    >
      <head />
      <body>
        {/* Seules les pages 404 et d'erreur, rendues côté client, lisent des messages. */}
        <NextIntlClientProvider
          locale={locale}
          messages={{ notFound: messages.notFound, error: messages.error }}
        >
          <Providers locale={locale} themeProps={themeProps}>
            <a
              href='#contenu'
              className='sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-fenetre focus:rounded-controle focus:bg-accent focus:px-5 focus:py-3 focus:font-semibold focus:text-sur-accent focus:no-underline'
            >
              {t('a11y.skip')}
            </a>
            <div className='flex min-h-[100dvh] flex-col'>
              <Navbar
                navItems={navItems}
                navMenuItems={navMenuItems}
                labels={{
                  home: t('toolbar.home_aria'),
                  openMenu: t('toolbar.open_menu'),
                  closeMenu: t('toolbar.close_menu'),
                  mainNav: t('a11y.mainNav'),
                  language: t('language.label'),
                  toDark: t('theme.toDark'),
                  toLight: t('theme.toLight')
                }}
              />
              <main
                id='contenu'
                tabIndex={-1}
                className='conteneur flex-grow pb-24 pt-10 md:pt-16 focus:outline-none'
              >
                {children}
              </main>
              <MotionRuntime />
              <Footer
                footerLinks={footerLinks}
                labels={{ nav: t('a11y.footerNav') }}
              />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
