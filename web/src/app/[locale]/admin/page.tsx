import type { CSSProperties } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  AdminGrantForm,
  OrganizationForm,
  RoleForm
} from '@/components/admin-forms';
import { ArrowRightIcon } from '@/components/icons';
import { UnlockButton } from '@/components/password-unlock';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { TitreSection } from '@/components/pilotage/titre-section';
import { TengaAdminsPanel } from '@/components/tenga-admins-panel';
import {
  loadJournal,
  loadOrganizations,
  loadTengaAdmins
} from '@/lib/admin-data';
import {
  formatDate,
  formatDateHeure,
  formatNombre,
  isolerEnArabe
} from '@/lib/format';
import { loadLockedAccounts } from '@/lib/password-locked-accounts';
import { requireAdmin } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const TIME_ZONE = 'Africa/Casablanca';
const th = 'px-4 py-3 text-start text-legende font-medium text-texte-3';
const td = 'px-4 py-3.5 align-top';
const tableau = 'mt-6 overflow-x-auto rounded-panneau border border-trait';
const entete = 'border-b border-trait bg-creux/60';
const rang = (i: number): CSSProperties => ({ ['--i' as string]: i });

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  const viewer = await requireAdmin(locale, '/admin');
  const [organizations, journal, admins, locked] = await Promise.all([
    loadOrganizations(viewer),
    loadJournal(viewer),
    loadTengaAdmins(viewer),
    loadLockedAccounts(viewer)
  ]);
  const t = await getTranslations('admin');
  const roles = await getTranslations('roles');
  const account = await getTranslations('account');
  const pilotage = await getTranslations('pilotage');
  const tp = (cle: string, valeurs?: Record<string, string>): string =>
    pilotage(`admin.${cle}`, valeurs);
  const apercu = await getTranslations('apercu');

  const languages = {
    fr: account('languages.fr'),
    ar: account('languages.ar'),
    en: account('languages.en')
  };

  const feedback = {
    invalid: t('invalid'),
    exists: t('exists'),
    error: t('error')
  };

  const apercus = [
    {
      href: '/admin/apercu-resultats',
      titre: apercu('title'),
      texte: tp('apercuResultatsTexte')
    },
    {
      href: '/admin/apercu-rapport',
      titre: pilotage('rapportCabinet.titre'),
      texte: tp('apercuRapportTexte')
    }
  ];

  return (
    <div className='flex flex-col gap-20'>
      <EntetePilotage
        surtitre={tp('surtitre')}
        titre={t('title')}
        chapo={<p>{t('intro')}</p>}
        reperes={[
          {
            terme: t('organizationsTitle'),
            valeur: (
              <span className='chiffres font-display text-titre-1'>
                {formatNombre(organizations.length, locale)}
              </span>
            )
          }
        ]}
      >
        <ul
          role='list'
          aria-label={tp('apercusTitre')}
          className='mt-10 grid gap-4 md:grid-cols-2'
        >
          {apercus.map((apercu, i) => (
            <li key={apercu.href} style={rang(3 + i)} className='apparait-tard'>
              <Link
                href={apercu.href}
                className='lien-fleche group flex h-full flex-col gap-2 rounded-panneau border border-trait bg-surface p-5 transition-colors duration-courte ease-tenga hover:border-trait-fort'
              >
                <span className='flex items-center justify-between gap-3 text-titre-3 text-encre group-hover:text-accent'>
                  {apercu.titre}
                  <ArrowRightIcon size={18} />
                </span>
                <span className='text-petit text-texte-2'>{apercu.texte}</span>
              </Link>
            </li>
          ))}
        </ul>
      </EntetePilotage>

      <section aria-labelledby='organisations-titre'>
        <TitreSection id='organisations-titre' numero={1} locale={locale}>
          {t('organizationsTitle')}
        </TitreSection>
        <p className='mt-3 colonne-lecture text-texte-2'>
          {tp('organisationsIntro')}
        </p>
        {organizations.length === 0 ? (
          <p className='mt-6 text-texte-2'>{t('empty')}</p>
        ) : (
          <ul role='list' className='mt-6 border-t-2 border-encre'>
            {organizations.map((o, index) => (
              <li
                key={o.id}
                data-reveal='monte'
                style={rang(Math.min(index, 4))}
                className='relative grid gap-x-8 gap-y-4 py-6 md:grid-cols-12 md:items-center'
              >
                {index > 0 && (
                  <span
                    aria-hidden='true'
                    className='barre-reglee absolute inset-x-0 top-0 block h-px bg-trait'
                  />
                )}
                <div className='md:col-span-6'>
                  <h3 className='text-titre-3 text-encre [overflow-wrap:anywhere]'>
                    <Link
                      href={`/o/${o.slug}`}
                      aria-label={tp('ouvrirAria', { nom: o.nom })}
                      className='lien-fleche group inline-flex items-center gap-2 rounded-petit hover:text-accent'
                    >
                      <bdi>{o.nom}</bdi>
                      <ArrowRightIcon size={18} />
                    </Link>
                  </h3>
                  <p className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-petit text-texte-2'>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-legende font-medium ${o.statut === 'archivee' ? 'border-trait text-texte-3' : 'border-accent/30 bg-accent-doux text-accent'}`}
                    >
                      <span
                        aria-hidden='true'
                        className={`size-1.5 rounded-full ${o.statut === 'archivee' ? 'bg-trait-fort' : 'bg-accent'}`}
                      />
                      {o.statut === 'archivee'
                        ? t('status.archivee')
                        : t('status.active')}
                    </span>
                    <span>
                      <span className='sr-only'>{t('colSlug')} </span>
                      <bdi dir='ltr' className='font-mono text-legende'>
                        {o.slug}
                      </bdi>
                    </span>
                    <span>
                      {tp('creeLe', { date: formatDate(o.creeLe, locale) })}
                    </span>
                  </p>
                </div>
                <dl className='grid grid-cols-3 gap-4 md:col-span-6'>
                  {[
                    { terme: t('colResponsables'), valeur: o.responsables },
                    { terme: t('colConsultants'), valeur: o.consultants },
                    { terme: t('colParticipants'), valeur: o.participants }
                  ].map((chiffre) => (
                    <div
                      key={chiffre.terme}
                      className='border-s border-trait ps-4'
                    >
                      <dt className='text-legende text-texte-3'>
                        {chiffre.terme}
                      </dt>
                      <dd className='chiffres mt-1 font-display text-titre-2 text-encre'>
                        {formatNombre(chiffre.valeur, locale)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby='acces-titre'>
        <TitreSection id='acces-titre' numero={2} locale={locale}>
          {tp('accesTitre')}
        </TitreSection>
        <div className='mt-6 grid gap-6 lg:grid-cols-2'>
          <section
            aria-labelledby='creer-titre'
            data-reveal='monte'
            className='carte'
          >
            <h3 id='creer-titre' className='text-titre-2 text-encre'>
              {t('createTitle')}
            </h3>
            <OrganizationForm
              locale={locale}
              labels={{
                ...feedback,
                nameLabel: t('nameLabel'),
                slugLabel: t('slugLabel'),
                slugHelp: t('slugHelp'),
                submit: t('create'),
                done: t('created'),
                working: t('createWorking'),
                requiredLegend: t('requiredLegend')
              }}
            />
          </section>

          <section
            aria-labelledby='role-titre'
            data-reveal='monte'
            style={rang(1)}
            className='carte'
          >
            <h3 id='role-titre' className='text-titre-2 text-encre'>
              {t('assignTitle')}
            </h3>
            <p className='mt-2 text-texte-2'>{t('assignIntro')}</p>
            <RoleForm
              locale={locale}
              organizations={organizations.map((o) => ({
                id: o.id,
                nom: o.nom
              }))}
              labels={{
                ...feedback,
                emailLabel: t('emailLabel'),
                organizationLabel: t('organizationLabel'),
                organizationPlaceholder: t('organizationPlaceholder'),
                roleLabel: t('roleLabel'),
                rolePlaceholder: t('rolePlaceholder'),
                languageLabel: t('languageLabel'),
                roles: {
                  responsable: roles('responsable'),
                  consultant: roles('consultant'),
                  participant: roles('participant')
                },
                languages,
                submit: t('assign'),
                done: t('assigned'),
                working: t('assignWorking'),
                requiredLegend: t('requiredLegend')
              }}
            />
          </section>

          <section
            aria-labelledby='super-titre'
            data-reveal='monte'
            className='carte lg:col-span-2'
          >
            <h3 id='super-titre' className='text-titre-2 text-encre'>
              {t('grantTitle')}
            </h3>
            <p className='mt-2 colonne-lecture text-texte-2'>
              {t('grantIntro')}
            </p>
            <AdminGrantForm
              locale={locale}
              labels={{
                emailLabel: t('emailLabel'),
                languageLabel: t('languageLabel'),
                languages,
                confirmLabel: t('grantConfirmLabel'),
                submit: t('grant'),
                done: t('granted'),
                working: t('grantWorking'),
                requiredLegend: t('requiredLegend'),
                invalidFields: t('grantInvalid'),
                alreadyAdmin: t('grantExists'),
                failed: t('grantError')
              }}
            />
          </section>
        </div>
      </section>

      <section aria-labelledby='admins-titre'>
        <TitreSection id='admins-titre' numero={3} locale={locale} focalisable>
          {t('removeTitle')}
        </TitreSection>
        <p className='mt-3 colonne-lecture text-texte-2'>{t('removeIntro')}</p>
        {admins === null ? (
          <p className='mt-6 text-texte-2'>{t('adminsUnavailable')}</p>
        ) : (
          <TengaAdminsPanel
            locale={locale}
            headingId='admins-titre'
            rows={admins.map((admin) => ({
              userId: admin.userId,
              address: admin.adresse,
              addedAt: formatDate(admin.ajouteLe, locale),
              isMe: admin.estMoi,
              confirm: t('removeConfirm', {
                adresse: isolerEnArabe(admin.adresse, locale)
              }),
              ariaLabel: t('removeButtonAria', { adresse: admin.adresse })
            }))}
            labels={{
              caption: t('removeCaption'),
              colAddress: t('removeColAddress'),
              colAdded: t('removeColAdded'),
              colAction: t('removeColAction'),
              you: t('removeYou'),
              selfHelp: t('removeSelfHelp'),
              submit: t('removeButton'),
              working: t('removeWorking'),
              done: t('removed'),
              invalid: t('removeInvalid'),
              self: t('removeSelf'),
              absent: t('removeAbsent'),
              forbidden: t('removeForbidden'),
              error: t('removeError')
            }}
          />
        )}
      </section>

      <section aria-labelledby='verrous-titre'>
        <h2
          id='verrous-titre'
          className='flex items-baseline gap-4 text-titre-section text-encre'
        >
          <span
            aria-hidden='true'
            className='chiffres font-display text-petit font-medium text-texte-3'
          >
            {formatNombre(4, locale).padStart(2, '0')}
          </span>
          <span>{t('locked.title')}</span>
        </h2>
        <p className='mt-3 colonne-lecture text-texte-2'>{t('locked.intro')}</p>
        {locked === null ? (
          <p className='mt-6 text-texte-2'>{t('locked.unavailable')}</p>
        ) : locked.length === 0 ? (
          <p className='mt-6 text-texte-2'>{t('locked.empty')}</p>
        ) : (
          <div
            role='region'
            aria-labelledby='verrous-titre'
            tabIndex={0}
            className={tableau}
          >
            <table className='w-full min-w-[640px] text-petit'>
              <thead className={entete}>
                <tr>
                  <th scope='col' className={th}>
                    {t('locked.colAccount')}
                  </th>
                  <th scope='col' className={th}>
                    {t('locked.colState')}
                  </th>
                  <th scope='col' className={th}>
                    {t('locked.colUntil')}
                  </th>
                  <th scope='col' className={th}>
                    {t('locked.colAction')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-trait'>
                {locked.map((account) => {
                  const compte = account.email ?? account.nom ?? '';
                  return (
                    <tr key={account.utilisateur}>
                      <th
                        scope='row'
                        className={`${td} break-all text-start font-semibold text-encre`}
                      >
                        {account.nom && (
                          <span className='block'>{account.nom}</span>
                        )}
                        <bdi dir='ltr'>{account.email ?? '-'}</bdi>
                      </th>
                      <td className={td}>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-legende font-medium ${account.etat === 'definitif' ? 'bg-erreur-doux text-erreur' : 'bg-avis-doux text-avis'}`}
                        >
                          {account.etat === 'definitif'
                            ? t('locked.stateDefinitif')
                            : t('locked.stateTemporaire')}
                        </span>
                      </td>
                      <td className={`${td} chiffres whitespace-nowrap`}>
                        {account.etat === 'temporaire' && account.jusqu
                          ? // Heure de fin du blocage, lue au Maroc.
                            formatDateHeure(account.jusqu, locale, TIME_ZONE)
                          : '-'}
                      </td>
                      <td className={td}>
                        <UnlockButton
                          locale={locale}
                          userId={account.utilisateur}
                          label={t('locked.unlock')}
                          ariaLabel={t('locked.unlockAria', { compte })}
                          done={t('locked.unlocked')}
                          error={t('locked.error')}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby='journal-titre'>
        <TitreSection id='journal-titre' numero={5} locale={locale}>
          {t('journalTitle')}
        </TitreSection>
        <p className='mt-3 colonne-lecture text-texte-2'>{t('journalIntro')}</p>
        {journal.length === 0 ? (
          <p className='mt-6 text-texte-2'>{t('journalEmpty')}</p>
        ) : (
          <div
            role='region'
            aria-labelledby='journal-titre'
            tabIndex={0}
            className={tableau}
          >
            <table className='w-full min-w-[720px] text-petit'>
              <thead className={entete}>
                <tr>
                  <th scope='col' className={th}>
                    {t('colDate')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colAction')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colActor')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colResource')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colQuantity')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-trait'>
                {journal.map((entry) => (
                  <tr key={entry.id} className='hover:bg-creux/40'>
                    <td
                      className={`${td} chiffres whitespace-nowrap text-texte-2`}
                    >
                      {formatDateHeure(entry.cree_le, locale)}
                    </td>
                    <td className={td}>
                      <bdi
                        dir='ltr'
                        className='font-mono text-legende text-encre'
                      >
                        {entry.action}
                      </bdi>
                    </td>
                    <td className={`${td} break-all`}>
                      <bdi dir='ltr'>{entry.acteur ?? '-'}</bdi>
                    </td>
                    <td className={`${td} break-all text-texte-2`}>
                      <bdi dir='ltr'>
                        {entry.ressource_type
                          ? `${entry.ressource_type} ${entry.ressource_id ?? ''}`
                          : '-'}
                      </bdi>
                    </td>
                    <td className={`${td} chiffres`}>
                      {entry.quantite ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
