import { getTranslations, setRequestLocale } from 'next-intl/server';
import { title } from '@/components/primitives';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { GroupSynthesis } from '@/components/synthese/group-synthesis';
import {
  groupesApercu,
  lienApercu,
  lireReglagesApercu,
  nomProfilApercu,
  PROFILS_APERCU,
  scoresApercu,
  VUES_APERCU,
  type ReglagesApercu
} from '@/lib/apercu-resultats';
import { profilDepuisScores } from '@/lib/moteur';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';
import { requireAdmin } from '@/lib/session';
import { Link } from '@/navigation';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'apercu' });
  return { title: t('title'), robots: { index: false, follow: false } };
}

const pastille = 'rounded-full border px-3.5 py-1.5 font-semibold';

// Aperçu interne : assemble les vrais composants (vue des résultats, rapport
// individuel, synthèse de groupe) sur des données fictives. Aucune lecture de
// la base, aucune variable d'exploitation : la simulation de la garde de
// relecture passe en paramètre d'appel.
export default async function ApercuResultatsPage({
  params,
  searchParams
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, '/admin/apercu-resultats');
  const reglages = lireReglagesApercu(await searchParams);
  const { vue, profil, simulation } = reglages;

  const t = await getTranslations('apercu');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');
  const flow = await getTranslations('flow');
  const rapportT = await getTranslations('rapport');
  const synthese = await getTranslations('synthese');

  const lien = (
    changement: Partial<ReglagesApercu>,
    libelle: string,
    actif: boolean
  ) => (
    <Link
      key={libelle}
      href={lienApercu({ ...reglages, ...changement })}
      aria-current={actif ? 'page' : undefined}
      className={`${pastille} ${actif ? 'border-encre text-encre' : 'border-trait hover:border-texte-2'}`}
    >
      {libelle}
    </Link>
  );

  const scores = scoresApercu(profil);
  const audience = vue === 'consultant' ? 'consultant' : 'personne';
  // Le réglage ne vaut que pour la vue participant ; le consultant voit toujours tout.
  const afficherNonRelus = vue === 'participant' ? simulation : undefined;

  return (
    <div className='flex flex-col gap-8' data-vue={vue} data-profil={profil}>
      <header>
        <h1 className={title()}>{t('title')}</h1>
        <p className='mt-4 colonne-lecture text-chapo text-texte-2'>
          {t('intro')}
        </p>
      </header>

      <p
        role='note'
        className='rounded-panneau border-2 border-encre px-4 py-3 text-base font-bold text-encre'
      >
        {t('bandeau')}
      </p>

      <nav aria-label={t('vueLegende')} className='flex flex-col gap-4'>
        <div className='flex flex-wrap items-center gap-3'>
          <span className='text-texte-2'>{t('vueLegende')}</span>
          {VUES_APERCU.map((v) => lien({ vue: v }, t(`vues.${v}`), v === vue))}
        </div>
        {vue !== 'groupe' && (
          <div className='flex flex-wrap items-center gap-3'>
            <span className='text-texte-2'>{t('profilLegende')}</span>
            {PROFILS_APERCU.map((p) =>
              lien({ profil: p }, `${p} : ${nomProfilApercu(p)}`, p === profil)
            )}
          </div>
        )}
      </nav>

      {vue === 'participant' && (
        <section
          aria-labelledby='apercu-simulation'
          className='carte flex flex-col gap-2'
        >
          <h2 id='apercu-simulation' className='text-titre-3 text-encre'>
            {t('simulationTitre')}
          </h2>
          <p className='colonne-lecture text-texte-2'>{t('simulationAide')}</p>
          <p className='font-semibold'>
            {simulation ? t('simulationOn') : t('simulationOff')}
          </p>
          <p>
            {lien(
              { simulation: !simulation },
              simulation ? t('simulationDesactiver') : t('simulationActiver'),
              false
            )}
          </p>
        </section>
      )}

      {vue === 'groupe' ? (
        <section aria-labelledby='apercu-synthese'>
          <h2 id='apercu-synthese' className='text-titre-2 text-encre'>
            {t('syntheseTitre')}
          </h2>
          <p className='mt-2 colonne-lecture text-texte-2'>
            {t('syntheseAide')}
          </p>
          <div className='mt-6'>
            <GroupSynthesis
              groupes={groupesApercu()}
              locale={locale}
              labels={{
                groupeCaption: synthese('groupeCaption'),
                complementCaption: synthese('complementCaption'),
                colDomaine: synthese('colDomaine'),
                colEffectif: synthese('colEffectif'),
                colMoyenne: synthese('colMoyenne'),
                colEcartType: synthese('colEcartType'),
                ecartTypeAbsent: synthese('ecartTypeAbsent'),
                colNiveau: synthese('colNiveau'),
                nonPublie: synthese('nonPublie'),
                complementNonPublie: synthese('complementNonPublie'),
                complementVide: synthese('complementVide'),
                sansMoyenne: synthese('sansMoyenne'),
                dispersion: synthese('dispersion'),
                niveauLecture: synthese('niveauLecture', {
                  niveau: '{niveau}'
                }),
                niveaux: {
                  bas: niveaux('bas'),
                  plutot_bas: niveaux('plutot_bas'),
                  milieu: niveaux('milieu'),
                  plutot_haut: niveaux('plutot_haut'),
                  haut: niveaux('haut')
                },
                aucunGroupe: synthese('aucunGroupe')
              }}
            />
          </div>
        </section>
      ) : (
        <>
          <p className='colonne-lecture text-texte-2'>
            {vue === 'consultant' ? t('consultantAide') : t('participantAide')}
          </p>
          {vue === 'participant' && (
            <section aria-labelledby='apercu-resultat'>
              <h2 id='apercu-resultat' className='text-titre-2 text-encre'>
                {t('resultatTitre')}
              </h2>
              <div className='mt-6'>
                <ResultView
                  profil={profilDepuisScores(scores)}
                  locale={locale}
                  audience={audience}
                  libelles={libellesResultView(mes, niveaux, flow)}
                  date={null}
                  afficherNonRelus={afficherNonRelus}
                />
              </div>
            </section>
          )}
          <section aria-labelledby='apercu-rapport'>
            <h2 id='apercu-rapport' className='text-titre-2 text-encre'>
              {t('rapportTitre')}
            </h2>
            <div className='mt-6'>
              <RapportIndividuel
                rapport={construireRapportIndividuel({
                  scores,
                  locale,
                  audience,
                  afficherNonRelus
                })}
                locale={locale}
                libelles={libellesRapport(rapportT, mes, niveaux)}
                date={null}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
