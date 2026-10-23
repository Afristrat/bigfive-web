import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { signOutAction } from '@/actions/auth';
import { secondaryButtonClass } from '@/components/form-styles';
import styles from '@/components/formulaires.module.css';
import { MotsCinetiques } from '@/components/home-sections';
import { ProfileForm } from '@/components/profile-form';
import { PasswordSection, TotpSection } from '@/components/security-forms';
import { title } from '@/components/primitives';
import { Sceau, initiale } from '@/components/sceau';
import { hasVerifiedTotp, loadAccount } from '@/lib/account-data';
import { isoler } from '@/lib/format';
import { isTengaAdmin, requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

export default async function AccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const viewer = await requireViewer(locale, '/mon-compte');
  const [account, admin] = await Promise.all([
    loadAccount(viewer),
    isTengaAdmin(viewer)
  ]);
  // Sécurité de la connexion : réservée aux administrateurs Tenga, seuls à
  // pouvoir se connecter par mot de passe (les actions le revérifient).
  const totpActive = admin ? await hasVerifiedTotp(viewer) : false;
  const t = await getTranslations('account');
  const roles = await getTranslations('roles');
  const results = await getTranslations('mesResultats');
  const security = {
    totpTitle: t('security.totpTitle'),
    totpActive: t('security.totpActive'),
    totpInactive: t('security.totpInactive'),
    totpStart: t('security.totpStart'),
    totpStarting: t('security.totpStarting'),
    totpScan: t('security.totpScan'),
    totpQrAlt: t('security.totpQrAlt'),
    totpSecretLabel: t('security.totpSecretLabel'),
    totpCodeLabel: t('security.totpCodeLabel'),
    totpConfirm: t('security.totpConfirm'),
    totpConfirming: t('security.totpConfirming'),
    totpEnabled: t('security.totpEnabled'),
    totpFailed: t('security.totpFailed'),
    error: t('security.error'),
    passwordTitle: t('security.passwordTitle'),
    passwordIntro: t('security.passwordIntro'),
    newLabel: t('security.newLabel'),
    confirmLabel: t('security.confirmLabel'),
    codeLabel: t('security.codeLabel'),
    save: t('security.save'),
    saving: t('security.saving'),
    saved: t('security.saved'),
    needsTotp: t('security.needsTotp'),
    mismatch: t('security.mismatch'),
    invalid: t('security.invalid'),
    codeFailed: t('security.codeFailed'),
    rateLimited: t('security.rateLimited'),
    weak: {
      too_short: t('security.weak.too_short'),
      too_long: t('security.weak.too_long'),
      common: t('security.weak.common'),
      repetitive: t('security.weak.repetitive'),
      contains_email: t('security.weak.contains_email')
    }
  };

  // Ouverture : le sceau se trace autour de l'initiale, le titre monte mot à
  // mot, puis l'identité et les panneaux entrent en cascade (rang --i). La
  // colonne d'identité reste en vue pendant le défilement sur grand écran.
  const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });
  const lettre = initiale(account.nom?.trim() || viewer.email, locale);

  return (
    <div className='grid gap-10 lg:grid-cols-12'>
      <div className='lg:sticky lg:top-24 lg:col-span-5 lg:self-start'>
        <Sceau lettre={lettre} className='mb-6 h-20 w-20' />
        <h1 className={title()}>
          <MotsCinetiques texte={t('title')} />
        </h1>
        <p style={rang(1)} className={`mt-4 text-texte-2 ${styles.entree}`}>
          {t('intro')}
        </p>
        <dl style={rang(2)} className={`mt-6 ${styles.entree}`}>
          <dt className='text-legende font-semibold text-texte-2'>
            {t('emailLabel')}
          </dt>
          <dd className='mt-1 break-all font-semibold text-encre'>
            <bdi dir='ltr'>{isoler(viewer.email)}</bdi>
          </dd>
        </dl>
        <div
          style={rang(3)}
          className={`mt-8 flex flex-wrap gap-3 ${styles.entree}`}
        >
          <Link href='/mes-resultats' className={secondaryButtonClass}>
            {results('title')}
          </Link>
          {admin && (
            <Link href='/admin' className={secondaryButtonClass}>
              {t('adminLink')}
            </Link>
          )}
          <form action={signOutAction}>
            <input type='hidden' name='locale' value={locale} />
            <button type='submit' className={secondaryButtonClass}>
              {t('logout')}
            </button>
          </form>
        </div>
      </div>

      <div className='flex flex-col gap-10 lg:col-span-7'>
        <section
          aria-labelledby='profil-titre'
          style={rang(3)}
          className={`carte ${styles.entree}`}
        >
          <h2 id='profil-titre' className='text-titre-2 text-encre'>
            {t('profileTitle')}
          </h2>
          <ProfileForm
            locale={locale}
            nom={account.nom ?? ''}
            langue={account.langue}
            labels={{
              nameLabel: t('nameLabel'),
              nameHelp: t('nameHelp'),
              languageLabel: t('languageLabel'),
              languages: {
                fr: t('languages.fr'),
                ar: t('languages.ar'),
                en: t('languages.en')
              },
              save: t('save'),
              saving: t('saving'),
              saved: t('saved'),
              invalid: t('invalid'),
              error: t('error')
            }}
          />
        </section>

        <section
          aria-labelledby='roles-titre'
          style={rang(4)}
          className={`carte ${styles.entree}`}
        >
          <h2 id='roles-titre' className='text-titre-2 text-encre'>
            {t('rolesTitle')}
          </h2>
          {account.roles.length === 0 ? (
            <p className='mt-4 text-texte-2'>{t('noRoles')}</p>
          ) : (
            <ul className='mt-4 divide-y divide-trait'>
              {account.roles.map((r, i) => (
                <li
                  key={`${r.organisation}-${r.role}`}
                  style={rang(5 + Math.min(i, 5))}
                  className={`flex flex-wrap items-center justify-between gap-2 py-3 ${styles.entree}`}
                >
                  <span className='font-semibold text-encre'>
                    {r.organisation}
                  </span>
                  <span className='rounded-full bg-accent-doux px-3.5 py-1 text-legende font-semibold text-accent'>
                    {roles(r.role)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {admin && (
          <section
            aria-labelledby='securite-titre'
            style={rang(5)}
            className={`carte ${styles.entree}`}
          >
            <h2 id='securite-titre' className='text-titre-2 text-encre'>
              {t('security.title')}
            </h2>
            <p className='mt-2 text-texte-2'>{t('security.intro')}</p>
            <div className='mt-6 flex flex-col gap-8'>
              <TotpSection
                locale={locale}
                active={totpActive}
                labels={security}
              />
              <PasswordSection
                locale={locale}
                totpActive={totpActive}
                labels={security}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
