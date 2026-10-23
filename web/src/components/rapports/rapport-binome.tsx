import { useId, type ReactElement } from 'react';
import clsx from 'clsx';
import { isRtlLang } from 'rtl-detect';
import { domainShapes, shapePath } from '@/components/domain-shape';
import type {
  BinomeConsentLabels,
  BinomePropositionLabels
} from '@/components/rapports/binome-consent';
import { radarFraction } from '@/components/radar-chart';
import motion from '@/components/radar-motion.module.css';
import { LevelBadge } from '@/components/resultats/level-badge';
import { ResultMotion } from '@/components/resultats/result-motion';
import styles from '@/components/resultats/result-motion.module.css';
import type { ResultViewLabels } from '@/components/resultats/result-view';
import { ScoreValue } from '@/components/resultats/score-value';
import { ScoreBar } from '@/components/score-bar';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import { formatNombre, remplir } from '@/lib/format';
import {
  DOMAINES,
  SEUILS_DEFAUT,
  type ClasseEcart,
  type FacetteCode
} from '@/lib/moteur';
import type {
  DomaineCompare,
  LigneDomaine,
  LigneFacette,
  RapportBinome as Rapport
} from '@/lib/rapports/binome';

// Rapport de binôme en page HTML imprimable (composant serveur). Il met en page
// le modèle construit par `construireRapportBinome` et n'importe ni la
// bibliothèque, ni aucun paquet @bigfive-org. Ni indice global du binôme, ni
// pourcentage, ni lectures croisées, ni scénarios par modèle de langue (base
// juridique à instruire d'abord). Le domaine Ouverture n'y figure pas.

const CLASSES: readonly ClasseEcart[] = [
  'notable',
  'intermediaire',
  'proche'
] as const;

export type RapportBinomeLibelles = {
  /** Espace « niveaux ». */
  niveaux: ResultViewLabels['niveaux'];
  lire: {
    titre: string;
    supportConversation: string;
    aucuneNote: string;
    pasDecision: string;
    consentement: string;
    niveaux: string;
    destinatairesPersonne: string;
    destinatairesConsultant: string;
  };
  ensemble: {
    titre: string;
    radarTitle: string;
    radarSummary: string;
    columnDomain: string;
    domainOutOf: string;
    rapprocheTitre: string;
    rapprocheAucun: string;
    distingueTitre: string;
    distingueAucun: string;
    conversationTitre: string;
    conversationIntro: string;
    conversationAucune: string;
  };
  domaines: {
    titre: string;
    intro: string;
    /** Modèle avec {valeur}. */
    ecart: string;
  };
  ouverture: string;
  carte: {
    titre: string;
    /** Modèle avec {proche} et {notable}. */
    intro: string;
    caption: string;
    colFacette: string;
    colEcart: string;
    colClasse: string;
    aucune: string;
    groupes: Record<ClasseEcart, string>;
  };
  classe: Record<ClasseEcart, string>;
  attention: {
    titre: string;
    intro: string;
    aucun: string;
    limite: string;
    conscienciosite: { titre: string; texte: string; source: string };
    agreabilite: { titre: string; texte: string; source: string };
  };
  fiabilite: { titre: string; texte: string; limite: string };
};

type Traducteur = (key: string, values?: Record<string, string>) => string;

