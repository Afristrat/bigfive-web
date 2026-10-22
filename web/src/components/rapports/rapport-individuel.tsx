import type { ReactElement } from 'react';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import {
  FacetCard,
  type FacetCardLabels
} from '@/components/resultats/facet-card';
import { LevelBadge } from '@/components/resultats/level-badge';
import type { ResultViewLabels } from '@/components/resultats/result-view';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre, localeRegionale } from '@/lib/format';
import { DOMAINES, type DomainCode, type FacetteCode } from '@/lib/moteur';
import type { RapportIndividuel as Rapport } from '@/lib/rapports/individuel';

export type RapportLibelles = {
  /** Modèle avec {date}. */
  rempliLe: string;
  /** Espace « niveaux ». */
  niveaux: ResultViewLabels['niveaux'];
  /** Libellés d'une carte de facette (espace « mesResultats.vue »). */
  facette: FacetCardLabels;
  retiree: string;
  lire: {
    titre: string;
    ce: string;
    neDitPas: string;
    niveaux: string;
    hypotheses: string;
    limites: string;
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
    /** Modèle avec {n}. */
    reponses: string;
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
    lire: {
      titre: t('lire.titre'),
      ce: t('lire.ce'),
      neDitPas: t('lire.neDitPas'),
      niveaux: t('lire.niveaux'),
      hypotheses: t('lire.hypotheses'),
      limites: t('lire.limites'),
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
      reponses: t('fiabilite.reponses', { n: '{n}' }),
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

const remplir = (modele: string, valeurs: Record<string, string>): string =>
  modele.replace(/\{(\w+)\}/g, (tel, nom: string) => valeurs[nom] ?? tel);

const libelleFacette = (code: FacetteCode, locale: string): string => {
  const domaine: DomainCode | undefined = DOMAINES.find((d) => d === code[0]);
  if (!domaine) throw new RangeError(`Facette inconnue : ${code}`);
  return facetLabel(domaine, Number(code.slice(1)), locale);
};

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
export function RapportIndividuel({
  rapport,
  locale,
  libelles,
  date
}: RapportIndividuelProps): ReactElement {
  const { niveaux, ensemble, lire, carte, tensions, fiabilite } = libelles;
  const nombre = (valeur: number): string => formatNombre(valeur, locale);
  return (
    <div
      className='flex flex-col gap-12'
      data-bibliotheque={rapport.versionBibliotheque}
    >
      {date && (
        <p className='text-texte-2'>{remplir(libelles.rempliLe, { date })}</p>
      )}

      <section data-section='lire' aria-labelledby='rapport-lire'>
        <h2 id='rapport-lire' className='text-titre-3 text-encre'>
          {lire.titre}
        </h2>
        <div className='mt-3 colonne-lecture flex flex-col gap-2 text-texte-2'>
          <p>{lire.ce}</p>
          <p>{lire.neDitPas}</p>
          <p>{lire.niveaux}</p>
          <p>{lire.hypotheses}</p>
          <p>{lire.limites}</p>
          <p className='font-semibold text-encre'>
            {rapport.audience === 'personne'
              ? lire.destinatairesPersonne
              : lire.destinatairesConsultant}
          </p>
        </div>
      </section>

      <section data-section='ensemble' aria-labelledby='rapport-ensemble'>
        <h2 id='rapport-ensemble' className='text-titre-3 text-encre'>
          {ensemble.titre}
        </h2>
        <RadarChart
          className='mx-auto mt-4 w-full max-w-xl'
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
        <h3 className='mt-6 text-corps font-bold text-encre'>
          {ensemble.ressortTitre}
        </h3>
        <p className='mt-1 text-petit text-texte-2'>{ensemble.ressortIntro}</p>
        {rapport.ressort.length === 0 ? (
          <p className='mt-2 text-texte-2'>{ensemble.ressortAucun}</p>
        ) : (
          <ul className='mt-2 flex flex-col gap-2'>
            {rapport.ressort.map((point) => (
              <li
                key={point.code}
                className='flex flex-wrap items-baseline gap-3'
              >
                <span className='font-semibold text-encre'>
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
      </section>

      <section data-section='entretien' aria-labelledby='rapport-entretien'>
        <h2 id='rapport-entretien' className='text-titre-3 text-encre'>
          {ensemble.entretienTitre}
        </h2>
        {rapport.entretien.length === 0 ? (
          <p className='mt-2 text-texte-2'>{ensemble.entretienAucune}</p>
        ) : (
          <>
            <p className='mt-1 text-petit text-texte-2'>
              {ensemble.entretienIntro}
            </p>
            <ul className='mt-3 flex flex-col gap-3'>
              {rapport.entretien.map((q) => (
                <li key={q.code}>
                  <span className='block text-petit font-bold text-encre'>
                    {libelleFacette(q.code, locale)}
                  </span>
                  <span className='block text-corps text-encre'>
                    {q.question}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <div data-section='domaines' className='flex flex-col gap-10'>
        {rapport.domaines.map((domaine, index) => (
          <section
            key={domaine.code}
            data-domaine={domaine.code}
            aria-labelledby={`rapport-domaine-${domaine.code}`}
            className='print:break-before-page'
          >
            <div className='flex flex-wrap items-baseline justify-between gap-3'>
              <h2
                id={`rapport-domaine-${domaine.code}`}
                className='text-titre-3 text-encre'
              >
                {domainLabel(domaine.code, locale)}
              </h2>
              <LevelBadge
                niveau={domaine.niveau}
                label={niveaux[domaine.niveau]}
              />
            </div>
            <p className='mt-2' dir='ltr'>
              <span className='chiffres text-[26px] font-extrabold text-encre'>
                {nombre(domaine.score)}
              </span>{' '}
              <span className='text-petit font-medium text-texte-2'>
                {ensemble.domainOutOf}
              </span>
            </p>
            <div className='mt-2'>
              <ScoreBar score={domaine.score} min={24} max={120} rang={index} />
            </div>
            {rapport.facetteRetiree && domaine.code === 'O' && (
              <p className='mt-3 text-petit text-texte-2'>{libelles.retiree}</p>
            )}
            <h3 className='sr-only'>{libelles.facettes}</h3>
            <ul className='mt-4 grid gap-3 md:grid-cols-2'>
              {domaine.facettes.map((facette, rang) => (
                <FacetCard
                  key={facette.code}
                  label={libelleFacette(facette.code, locale)}
                  score={facette.score}
                  niveau={facette.niveau}
                  niveauLabel={niveaux[facette.niveau]}
                  etat={facette.etat}
                  avertissement={facette.avertissement}
                  locale={locale}
                  rang={rang}
                  labels={libelles.facette}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section
        data-section='carte'
        aria-labelledby='rapport-carte'
        className='print:break-before-page'
      >
        <h2 id='rapport-carte' className='text-titre-3 text-encre'>
          {carte.titre}
        </h2>
        <p className='mt-1 text-petit text-texte-2'>{carte.intro}</p>
        <div
          role='region'
          aria-labelledby='rapport-carte'
          tabIndex={0}
          className='carte mt-3 overflow-x-auto !p-0'
        >
          <table className='w-full text-petit'>
            <caption className='sr-only'>{carte.caption}</caption>
            <thead className='border-b border-trait'>
              <tr>
                <th
                  scope='col'
                  className='px-3.5 py-3 text-start text-legende font-semibold text-texte-2'
                >
                  {carte.colFacette}
                </th>
                <th
                  scope='col'
                  className='px-3.5 py-3 text-start text-legende font-semibold text-texte-2'
                >
                  {carte.colNiveau}
                </th>
                <th
                  scope='col'
                  className='px-3.5 py-3 text-start text-legende font-semibold text-texte-2'
                >
                  {carte.colTotal}
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-trait'>
              {rapport.carte.map((ligne) => (
                <tr key={ligne.code} data-carte={ligne.code}>
                  <th scope='row' className='px-3.5 py-2.5 text-start'>
                    {libelleFacette(ligne.code, locale)}
                  </th>
                  <td className='px-3.5 py-2.5'>{niveaux[ligne.niveau]}</td>
                  <td className='chiffres px-3.5 py-2.5' dir='ltr'>
                    {nombre(ligne.score)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section data-section='tensions' aria-labelledby='rapport-tensions'>
        <h2 id='rapport-tensions' className='text-titre-3 text-encre'>
          {tensions.titre}
        </h2>
        {rapport.tensions.length === 0 ? (
          <p className='mt-2 text-texte-2'>{tensions.aucune}</p>
        ) : (
          <>
            <p className='mt-1 text-petit text-texte-2'>{tensions.intro}</p>
            <ul className='mt-3 list-disc ps-5 text-corps text-encre'>
              {rapport.tensions.map((tension) => (
                <li key={tension.id}>
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
      </section>

      <section data-section='fiabilite' aria-labelledby='rapport-fiabilite'>
        <h2 id='rapport-fiabilite' className='text-titre-3 text-encre'>
          {fiabilite.titre}
        </h2>
        <div className='mt-2 flex flex-col gap-2 text-texte-2'>
          <p>
            {remplir(fiabilite.reponses, {
              n: nombre(rapport.fiabilite.reponses)
            })}
          </p>
          {rapport.fiabilite.dureeSecondes !== null && (
            <p>
              {remplir(fiabilite.duree, {
                duree: formatDuree(rapport.fiabilite.dureeSecondes, locale)
              })}
            </p>
          )}
          <p>{fiabilite.limite}</p>
        </div>
      </section>

      <p className='text-petit text-texte-2'>
        {niveaux.echelle}.{' '}
        {remplir(niveaux.versionMoteur, { version: rapport.versionMoteur })}
      </p>
    </div>
  );
}
