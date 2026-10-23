import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import { BinomeConsent } from '@/components/rapports/binome-consent';
import {
  RapportBinome,
  libellesConsent,
  libellesRapportBinome
} from '@/components/rapports/rapport-binome';
import { loadBinome, parseBinomeId } from '@/lib/binome-data';
import { formatNombre } from '@/lib/format';
import { construireRapportBinome } from '@/lib/rapports/binome';
import { requireViewer } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string; binome: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'binome' });
  return {
    title: t('rapport.titre'),
    robots: { index: false, follow: false }
  };
}

// Rapport d'un binôme, pour l'une des deux personnes, le consultant de
// l'organisation ou l'administrateur Tenga. La seule lecture passe par
// app.lire_binome : la base exige les DEUX accords, refuse le responsable et
// toute autre personne, et écrit la ligne de journal avant de répondre. Tout
// refus devient un 404 uniforme : on ne dit pas pourquoi.
export default async function BinomePage({ params }: Props) {
  const { locale, binome: brut } = await params;
  setRequestLocale(locale);
  const id = parseBinomeId(brut);
  if (!id) notFound();
  const viewer = await requireViewer(locale, `/mes-resultats/binomes/${id}`);
  const lu = await loadBinome(viewer, id);
  if (!lu) notFound();

  // La personne qui regarde passe en premier ; le consultant voit l'ordre de la base.
  const [premiere, seconde] = [...lu.personnes].sort(
    (x, y) => Number(y.estLaMienne) - Number(x.estLaMienne)
  );
  if (!premiere || !seconde) notFound();
  const personne = premiere.estLaMienne;

  const t = await getTranslations('binome');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');

  const etiquettes = personne
    ? { a: t('etiquettes.moi'), b: t('etiquettes.autre') }
    : {
        a: t('etiquettes.personne', { numero: formatNombre(1, locale) }),
        b: t('etiquettes.personne', { numero: formatNombre(2, locale) })
      };

  return (
    <div>
      <p>
        <Link
          href={personne ? '/mes-resultats/binomes' : '/mon-compte'}
          className='font-semibold text-accent'
        >
          {personne ? t('rapport.retour') : t('rapport.retourCompte')}
        </Link>
      </p>
      <h1 className={`mt-4 ${title()}`}>{t('rapport.titre')}</h1>
      {!personne && (
        <p className='mt-2 text-texte-2'>{t('rapport.consultant')}</p>
      )}
      <div className='mt-8'>
        {premiere.scores && seconde.scores ? (
          <RapportBinome
            rapport={construireRapportBinome({
              a: premiere.scores,
              b: seconde.scores
            })}
            locale={locale}
            libelles={libellesRapportBinome(t, niveaux)}
            etiquettes={etiquettes}
            audience={personne ? 'personne' : 'consultant'}
          />
        ) : (
          <p className='text-texte-2'>{mes('formatAnterieur')}</p>
        )}
      </div>
      {personne && (
        <div className='mt-10'>
          <BinomeConsent
            binomeId={lu.binomeId}
            statut='actif'
            aDonneAccord
            labels={libellesConsent(t)}
          />
        </div>
      )}
    </div>
  );
}
