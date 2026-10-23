import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  consentirReseau,
  informerReseau,
  repondreReseau,
  retirerReseau
} from '@/actions/reseau';
import { EcranReseau } from '@/components/reseau/ecran-reseau';
import { libellesReseau } from '@/components/reseau/libelles';
import { LienRetour } from '@/components/resultats/lien-retour';
import { ResultHeader } from '@/components/resultats/result-header';
import { supportEmail } from '@/config/site';
import { isolerEnArabe } from '@/lib/format';
import {
  loadMesRelevesReseau,
  loadReleveReseau,
  parseParticipationReseau
} from '@/lib/reseau-data';
import type { ActionsReseau } from '@/lib/reseau-releve';
import { requireViewer } from '@/lib/session';

interface Props {
  params: Promise<{ locale: string; participation: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reseau' });
  return { title: t('page.titre'), robots: { index: false, follow: false } };
}

const actions: ActionsReseau = {
  informer: informerReseau,
  consentir: consentirReseau,
  repondre: repondreReseau,
  retirer: retirerReseau
};

// Relevé du réseau de l'équipe pour une participation de la personne connectée.
// La seule lecture passe par app.reseau_releve : la base vérifie que la
// participation est la sienne et rend {"ouvert": false} tant que l'interrupteur
// de production est fermé. Tout refus, comme l'interrupteur fermé, devient un
// 404 uniforme : on ne dit pas pourquoi.
export default async function ReleveReseauPage({ params }: Props) {
  const { locale, participation: brut } = await params;
  setRequestLocale(locale);
  const participationId = parseParticipationReseau(brut);
  if (!participationId) notFound();
  const viewer = await requireViewer(
    locale,
    `/mes-resultats/reseau/${participationId}`
  );
  const [releve, mesReleves] = await Promise.all([
    loadReleveReseau(viewer, participationId),
    loadMesRelevesReseau(viewer)
  ]);
  if (!releve) notFound();
  // Organisation et campagne, pour situer le relevé ; absentes, l'écran reste complet.
  const ligne = mesReleves.find((r) => r.participationId === participationId);

  const t = await getTranslations('reseau');

  return (
    <div className='flex flex-col gap-12'>
      <ResultHeader
        retour={
          <LienRetour href='/mes-resultats'>{t('page.retour')}</LienRetour>
        }
        surtitre={ligne ? isolerEnArabe(ligne.organisationNom, locale) : null}
        titre={t('page.titre')}
        sousTitre={ligne ? isolerEnArabe(ligne.campagneTitre, locale) : null}
      />
      <div className='max-w-[52rem]'>
        <EcranReseau
          participationId={participationId}
          releve={releve}
          actions={actions}
          libelles={libellesReseau(t, supportEmail)}
          locale={locale}
        />
      </div>
    </div>
  );
}
