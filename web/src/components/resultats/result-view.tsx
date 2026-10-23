import type { ReactElement, ReactNode } from 'react';
import { title } from '@/components/primitives';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import {
  FacetCard,
  type FacetCardLabels
} from '@/components/resultats/facet-card';
import { LevelBadge } from '@/components/resultats/level-badge';
import { ResultMotion } from '@/components/resultats/result-motion';
import styles from '@/components/resultats/result-motion.module.css';
import { ResultRail, type RailItem } from '@/components/resultats/result-rail';
import { ScoreValue } from '@/components/resultats/score-value';
import {
  avertissementFacette,
  blocFacette,
  type Audience
} from '@/lib/bibliotheque';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre, remplir } from '@/lib/format';
import {
  DOMAINES,
  INDEX_FACETTES,
  type DomainCode,
  type FacetteCode,
  type Niveau,
  type ProfilCalcule
} from '@/lib/moteur';

export type ResultViewLabels = {
  /** Espace de messages « niveaux ». */
  niveaux: Record<Niveau, string> & { echelle: string; versionMoteur: string };
  /** Modèle avec {date}. */
  passeLe: string;
  /** Espace de messages « flow » : sommaire collant. */
  rail: { label: string; profil: string; scores: string; facettes: string };
  /** Espace de messages « mesResultats.vue ». */
  vue: FacetCardLabels & {
    radarTitle: string;
    radarSummary: string;
    scoresTitre: string;
    columnDomain: string;
    columnScore: string;
    domainOutOf: string;
    facettes: string;
    tensionsTitre: string;
    tensionsIntro: string;
    /** Modèle avec {a}, {b} et {ecart}. */
    tension: string;
  };
};

type Traducteur = (key: string, values?: Record<string, string>) => string;

/** Libellés de la vue, lus dans les espaces « mesResultats », « niveaux » et « flow ». */
export function libellesResultView(
  mes: Traducteur,
  niv: Traducteur,
  flow: Traducteur
): ResultViewLabels {
  const v = (cle: string): string => mes(`vue.${cle}`);
  return {
    passeLe: mes('passeLe', { date: '{date}' }),
    rail: {
      label: flow('railLabel'),
      profil: flow('railProfile'),
      scores: flow('railScores'),
      facettes: flow('railDetail')
    },
    niveaux: {
      bas: niv('bas'),
      plutot_bas: niv('plutot_bas'),
      milieu: niv('milieu'),
      plutot_haut: niv('plutot_haut'),
      haut: niv('haut'),
      echelle: niv('echelle'),
      versionMoteur: niv('versionMoteur', { version: '{version}' })
    },
    vue: {
      radarTitle: v('radarTitle'),
      radarSummary: v('radarSummary'),
      scoresTitre: v('scoresTitre'),
      columnDomain: v('columnDomain'),
      columnScore: v('columnScore'),
      domainOutOf: v('domainOutOf'),
      facetOutOf: v('facetOutOf'),
      facettes: v('facettes'),
      description: v('description'),
      apport: v('apport'),
      cout: v('cout'),
      question: v('question'),
      avertissement: v('avertissement'),
      enRelecture: v('enRelecture'),
      langueAbsente: v('langueAbsente'),
      nonRelu: v('nonRelu'),
      tensionsTitre: v('tensionsTitre'),
      tensionsIntro: v('tensionsIntro'),
      tension: mes('vue.tension', { a: '{a}', b: '{b}', ecart: '{ecart}' })
    }
  };
}

type ResultViewProps = {
  profil: ProfilCalcule;
  locale: string;
  audience: Audience;
  libelles: ResultViewLabels;
  /** Date de passation déjà formatée, ou null. */
  date: string | null;
  /** Remplace la variable d'exploitation de la garde de relecture (aperçu interne). */
  afficherNonRelus?: boolean;
  /** Au-dessus du sommaire, dans le conteneur de mouvement (titre de la page). */
  entete?: ReactNode;
  /** Après la vue, dans le conteneur de mouvement (identifiant, boutons). */
  children?: ReactNode;
  /** Ancres de la page ajoutées à la suite des trois parties du sommaire. */
  ancres?: readonly RailItem[];
};

const libelleFacette = (code: FacetteCode, locale: string): string => {
  const domaine: DomainCode | undefined = DOMAINES.find((d) => d === code[0]);
  if (!domaine) throw new RangeError(`Facette inconnue : ${code}`);
  return facetLabel(domaine, Number(code.slice(1)), locale);
};

