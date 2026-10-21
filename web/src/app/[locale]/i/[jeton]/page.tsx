import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AcceptInvitationForm } from '@/components/accept-invitation-form';
import { Notice } from '@/components/notice';
import { title } from '@/components/primitives';
import { formatDate, isoler } from '@/lib/format';
import { loadInvitation } from '@/lib/invitation-data';
import { invitationLimits } from '@/lib/invitation-limits';
import { isLoginToken } from '@/lib/login-format';
import { isRateLimited } from '@/lib/rate-limit';

interface Props {
  params: Promise<{ locale: string; jeton: string }>;
}

// Page propre à un jeton : jamais servie depuis un cache, jamais prérendue. Le
// limiteur la rend dynamique par effet de bord ; on le déclare ici.
export const dynamic = 'force-dynamic';

// Fuseau de lecture des dates, celui de l'e-mail d'invitation.
const TIME_ZONE = 'Africa/Casablanca';

// Le jeton est dans l'adresse : aucune indexation, aucun en-tête Referer vers
// d'autres sites. Le chargement de la page ne consomme rien.
export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'invitation' });
  return {
    title: t('title'),
    robots: { index: false, follow: false },
    referrer: 'no-referrer' as const
  };
}

export default async function InvitationPage({ params }: Props) {
  const { locale, jeton } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('invitation');

  // Un seul refus pour tout : plafond atteint, jeton mal formé, inconnu,
  // expiré, utilisé ou campagne close. Rien ne distingue ces causes. La forme
  // du jeton est testée AVANT le limiteur : un jeton mal formé ne compte pas.
  const invitation =
    !isLoginToken(jeton) ||
    (await isRateLimited('invitationView', invitationLimits.viewPerIp))
      ? null
      : await loadInvitation(jeton);

  if (!invitation) {
    return (
      <div className='min-h-[50vh]'>
        <h1 className={title()}>{t('title')}</h1>
        <div className='mt-6 max-w-md'>
          <Notice ton='erreur'>
            <p>{t('invalid')}</p>
          </Notice>
        </div>
      </div>
    );
  }

  const prenom = invitation.prenom?.trim();
  const message = invitation.message?.trim();
  // En arabe, un nom latin dans la phrase ne doit pas être réordonné.
  const isolated = (texte: string): string =>
    locale === 'ar' ? isoler(texte) : texte;

  return (
    <div className='min-h-[50vh]'>
      <h1 className={title()}>{t('title')}</h1>
      <p className='mt-4 break-words text-chapo text-encre'>
        {prenom
          ? t('greeting', { prenom: isolated(prenom) })
          : t('greetingNeutral')}
      </p>
      <p className='mt-2 break-words colonne-lecture text-chapo text-texte-2'>
        {t('intro', {
          organisation: isolated(invitation.organisation_nom),
          campagne: isolated(invitation.campagne_titre)
        })}
      </p>
      {message && (
        <section className='carte mt-6 max-w-xl'>
          <h2 className='text-legende font-semibold text-texte-2'>
            {t('messageTitle')}
          </h2>
          {/* Texte libre d'un tiers : rendu comme texte (React l'échappe), jamais en HTML. */}
          <p
            dir='auto'
            className='mt-2 whitespace-pre-line break-words text-encre'
          >
            {message}
          </p>
        </section>
      )}
      <p className='mt-6 text-texte-2'>
        {t('expires', {
          date: formatDate(invitation.expire, locale, TIME_ZONE)
        })}
      </p>
      <p className='mt-1 text-texte-2'>{t('acceptHelp')}</p>
      <AcceptInvitationForm
        token={jeton}
        labels={{
          button: t('button'),
          accepting: t('accepting'),
          unavailable: t('invalid'),
          otherSession: t('otherSession'),
          signinRequired: t('signinRequired'),
          signinLink: t('signinLink'),
          failed: t('failed')
        }}
      />
    </div>
  );
}
