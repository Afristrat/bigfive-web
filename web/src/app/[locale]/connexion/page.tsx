import type { CSSProperties } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import styles from '@/components/formulaires.module.css';
import { MotsCinetiques } from '@/components/home-sections';
import { LoginForm, type LoginLabels } from '@/components/login-form';
import { Notice } from '@/components/notice';
import { PasswordLoginForm } from '@/components/password-login-form';
import { locales } from '@/config/site';
import { title } from '@/components/primitives';
import { DEFAULT_AFTER_LOGIN } from '@/lib/route-guard';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import { currentViewer } from '@/lib/session';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; erreur?: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'login' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });
const etapes = ['address', 'open', 'confirm'] as const;

export default async function LoginPage({ params, searchParams }: Props) {
  const { locale } = await params;
  // Langue issue de l'URL : inconnue = 404, avant toute redirection.
  if (!locales.includes(locale)) notFound();
  const { next, erreur } = await searchParams;
  setRequestLocale(locale);
  // `next` est un chemin interne sans langue, contrôlé avant tout usage.
  const target = safeInternalPath(next, '');

  // Déjà connecté : retour direct à la destination demandée. Si la session ne
  // peut pas être lue (passerelle indisponible), le formulaire reste affiché.
  const state = await currentViewer().catch(() => null);
  if (state?.status === 'ok') {
    redirect(
      safeInternalPath(
        localizedPath(locale, target || DEFAULT_AFTER_LOGIN),
        '/'
      )
    );
  }

  const t = await getTranslations('login');
  const link: LoginLabels = {
    emailLabel: t('emailLabel'),
    submit: t('submit'),
    sending: t('sending'),
    invalid: t('invalid'),
    sent: t('sent'),
    sentHelp: t('sentHelp'),
    retry: t('retry'),
    code: {
      title: t('codeTitle'),
      intro: t('codeIntro'),
      emailLabel: t('emailLabel'),
      codeLabel: t('codeLabel'),
      submit: t('codeSubmit'),
      checking: t('codeChecking'),
      error: t('codeError'),
      invalid: t('codeInvalid')
    }
  };

  // Parcours : le lien par e-mail est la voie principale, dans le panneau ;
  // la voie des administrateurs Tenga (mot de passe puis code TOTP, et « mot
  // de passe oublié ») est repliée dessous. Sur mobile, le formulaire suit
  // directement le titre ; les étapes viennent après. Le titre monte mot à
  // mot, le reste entre en cascade (rang --i).
  return (
    <div className='grid gap-x-12 gap-y-10 lg:grid-cols-12'>
      <div className='lg:col-span-5 lg:row-start-1'>
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p
          style={rang(1)}
          className={`mt-4 text-chapo text-texte-2 ${styles.entree}`}
        >
          {t('intro')}
        </p>
      </div>

      <div className='flex flex-col gap-8 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1'>
        <section style={rang(2)} className={`carte ${styles.entree}`}>
          {erreur && (
            <div className='mb-6 max-w-md'>
              <Notice ton='erreur'>
                <p>{t('linkError')}</p>
              </Notice>
            </div>
          )}
          <LoginForm locale={locale} next={target || undefined} labels={link} />
        </section>
        <div style={rang(4)} className={`px-1 ${styles.entree}`}>
          <PasswordLoginForm
            locale={locale}
            next={target || undefined}
            link={link}
            labels={{
              summary: t('password.summary'),
              intro: t('password.intro'),
              stepOne: t('password.stepOne'),
              stepTwo: t('password.stepTwo'),
              emailLabel: t('password.emailLabel'),
              passwordLabel: t('password.passwordLabel'),
              submit: t('password.submit'),
              checking: t('password.checking'),
              failed: t('password.failed'),
              invalid: t('password.invalid'),
              totpTitle: t('password.totpTitle'),
              totpIntro: t('password.totpIntro'),
              totpLabel: t('password.totpLabel'),
              totpSubmit: t('password.totpSubmit'),
              totpFailed: t('password.totpFailed'),
              restart: t('password.restart'),
              forgot: {
                open: t('password.forgot.open'),
                title: t('password.forgot.title'),
                intro: t('password.forgot.intro'),
                lock: t('password.forgot.lock'),
                submit: t('password.forgot.submit'),
                back: t('password.forgot.back')
              }
            }}
          />
        </div>
      </div>

      <ol
        aria-label={t('stepsLabel')}
        className='flex flex-col gap-5 lg:col-span-5 lg:row-start-2'
      >
        {etapes.map((etape, i) => (
          <li
            key={etape}
            style={rang(3 + i)}
            className={`flex items-start gap-4 ${styles.entree}`}
          >
            <span
              aria-hidden='true'
              className='chiffres flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-trait-fort text-petit font-semibold text-encre'
            >
              {i + 1}
            </span>
            <span className='pt-1 text-texte-2'>{t(`steps.${etape}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