/** Libellés du rapport, lus dans les espaces « binome » et « niveaux ». */
export function libellesRapportBinome(
  t: Traducteur,
  niv: Traducteur
): RapportBinomeLibelles {
  const classes = (prefixe: string): Record<ClasseEcart, string> => ({
    proche: t(`${prefixe}.proche`),
    intermediaire: t(`${prefixe}.intermediaire`),
    notable: t(`${prefixe}.notable`)
  });
  const point = (cle: 'conscienciosite' | 'agreabilite') => ({
    titre: t(`attention.${cle}.titre`),
    texte: t(`attention.${cle}.texte`),
    source: t(`attention.${cle}.source`)
  });
  return {
    niveaux: {
      bas: niv('bas'),
      plutot_bas: niv('plutot_bas'),
      milieu: niv('milieu'),
      plutot_haut: niv('plutot_haut'),
      haut: niv('haut'),
      echelle: niv('echelle'),
      versionMoteur: niv('versionMoteur', { version: '{version}' })
    },
    lire: {
      titre: t('lire.titre'),
      supportConversation: t('lire.supportConversation'),
      aucuneNote: t('lire.aucuneNote'),
      pasDecision: t('lire.pasDecision'),
      consentement: t('lire.consentement'),
      niveaux: t('lire.niveaux'),
      destinatairesPersonne: t('lire.destinatairesPersonne'),
      destinatairesConsultant: t('lire.destinatairesConsultant')
    },
    ensemble: {
      titre: t('ensemble.titre'),
      radarTitle: t('ensemble.radarTitle'),
      radarSummary: t('ensemble.radarSummary'),
      columnDomain: t('ensemble.columnDomain'),
      domainOutOf: t('ensemble.domainOutOf'),
      rapprocheTitre: t('ensemble.rapprocheTitre'),
      rapprocheAucun: t('ensemble.rapprocheAucun'),
      distingueTitre: t('ensemble.distingueTitre'),
      distingueAucun: t('ensemble.distingueAucun'),
      conversationTitre: t('ensemble.conversationTitre'),
      conversationIntro: t('ensemble.conversationIntro'),
      conversationAucune: t('ensemble.conversationAucune')
    },
    domaines: {
      titre: t('domaines.titre'),
      intro: t('domaines.intro'),
      ecart: t('domaines.ecart', { valeur: '{valeur}' })
    },
    ouverture: t('ouverture.retiree'),
    carte: {
      titre: t('carte.titre'),
      intro: t('carte.intro', { proche: '{proche}', notable: '{notable}' }),
      caption: t('carte.caption'),
      colFacette: t('carte.colFacette'),
      colEcart: t('carte.colEcart'),
      colClasse: t('carte.colClasse'),
      aucune: t('carte.aucune'),
      groupes: classes('carte.groupes')
    },
    classe: classes('classe'),
    attention: {
      titre: t('attention.titre'),
      intro: t('attention.intro'),
      aucun: t('attention.aucun'),
      limite: t('attention.limite'),
      conscienciosite: point('conscienciosite'),
      agreabilite: point('agreabilite')
    },
    fiabilite: {
      titre: t('fiabilite.titre'),
      texte: t('fiabilite.texte'),
      limite: t('fiabilite.limite')
    }
  };
}

// ---------------------------------------------------------------------------
// Radar superposé : quatre axes (le domaine Ouverture n'est pas présenté), un
// tracé par personne. Mêmes classes et même mouvement que le radar partagé :
// la première personne porte le tracé safran et les sommets d'encre pleins ;
// la seconde, un contour d'encre en tirets et des sommets creux. Elles se
// distinguent par la forme du trait et des sommets, jamais par la couleur
// seule.

type Etiquettes = { a: string; b: string };
type Variante = 'large' | 'compact';
type Ancre = 'start' | 'middle' | 'end';

const VARIANTES = {
  large: { width: 640, height: 470, cx: 320, cy: 236, radius: 150, marker: 9 },
  compact: { width: 520, height: 420, cx: 260, cy: 214, radius: 96, marker: 8 }
} as const;
const ANNEAUX = [0.25, 0.5, 0.75, 1] as const;
const DEBUT = 24;
const FIN = 120;

const un = (valeur: number): string => valeur.toFixed(1);
const rang = (index: number) => ({ ['--i' as string]: index });
const miroir = (ancre: Ancre): Ancre =>
  ancre === 'start' ? 'end' : ancre === 'end' ? 'start' : ancre;

type Geometrie = {
  anneaux: string[];
  axes: { x2: number; y2: number }[];
  trace: (valeurs: readonly number[]) => string;
  points: (valeurs: readonly number[]) => { x: number; y: number }[];
  etiquettes: { x: number; y: number; ancre: Ancre }[];
  marqueur: number;
  largeur: number;
  hauteur: number;
};

