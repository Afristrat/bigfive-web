import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';
import { LienRetour } from '@/components/resultats/lien-retour';
import { ResultHeader } from '@/components/resultats/result-header';
import { formatDateMaroc, isolerEnArabe, remplir } from '@/lib/format';
import {
  loadMaParticipation,
  parseParticipationId
} from '@/lib/mes-resultats-data';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ locale: string; participation: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'rapport' });
  return {
    title: t('personne.titre'),
    robots: { index: false, follow: false }
  };
}

// Rapport individuel de la personne elle-même (audience « personne ») : elle
// lit son propre résultat par app.mes_resultats, la seule voie qui lui est
// ouverte.
export default async function RapportPersonnePage({ params }: Props) {
  const { locale, participation: brut } = await params;
  setRequestLocale(locale);
  // 404 uniforme : identifiant hors format, participation absente, d'autrui ou
  // sans résultat lisible.
  const id = parseParticipationId(brut);
  if (!id) notFound();
  const viewer = await requireViewer(locale, `/mes-resultats/${id}/rapport`);
  const participation = await loadMaParticipation(viewer, id);
  if (!participation?.scores) notFound();

  const t = await getTranslations('rapport');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');

  const rapport = construireRapportIndividuel({
    scores: participation.scores,
    locale,
    audience: 'personne'
  });
  const date = participation.termineeLe
    ? formatDateMaroc(participation.termineeLe, locale)
    : null;

  const libelles = libellesRapport(t, mes, niveaux);
  return (
    <div>
      <ResultHeader
        retour={
          <LienRetour href={`/mes-resultats/${participation.participationId}`}>
            {t('personne.retour')}
          </LienRetour>
        }
        surtitre={`${isolerEnArabe(participation.campagneTitre, locale)}, ${isolerEnArabe(participation.organisationNom, locale)}`}
        titre={t('personne.titre')}
        sousTitre={date ? remplir(libelles.rempliLe, { date }) : null}
      />
      <div className='mt-12'>
        <RapportIndividuel
          rapport={rapport}
          locale={locale}
          libelles={libelles}
          date={null}
        />
      </div>
    </div>
  );
}
