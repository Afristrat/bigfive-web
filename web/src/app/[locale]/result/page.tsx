import { GetResultPage } from './get-result';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ResultHeader } from '@/components/resultats/result-header';
import { PARCOURS_ANONYME_OUVERT } from '@/config/site';
import { versMesResultats } from '@/lib/parcours-anonyme';

interface Props {
  params: Promise<{ locale: string }>;
}

// Retrouver un résultat public par son identifiant : même ouverture que la page
// de résultat (surtitre réglé, titre qui monte mot à mot), puis le champ.
export default async function ResultPage({ params }: Props) {
  const { locale } = await params;
  // Parcours anonyme fermé : chacun lit son résultat derrière la connexion.
  if (!PARCOURS_ANONYME_OUVERT) await versMesResultats(locale);
  setRequestLocale(locale);
  const t = await getTranslations('getResult');

  return (
    <div className='min-h-[60dvh]'>
      <ResultHeader
        surtitre={t('surtitre')}
        titre={t('result')}
        chapo={t('explanation')}
      />
      <div className='mt-10 max-w-xl border-t-2 border-encre pt-8'>
        <GetResultPage
          labels={{
            champ: t('idInput'),
            exemple: t('urlOrId'),
            invalide: t('invalid'),
            courriel: t('courriel'),
            courrielLien: t('courrielLien'),
            afficher: t('getResult'),
            precedent: t('viewPrevious')
          }}
        />
      </div>
    </div>
  );
}
