import { getTranslations, setRequestLocale } from 'next-intl/server';
import { OrganizationForm, RoleForm } from '@/components/admin-forms';
import { title } from '@/components/primitives';
import { loadJournal, loadOrganizations } from '@/lib/admin-data';
import { formatDate, formatDateHeure } from '@/lib/format';
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

const th = 'px-3.5 py-3 text-start text-legende font-semibold text-texte-2';
const td = 'px-3.5 py-3 align-top';

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  const viewer = await requireAdmin(locale, '/admin');
  const [organizations, journal] = await Promise.all([
    loadOrganizations(viewer),
    loadJournal(viewer)
  ]);
  const t = await getTranslations('admin');
  const roles = await getTranslations('roles');
  const account = await getTranslations('account');

  const feedback = {
    invalid: t('invalid'),
    exists: t('exists'),
    error: t('error')
  };

  return (
    <div className='flex flex-col gap-12'>
      <header>
        <h1 className={title()}>{t('title')}</h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          {t('intro')}
        </p>
        <p className='mt-4'>
          <Link
            href='/admin/apercu-rapport'
            className='underline underline-offset-4'
          >
            Aperçu des rapports comparatifs
          </Link>
        </p>
      </header>

      <section aria-labelledby='organisations-titre'>
        <h2 id='organisations-titre' className='text-titre-2 text-encre'>
          {t('organizationsTitle')}
        </h2>
        {organizations.length === 0 ? (
          <p className='mt-4 text-texte-2'>{t('empty')}</p>
        ) : (
          <div
            role='region'
            aria-labelledby='organisations-titre'
            tabIndex={0}
            className='carte mt-4 overflow-x-auto !p-0'
          >
            <table className='w-full min-w-[640px] text-petit'>
              <thead className='border-b border-trait'>
                <tr>
                  <th scope='col' className={th}>
                    {t('colName')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colSlug')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colStatus')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colCreated')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colResponsables')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colConsultants')}
                  </th>
                  <th scope='col' className={th}>
                    {t('colParticipants')}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-trait'>
                {organizations.map((o) => (
                  <tr key={o.id}>
                    <th
                      scope='row'
                      className={`${td} text-start font-semibold`}
                    >
                      {o.nom}
                    </th>
                    <td className={td}>
                      <bdi dir='ltr'>{o.slug}</bdi>
                    </td>
                    <td className={td}>
                      {o.statut === 'archivee'
                        ? t('status.archivee')
                        : t('status.active')}
                    </td>
                    <td className={td}>{formatDate(o.creeLe, locale)}</td>
                    <td className={`${td} chiffres`}>{o.responsables}</td>
                    <td className={`${td} chiffres`}>{o.consultants}</td>
                    <td className={`${td} chiffres`}>{o.participants}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className='grid gap-6 lg:grid-cols-2'>
        <section aria-labelledby='creer-titre' className='carte'>
          <h2 id='creer-titre' className='text-titre-2 text-encre'>
            {t('createTitle')}
          </h2>
          <OrganizationForm
            locale={locale}
            labels={{
              ...feedback,
              nameLabel: t('nameLabel'),
              slugLabel: t('slugLabel'),
              slugHelp: t('slugHelp'),
              submit: t('create'),
              done: t('created')
            }}
          />
        </section>

        <section aria-labelledby='role-titre' className='carte'>
          <h2 id='role-titre' className='text-titre-2 text-encre'>
            {t('assignTitle')}
          </h2>
          <p className='mt-2 text-texte-2'>{t('assignIntro')}</p>
          <RoleForm
            locale={locale}
            organizations={organizations.map((o) => ({ id: o.id, nom: o.nom }))}
            labels={{
              ...feedback,
              emailLabel: t('emailLabel'),
              organizationLabel: t('organizationLabel'),
              roleLabel: t('roleLabel'),
              languageLabel: t('languageLabel'),
              roles: {
                responsable: roles('responsable'),
                consultant: roles('consultant'),
                participant: roles('participant')
              },
              languages: {
                fr: account('languages.fr'),
                ar: account('languages.ar'),
                en: account('languages.en')
              },
              submit: t('assign'),
              done: t('assigned')
            }}
          />
        </section>
      </div>

      <section aria-labelledby='journal-titre'>
        <h2 id='journal-titre' className='text-titre-2 text-encre'>
          {t('journalTitle')}
        </h2>
        <p className='mt-2 text-texte-2'>{t('journalIntro')}</p>
        {journal.length === 0 ? (
          <p className='mt-4 text-texte-2'>{t('journalEmpty')}</p>
        ) : (
          <div
            role='region'
            aria-labelledby='journal-titre'
            tabIndex={0}
            className='carte mt-4 overflow-x-auto !p-0'
          >
            <table className='w-full min-w-[720px] text-petit'>
              <thead className='border-b border-trait'>
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
                  <tr key={entry.id}>
                    <td className={`${td} chiffres whitespace-nowrap`}>
                      {formatDateHeure(entry.cree_le, locale)}
                    </td>
                    <td className={td}>
                      <bdi dir='ltr'>{entry.action}</bdi>
                    </td>
                    <td className={`${td} break-all`}>
                      <bdi dir='ltr'>{entry.acteur ?? '-'}</bdi>
                    </td>
                    <td className={`${td} break-all`}>
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
