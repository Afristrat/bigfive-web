import type { CSSProperties, ReactElement } from 'react';
import { domainNumber } from '@/components/domain-shape';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import {
  FacetCard,
  type FacetCardLabels
} from '@/components/resultats/facet-card';
import { LevelBadge } from '@/components/resultats/level-badge';
import { ResultMotion } from '@/components/resultats/result-motion';
import styles from '@/components/resultats/result-motion.module.css';
import type { ResultViewLabels } from '@/components/resultats/result-view';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre, localeRegionale, remplir } from '@/lib/format';
import { DOMAINES, type DomainCode, type FacetteCode } from '@/lib/moteur';
import type { RapportIndividuel as Rapport } from '@/lib/rapports/individuel';

type LireVoix = {
  ce: string;
  neDitPas: string;
  niveaux: string;
  hypotheses: string;
  limites: string;
};

export type RapportLibelles = {
  /** Modèle avec {date}. */
  rempliLe: string;
  /** Espace « niveaux ». */
  niveaux: ResultViewLabels['niveaux'];
  /** Libellés d'une carte de facette (espace « mesResultats.vue »). */
  facette: FacetCardLabels;
  retiree: string;
  /** Intitulé de la question d'une facette, côté consultant. */
  questionConsultant: string;
  lire: {
    titre: string;
    /** Texte adressé à la personne (« vous »). */
    personne: LireVoix;
    /** Même texte, à la troisième personne, pour le consultant. */
    consultant: LireVoix;
    destinatairesPersonne: string;
    destinatairesConsultant: string;
  };
  ensemble: {
    titre: string;
    radarTitle: string;
    radarSummary: string;
    columnDomain: string;
    columnTotal: string;
    domainOutOf: string;
    ressortTitre: string;
    ressortIntro: string;
    ressortAucun: string;
    entretienTitre: string;
    entretienIntro: string;
    entretienAucune: string;
  };
  facettes: string;
  carte: {
    titre: string;
    intro: string;
    caption: string;
    colFacette: string;
    colNiveau: string;
    colTotal: string;
  };
  tensions: {
    titre: string;
    intro: string;
    /** Modèle avec {a}, {b} et {ecart}. */
    ligne: string;
    aucune: string;
  };
  fiabilite: {
    titre: string;
    /** Modèle avec {duree}. */
    duree: string;
    limite: string;
  };
};

type Traducteur = (key: string, values?: Record<string, string>) => string;

/** Libellés du rapport, lus dans les espaces « rapport », « mesResultats » et « niveaux ». */
export function libellesRapport(
  t: Traducteur,
  mes: Traducteur,
  niv: Traducteur
): RapportLibelles {
  const v = (cle: string): string => mes(`vue.${cle}`);
  const voix = (qui: 'personne' | 'consultant'): LireVoix => ({
    ce: t(`lire.${qui}.ce`),
    neDitPas: t(`lire.${qui}.neDitPas`),
    niveaux: t(`lire.${qui}.niveaux`),
    hypotheses: t(`lire.${qui}.hypotheses`),
    limites: t(`lire.${qui}.limites`)
  });
  return {
    rempliLe: t('rempliLe', { date: '{date}' }),
    niveaux: {
      bas: niv('bas'),
      plutot_bas: niv('plutot_bas'),
      milieu: niv('milieu'),
      plutot_haut: niv('plutot_haut'),
      haut: niv('haut'),
      echelle: niv('echelle'),
      versionMoteur: niv('versionMoteur', { version: '{version}' })
    },
    facette: {
      facetOutOf: v('facetOutOf'),
      description: v('description'),
      apport: v('apport'),
      cout: v('cout'),
      question: v('question'),
      avertissement: v('avertissement'),
      enRelecture: v('enRelecture'),
      langueAbsente: v('langueAbsente'),
      nonRelu: v('nonRelu')
    },
    retiree: t('consultant.facetteRetiree'),
    questionConsultant: t('consultant.question'),
    lire: {
      titre: t('lire.titre'),
      personne: voix('personne'),
      consultant: voix('consultant'),
      destinatairesPersonne: t('lire.destinatairesPersonne'),
      destinatairesConsultant: t('lire.destinatairesConsultant')
    },
    ensemble: {
      titre: t('ensemble.titre'),
      radarTitle: t('ensemble.radarTitle'),
      radarSummary: t('ensemble.radarSummary'),
      columnDomain: t('ensemble.columnDomain'),
      columnTotal: t('ensemble.columnTotal'),
      domainOutOf: t('ensemble.domainOutOf'),
      ressortTitre: t('ensemble.ressortTitre'),
      ressortIntro: t('ensemble.ressortIntro'),
      ressortAucun: t('ensemble.ressortAucun'),
      entretienTitre: t('ensemble.entretienTitre'),
      entretienIntro: t('ensemble.entretienIntro'),
      entretienAucune: t('ensemble.entretienAucune')
    },
    facettes: t('domaines.facettes'),
    carte: {
      titre: t('carte.titre'),
      intro: t('carte.intro'),
      caption: t('carte.caption'),
      colFacette: t('carte.colFacette'),
      colNiveau: t('carte.colNiveau'),
      colTotal: t('carte.colTotal')
    },
    tensions: {
      titre: t('tensions.titre'),
      intro: t('tensions.intro'),
      ligne: t('tensions.ligne', { a: '{a}', b: '{b}', ecart: '{ecart}' }),
      aucune: t('tensions.aucune')
    },
    fiabilite: {
      titre: t('fiabilite.titre'),
      duree: t('fiabilite.duree', { duree: '{duree}' }),
      limite: t('fiabilite.limite')
    }
  };
}

