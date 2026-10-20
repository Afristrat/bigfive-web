import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CodeForm } from '@/components/code-form';
import { ConsumeLinkForm } from '@/components/consume-link-form';
import { Notice } from '@/components/notice';
import { title } from '@/components/primitives';
import { isLoginToken } from '@/lib/login-format';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

// Le jeton est dans l'adresse : aucune indexation, aucun en-tête Referer vers
// d'autres sites. Le chargement de la page ne consomme rien.
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return {
    title: t('connect.title'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer' as const
  };
}

export default async function ConnectPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');
  const usable = isLoginToken(token);

  return (
    <div className='min-h-[50vh]'>
      <h1 className={title()}>{t('connect.title')}</h1>
      {usable ? (
        <>
          <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
            {t('connect.intro')}
          </p>
          <ConsumeLinkForm
            token={token}
            locale={locale}
            labels={{
              button: t('connect.button'),
              opening: t('connect.opening'),
              error: t('connect.error'),
              newLink: t('connect.newLink')
            }}
          />
        </>
      ) : (
        <div className='mt-6 max-w-md'>
          <Notice ton='erreur'>
            <p>{t('connect.error')}</p>
            <Link href='/connexion' className='font-semibold underline'>
              {t('connect.newLink')}
            </Link>
          </Notice>
        </div>
      )}
      <CodeForm
        locale={locale}
        labels={{
          title: t('codeTitle'),
          intro: t('codeIntro'),
          emailLabel: t('emailLabel'),
          codeLabel: t('codeLabel'),
          submit: t('codeSubmit'),
          checking: t('codeChecking'),
          error: t('codeError'),
          invalid: t('invalid')
        }}
      />
    </div>
  );
}