// Composant serveur partagé : résultat public, « Mes résultats » et aperçu
// administrateur. Une seule présentation animée (radar qui se dessine,
// compteurs, règles graduées, sommaire collant), entièrement lisible sans
// JavaScript et sous prefers-reduced-motion. N'importe aucun paquet
// @bigfive-org : tout vient du moteur et de la bibliothèque. Les niveaux sont
// des conventions non calibrées : la phrase de convention et la version du
// moteur sont affichées.
export function ResultView({
  profil,
  locale,
  audience,
  libelles,
  date,
  afficherNonRelus,
  entete,
  children,
  ancres = []
}: ResultViewProps): ReactElement {
  const { niveaux, vue, rail } = libelles;
  return (
    <ResultMotion locale={locale}>
      {entete}
      {date && (
        <p className='mt-6 text-texte-2'>
          {remplir(libelles.passeLe, { date })}
        </p>
      )}

      <ResultRail
        label={rail.label}
        items={[
          { id: 'profil', label: rail.profil },
          { id: 'scores', label: rail.scores },
          { id: 'facettes', label: rail.facettes },
          ...ancres
        ]}
      />

      <div className='mt-8 grid gap-4 lg:grid-cols-[11fr_10fr]'>
        <section
          id='profil'
          aria-labelledby='radar-titre'
          className={`carte scroll-mt-32 ${styles['carte-profil']}`}
        >
          <h2 id='radar-titre' className='text-titre-2 text-encre'>
            {vue.radarTitle}
          </h2>
          <RadarChart
            className='mt-4'
            domains={DOMAINES.map((code) => ({
              code,
              label: domainLabel(code, locale, 'short'),
              value: profil.domaines[code].score
            }))}
            min={24}
            max={120}
            locale={locale}
            title={vue.radarTitle}
            summary={vue.radarSummary}
            columnLabels={{ domain: vue.columnDomain, score: vue.columnScore }}
          />
        </section>

        <section
          id='scores'
          data-revele
          aria-labelledby='scores-titre'
          className={`carte scroll-mt-32 ${styles['carte-scores']}`}
        >
          <h2 id='scores-titre' className='sr-only'>
            {vue.scoresTitre}
          </h2>
          <ul className='flex flex-col divide-y divide-trait'>
            {DOMAINES.map((code, index) => {
              const domaine = profil.domaines[code];
              return (
                <li
                  key={code}
                  className={`break-inside-avoid py-5 first:pt-0 last:pb-0 ${styles.facteur}`}
                  style={{ ['--i' as string]: index }}
                >
                  <div className='flex flex-wrap items-baseline gap-3'>
                    <span className='text-corps font-semibold text-encre'>
                      {domainLabel(code, locale, 'short')}
                    </span>
                    <LevelBadge
                      niveau={domaine.niveau}
                      label={niveaux[domaine.niveau]}
                    />
                    <span className='ms-auto'>
                      <ScoreValue
                        valeur={formatNombre(domaine.score, locale)}
                        compte={domaine.score}
                        max={formatNombre(120, locale)}
                        spoken={`${vue.columnScore} ${formatNombre(domaine.score, locale)} ${vue.domainOutOf}`}
                      />
                    </span>
                  </div>
                  <div className='mt-2'>
                    <ScoreBar
                      score={domaine.score}
                      min={24}
                      max={120}
                      anime
                      gradue
                      rang={index}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section
        id='facettes'
        data-revele
        aria-labelledby='facettes-titre'
        className='carte mt-4 scroll-mt-32'
      >
        <h2 id='facettes-titre' className={title({ size: 'section' })}>
          {vue.facettes}
        </h2>
        {DOMAINES.map((code) => {
          const domaine = profil.domaines[code];
          return (
            <section
              key={code}
              data-domaine={code}
              aria-labelledby={`titre-${code}`}
              className='mt-8'
            >
              <div className='flex flex-wrap items-baseline justify-between gap-3'>
                <h3 id={`titre-${code}`} className='text-titre-3 text-encre'>
                  {domainLabel(code, locale)}
                </h3>
                <LevelBadge
                  niveau={domaine.niveau}
                  label={niveaux[domaine.niveau]}
                />
              </div>
              <ul className='mt-4 grid gap-3 md:grid-cols-2'>
                {INDEX_FACETTES.map((f, rang) => {
                  const k: FacetteCode = `${code}${f}`;
                  const facette = profil.facettes[k];
                  return (
                    <FacetCard
                      key={k}
                      label={libelleFacette(k, locale)}
                      score={facette.score}
                      niveau={facette.niveau}
                      niveauLabel={niveaux[facette.niveau]}
                      etat={blocFacette(facette.blocId, locale, audience, 'n', {
                        afficherNonRelus
                      })}
                      avertissement={avertissementFacette(k, locale)}
                      locale={locale}
                      rang={rang}
                      labels={vue}
                      anime
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </section>

      {profil.tensions.length > 0 && (
        <section
          aria-labelledby='titre-tensions'
          data-revele
          className='carte mt-4'
        >
          <h2 id='titre-tensions' className='text-titre-3 text-encre'>
            {vue.tensionsTitre}
          </h2>
          <p className='mt-1 text-petit text-texte-2'>{vue.tensionsIntro}</p>
          <ul className='mt-3 list-disc ps-5 text-corps text-encre'>
            {profil.tensions.map((tension) => (
              <li key={tension.id}>
                {remplir(vue.tension, {
                  a: libelleFacette(tension.facettes[0], locale),
                  b: libelleFacette(tension.facettes[1], locale),
                  ecart: formatNombre(
                    Math.round(tension.ecart * 10) / 10,
                    locale
                  )
                })}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className='mt-6 text-petit text-texte-2'>
        {niveaux.echelle}.{' '}
        {remplir(niveaux.versionMoteur, { version: profil.versionMoteur })}
      </p>

      {children}
    </ResultMotion>
  );
}