function geometrie(
  nombre: number,
  rtl: boolean,
  variante: Variante
): Geometrie {
  const { width, height, cx, cy, radius, marker } = VARIANTES[variante];
  const sens = rtl ? -1 : 1;
  const point = (index: number, fraction: number) => {
    const angle = ((-90 + (360 / nombre) * index) * Math.PI) / 180;
    return {
      x: cx + sens * fraction * radius * Math.cos(angle),
      y: cy + fraction * radius * Math.sin(angle)
    };
  };
  const indices = Array.from({ length: nombre }, (_, i) => i);
  const chaine = (points: { x: number; y: number }[]): string =>
    points.map((p) => `${un(p.x)},${un(p.y)}`).join(' ');
  // Placement des libellés de quatre axes : haut, début, bas, fin.
  const places: { dx: number; dy: number; ancre: Ancre }[] = [
    { dx: 0, dy: -26, ancre: 'middle' },
    { dx: 18, dy: 6, ancre: 'start' },
    { dx: 0, dy: 38, ancre: 'middle' },
    { dx: -18, dy: 6, ancre: 'end' }
  ];
  return {
    anneaux: ANNEAUX.map((f) => chaine(indices.map((i) => point(i, f)))),
    axes: indices.map((i) => {
      const bout = point(i, 1);
      return { x2: bout.x, y2: bout.y };
    }),
    trace: (valeurs) =>
      chaine(valeurs.map((v, i) => point(i, radarFraction(v, DEBUT, FIN)))),
    points: (valeurs) =>
      valeurs.map((v, i) => point(i, radarFraction(v, DEBUT, FIN))),
    etiquettes: indices.map((i) => {
      const bout = point(i, 1);
      const place = places[i] ?? { dx: 0, dy: 0, ancre: 'middle' as const };
      return {
        x: bout.x + sens * place.dx,
        y: bout.y + place.dy,
        ancre: rtl ? miroir(place.ancre) : place.ancre
      };
    }),
    marqueur: marker,
    largeur: width,
    hauteur: height
  };
}

type RadarProps = {
  domaines: readonly LigneDomaine[];
  locale: string;
  titre: string;
  description: string;
  variante: Variante;
  className: string;
};

