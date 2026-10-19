import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import { fontSans } from '@/config/fonts';
import { Providers } from '../providers';
import { Navbar } from '@/components/navbar';
import clsx from 'clsx';
import Footer from '@/components/footer';
import { ThemeProviderProps } from 'next-themes/dist/types';
import { basePath, getNavItems, locales } from '@/config/site';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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
    authors: [{ name: 'AI-MPower' }],
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
        alt: 'People comparing personality tests'
      }
    },
    twitter: {
      title: t('seo.title'),
      card: 'summary_large_image',
      description: t('seo.description'),
      site: basePath,
      images: {
        url: `${basePath}/og-image.png`,
        alt: 'People comparing personality tests'
      }
    }
  };
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' }
  ]
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

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head />
      <body
        className={clsx(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        {/* Les composants client n'ont besoin que de la locale, pas des messages. */}
        <NextIntlClientProvider locale={locale} messages={{}}>
          <Providers
            themeProps={
              {
                attribute: 'class',
                defaultTheme: 'light'
              } as ThemeProviderProps
            }
          >
            <div className='relative flex flex-col h-screen'>
              <Navbar navItems={navItems} navMenuItems={navMenuItems} />
              <main className='container mx-auto max-w-7xl pt-6 md:pt-16 px-6 flex-grow'>
                {children}
              </main>
              <Footer footerLinks={footerLinks} />
            </div>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
