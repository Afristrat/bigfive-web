import { setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { rapportApercuHtml } from '@/data/rapport-apercu-html';
import { requireAdmin } from '@/lib/session';

const formats = [
  { code: 'pdf', libelle: 'PDF (avec graphiques)' },
  { code: 'docx', libelle: 'Word (modifiable)' },
  { code: 'md', libelle: 'Markdown' },
  { code: 'html', libelle: 'HTML (animé)' }
] as const;

interface Props {
  params: Promise<{ locale: string }>;
}

// ponytail: aperçu interne en français seulement, hors des fichiers de messages ; rapport « cabinet » généré hors ligne par docs/design/rapport-cabinet (moteur, bibliothèque, audit) et figé dans src/data, à remplacer par le moteur de rapports (lot 4 et 6) qui lira les vrais résultats, déclencheur : branchement du rapport sur app.results.
export async function generateMetadata() {
  return {
    title: 'Aperçu du rapport cabinet',
    robots: { index: false, follow: false }
  };
}

export default async function ApercuRapportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, '/admin/apercu-rapport');
  // Préfixe de langue : l'anglais (langue par défaut) est servi sans préfixe.
  const prefixe = locale === 'en' ? '' : `/${locale}`;

  return (
    <div className='flex flex-col gap-6'>
      <header>
        <h1 className={title()}>Aperçu du rapport cabinet</h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          Démonstration réservée aux administrateurs : une organisation fictive,
          trois profils fictifs et un profil estimé, lus à cinq niveaux
          (individuel, relations, équipe, lecture organisationnelle, plan
          d&apos;accompagnement). Ces données sont fixes, elles ne viennent pas
          des résultats enregistrés ; les 150 textes de la bibliothèque ne sont
          pas relus et chaque lecture est une hypothèse à vérifier en entretien.
        </p>
      </header>
      <p className='flex flex-wrap items-center gap-3 text-petit'>
        <span className='text-texte-2'>Télécharger :</span>
        {formats.map((f) => (
          <a
            key={f.code}
            href={`${prefixe}/admin/apercu-rapport/export/${f.code}`}
            download
            className='rounded-full border border-trait px-3.5 py-1.5 font-semibold hover:border-texte-2'
          >
            {f.libelle}
          </a>
        ))}
      </p>
      <iframe
        title='Rapport cabinet : cinq niveaux de lecture'
        srcDoc={rapportApercuHtml}
        sandbox='allow-scripts allow-modals'
        className='h-[85vh] w-full rounded-panneau border border-trait bg-fond'
      />
    </div>
  );
}