function RadarSvg({
  domaines,
  locale,
  titre,
  description,
  variante,
  className
}: RadarProps): ReactElement {
  const id = useId();
  const rtl = isRtlLang(locale) === true;
  const g = geometrie(domaines.length, rtl, variante);
  const valeursA = domaines.map((d) => d.scoreA);
  const valeursB = domaines.map((d) => d.scoreB);
  const pointsA = g.points(valeursA);
  const pointsB = g.points(valeursB);
  return (
    <svg
      className={clsx(
        'radar',
        motion.radar,
        variante === 'compact' && 'radar-etroit',
        className
      )}
      viewBox={`0 0 ${g.largeur} ${g.hauteur}`}
      role='img'
      aria-labelledby={`${id}t ${id}d`}
    >
      <title id={`${id}t`}>{titre}</title>
      <desc id={`${id}d`}>{description}</desc>
      {g.anneaux.map((points, index) => (
        <polygon
          key={points}
          className={clsx(
            'radar-anneau',
            motion.anneau,
            index < g.anneaux.length - 1 && motion.pointille
          )}
          points={points}
        />
      ))}
      {g.axes.map((axe, index) => (
        <line
          key={`${axe.x2}-${axe.y2}`}
          className={clsx('radar-axe', motion.axe)}
          style={rang(index)}
          pathLength={1}
          x1={VARIANTES[variante].cx}
          y1={VARIANTES[variante].cy}
          x2={un(axe.x2)}
          y2={un(axe.y2)}
        />
      ))}
      <polygon
        className={clsx('radar-trace', motion.etiquette)}
        pathLength={1}
        points={g.trace(valeursB)}
        style={{
          ...rang(4),
          stroke: 'rgb(var(--c-encre))',
          strokeWidth: 2,
          strokeDasharray: '0.02 0.012'
        }}
      />
      <polygon
        className={clsx('radar-aire', motion.aire)}
        points={g.trace(valeursA)}
      />
      <polygon
        className={clsx('radar-trace', motion.trace)}
        pathLength={1}
        points={g.trace(valeursA)}
      />
      {domaines.map((domaine, index) => (
        <g key={domaine.code}>
          <path
            className={clsx('radar-marqueur', motion.marqueur)}
            style={{
              ...rang(index),
              fill: 'rgb(var(--c-fond))',
              stroke: 'rgb(var(--c-encre))',
              strokeWidth: 2.5
            }}
            d={shapePath(
              domainShapes[domaine.code],
              pointsB[index]?.x ?? 0,
              pointsB[index]?.y ?? 0,
              g.marqueur
            )}
          />
          <path
            className={clsx('radar-marqueur', motion.marqueur)}
            style={rang(index)}
            d={shapePath(
              domainShapes[domaine.code],
              pointsA[index]?.x ?? 0,
              pointsA[index]?.y ?? 0,
              g.marqueur
            )}
          />
        </g>
      ))}
      {domaines.map((domaine, index) => {
        const etiquette = g.etiquettes[index];
        return (
          <g
            key={domaine.code}
            className={motion.etiquette}
            style={rang(index)}
          >
            <text
              className='radar-nom'
              textAnchor={etiquette?.ancre}
              x={un(etiquette?.x ?? 0)}
              y={un(etiquette?.y ?? 0)}
            >
              {domainLabel(domaine.code, locale, 'short')}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

type RadarBinomeProps = {
  domaines: readonly LigneDomaine[];
  locale: string;
  titre: string;
  resume: string;
  colonneDomaine: string;
  surMax: string;
  etiquettes: Etiquettes;
  className?: string;
};

function RadarBinome({
  domaines,
  locale,
  titre,
  resume,
  colonneDomaine,
  surMax,
  etiquettes,
  className
}: RadarBinomeProps): ReactElement {
  const nombre = (valeur: number): string => formatNombre(valeur, locale);
  const description = `${resume} ${domaines
    .map(
      (d) =>
        `${domainLabel(d.code, locale, 'short')} : ${etiquettes.a} ${nombre(d.scoreA)}, ${etiquettes.b} ${nombre(d.scoreB)} ${surMax}`
    )
    .join(' ; ')}`;
  const commun = { domaines, locale, titre, description };
  return (
    <div className={className}>
      <RadarSvg {...commun} variante='large' className='max-sm:hidden' />
      <RadarSvg {...commun} variante='compact' className='sm:hidden' />
      <ul className='mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2 text-petit font-medium text-encre'>
        <li className='flex items-center gap-2'>
          <svg width='14' height='14' viewBox='0 0 14 14' aria-hidden='true'>
            <line
              x1='0'
              y1='7'
              x2='14'
              y2='7'
              style={{ stroke: 'rgb(var(--c-safran))', strokeWidth: 3 }}
            />
            <circle
              cx='7'
              cy='7'
              r='4'
              style={{ fill: 'rgb(var(--c-encre))' }}
            />
          </svg>
          {etiquettes.a}
        </li>
        <li className='flex items-center gap-2'>
          <svg width='14' height='14' viewBox='0 0 14 14' aria-hidden='true'>
            <line
              x1='0'
              y1='7'
              x2='14'
              y2='7'
              strokeDasharray='3 2'
              style={{ stroke: 'rgb(var(--c-encre))', strokeWidth: 2 }}
            />
            <circle
              cx='7'
              cy='7'
              r='3.5'
              style={{
                fill: 'rgb(var(--c-fond))',
                stroke: 'rgb(var(--c-encre))',
                strokeWidth: 2
              }}
            />
          </svg>
          {etiquettes.b}
        </li>
      </ul>
      <table data-radar-table='' className='sr-only'>
        <caption>{titre}</caption>
        <thead>
          <tr>
            <th scope='col'>{colonneDomaine}</th>
            <th scope='col'>{etiquettes.a}</th>
            <th scope='col'>{etiquettes.b}</th>
          </tr>
        </thead>
        <tbody>
          {domaines.map((d) => (
            <tr key={d.code}>
              <th scope='row'>{domainLabel(d.code, locale, 'short')}</th>
              <td dir='ltr'>
                {nombre(d.scoreA)} {surMax}
              </td>
              <td dir='ltr'>
                {nombre(d.scoreB)} {surMax}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pastille de classe : le sens ne dépend jamais de la couleur (le mot est écrit).

const PASTILLES: Record<ClasseEcart, string> = {
  notable: 'bg-encre text-fond',
  intermediaire: 'bg-creux text-encre',
  proche: 'border border-trait-fort text-texte-2'
};

function PastilleClasse({
  classe,
  libelle
}: {
  classe: ClasseEcart;
  libelle: string;
}): ReactElement {
  return (
    <span
      data-classe-pastille={classe}
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-0.5 text-legende font-semibold',
        PASTILLES[classe]
      )}
    >
      {libelle}
    </span>
  );
}

const libelleFacette = (code: FacetteCode, locale: string): string => {
  const domaine = DOMAINES.find((d) => d === code[0]);
  if (!domaine) throw new RangeError(`Facette inconnue : ${code}`);
  return facetLabel(domaine, Number(code.slice(1)), locale);
};

const th = 'py-3 pe-4 text-start text-legende font-semibold text-texte-2';

// Partie du rapport : filet d'encre, titre dans une colonne à part (même
// grammaire que le rapport individuel).
const PARTIE =
  'grid gap-x-12 gap-y-6 border-t-2 border-encre pt-8 lg:grid-cols-12';
const TITRE_PARTIE = 'text-titre-section text-encre lg:col-span-4';
const CORPS_PARTIE = 'lg:col-span-8';

type RapportBinomeProps = {
  rapport: Rapport;
  locale: string;
  libelles: RapportBinomeLibelles;
  /** Nom des deux personnes : « Vous » et « L'autre personne », ou « Personne 1 » et « Personne 2 ». */
  etiquettes: Etiquettes;
  audience: 'personne' | 'consultant';
};

export function RapportBinome({
  rapport,
  locale,
  libelles,
  etiquettes,
  audience
}: RapportBinomeProps): ReactElement {
  const { niveaux, lire, ensemble, domaines, carte, attention, fiabilite } =
    libelles;
  const nombre = (valeur: number): string => formatNombre(valeur, locale);
  const ecartAffiche = (valeur: number): string =>
    nombre(Math.round(valeur * 100) / 100);
  const surMax = ensemble.domainOutOf;
  const domaine = (code: DomaineCompare): string =>
    domainLabel(code, locale, 'short');
  const parClasse = (classe: ClasseEcart): LigneFacette[] =>
    rapport.facettes.filter((f) => f.classe === classe);

  return (
    <ResultMotion locale={locale}>
      <div className='flex flex-col gap-20'>
        <section
          data-section='lire'
          aria-labelledby='binome-lire'
          className={PARTIE}
        >
          <h2 id='binome-lire' className={TITRE_PARTIE}>
            {lire.titre}
          </h2>
          <div
            className={`colonne-lecture flex flex-col gap-3 text-texte-2 ${CORPS_PARTIE}`}
          >
            <p className='text-chapo text-encre'>{lire.supportConversation}</p>
            <p>{lire.aucuneNote}</p>
            <p>{lire.pasDecision}</p>
            <p>{lire.consentement}</p>
            <p>{lire.niveaux}</p>
            <p className='mt-3 border-s-2 border-safran ps-4 font-medium text-encre'>
              {audience === 'personne'
                ? lire.destinatairesPersonne
                : lire.destinatairesConsultant}
            </p>
          </div>
        </section>

        <section
          data-section='ensemble'
          data-revele
          aria-labelledby='binome-ensemble'
          className='border-t-2 border-encre pt-8'
        >
          <h2 id='binome-ensemble' className='text-titre-section text-encre'>
            {ensemble.titre}
          </h2>
          <RadarBinome
            className='mx-auto mt-8 w-full max-w-2xl'
            domaines={rapport.domaines}
            locale={locale}
            titre={ensemble.radarTitle}
            resume={ensemble.radarSummary}
            colonneDomaine={ensemble.columnDomain}
            surMax={surMax}
            etiquettes={etiquettes}
          />
          <div className='mt-12 grid gap-x-10 gap-y-8 border-t border-trait pt-8 md:grid-cols-3'>
            <div>
              <h3 className='text-titre-3 text-encre'>
                {ensemble.rapprocheTitre}
              </h3>
              {rapport.rapproche.length === 0 ? (
                <p className='mt-1 text-texte-2'>{ensemble.rapprocheAucun}</p>
              ) : (
                <ul className='mt-2 flex flex-col gap-1 text-encre'>
                  {rapport.rapproche.map((code) => (
                    <li key={code}>{domaine(code)}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className='text-titre-3 text-encre'>
                {ensemble.distingueTitre}
              </h3>
              {rapport.distingue.length === 0 ? (
                <p className='mt-1 text-texte-2'>{ensemble.distingueAucun}</p>
              ) : (
                <ul className='mt-2 flex flex-col gap-1 text-encre'>
                  {rapport.distingue.map((code) => (
                    <li key={code}>{domaine(code)}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className='text-titre-3 text-encre'>
                {ensemble.conversationTitre}
              </h3>
              {rapport.conversation.length === 0 ? (
                <p className='mt-1 text-texte-2'>
                  {ensemble.conversationAucune}
                </p>
              ) : (
                <>
                  <p className='mt-1 text-petit text-texte-2'>
                    {ensemble.conversationIntro}
                  </p>
                  <ul className='mt-2 flex flex-col gap-1 text-encre'>
                    {rapport.conversation.map((code) => (
                      <li key={code}>{libelleFacette(code, locale)}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </section>

        <section
          data-section='domaines'
          data-revele
          aria-labelledby='binome-domaines'
          className='border-t-2 border-encre pt-8'
        >
          <h2 id='binome-domaines' className='text-titre-section text-encre'>
            {domaines.titre}
          </h2>
          <p className='mt-3 max-w-[40em] text-texte-2'>{domaines.intro}</p>
          <ul className='mt-6 flex flex-col'>
            {rapport.domaines.map((ligne, index) => (
              <li
                key={ligne.code}
                data-domaine={ligne.code}
                className={`break-inside-avoid border-t border-trait py-6 ${styles.cascade}`}
                style={rang(index)}
              >
                <div className='flex flex-wrap items-baseline gap-3'>
                  <span className='text-titre-3 text-encre'>
                    {domaine(ligne.code)}
                  </span>
                  <span className='ms-auto flex flex-wrap items-baseline gap-3 text-petit text-texte-2'>
                    {remplir(domaines.ecart, {
                      valeur: ecartAffiche(ligne.ecart)
                    })}
                    <PastilleClasse
                      classe={ligne.classe}
                      libelle={libelles.classe[ligne.classe]}
                    />
                  </span>
                </div>
                {(
                  [
                    [etiquettes.a, ligne.scoreA, ligne.niveauA],
                    [etiquettes.b, ligne.scoreB, ligne.niveauB]
                  ] as const
                ).map(([nom, score, niveau]) => (
                  <div key={nom} className='mt-3'>
                    <div className='flex flex-wrap items-baseline gap-3'>
                      <span className='text-petit font-medium text-texte-2'>
                        {nom}
                      </span>
                      <LevelBadge niveau={niveau} label={niveaux[niveau]} />
                      <span className='ms-auto'>
                        <ScoreValue
                          valeur={nombre(score)}
                          compte={score}
                          max={nombre(FIN)}
                          spoken={`${nom} : ${nombre(score)} ${ensemble.domainOutOf}`}
                        />
                      </span>
                    </div>
                    <div className='mt-1'>
                      <ScoreBar
                        score={score}
                        min={DEBUT}
                        max={FIN}
                        anime
                        gradue
                        rang={index}
                      />
                    </div>
                  </div>
                ))}
              </li>
            ))}
          </ul>
          <p className='mt-6 text-petit text-texte-2'>{libelles.ouverture}</p>
        </section>

        <section
          data-section='carte'
          data-revele
          aria-labelledby='binome-carte'
          className='border-t-2 border-encre pt-8 print:break-before-page'
        >
          <h2 id='binome-carte' className='text-titre-section text-encre'>
            {carte.titre}
          </h2>
          <p className='mt-3 max-w-[44em] text-texte-2'>
            {remplir(carte.intro, {
              proche: nombre(SEUILS_DEFAUT.ecarts.proche),
              notable: nombre(SEUILS_DEFAUT.ecarts.notable)
            })}
          </p>
          {CLASSES.map((classe) => {
            const lignes = parClasse(classe);
            const titreId = `binome-carte-${classe}`;
            return (
              <section
                key={classe}
                data-classe-groupe={classe}
                aria-labelledby={titreId}
                className='mt-6'
              >
                <h3 id={titreId} className='text-titre-3 text-encre'>
                  {carte.groupes[classe]}
                </h3>
                {lignes.length === 0 ? (
                  <p className='mt-2 text-texte-2'>{carte.aucune}</p>
                ) : (
                  <div
                    role='region'
                    aria-labelledby={titreId}
                    tabIndex={0}
                    className='mt-3 overflow-x-auto'
                  >
                    <table className='w-full text-petit'>
                      <caption className='sr-only'>{carte.caption}</caption>
                      <thead className='border-b border-encre'>
                        <tr>
                          <th scope='col' className={th}>
                            {carte.colFacette}
                          </th>
                          <th scope='col' className={th}>
                            {etiquettes.a}
                          </th>
                          <th scope='col' className={th}>
                            {etiquettes.b}
                          </th>
                          <th scope='col' className={th}>
                            {carte.colEcart}
                          </th>
                          <th scope='col' className={th}>
                            {carte.colClasse}
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-trait'>
                        {lignes.map((ligne) => (
                          <tr
                            key={ligne.code}
                            data-ecart={ligne.code}
                            data-classe={ligne.classe}
                          >
                            <th
                              scope='row'
                              className='py-2.5 pe-4 text-start font-medium text-encre'
                            >
                              {libelleFacette(ligne.code, locale)}
                            </th>
                            <td className='py-2.5 pe-4'>
                              {niveaux[ligne.niveauA]}
                            </td>
                            <td className='py-2.5 pe-4'>
                              {niveaux[ligne.niveauB]}
                            </td>
                            <td className='chiffres py-2.5 pe-4' dir='ltr'>
                              {ecartAffiche(ligne.ecart)}
                            </td>
                            <td className='py-2.5 pe-4'>
                              {libelles.classe[ligne.classe]}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
        </section>

        <section
          data-section='attention'
          data-revele
          aria-labelledby='binome-attention'
          className={PARTIE}
        >
          <h2 id='binome-attention' className={TITRE_PARTIE}>
            {attention.titre}
          </h2>
          <div className={CORPS_PARTIE}>
            {rapport.attention.length === 0 ? (
              <p className='text-texte-2'>{attention.aucun}</p>
            ) : (
              <>
                <p className='text-texte-2'>{attention.intro}</p>
                <ul className='mt-6 flex flex-col'>
                  {rapport.attention.map((cle) => (
                    <li
                      key={cle}
                      data-attention={cle}
                      className='border-t border-trait py-6'
                    >
                      <h3 className='text-titre-3 text-encre'>
                        {attention[cle].titre}
                      </h3>
                      <p className='mt-2 text-texte-2'>
                        {attention[cle].texte}
                      </p>
                      <p className='mt-3 text-legende text-texte-3'>
                        {attention[cle].source}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className='mt-3 border-s-2 border-safran ps-4 text-petit font-medium text-encre'>
                  {attention.limite}
                </p>
              </>
            )}
          </div>
        </section>

        <section
          data-section='fiabilite'
          data-revele
          aria-labelledby='binome-fiabilite'
          className={PARTIE}
        >
          <h2 id='binome-fiabilite' className={TITRE_PARTIE}>
            {fiabilite.titre}
          </h2>
          <div className={`flex flex-col gap-3 text-texte-2 ${CORPS_PARTIE}`}>
            <p>{fiabilite.texte}</p>
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

/** Libellés des boutons de consentement, lus dans l'espace « binome ». */
export function libellesConsent(t: Traducteur): BinomeConsentLabels {
  return {
    accepter: t('consent.accepter'),
    refuser: t('consent.refuser'),
    retirer: t('consent.retirer'),
    working: t('consent.working'),
    explication: t('consent.explication'),
    messages: {
      en_attente: t('consent.enAttente'),
      actif: t('consent.actif'),
      retire: t('consent.retire'),
      forbidden: t('consent.forbidden'),
      closed: t('consent.closed'),
      notfound: t('consent.notfound'),
      invalid: t('consent.invalid'),
      failed: t('consent.failed')
    }
  };
}

/** Libellés du formulaire de proposition du consultant. */
export function libellesProposition(t: Traducteur): BinomePropositionLabels {
  return {
    choixA: t('proposition.choixA'),
    choixB: t('proposition.choixB'),
    choisir: t('proposition.choisir'),
    envoyer: t('proposition.envoyer'),
    working: t('proposition.working'),
    proposed: t('proposition.proposed'),
    lienRapport: t('proposition.lienRapport'),
    messages: {
      invalid: t('proposition.invalid'),
      forbidden: t('proposition.forbidden'),
      already: t('proposition.already'),
      error: t('proposition.error')
    }
  };
}