type RapportIndividuelProps = {
  rapport: Rapport;
  locale: string;
  libelles: RapportLibelles;
  /** Date de remplissage déjà formatée, ou null. */
  date: string | null;
};

const libelleFacette = (code: FacetteCode, locale: string): string => {
  const domaine: DomainCode | undefined = DOMAINES.find((d) => d === code[0]);
  if (!domaine) throw new RangeError(`Facette inconnue : ${code}`);
  return facetLabel(domaine, Number(code.slice(1)), locale);
};

// Partie du rapport : filet d'encre, titre dans une colonne à part.
const PARTIE =
  'grid gap-x-12 gap-y-6 border-t-2 border-encre pt-8 lg:grid-cols-12';
const TITRE_PARTIE = 'text-titre-section text-encre lg:col-span-4';
const TH = 'py-3 pe-4 text-start text-legende font-semibold text-texte-2';

// Repères de coupe de la planche du radar, comme sur l'accueil.
const COINS = [
  'start-0 top-0 border-s border-t',
  'end-0 top-0 border-e border-t',
  'bottom-0 start-0 border-b border-s',
  'bottom-0 end-0 border-b border-e'
] as const;

const rangCss = (i: number): CSSProperties => ({ ['--i' as string]: i });

// Secondes sous la minute, sinon minutes entières : « 13 minutes ». Aucun seuil.
const formatDuree = (secondes: number, locale: string): string => {
  const enSecondes = secondes < 60;
  return new Intl.NumberFormat(`${localeRegionale(locale)}-u-nu-latn`, {
    style: 'unit',
    unit: enSecondes ? 'second' : 'minute',
    unitDisplay: 'long'
  }).format(Math.round(enSecondes ? secondes : secondes / 60));
};

