import { notFound, redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { LoginForm } from '@/components/login-form';
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
  return (
    <div className='min-h-[50vh]'>
      <h1 className={title()}>{t('title')}</h1>
      <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
        {t('intro')}
      </p>
      {erreur && (
        <div className='mt-6 max-w-md'>
          <Notice ton='erreur'>
            <p>{t('linkError')}</p>
          </Notice>
        </div>
      )}
      <LoginForm
        locale={locale}
        next={target || undefined}
        labels={{
          emailLabel: t('emailLabel'),
          submit: t('submit'),
          sending: t('sending'),
          invalid: t('invalid'),
          sent: t('sent'),
          sentHelp: t('sentHelp'),
          code: {
            title: t('codeTitle'),
            intro: t('codeIntro'),
            emailLabel: t('emailLabel'),
            codeLabel: t('codeLabel'),
            submit: t('codeSubmit'),
            checking: t('codeChecking'),
            error: t('codeError'),
            invalid: t('invalid')
          }
        }}
      />
      {/* Voie des administrateurs Tenga (mot de passe puis code TOTP), repliée :
          le lien reste la voie ordinaire et le secours. */}
      <PasswordLoginForm
        locale={locale}
        next={target || undefined}
        labels={{
          summary: t('password.summary'),
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
          totpFailed: t('password.totpFailed')
        }}
      />
    </div>
  );
}
