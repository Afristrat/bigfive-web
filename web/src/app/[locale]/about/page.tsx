import { title } from '@/components/primitives';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/navigation';
import { supportEmail } from '@/config/site';

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

  return (
    <>
      <div className='text-center justify-center mt-10'>
        <h1 className={title()}>About</h1>
      </div>
      <div className='mt-2 text-medium lg:mt-4 lg:text-large'>
        <p>
          Welcome to the Big Five personality test, your premier destination for
          exploring personality traits using the scientifically acclaimed Big
          Five model. Our free, open-source test offers detailed insights into
          the five key dimensions of personality: Openness, Conscientiousness,
          Extraversion, Agreeableness, and Neuroticism.
        </p>
        <br />
        <p>
          Each dimension is carefully analyzed to provide a comprehensive view
          of your traits and how they influence your behavior and interactions.
        </p>
        <p>
          Developed with precision and accessibility in mind, our test helps you
          understand yourself better and foster personal growth. Embrace the
          journey of self-discovery with this test, where psychological insights
          meet user-friendly technology.
        </p>
        <br />
        <p>
          If you have questions please read through the{' '}
          <Link href='/faq' className='underline'>
            FAQ
          </Link>{' '}
          first.
          {supportEmail && (
            <>
              {' '}
              If you can&apos;t find an answer there, feel free to contact us at{' '}
              {supportEmail}.
            </>
          )}
        </p>
      </div>
    </>
  );
}
