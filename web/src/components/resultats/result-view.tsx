import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { DomainShape, domainNumber } from '@/components/domain-shape';
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
    profilIntro: string;
    scoresTitre: string;
    columnDomain: string;
    columnScore: string;
    domainOutOf: string;
    facettes: string;
    facettesIntro: string;
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
      profilIntro: v('profilIntro'),
      scoresTitre: v('scoresTitre'),
      columnDomain: v('columnDomain'),
      columnScore: v('columnScore'),
      domainOutOf: v('domainOutOf'),
      facetOutOf: v('facetOutOf'),
      facettes: v('facettes'),
      facettesIntro: v('facettesIntro'),
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

// Repères de coupe de la planche du radar, comme sur l'accueil.
const COINS = [
  'start-0 top-0 border-s border-t',
  'end-0 top-0 border-e border-t',
  'bottom-0 start-0 border-b border-s',
  'bottom-0 end-0 border-b border-e'
] as const;

const rangCss = (i: number): CSSProperties => ({ ['--i' as string]: i });

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

      {/* Profil : à gauche la planche du radar et ses repères de coupe, à
          droite la fiche des cinq domaines, réglée d'un filet d'encre. */}
      <div className='mt-12 grid gap-x-12 gap-y-14 lg:grid-cols-12'>
        <section
          id='profil'
          aria-labelledby='radar-titre'
          className={`scroll-mt-32 lg:col-span-6 ${styles.planche}`}
        >
          <h2 id='radar-titre' className='text-titre-section text-encre'>
            {vue.radarTitle}
          </h2>
          <p className='mt-3 max-w-[34em] text-petit text-texte-2'>
            {vue.profilIntro}
          </p>
          <div className='relative mx-auto mt-6 w-full max-w-[560px] p-3 sm:p-5'>
            {COINS.map((coin, i) => (
              <span
                key={coin}
                aria-hidden='true'
                style={rangCss(i)}
                className={`absolute size-[18px] border-trait-fort ${coin} ${styles.coin}`}
              />
            ))}
            <RadarChart
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
              columnLabels={{
                domain: vue.columnDomain,
                score: vue.columnScore
              }}
            />
          </div>
        </section>

        <section
          id='scores'
          data-revele
          aria-labelledby='scores-titre'
          className='relative scroll-mt-32 self-start lg:col-span-6 lg:mt-2'
        >
          <h2 id='scores-titre' className='sr-only'>
            {vue.scoresTitre}
          </h2>
          <span
            aria-hidden='true'
            className={`absolute inset-x-0 top-0 block h-0.5 bg-encre ${styles['fiche-filet']}`}
          />
          <ol className='flex flex-col'>
            {DOMAINES.map((code, index) => {
              const domaine = profil.domaines[code];
              return (
                <li
                  key={code}
                  className={`break-inside-avoid border-b border-trait py-5 ${styles.facteur}`}
                  style={rangCss(index)}
                >
                  <div className='flex items-end gap-4'>
                    <span
                      aria-hidden='true'
                      className='chiffres w-7 flex-none pb-1 text-legende font-medium text-texte-3'
                    >
                      {domainNumber(code)}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='flex items-center gap-2 text-titre-3 text-encre'>
                        <DomainShape
                          domain={code}
                          size={14}
                          className='text-texte-3'
                        />
                        {domainLabel(code, locale, 'short')}
                      </p>
                      <div className='mt-1'>
                        <LevelBadge
                          niveau={domaine.niveau}
                          label={niveaux[domaine.niveau]}
                        />
                      </div>
                    </div>
                    <ScoreValue
                      taille='grand'
                      valeur={formatNombre(domaine.score, locale)}
                      compte={domaine.score}
                      max={formatNombre(120, locale)}
                      spoken={`${vue.columnScore} ${formatNombre(domaine.score, locale)} ${vue.domainOutOf}`}
                    />
                  </div>
                  <div className='mt-4 ps-11'>
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
          </ol>
        </section>
      </div>

      {/* Facettes : un chapitre par domaine. Le numéro, le nom et le niveau
          restent à l'écran (colonne collante) pendant la lecture des six
          facettes. */}
      <section
        id='facettes'
        aria-labelledby='facettes-titre'
        className='mt-24 scroll-mt-32'
      >
        <div data-revele className='max-w-[44em]'>
          <h2 id='facettes-titre' className='text-titre-1 text-encre'>
            {vue.facettes}
          </h2>
          <p className='mt-4 text-chapo text-texte-2'>{vue.facettesIntro}</p>
        </div>
        {DOMAINES.map((code) => {
          const domaine = profil.domaines[code];
          return (
            <section
              key={code}
              data-domaine={code}
              data-revele
              aria-labelledby={`titre-${code}`}
              className='mt-16 grid gap-x-12 gap-y-6 border-t-2 border-encre pt-8 lg:grid-cols-12'
            >
              <div className='self-start lg:sticky lg:top-32 lg:col-span-4'>
                <p
                  aria-hidden='true'
                  className='chiffres font-display text-[clamp(3rem,2.2rem+3vw,5rem)] font-semibold leading-none tracking-[-0.04em] text-trait-fort'
                >
                  {domainNumber(code)}
                </p>
                <h3
                  id={`titre-${code}`}
                  className='mt-4 text-titre-section text-encre'
                >
                  {domainLabel(code, locale)}
                </h3>
                <div className='mt-3'>
                  <LevelBadge
                    ton='fort'
                    niveau={domaine.niveau}
                    label={niveaux[domaine.niveau]}
                  />
                </div>
              </div>
              <ul className='lg:col-span-8'>
                {INDEX_FACETTES.map((f, rang) => {
                  const k: FacetteCode = `${code}${f}`;
                  const facette = profil.facettes[k];
                  return (
                    <FacetCard
                      key={k}
                      titre='h4'
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
          className='mt-20 border-t-2 border-encre pt-8'
        >
          <h2 id='titre-tensions' className='text-titre-section text-encre'>
            {vue.tensionsTitre}
          </h2>
          <p className='mt-3 max-w-[40em] text-texte-2'>{vue.tensionsIntro}</p>
          <ul className='mt-6 flex flex-col'>
            {profil.tensions.map((tension, index) => (
              <li
                key={tension.id}
                style={rangCss(index)}
                className={`flex items-baseline gap-4 border-b border-trait py-4 text-corps text-encre ${styles.cascade}`}
              >
                <span
                  aria-hidden='true'
                  className='block h-px w-6 flex-none -translate-y-1 bg-safran'
                />
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

      <p className='mt-16 border-t border-trait pt-6 text-petit text-texte-3'>
        {niveaux.echelle}.{' '}
        {remplir(niveaux.versionMoteur, { version: profil.versionMoteur })}
      </p>

      {children}
    </ResultMotion>
  );
}
