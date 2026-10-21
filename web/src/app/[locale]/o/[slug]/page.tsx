import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CampaignAnnouncer } from '@/components/campaign-announcer';
import {
  CampaignCreateForm,
  CampaignRowActions
} from '@/components/campaign-forms';
import { InviteForm } from '@/components/invite-form';
import { MemberInviteForm } from '@/components/member-invite-form';
import { title } from '@/components/primitives';
import {
  CAMPAIGN_TITLE_MAX,
  INVITATION_MESSAGE_MAX,
  INVITE_BATCH_MAX,
  canManageCampaigns,
  isInvitationLocale,
  memberInviteRoles,
  type InvitationLocale
} from '@/lib/access-rules';
import {
  loadCampaignStats,
  loadCampaigns,
  loadOrgPage,
  parseOrgSlug
} from '@/lib/campaign-data';
import { formatNombre, isoler } from '@/lib/format';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'campaigns' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';

const asLanguage = (value: string): InvitationLocale =>
  isInvitationLocale(value) ? value : 'fr';

export default async function OrganizationPage({ params }: Props) {
  const { locale, slug: rawSlug } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, organisation absente ou invisible,
  // rôle sans droit de gestion. Aucune de ces causes ne se distingue.
  const slug = parseOrgSlug(rawSlug);
  if (!slug) notFound();
  const viewer = await requireViewer(locale, `/o/${slug}`);
  const page = await loadOrgPage(viewer, slug);
  if (
    !page ||
    !canManageCampaigns({
      isTengaAdmin: page.isAdmin,
      roleInOrganization: page.role
    })
  ) {
    notFound();
  }

  const campaigns = await loadCampaigns(viewer, page.org.id);
  const stats = await Promise.all(
    campaigns.map((campaign) => loadCampaignStats(viewer, campaign.id))
  );

  const t = await getTranslations('campaigns');
  const ti = await getTranslations('invitations');
  const account = await getTranslations('account');
  const tm = await getTranslations('members');
  const tr = await getTranslations('roles');

  const languages = {
    fr: account('languages.fr'),
    ar: account('languages.ar'),
    en: account('languages.en')
  };
  const feedback = {
    invalid: t('invalid'),
    forbidden: t('forbidden'),
    conflict: t('conflict'),
    error: t('error')
  };
  // Un titre ou un nom saisi par un tiers, isolé dans une phrase arabe.
  const iso = (value: string): string =>
    locale === 'ar' ? isoler(value) : value;
  // Effectif inconnu : un tiret nu est lu « tiret » ; on dit « non disponible ».
  const number = (value: number | undefined) =>
    value === undefined ? (
      <>
        <span aria-hidden='true'>-</span>
        <span className='sr-only'>{t('figureUnknown')}</span>
      </>
    ) : (
      formatNombre(value, locale)
    );
  const archived = page.org.statut === 'archivee';
  // Rôles que cette personne peut donner par ce formulaire (l'administrateur :
  // responsable et consultant ; un responsable : aucun, il invite des
  // participants par les campagnes, décision I2). Vide : pas de formulaire.
  const memberRoles = memberInviteRoles({
    isTengaAdmin: page.isAdmin,
    roleInOrganization: page.role
  });
  const open = campaigns.filter((campaign) => campaign.statut === 'ouverte');

  const inviteLabels = {
    addressesLabel: ti('addressesLabel'),
    requiredLegend: ti('requiredLegend'),
    addressesHelp: ti('addressesHelp', {
      max: formatNombre(INVITE_BATCH_MAX, locale)
    }),
    languageLabel: ti('languageLabel'),
    languages,
    messageLabel: ti('messageLabel'),
    messageHelp: ti('messageHelp'),
    counter: ti('counter', { count: '{count}', max: '{max}' }),
    counterLow: ti('counterLow', { remaining: '{remaining}' }),
    counterFull: ti('counterFull'),
    submit: ti('submit'),
    sending: ti('sending'),
    summary: ti('summary', { sent: '{sent}', total: '{total}' }),
    doneNone: ti('doneNone'),
    summaryFailed: ti('summaryFailed', { failed: '{failed}' }),
    summaryUnprocessed: ti('summaryUnprocessed', {
      unprocessed: '{unprocessed}'
    }),
    abortedError: ti('abortedError'),
    abortedForbidden: ti('abortedForbidden'),
    abortedClosed: ti('abortedClosed'),
    failuresTitle: ti('failuresTitle'),
    outcome: {
      mail_failed: ti('outcome.mail_failed'),
      skipped_recent: ti('outcome.skipped_recent'),
      refused: ti('outcome.refused'),
      rate_limited: ti('outcome.rate_limited')
    },
    invalid: {
      empty: ti('invalid.empty'),
      too_many: ti('invalid.too_many', {
        max: formatNombre(INVITE_BATCH_MAX, locale)
      }),
      address: ti('invalid.address'),
      message: ti('invalid.message', {
        max: formatNombre(INVITATION_MESSAGE_MAX, locale)
      })
    },
    forbidden: ti('forbidden'),
    closed: ti('closed'),
    rateLimited: ti('rateLimited'),
    error: ti('error')
  };

  return (
    <div className='flex flex-col gap-12'>
      <header>
        <h1 className={title()}>
          <bdi>{page.org.nom}</bdi>{' '}
          <span className='mt-2 block text-titre-2 text-encre'>
            {t('title')}
          </span>
        </h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          {t('intro')}
        </p>
      </header>

      <section>
        <h2 id='campagnes-titre' className='text-titre-2 text-encre'>
          {t('listTitle')}
        </h2>
        <p className='mt-2 text-texte-2'>{t('statsHelp')}</p>
        {/* Région d'annonce persistante : « Ouvrir » et « Clôturer » re-rendent la page. */}
        <CampaignAnnouncer>
          {campaigns.length === 0 ? (
            <p className='mt-4 text-texte-2'>{t('empty')}</p>
          ) : (
            <div
              role='region'
              aria-labelledby='campagnes-titre'
              tabIndex={0}
              className='carte mt-4 overflow-x-auto !p-0'
            >
              <table className='w-full min-w-[900px] text-petit'>
                <caption className='sr-only'>{t('tableCaption')}</caption>
                <thead className='border-b border-trait'>
                  <tr>
                    <th scope='col' className={th}>
                      {t('colTitle')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colStatus')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colParticipants')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colInProgress')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colDone')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colPending')}
                    </th>
                    <th scope='col' className={th}>
                      {t('colActions')}
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-trait'>
                  {campaigns.map((campaign, index) => {
                    const figures = stats[index];
                    const titre = iso(campaign.titre);
                    return (
                      <tr key={campaign.id}>
                        {/* Reçoit le focus après « Ouvrir » ou « Clôturer ». */}
                        <th
                          scope='row'
                          id={`campagne-${campaign.id}`}
                          tabIndex={-1}
                          className={`${td} text-start font-semibold [overflow-wrap:anywhere] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-anneau`}
                        >
                          <bdi>{campaign.titre}</bdi>
                        </th>
                        <td className={td}>{t(`status.${campaign.statut}`)}</td>
                        <td className={`${td} chiffres`}>
                          {number(figures?.participants)}
                        </td>
                        <td className={`${td} chiffres`}>
                          {number(figures?.enCours)}
                        </td>
                        <td className={`${td} chiffres`}>
                          {number(figures?.termines)}
                        </td>
                        <td className={`${td} chiffres`}>
                          {number(figures?.enAttente)}
                        </td>
                        <td className={td}>
                          <CampaignRowActions
                            locale={locale}
                            slug={slug}
                            campaignId={campaign.id}
                            statut={campaign.statut}
                            titleId={`campagne-${campaign.id}`}
                            labels={{
                              ...feedback,
                              working: t('working'),
                              open: {
                                submit: t('open'),
                                ariaLabel: t('openAria', {
                                  titre: campaign.titre
                                }),
                                done: t('opened', { titre })
                              },
                              close: {
                                warning: t('closeWarning'),
                                confirm: t('closeConfirm'),
                                submit: t('close'),
                                ariaLabel: t('closeAria', {
                                  titre: campaign.titre
                                }),
                                done: t('closed', { titre })
                              }
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CampaignAnnouncer>
      </section>

      {open.map((campaign) => (
        <section
          key={campaign.id}
          aria-labelledby={`inviter-${campaign.id}`}
          className='carte'
        >
          <h2
            id={`inviter-${campaign.id}`}
            className='text-titre-2 text-encre [overflow-wrap:anywhere]'
          >
            {ti('title', { titre: iso(campaign.titre) })}
          </h2>
          <InviteForm
            locale={locale}
            slug={slug}
            campaignId={campaign.id}
            defaultLanguage={asLanguage(campaign.langue)}
            labels={inviteLabels}
          />
        </section>
      ))}

      {memberRoles.length > 0 && (
        <section aria-labelledby='membres-titre' className='carte'>
          <h2 id='membres-titre' className='text-titre-2 text-encre'>
            {tm('title')}
          </h2>
          <p className='mt-2 colonne-lecture text-texte-2'>{tm('intro')}</p>
          <MemberInviteForm
            locale={locale}
            slug={slug}
            organisationId={page.org.id}
            roles={memberRoles}
            defaultLanguage={asLanguage(locale)}
            labels={{
              requiredLegend: tm('requiredLegend'),
              emailLabel: tm('emailLabel'),
              confirmLabel: tm('confirmLabel'),
              confirmHelp: tm('confirmHelp'),
              roleLabel: tm('roleLabel'),
              rolePlaceholder: tm('rolePlaceholder'),
              roleHelp: tm('roleHelp'),
              roles: {
                responsable: tr('responsable'),
                consultant: tr('consultant')
              },
              languageLabel: tm('languageLabel'),
              languages,
              working: tm('working'),
              submit: tm('submit'),
              invited: tm('invited'),
              invitedMailFailed: tm('invitedMailFailed'),
              invalid: tm('invalid'),
              forbidden: tm('forbidden'),
              rateLimited: tm('rateLimited'),
              error: tm('error')
            }}
          />
        </section>
      )}

      <section aria-labelledby='creer-campagne-titre' className='carte'>
        <h2 id='creer-campagne-titre' className='text-titre-2 text-encre'>
          {t('createTitle')}
        </h2>
        {archived ? (
          <p className='mt-2 text-texte-2'>{t('archived')}</p>
        ) : (
          <>
            <p className='mt-2 text-texte-2'>{t('createIntro')}</p>
            <CampaignCreateForm
              locale={locale}
              slug={slug}
              organisationId={page.org.id}
              defaultLanguage={asLanguage(locale)}
              labels={{
                ...feedback,
                requiredLegend: t('requiredLegend'),
                titleLabel: t('titleLabel'),
                titleHelp: t('titleHelp', {
                  max: formatNombre(CAMPAIGN_TITLE_MAX, locale)
                }),
                titleInvalid: t('titleInvalid', {
                  max: formatNombre(CAMPAIGN_TITLE_MAX, locale)
                }),
                languageLabel: t('languageLabel'),
                languages,
                submit: t('create'),
                working: t('working'),
                done: t('created')
              }}
            />
          </>
        )}
      </section>
    </div>
  );
}
