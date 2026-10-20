import { setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { rapportApercuHtml } from '@/data/rapport-apercu-html';
import { requireAdmin } from '@/lib/session';

interface Props {
  params: Promise<{ locale: string }>;
}

// ponytail: aperçu interne en français seulement, hors des fichiers de messages ; à remplacer par le moteur de rapports (lot 4 et 6) qui lira les vrais résultats, déclencheur : branchement du rapport de binôme sur app.results.
export async function generateMetadata() {
  return {
    title: 'Aperçu des rapports comparatifs',
    robots: { index: false, follow: false }
  };
}

export default async function ApercuRapportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, '/admin/apercu-rapport');

  return (
    <div className='flex flex-col gap-6'>
      <header>
        <h1 className={title()}>Aperçu des rapports comparatifs</h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          Maquette de lecture, réservée aux administrateurs : trois profils
          fictifs et un profil estimé, six rapports de binôme et un rapport
          d&apos;équipe. Ces données sont fixes, elles ne viennent pas des
          résultats enregistrés ; le moteur de rapports n&apos;est pas encore
          branché.
        </p>
      </header>
      <iframe
        title='Rapports comparatifs : profils, binômes et équipe'
        srcDoc={rapportApercuHtml}
        sandbox=''
        className='h-[85vh] w-full rounded-panneau border border-trait bg-fond'
      />
    </div>
  );
}
