import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CodeForm } from '@/components/code-form';
import { ConsumeLinkForm } from '@/components/consume-link-form';
import styles from '@/components/formulaires.module.css';
import { MotsCinetiques } from '@/components/home-sections';
import { Notice } from '@/components/notice';
import { title } from '@/components/primitives';
import { isLoginToken } from '@/lib/login-format';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

// Le jeton est dans l'adresse : aucune indexation, et un Referer réduit à
// l'origine (jamais le chemin, donc jamais le jeton). Pas « no-referrer » :
// avec lui, un envoi du formulaire avant l'hydratation part avec « Origin:
// null », que Next ne sait pas lire (500). Le chargement ne consomme rien.
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return {
    title: t('connect.title'),
    robots: { index: false, follow: false },
    referrer: 'strict-origin' as const
  };
}

export default async function ConnectPage({ params }: Props) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('login');
  const usable = isLoginToken(token);
  const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

  // Le titre monte mot à mot ; le bouton (seul geste qui consomme le jeton)
  // puis la saisie du code entrent en cascade.
  return (
    <div className='min-h-[50vh]'>
      <h1 className={title()}>
        <MotsCinetiques texte={t('connect.title')} />
      </h1>
      {usable ? (
        <div style={rang(1)} className={styles.entree}>
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
        </div>
      ) : (
        <div style={rang(1)} className={`mt-6 max-w-md ${styles.entree}`}>
          <Notice ton='erreur'>
            <p>{t('connect.error')}</p>
            <Link href='/connexion' className='font-semibold underline'>
              {t('connect.newLink')}
            </Link>
          </Notice>
        </div>
      )}
      <div style={rang(2)} className={`mt-4 ${styles.entree}`}>
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
            invalid: t('codeInvalid')
          }}
        />
      </div>
    </div>
  );
}
