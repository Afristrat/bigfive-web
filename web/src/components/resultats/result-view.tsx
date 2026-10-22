import type { ReactElement } from 'react';
import { RadarChart } from '@/components/radar-chart';
import { ScoreBar } from '@/components/score-bar';
import {
  FacetCard,
  type FacetCardLabels
} from '@/components/resultats/facet-card';
import { LevelBadge } from '@/components/resultats/level-badge';
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
  /** Espace de messages « mesResultats.vue ». */
  vue: FacetCardLabels & {
    radarTitle: string;
    radarSummary: string;
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

/** Libellés de la vue, lus dans les espaces « mesResultats » et « niveaux ». */
export function libellesResultView(
  mes: Traducteur,
  niv: Traducteur
): ResultViewLabels {
  const v = (cle: string): string => mes(`vue.${cle}`);
  return {
    passeLe: mes('passeLe', { date: '{date}' }),
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
};

const libelleFacette = (code: FacetteCode, locale: string): string => {
  const domaine: DomainCode | undefined = DOMAINES.find((d) => d === code[0]);
  if (!domaine) throw new RangeError(`Facette inconnue : ${code}`);
  return facetLabel(domaine, Number(code.slice(1)), locale);
};

// Composant serveur partagé (« Mes résultats », rapport individuel, résultat
// public). N'importe aucun paquet @bigfive-org : tout vient du moteur et de la
// bibliothèque. Les niveaux sont des conventions non calibrées : la phrase de
// convention et la version du moteur sont affichées.
export function ResultView({
  profil,
  locale,
  audience,
  libelles,
  date
}: ResultViewProps): ReactElement {
  const { niveaux, vue } = libelles;
  return (
    <div className='flex flex-col gap-10'>
      {date && (
        <p className='text-texte-2'>{remplir(libelles.passeLe, { date })}</p>
      )}

      <RadarChart
        className='mx-auto w-full max-w-xl'
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

      {DOMAINES.map((code, index) => {
        const domaine = profil.domaines[code];
        return (
          <section
            key={code}
            data-domaine={code}
            aria-labelledby={`titre-${code}`}
          >
            <div className='flex flex-wrap items-baseline justify-between gap-3'>
              <h2 id={`titre-${code}`} className='text-titre-3 text-encre'>
                {domainLabel(code, locale)}
              </h2>
              <LevelBadge
                niveau={domaine.niveau}
                label={niveaux[domaine.niveau]}
              />
            </div>
            <p className='mt-2' dir='ltr'>
              <span className='chiffres text-[26px] font-extrabold text-encre'>
                {formatNombre(domaine.score, locale)}
              </span>{' '}
              <span className='text-petit font-medium text-texte-2'>
                {vue.domainOutOf}
              </span>
            </p>
            <div className='mt-2'>
              <ScoreBar score={domaine.score} min={24} max={120} rang={index} />
            </div>
            <h3 className='sr-only'>{vue.facettes}</h3>
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
                    etat={blocFacette(facette.blocId, locale, audience)}
                    avertissement={avertissementFacette(k, locale)}
                    locale={locale}
                    rang={rang}
                    labels={vue}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}

      {profil.tensions.length > 0 && (
        <section aria-labelledby='titre-tensions'>
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

      <p className='text-petit text-texte-2'>
        {niveaux.echelle}.{' '}
        {remplir(niveaux.versionMoteur, { version: profil.versionMoteur })}
      </p>
    </div>
  );
}
