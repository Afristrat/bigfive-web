import { subtitle, title } from '@/components/primitives';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/navigation';
import { supportEmail } from '@/config/site';
import { isoler } from '@/lib/format';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return {
    title: t('seo.title'),
    description: t('seo.description')
  };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const p = await getTranslations('presentation');

  return (
    <article className='colonne-lecture'>
      <h1 className={title()}>{t('title')}</h1>
      <p className={subtitle()}>{t('p1')}</p>
      <div className='texte-riche mt-8'>
        <p>{t('p2')}</p>
        <p>{t('p3')}</p>
        <p>{t('p4')}</p>
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
    </article>
  );
}
