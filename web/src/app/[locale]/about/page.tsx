import { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { MotsCinetiques, phrases } from '@/components/home-sections';
import { Link } from '@/navigation';
import { supportEmail } from '@/config/site';
import { isoler } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('seo.title'),
    description: t('seo.description')
  };
}

// À propos : le titre monte mot à mot, le chapeau suit ; le récit se révèle au
// défilement, et la dernière phrase du texte, la règle de la maison, est posée
// seule en grand, révélée par un masque.
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const p = await getTranslations('presentation');

  const conclusion = phrases(t('p4'));
  const regle = conclusion.length > 1 ? conclusion.pop() : undefined;

  return (
    <article>
      <header className='pb-12 lg:pb-16'>
        <h1 className={`${title({ size: 'display' })} max-w-[12em]`}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p
          style={rang(1)}
          className='apparait-tard mt-8 max-w-[34em] text-chapo text-texte-2'
        >
          {t('p1')}
        </p>
      </header>

      <section className='grid gap-y-8 border-t border-trait py-12 lg:grid-cols-12 lg:gap-x-8 lg:py-20'>
        <span
          aria-hidden='true'
          data-reveal='volet'
          className='mt-3 block h-[3px] w-24 bg-safran lg:col-span-3 lg:w-full'
        />
        <div className='texte-riche colonne-lecture lg:col-span-7 lg:col-start-5'>
          <p data-reveal='monte'>{t('p2')}</p>
          <p data-reveal='monte'>{t('p3')}</p>
          <p data-reveal='monte'>{conclusion.join(' ')}</p>
        </div>
      </section>

      {regle && (
        <section className='border-t border-trait py-16 lg:py-24'>
          <p className='font-display text-geant text-encre lg:ms-[25%]'>
            <span data-reveal='masque' className='block'>
              {regle}
            </span>
          </p>
        </section>
      )}

      <footer className='grid gap-y-4 border-t border-trait pt-10 lg:grid-cols-12 lg:gap-x-8'>
        <div
          data-reveal='monte'
          className='texte-riche colonne-lecture lg:col-span-7 lg:col-start-5'
        >
          <p>
            {t.rich('contact_faq', {
              link: (chunks) => <Link href='/faq'>{chunks}</Link>
            })}
            {supportEmail && (
              <> {t('contact_email', { email: isoler(supportEmail) })}</>
            )}
          </p>
          <p>
            {p.rich('aboutLink', {
              link: (chunks) => <Link href='/presentation'>{chunks}</Link>
            })}
          </p>
        </div>
      </footer>
    </article>
  );
}
