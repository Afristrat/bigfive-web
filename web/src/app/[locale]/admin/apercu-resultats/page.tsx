import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntetePilotage } from '@/components/pilotage/entete-pilotage';
import { EcranReseau } from '@/components/reseau/ecran-reseau';
import { libellesReseau } from '@/components/reseau/libelles';
import {
  RapportBinome,
  libellesRapportBinome
} from '@/components/rapports/rapport-binome';
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
import { supportEmail } from '@/config/site';
import {
  actionsApercuReseau,
  CAMPAGNES_APERCU_RESEAU,
  ETAPES_APERCU_RESEAU,
  lienApercuReseau,
  lireReglagesReseau,
  participationApercu,
  releveApercu,
  type ReglagesReseau
} from '@/lib/apercu-reseau';
import {
  groupesApercu,
  LECTEURS_BINOME,
  lienApercu,
  lireReglagesApercu,
  nomProfilApercu,
  PROFILS_APERCU,
  scoresApercu,
  VUES_APERCU,
  type ReglagesApercu
} from '@/lib/apercu-resultats';
import { formatNombre } from '@/lib/format';
import { profilDepuisScores } from '@/lib/moteur';
import { construireRapportBinome } from '@/lib/rapports/binome';
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
// individuel, synthèse de groupe, rapport de binôme) sur des données fictives.
// Aucune lecture de la base, aucune variable d'exploitation : la simulation de
// la garde de relecture passe en paramètre d'appel. Le binôme saute ici la
// garde des deux accords, qui vit en base (app.lire_binome) : il n'y a pas de
// personne réelle à protéger. Le relevé du réseau monte le vrai écran sur des
// membres fictifs, avec des actions neutralisées (rien n'est lu ni écrit) ;
// l'interrupteur de production, en base, n'est ni lu ni simulé.
export default async function ApercuResultatsPage({
  params,
  searchParams
}: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // 404 pour quiconque n'est pas dans private.tenga_admins (lu en base).
  await requireAdmin(locale, '/admin/apercu-resultats');
  const recherche = await searchParams;
  const reglages = lireReglagesApercu(recherche);
  const { vue, profil, partenaire, lecteur, simulation } = reglages;
  const reseau = lireReglagesReseau(recherche);

  const t = await getTranslations('apercu');
  const mes = await getTranslations('mesResultats');
  const niveaux = await getTranslations('niveaux');
  const flow = await getTranslations('flow');
  const rapportT = await getTranslations('rapport');
  const synthese = await getTranslations('synthese');
  const tp = await getTranslations('pilotage');
  const binomeT = await getTranslations('binome');
  const reseauT = await getTranslations('reseau');

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
      {/* Les noms fictifs sont latins : isolés, ils gardent leur ordre en arabe. */}
      <bdi>{libelle}</bdi>
    </Link>
  );
  // Vue « reseau » : chaque lien garde la personne, l'étape et la campagne.
  const lienReseau = (
    changement: Partial<ReglagesReseau> & { profil?: typeof profil },
    libelle: string,
    actif: boolean
  ) => (
    <Link
      key={libelle}
      href={lienApercuReseau(changement.profil ?? profil, {
        ...reseau,
        ...changement
      })}
      aria-current={actif ? 'page' : undefined}
      className={`${segment} ${actif ? segmentActif : segmentInactif}`}
    >
      <bdi>{libelle}</bdi>
    </Link>
  );

  const scores = scoresApercu(profil);
  const audience = vue === 'consultant' ? 'consultant' : 'personne';
  const nommer = (p: (typeof PROFILS_APERCU)[number]): string =>
    `${p} : ${nomProfilApercu(p)}`;
  // Isolat bidirectionnel (FSI … PDI) pour un nom latin inséré dans une phrase.
  const isoler = (texte: string): string => `⁨${texte}⁩`;
  // Mêmes étiquettes que la vraie page : « Vous » pour la personne qui lit,
  // « Personne 1 » et « Personne 2 » pour le consultant.
  const etiquettesBinome =
    lecteur === 'personne'
      ? { a: binomeT('etiquettes.moi'), b: binomeT('etiquettes.autre') }
      : {
          a: binomeT('etiquettes.personne', {
            numero: formatNombre(1, locale)
          }),
          b: binomeT('etiquettes.personne', {
            numero: formatNombre(2, locale)
          })
        };
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
        {vue === 'reseau' && (
          <>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className={legende}>{t('repondantLegende')}</span>
              <span className={groupe}>
                {PROFILS_APERCU.map((p) =>
                  lienReseau({ profil: p }, nommer(p), p === profil)
                )}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className={legende}>{t('etapeLegende')}</span>
              <span className={groupe}>
                {ETAPES_APERCU_RESEAU.map((e) =>
                  lienReseau({ etape: e }, t(`etapes.${e}`), e === reseau.etape)
                )}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className={legende}>{t('campagneLegende')}</span>
              <span className={groupe}>
                {CAMPAGNES_APERCU_RESEAU.map((c) =>
                  lienReseau(
                    { campagne: c },
                    t(`campagnes.${c}`),
                    c === reseau.campagne
                  )
                )}
              </span>
            </div>
          </>
        )}
        {vue !== 'groupe' && vue !== 'reseau' && (
          <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
            <span className={legende}>
              {vue === 'binome' ? t('premiereLegende') : t('profilLegende')}
            </span>
            <span className={groupe}>
              {PROFILS_APERCU.map((p) =>
                lien({ profil: p }, nommer(p), p === profil)
              )}
            </span>
          </div>
        )}
        {vue === 'binome' && (
          <>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className={legende}>{t('partenaireLegende')}</span>
              <span className={groupe}>
                {PROFILS_APERCU.filter((p) => p !== profil).map((p) =>
                  lien({ partenaire: p }, nommer(p), p === partenaire)
                )}
              </span>
            </div>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              <span className={legende}>{t('lecteurLegende')}</span>
              <span className={groupe}>
                {LECTEURS_BINOME.map((l) =>
                  lien({ lecteur: l }, t(`lecteurs.${l}`), l === lecteur)
                )}
              </span>
            </div>
          </>
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

      {vue === 'reseau' ? (
        <section aria-labelledby='apercu-reseau'>
          <h2 id='apercu-reseau' className='text-titre-section text-encre'>
            {t('reseauTitre')}
          </h2>
          <p className='mt-3 colonne-lecture text-texte-2'>
            {t('reseauAide', { moi: isoler(nommer(profil)) })}
          </p>
          <p
            role='note'
            className='mt-5 colonne-lecture border-s-2 border-safran ps-4 font-semibold text-encre'
          >
            {t('reseauFerme')}
          </p>
          <div className='mt-8 max-w-[52rem]'>
            <EcranReseau
              key={`${profil}-${reseau.etape}-${reseau.campagne}`}
              participationId={participationApercu(profil)}
              releve={releveApercu(profil, reseau.etape, reseau.campagne)}
              actions={actionsApercuReseau}
              libelles={libellesReseau(reseauT, supportEmail)}
              locale={locale}
            />
          </div>
        </section>
      ) : vue === 'binome' ? (
        <section aria-labelledby='apercu-binome'>
          <h2 id='apercu-binome' className='text-titre-section text-encre'>
            {t('binomeTitre')}
          </h2>
          <p className='mt-3 colonne-lecture text-texte-2'>
            {t(
              lecteur === 'personne'
                ? 'binomePersonneAide'
                : 'binomeConsultantAide',
              {
                premiere: isoler(nommer(profil)),
                seconde: isoler(nommer(partenaire))
              }
            )}
          </p>
          <div className='mt-8'>
            <RapportBinome
              rapport={construireRapportBinome({
                a: scores,
                b: scoresApercu(partenaire)
              })}
              locale={locale}
              libelles={libellesRapportBinome(binomeT, niveaux)}
              etiquettes={etiquettesBinome}
              audience={lecteur}
            />
          </div>
        </section>
      ) : vue === 'groupe' ? (
        <section aria-labelledby='apercu-synthese'>
          <h2 id='apercu-synthese' className='text-titre-section text-encre'>
            {t('syntheseTitre')}
          </h2>
          <p className='mt-3 colonne-lecture text-texte-2'>
            {t('syntheseAide')}
          </p>
          <div className='mt-8'>
            <GroupSynthesis
              groupes={groupesApercu(locale)}
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
