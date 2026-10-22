import { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { MotsCinetiques } from '@/components/home-sections';
import { Link } from '@/navigation';
import { supportEmail } from '@/config/site';
import { formatNombre, isoler } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

const sections = ['instrument', 'model', 'languages', 'limits'] as const;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('seo.title'),
    description: t('seo.description')
  };
}

// À propos : une thèse en titre, montée mot à mot ; quatre rubriques numérotées
// en registre (intitulé en marge, texte en colonne de lecture), révélées au
// défilement sous un filet qui se trace ; la règle de la maison posée seule en
// grand, révélée par masque ; puis le contact.
export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const c = await getTranslations('common');
  const p = await getTranslations('presentation');

  return (
    <article>
      <header className='pb-14 lg:pb-20'>
        <p className='text-petit font-medium text-texte-3'>{t('title')}</p>
        <h1
          className={`${title({ size: 'display' })} mt-4 max-w-[13em] text-balance`}
        >
          <MotsCinetiques texte={t('headline')} />
        </h1>
        <p
          style={rang(1)}
          className='apparait-tard mt-8 max-w-[36em] text-chapo text-texte-2'
        >
          {t('lead')}
        </p>
      </header>

      <ol role='list' className='border-t-2 border-encre'>
        {sections.map((key, index) => (
          <li
            key={key}
            data-reveal='monte'
            className='relative grid gap-x-8 gap-y-3 py-10 lg:grid-cols-12 lg:py-14'
          >
            {index > 0 && (
              <span
                aria-hidden='true'
                className='barre-reglee absolute inset-x-0 top-0 block h-px bg-trait'
              />
            )}
            <h2 className='flex items-baseline gap-4 text-titre-2 text-encre lg:col-span-4'>
              <span
                aria-hidden='true'
                className='chiffres font-display text-petit font-medium text-texte-3'
              >
                {formatNombre(index + 1, locale).padStart(2, '0')}
              </span>
              <span>{t(`${key}.title`)}</span>
            </h2>
            <p
              className={`colonne-lecture text-chapo lg:col-span-7 lg:col-start-6 ${key === 'limits' ? 'text-encre' : 'text-texte-2'}`}
            >
              {t(`${key}.text`)}
            </p>
          </li>
        ))}
      </ol>

      <section
        aria-labelledby='regle'
        className='relative border-t border-trait py-16 lg:py-28'
      >
        <h2
          id='regle'
          className='text-petit font-medium text-texte-3 [font-family:var(--font-texte)]'
        >
          {t('rule')}
        </h2>
        <p className='mt-6 font-display text-geant text-encre lg:ms-[33%]'>
          <span data-reveal='masque' className='block'>
            {c('signature')}
          </span>
        </p>
        <span
          aria-hidden='true'
          data-reveal='volet'
          className='mt-8 block h-[3px] w-24 bg-safran lg:ms-[33%]'
        />
      </section>

      <footer
        aria-labelledby='contact'
        className='grid gap-x-8 gap-y-4 border-t border-trait pt-10 lg:grid-cols-12'
      >
        <h2 id='contact' className='text-titre-2 text-encre lg:col-span-4'>
          {t('contact.title')}
        </h2>
        <div
          data-reveal='monte'
          className='texte-riche colonne-lecture lg:col-span-7 lg:col-start-6'
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
