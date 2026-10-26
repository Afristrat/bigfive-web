'use client';

import { useRef, type CSSProperties, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { AnimatedBeam } from './animated-beam';
import { Instrument } from './instrument';
import styles from './apercu.module.css';

type Facteur = {
  cle: string;
  initiale: string;
  court: string;
  nom: string;
  texte: string;
  clair: string;
  sombre: string;
};

// Facteurs dans l'ordre standard du Big Five (OCEAN). Définitions : textes en production (messages fr).
// Couleurs : jetons --chart-1 à --chart-5 du thème fourni. Exception assumée : Extraversion en sombre
// reprend un magenta clair, car l'olive #4c5f00 est illisible sur fond noir.
const FACTEURS: readonly Facteur[] = [
  {
    cle: 'o',
    initiale: 'O',
    court: 'Ouverture',
    nom: 'Ouverture à l’expérience',
    texte:
      'Curiosité, imagination, goût de la nouveauté. Certains explorent d’abord ; d’autres s’appuient sur ce qui a fait ses preuves. Les deux manières servent.',
    clair: '#0159b7',
    sombre: '#6a8dd8'
  },
  {
    cle: 'c',
    initiale: 'C',
    court: 'Conscienciosité',
    nom: 'Conscienciosité',
    texte:
      'Organisation, sens du devoir, persévérance. Certains planifient tout ; d’autres improvisent mieux.',
    clair: '#13c9aa',
    sombre: '#2062ce'
  },
  {
    cle: 'e',
    initiale: 'E',
    court: 'Extraversion',
    nom: 'Extraversion',
    texte:
      'Énergie dans les échanges et dans l’action. Certains se ressourcent avec les autres ; d’autres, dans le calme.',
    clair: '#cf3fd9',
    sombre: '#d36ee0'
  },
  {
    cle: 'a',
    initiale: 'A',
    court: 'Agréabilité',
    nom: 'Agréabilité',
    texte:
      'Coopération, confiance, souci d’autrui. Certains privilégient l’harmonie ; d’autres, la franchise.',
    clair: '#8f3c1e',
    sombre: '#cc7455'
  },
  {
    cle: 'n',
    initiale: 'N',
    court: 'Névrosisme',
    nom: 'Névrosisme',
    texte:
      'Sensibilité aux émotions négatives et au stress, plus ou moins vive selon les personnes. C’est une tendance d’humeur, pas un diagnostic.',
    clair: '#17ab92',
    sombre: '#4bb3a1'
  }
];

const teinteFil = (couleur: string): CSSProperties => ({
  ['--c' as string]: couleur
});

const PRIMAIRE = { clair: '#19398d', sombre: '#6a8dd8' } as const;

const CHOIX: readonly string[] = [
  'Pas du tout d’accord',
  'Plutôt en désaccord',
  'Ni d’accord ni en désaccord',
  'Plutôt d’accord',
  'Tout à fait d’accord'
];

const REGLES: readonly string[] = [
  'Une affirmation par écran.',
  'Cinq choix, toujours dans le même ordre.',
  'Aucune réponse n’est juste ni fausse.',
  'Rien ne bouge et rien ne change de couleur selon votre réponse.'
];

function Schema({ sombre }: { sombre: boolean }): ReactNode {
  const conteneur = useRef<HTMLDivElement>(null);
  const f0 = useRef<HTMLDivElement>(null);
  const f1 = useRef<HTMLDivElement>(null);
  const f2 = useRef<HTMLDivElement>(null);
  const f3 = useRef<HTMLDivElement>(null);
  const f4 = useRef<HTMLDivElement>(null);
  const centre = useRef<HTMLDivElement>(null);
  const sortie = useRef<HTMLDivElement>(null);
  const refs = [f0, f1, f2, f3, f4];
  const primaire = sombre ? PRIMAIRE.sombre : PRIMAIRE.clair;
  const teinte = (f: Facteur): string => (sombre ? f.sombre : f.clair);

  return (
    <div ref={conteneur} className={styles.schema}>
      <div className={`${styles.col} ${styles['col-facteurs']}`}>
        {FACTEURS.map((f, i) => (
          <div key={f.cle} className={styles['ligne-facteur']}>
            <span className={styles.etiquette}>{f.court}</span>
            <div
              ref={refs[i]}
              className={`${styles.noeud} ${styles['noeud-facteur']}`}
              style={{ borderColor: teinte(f), color: teinte(f) }}
            >
              {f.initiale}
            </div>
          </div>
        ))}
      </div>
      <div className={`${styles.col} ${styles['col-centre']}`}>
        <div
          ref={centre}
          className={`${styles.noeud} ${styles['noeud-centre']}`}
        >
          Tenga
        </div>
      </div>
      <div className={`${styles.col} ${styles['col-centre']}`}>
        <div
          ref={sortie}
          className={`${styles.noeud} ${styles['noeud-sortie']}`}
        >
          Profil
        </div>
      </div>

      {FACTEURS.map((f, i) => (
        <AnimatedBeam
          key={f.cle}
          containerRef={conteneur}
          fromRef={refs[i]}
          toRef={centre}
          curvature={(i - 2) * 18}
          duration={4 + i * 0.6}
          delay={i * 0.35}
          pathColor='currentColor'
          pathOpacity={0.25}
          gradientStartColor={teinte(f)}
          gradientStopColor={primaire}
        />
      ))}
      <AnimatedBeam
        containerRef={conteneur}
        fromRef={centre}
        toRef={sortie}
        duration={4}
        delay={1.5}
        pathColor='currentColor'
        pathOpacity={0.25}
        gradientStartColor={primaire}
        gradientStopColor={sombre ? '#2062ce' : '#13c9aa'}
      />
    </div>
  );
}

export function ApercuAccueil(): ReactNode {
  const { resolvedTheme } = useTheme();
  const sombre = resolvedTheme === 'dark';

  return (
    <div className={styles.racine} lang='fr' dir='ltr'>
      <p className={`${styles.note} ${styles.gouttiere}`}>
        <span className={styles.contenu} style={{ display: 'block' }}>
          Aperçu de travail, non indexé. Textes provisoires, version française
          seule.
        </span>
      </p>

      <div className={styles.bande}>
        <div className={styles.gouttiere}>
          <div className={`${styles.contenu} ${styles.heros}`}>
            <div>
              <h1>Des mots précis sur votre façon de travailler.</h1>
              <p className={styles.chapeau}>
                120 affirmations, sans limite de temps, tirées d’un inventaire
                public. Vous obtenez un profil sur cinq grands facteurs et
                trente facettes, avec ses sources et ses limites.
              </p>
              <div className={styles.actions}>
                <a className={styles.bouton} href='#presentation'>
                  Demander une présentation
                </a>
                <a className={styles['lien-clair']} href='#facteurs'>
                  Lire la méthode
                </a>
              </div>
              <p className={styles.etat}>
                Le questionnaire n’est pas encore ouvert au public. Votre
                organisation peut demander une présentation.
              </p>
            </div>
            <figure className={styles['cadran-fig']}>
              <Instrument />
              <figcaption>
                Cadran de mesure&nbsp;: un anneau par facteur. Illustration, ces
                figures ne représentent aucun résultat.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <div className={styles.gouttiere}>
        <div className={styles.contenu}>
          <section className={styles.section} aria-labelledby='t-profil'>
            <div className={`${styles.deux} ${styles.centre}`}>
              <div>
                <h2 id='t-profil'>
                  Cinq facteurs. Trente facettes. Aucun verdict.
                </h2>
                <p className={styles.sous}>
                  Chaque facteur se décompose en six facettes, décrites
                  séparément. Un profil se lit comme un ensemble&nbsp;: aucun
                  facteur ne résume une personne.
                </p>
              </div>
              <figure>
                <div className={styles.carte}>
                  <Schema sombre={sombre} />
                </div>
                <figcaption className={styles.legende}>
                  Schéma illustratif, il ne représente aucun résultat.
                </figcaption>
              </figure>
            </div>
          </section>

          <section
            id='facteurs'
            className={styles.section}
            aria-labelledby='t-facteurs'
          >
            <div className={styles.deux}>
              <div className={styles.collant}>
                <h2 id='t-facteurs'>Ce que mesurent les cinq facteurs</h2>
                <p className={styles.sous}>
                  Chaque facteur est un continuum. Aucune extrémité n’est bonne
                  ou mauvaise en soi&nbsp;: tout dépend du poste et de l’équipe.
                </p>
              </div>
              <ul className={styles.facteurs}>
                {FACTEURS.map((f) => (
                  <li
                    key={f.cle}
                    style={teinteFil(sombre ? f.sombre : f.clair)}
                  >
                    <span className={styles.fil} />
                    <div>
                      <h3>{f.nom}</h3>
                      <p>{f.texte}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            id='ecran'
            className={styles.section}
            aria-labelledby='t-ecran'
          >
            <div className={styles.deux}>
              <div>
                <h2 id='t-ecran'>Le questionnaire reste neutre</h2>
                <ul className={styles.regles}>
                  {REGLES.map((regle) => (
                    <li key={regle}>{regle}</li>
                  ))}
                </ul>
              </div>
              <form
                className={styles.ecran}
                onSubmit={(e) => e.preventDefault()}
              >
                <div className={styles['ecran-tete']}>
                  <span>Exemple d’écran, énoncé fictif</span>
                  <span>Fr</span>
                </div>
                <div className={styles.piste} aria-hidden='true'>
                  <i />
                </div>
                <p id='enonce' className={styles.enonce}>
                  Je relis mon travail avant de le rendre.
                </p>
                <fieldset className={styles.choix} aria-labelledby='enonce'>
                  {CHOIX.map((libelle, i) => (
                    <div key={libelle} style={{ display: 'contents' }}>
                      <input id={`r${i}`} type='radio' name='reponse' />
                      <label htmlFor={`r${i}`}>{libelle}</label>
                    </div>
                  ))}
                </fieldset>
                <p className={styles['ecran-note']}>
                  Le choix sélectionné reçoit le même contour, quelle que soit
                  la réponse.
                </p>
              </form>
            </div>
          </section>

          <section
            id='presentation'
            className={styles.section}
            aria-labelledby='t-presentation'
          >
            <div className={styles.deux}>
              <h2 id='t-presentation'>Pour votre organisation</h2>
              <div className={styles.organisation}>
                <p>
                  Tenga Conseil est le tiers entre votre direction et vos
                  équipes. Le consultant restitue, explique et recadre. Il ne
                  transmet rien d’individuel à l’organisation.
                </p>
                <p>
                  Demandez une présentation&nbsp;: Tenga Conseil vous répond
                  pour convenir d’un échange.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