// Rapport individuel en page HTML imprimable (composant serveur). Il met en
// page le modèle construit par `construireRapportIndividuel` et n'importe ni la
// bibliothèque, ni aucun paquet @bigfive-org. Pas de situations de travail ni
// de synthèse par modèle de langue (base juridique à instruire d'abord).
// Mise en page de dossier, sur la grammaire de l'accueil : chaque partie est
// réglée d'un filet d'encre, son titre dans une colonne à part ; le radar sur
// sa planche, les questions d'entretien numérotées en chiffres de titrage. Le
// texte s'adresse à la personne (« vous ») ou, côté consultant, parle d'elle à
// la troisième personne.
export function RapportIndividuel({
  rapport,
  locale,
  libelles,
  date
}: RapportIndividuelProps): ReactElement {
  const { niveaux, ensemble, lire, carte, tensions, fiabilite } = libelles;
  const nombre = (valeur: number): string => formatNombre(valeur, locale);
  const personne = rapport.audience === 'personne';
  const voix = personne ? lire.personne : lire.consultant;
  const labelsFacette: FacetCardLabels = personne
    ? libelles.facette
    : { ...libelles.facette, question: libelles.questionConsultant };
  return (
    <ResultMotion locale={locale}>
      <div
        className='flex flex-col gap-20'
        data-bibliotheque={rapport.versionBibliotheque}
      >
        {date && (
          <p className='text-texte-2'>{remplir(libelles.rempliLe, { date })}</p>
        )}

        <section
          data-section='lire'
          aria-labelledby='rapport-lire'
          className={PARTIE}
        >
          <h2 id='rapport-lire' className={TITRE_PARTIE}>
            {lire.titre}
          </h2>
          <div className='colonne-lecture flex flex-col gap-3 text-texte-2 lg:col-span-8'>
            <p className='text-chapo text-encre'>{voix.ce}</p>
            <p>{voix.neDitPas}</p>
            <p>{voix.niveaux}</p>
            <p>{voix.hypotheses}</p>
            <p>{voix.limites}</p>
            <p className='mt-3 border-s-2 border-safran ps-4 font-medium text-encre'>
              {personne
                ? lire.destinatairesPersonne
                : lire.destinatairesConsultant}
            </p>
          </div>
        </section>

        <section
          data-section='ensemble'
          data-revele
          aria-labelledby='rapport-ensemble'
          className={PARTIE}
        >
          <h2 id='rapport-ensemble' className={TITRE_PARTIE}>
            {ensemble.titre}
          </h2>
          <div className='grid gap-x-10 gap-y-10 lg:col-span-8 xl:grid-cols-[3fr_2fr]'>
            <div className='relative mx-auto w-full max-w-[520px] p-3 sm:p-5'>
              {COINS.map((coin, i) => (
                <span
                  key={coin}
                  aria-hidden='true'
                  style={rangCss(i)}
                  className={`absolute size-[18px] border-trait-fort ${coin} ${styles.coin}`}
                />
              ))}
              <RadarChart
                domains={rapport.domaines.map((domaine) => ({
                  code: domaine.code,
                  label: domainLabel(domaine.code, locale, 'short'),
                  value: domaine.score
                }))}
                min={24}
                max={120}
                locale={locale}
                title={ensemble.radarTitle}
                summary={ensemble.radarSummary}
                columnLabels={{
                  domain: ensemble.columnDomain,
                  score: ensemble.columnTotal
                }}
              />
            </div>
            <div>
              <h3 className='text-titre-3 text-encre'>
                {ensemble.ressortTitre}
              </h3>
              <p className='mt-2 text-petit text-texte-2'>
                {ensemble.ressortIntro}
              </p>
              {rapport.ressort.length === 0 ? (
                <p className='mt-4 text-texte-2'>{ensemble.ressortAucun}</p>
              ) : (
                <ul className='mt-4 flex flex-col border-t border-trait'>
                  {rapport.ressort.map((point, index) => (
                    <li
                      key={point.code}
                      style={rangCss(index)}
                      className={`flex flex-col gap-1 border-b border-trait py-3 ${styles.cascade}`}
                    >
                      <span className='font-medium text-encre'>
                        {libelleFacette(point.code, locale)}
                      </span>
                      <LevelBadge
                        niveau={point.niveau}
                        label={niveaux[point.niveau]}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section
          data-section='entretien'
          data-revele
          aria-labelledby='rapport-entretien'
          className={PARTIE}
        >
          <h2 id='rapport-entretien' className={TITRE_PARTIE}>
            {ensemble.entretienTitre}
          </h2>
          <div className='lg:col-span-8'>
            {rapport.entretien.length === 0 ? (
              <p className='text-texte-2'>{ensemble.entretienAucune}</p>
            ) : (
              <>
                <p className='text-texte-2'>{ensemble.entretienIntro}</p>
                <ol className='mt-6 flex flex-col'>
                  {rapport.entretien.map((q, index) => (
                    <li
                      key={q.code}
                      style={rangCss(index)}
                      className={`grid grid-cols-[3.5rem_1fr] gap-x-4 border-t border-trait py-6 ${styles.cascade}`}
                    >
                      <span
                        aria-hidden='true'
                        className='chiffres font-display text-[2.5rem] font-semibold leading-none tracking-[-0.04em] text-trait-fort'
                      >
                        {nombre(index + 1)}
                      </span>
                      <span>
                        <span className='block text-petit font-medium text-texte-2'>
                          {libelleFacette(q.code, locale)}
                        </span>
                        <span className='mt-1 block text-chapo text-encre'>
                          {q.question}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        </section>

        <div data-section='domaines' className='flex flex-col gap-20'>
          {rapport.domaines.map((domaine, index) => (
            <section
              key={domaine.code}
              data-domaine={domaine.code}
              data-revele
              aria-labelledby={`rapport-domaine-${domaine.code}`}
              className='border-t-2 border-encre pt-8 print:break-before-page'
            >
              <div className='flex flex-wrap items-end gap-x-6 gap-y-4'>
                <p
                  aria-hidden='true'
                  className='chiffres font-display text-[clamp(3rem,2.2rem+3vw,4.5rem)] font-semibold leading-none tracking-[-0.04em] text-trait-fort'
                >
                  {domainNumber(domaine.code)}
                </p>
                <div className='min-w-0 flex-1'>
                  <h2
                    id={`rapport-domaine-${domaine.code}`}
                    className='text-titre-section text-encre'
                  >
                    {domainLabel(domaine.code, locale)}
                  </h2>
                  <div className='mt-2'>
                    <LevelBadge
                      ton='fort'
                      niveau={domaine.niveau}
                      label={niveaux[domaine.niveau]}
                    />
                  </div>
                </div>
                <p dir='ltr' className='whitespace-nowrap'>
                  <span
                    className='chiffres font-display text-[clamp(2.25rem,1.7rem+2vw,3.25rem)] font-semibold leading-none tracking-[-0.04em] text-encre'
                    data-compte={domaine.score}
                  >
                    {nombre(domaine.score)}
                  </span>{' '}
                  <span className='text-petit font-medium text-texte-3'>
                    {ensemble.domainOutOf}
                  </span>
                </p>
              </div>
              <div className='mt-5'>
                <ScoreBar
                  score={domaine.score}
                  min={24}
                  max={120}
                  rang={index}
                  anime
                  gradue
                />
              </div>
              {rapport.facetteRetiree && domaine.code === 'O' && (
                <p className='mt-4 max-w-[44em] text-petit text-texte-2'>
                  {libelles.retiree}
                </p>
              )}
              <h3 className='sr-only'>{libelles.facettes}</h3>
              <ul className='mt-6 grid gap-x-10 md:grid-cols-2'>
                {domaine.facettes.map((facette, rang) => (
                  <FacetCard
                    key={facette.code}
                    titre='h4'
                    label={libelleFacette(facette.code, locale)}
                    score={facette.score}
                    niveau={facette.niveau}
                    niveauLabel={niveaux[facette.niveau]}
                    etat={facette.etat}
                    avertissement={facette.avertissement}
                    locale={locale}
                    rang={rang}
                    labels={labelsFacette}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section
          data-section='carte'
          data-revele
          aria-labelledby='rapport-carte'
          className={`${PARTIE} print:break-before-page`}
        >
          <div className='lg:col-span-4'>
            <h2 id='rapport-carte' className='text-titre-section text-encre'>
              {carte.titre}
            </h2>
            <p className='mt-3 text-petit text-texte-2'>{carte.intro}</p>
          </div>
          <div
            role='region'
            aria-labelledby='rapport-carte'
            tabIndex={0}
            className='overflow-x-auto lg:col-span-8'
          >
            <table className='w-full text-petit'>
              <caption className='sr-only'>{carte.caption}</caption>
              <thead className='border-b border-encre'>
                <tr>
                  <th scope='col' className={TH}>
                    {carte.colFacette}
                  </th>
                  <th scope='col' className={TH}>
                    {carte.colNiveau}
                  </th>
                  <th scope='col' className={`${TH} text-end`}>
                    {carte.colTotal}
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-trait'>
                {rapport.carte.map((ligne) => (
                  <tr key={ligne.code} data-carte={ligne.code}>
                    <th
                      scope='row'
                      className='py-2.5 pe-4 text-start font-medium text-encre'
                    >
                      {libelleFacette(ligne.code, locale)}
                    </th>
                    <td className='py-2.5 pe-4'>
                      <LevelBadge
                        niveau={ligne.niveau}
                        label={niveaux[ligne.niveau]}
                      />
                    </td>
                    <td
                      className='chiffres py-2.5 text-end font-medium text-encre'
                      dir='ltr'
                    >
                      {nombre(ligne.score)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section
          data-section='tensions'
          data-revele
          aria-labelledby='rapport-tensions'
          className={PARTIE}
        >
          <h2 id='rapport-tensions' className={TITRE_PARTIE}>
            {tensions.titre}
          </h2>
          <div className='lg:col-span-8'>
            {rapport.tensions.length === 0 ? (
              <p className='text-texte-2'>{tensions.aucune}</p>
            ) : (
              <>
                <p className='text-texte-2'>{tensions.intro}</p>
                <ul className='mt-5 flex flex-col'>
                  {rapport.tensions.map((tension) => (
                    <li
                      key={tension.id}
                      className='flex items-baseline gap-4 border-t border-trait py-4 text-encre'
                    >
                      <span
                        aria-hidden='true'
                        className='block h-px w-6 flex-none -translate-y-1 bg-safran'
                      />
                      {remplir(tensions.ligne, {
                        a: libelleFacette(tension.facettes[0], locale),
                        b: libelleFacette(tension.facettes[1], locale),
                        ecart: nombre(Math.round(tension.ecart * 10) / 10)
                      })}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section
          data-section='fiabilite'
          data-revele
          aria-labelledby='rapport-fiabilite'
          className={PARTIE}
        >
          <h2 id='rapport-fiabilite' className={TITRE_PARTIE}>
            {fiabilite.titre}
          </h2>
          <div className='flex flex-col gap-3 text-texte-2 lg:col-span-8'>
            {rapport.fiabilite.dureeSecondes !== null && (
              <p className='text-encre'>
                {remplir(fiabilite.duree, {
                  duree: formatDuree(rapport.fiabilite.dureeSecondes, locale)
                })}
              </p>
            )}
            <p>{fiabilite.limite}</p>
          </div>
        </section>

        <p className='border-t border-trait pt-6 text-petit text-texte-3'>
          {niveaux.echelle}.{' '}
          {remplir(niveaux.versionMoteur, { version: rapport.versionMoteur })}
        </p>
      </div>
    </ResultMotion>
  );
}
