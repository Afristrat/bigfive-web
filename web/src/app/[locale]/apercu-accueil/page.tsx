import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { setRequestLocale } from 'next-intl/server';
import { ApercuAccueil } from '@/components/apercu/apercu-accueil';

// Police du thème fourni par Amine, servie par l'application (aucun appel à Google à l'exécution).
const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter'
});

// Aperçu de travail : jamais indexé, absent du plan du site.
export const metadata: Metadata = {
  title: 'Tenga Conseil',
  robots: { index: false, follow: false }
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ApercuAccueilPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className={inter.variable}>
      <ApercuAccueil />
    </div>
  );
}
