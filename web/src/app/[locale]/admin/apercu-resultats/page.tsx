import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import {
  GroupSynthesis,
  libellesSynthese
} from '@/components/synthese/group-synthesis';
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

// Sélecteur segmenté : la valeur courante est pleine, à l'encre ; les autres
// restent au trait. Chaque choix est un lien (l'état vit dans l'adresse).
const segment =
  'appui inline-flex min-h-10 items-center rounded-petit px-3.5 text-petit font-medium';
const segmentActif = 'bg-encre text-fond';
const segmentInactif = 'text-texte-2 hover:bg-creux hover:text-encre';
const groupe =
  'inline-flex flex-wrap gap-1 rounded-controle border border-trait bg-surface p-1';
const legende = 'min-w-[7rem] text-petit font-medium text-texte-3';

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
  const tp = await getTranslations('pilotage');

  const lien = (
    changement: Partial<ReglagesApercu>,
    libelle: string,
    actif: boolean
  ) => (
    <Link
      key={libelle}
      href={lienApercu({ ...reglages, ...changement })}
      aria-current={actif ? 'page' : undefined}
      className={`${segment} ${actif ? segmentActif : segmentInactif}`}
    >
      {libelle}
    </Link>
  );

  const scores = scoresApercu(profil);
  const audience = vue === 'consultant' ? 'consultant' : 'personne';
  // Le réglage ne vaut que pour la vue participant ; le consultant voit toujours tout.
  const afficherNonRelus = vue === 'participant' ? simulation : undefined;

  return (
    <div className='flex flex-col gap-10' data-vue={vue} data-profil={profil}>
      <EntetePilotage
        retour={{ href: '/admin', libelle: tp('retourAdmin') }}
        surtitre={tp('surtitreApercu')}
        titre={t('title')}
        chapo={<p>{t('intro')}</p>}
      />

      <p
        role='note'
        className='flex items-start gap-3 rounded-panneau border border-avis/40 bg-avis-doux px-4 py-3 font-semibold text-avis'
      >
        <svg
          aria-hidden='true'
          focusable='false'
          viewBox='0 0 20 20'
          width={18}
          height={18}
          fill='none'
          stroke='currentColor'
          strokeWidth={1.7}
          strokeLinecap='round'
          strokeLinejoin='round'
          className='mt-1 shrink-0'
        >
          <path d='M10 2.5l8 14H2z' />
          <path d='M10 8v4M10 14.5v.01' />
        </svg>
        <span>{t('bandeau')}</span>
      </p>

      <nav
        aria-label={t('vueLegende')}
        className='flex flex-col gap-5 border-y border-trait py-6'
      >
        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
          <span className={legende}>{t('vueLegende')}</span>
          <span className={groupe}>
            {VUES_APERCU.map((v) =>
              lien({ vue: v }, t(`vues.${v}`), v === vue)
            )}
          </span>
        </div>
        {vue !== 'groupe' && (
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <span className={legende}>{t('profilLegende')}</span>
            <span className={groupe}>
              {PROFILS_APERCU.map((p) =>
                lien(
                  { profil: p },
                  `${p} : ${nomProfilApercu(p)}`,
                  p === profil
                )
              )}
            </span>
          </div>
        )}
      </nav>

      {vue === 'participant' && (
        <section
          aria-labelledby='apercu-simulation'
          className='carte grid gap-x-8 gap-y-4 md:grid-cols-[1fr_auto] md:items-center'
        >
          <div>
            <h2 id='apercu-simulation' className='text-titre-3 text-encre'>
              {t('simulationTitre')}
            </h2>
            <p className='mt-2 colonne-lecture text-texte-2'>
              {t('simulationAide')}
            </p>
            <p className='mt-3 flex items-center gap-2 font-semibold text-encre'>
              <span
                aria-hidden='true'
                className={`inline-block size-2 shrink-0 rounded-full ${simulation ? 'bg-safran' : 'bg-trait-fort'}`}
              />
              {simulation ? t('simulationOn') : t('simulationOff')}
            </p>
          </div>
          <p className={`${groupe} self-start md:self-center`}>
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
          <h2 id='apercu-synthese' className='text-titre-section text-encre'>
            {t('syntheseTitre')}
          </h2>
          <p className='mt-3 colonne-lecture text-texte-2'>
            {t('syntheseAide')}
          </p>
          <div className='mt-8'>
            <GroupSynthesis
              groupes={groupesApercu()}
              locale={locale}
              labels={libellesSynthese(synthese, niveaux)}
            />
          </div>
        </section>
      ) : (
        <>
          <p className='colonne-lecture text-chapo text-texte-2'>
            {vue === 'consultant' ? t('consultantAide') : t('participantAide')}
          </p>
          {vue === 'participant' && (
            <section aria-labelledby='apercu-resultat'>
              <h2
                id='apercu-resultat'
                className='text-titre-section text-encre'
              >
                {t('resultatTitre')}
              </h2>
              <div className='mt-8'>
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
            <h2 id='apercu-rapport' className='text-titre-section text-encre'>
              {t('rapportTitre')}
            </h2>
            <div className='mt-8'>
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
