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

type Point = { titre: string; texte: string };

// Textes repris de la page d'accueil en production (messages fr), sauf mention.
const TEMPS: readonly Point[] = [
  {
    titre: 'Vous répondez',
    texte:
      '120 affirmations, sans limite de temps. Pour chacune, dites comment vous êtes d’habitude, pas comment vous aimeriez être. Vous pouvez vous arrêter et reprendre plus tard sur cet appareil.'
  },
  {
    titre: 'Vous lisez votre profil',
    texte:
      'Cinq grands facteurs et trente facettes, chacun décrit comme une tendance. Rien ne vous classe, rien n’est un diagnostic.'
  },
  {
    titre: 'Vous le conservez',
    texte:
      'Un identifiant vous permet de retrouver votre profil. La page s’imprime, ou s’enregistre au format PDF, depuis votre navigateur.'
  }
];

// « dans des dizaines de langues » retiré : chiffre non sourcé dans le texte actuel.
const RECHERCHE: readonly Point[] = [
  {
    titre: 'Une structure qui voyage',
    texte:
      'Les cinq grands facteurs ont été retrouvés dans la plupart des cultures étudiées.'
  },
  {
    titre: 'Un lien réel, mais modeste',
    texte:
      'Parmi les cinq facteurs, la conscienciosité est celui dont le lien avec la performance professionnelle est le plus régulièrement observé. Son ampleur est modeste.'
  },
  {
    titre: 'Des groupes, pas des personnes',
    texte:
      'Ces résultats décrivent des tendances de groupe. Ils ne prédisent pas une personne, et les traits ne sont qu’un élément parmi d’autres : les compétences, l’expérience et le contexte comptent aussi.'
  }
];

const LIMITES: readonly Point[] = [
  {
    titre: 'Il ne pose pas de diagnostic',
    texte:
      'Il décrit des tendances habituelles de comportement, d’après vos propres réponses.'
  },
  {
    titre: 'Il n’est pas un examen',
    texte:
      'Il n’est pas un test de compétences, d’intelligence ni un examen de santé.'
  },
  {
    titre: 'Il ne dit que ce que vous dites de vous',
    texte:
      'Ses résultats reposent sur vos propres réponses : une information précieuse, mais partielle.'
  },
  {
    titre: 'Il n’est pas conçu pour trier des candidats',
    texte:
      'Quand l’enjeu est élevé, en recrutement par exemple, des réponses peuvent être embellies. Nous ne recommandons pas ce questionnaire pour sélectionner.'
  }
];

const FICHE: readonly (readonly [string, string])[] = [
  ['Inventaire', 'IPIP-NEO-120, de John A. Johnson (2014)'],
  ['Origine des affirmations', 'International Personality Item Pool'],
  ['Statut', 'Domaine public'],
  ['Contenu', '120 affirmations, 5 facteurs, 30 facettes'],
  ['Langues', 'Français, العربية, English'],
  ['Durée', 'Sans limite de temps'],
  [
    'Formulations',
    'Quelques-unes retouchées, sans changer la facette mesurée ni le sens de cotation.'
  ],
  [
    'Validation de cette version',
    'Aucune étude de validation à ce jour. Nous le disons, plutôt que de le laisser deviner.'
  ]
];

const FAQ: readonly (readonly [string, string])[] = [
  [
    'Est-ce scientifique ?',
    'Le modèle des cinq grands facteurs a fait l’objet de très nombreuses études, dont une méta-analyse de 410 échantillons et de plus de 400 000 personnes (Judge et coll., 2013). Le questionnaire reprend un inventaire publié et placé dans le domaine public. Il n’a pas pour but de vous évaluer ni de vous classer. Ses limites, nous les disons : il décrit ce que vous dites de vous-même, et nous n’avons trouvé aucune étude qui le valide en arabe marocain ni en français pour le Maroc.'
  ],
  [
    'À quoi ça sert ?',
    'À vous donner des mots pour décrire votre façon de travailler, et à ouvrir une conversation avec vos collègues. Ce n’est pas une promesse de résultat : c’est un support de dialogue.'
  ],
  [
    'Le questionnaire pose-t-il un diagnostic ?',
    'Non. Il décrit des tendances de comportement d’après vos propres réponses. Ce n’est ni un test de compétences, ni un test d’intelligence, ni un examen de santé.'
  ]
];

function Points({
  id,
  titre,
  intro,
  points
}: {
  id: string;
  titre: string;
  intro: string;
  points: readonly Point[];
}): ReactNode {
  return (
    <section className={styles.section} aria-labelledby={id}>
      <div className={styles.deux}>
        <div className={styles.collant}>
          <h2 id={id}>{titre}</h2>
          <p className={styles.sous}>{intro}</p>
        </div>
        <ul className={styles.points}>
          {points.map((p) => (
            <li key={p.titre}>
              <h3>{p.titre}</h3>
              <p>{p.texte}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

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
          <section className={styles.section} aria-labelledby='t-depart'>
            <div className={styles.deux}>
              <h2 id='t-depart'>Le point de départ</h2>
              <div className={styles.organisation}>
                <p>
                  On compose une équipe. On conduit un changement. On choisit
                  une formation. Chaque fois, il faut comprendre comment les
                  personnes travaillent.
                </p>
                <p>
                  Le questionnaire donne un vocabulaire commun pour en
                  parler&nbsp;: cinq facteurs, trente facettes, des définitions
                  publiques. Il ouvre la conversation&nbsp;; il ne la remplace
                  pas.
                </p>
              </div>
            </div>
          </section>

          <Points
            id='t-temps'
            titre='Trois temps, à votre rythme'
            intro='Rien à préparer, rien à réviser&nbsp;: il n’y a ni bonne ni mauvaise réponse.'
            points={TEMPS}
          />

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

          <Points
            id='t-recherche'
            titre='Ce que la recherche établit, et jusqu’où'
            intro='Trois constats, sans en forcer la portée. Les références complètes sont publiées.'
            points={RECHERCHE}
          />

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

          <Points
            id='t-limites'
            titre='Ce que le questionnaire ne fera pas'
            intro='Une méthode se juge aussi à ce qu’elle refuse de promettre.'
            points={LIMITES}
          />

          <section className={styles.section} aria-labelledby='t-fiche'>
            <div className={styles.deux}>
              <div>
                <h2 id='t-fiche'>Fiche de l’instrument</h2>
                <p className={styles.sous}>
                  De quoi vérifier par vous-même, sans nous croire sur parole.
                </p>
              </div>
              <dl className={styles.fiche}>
                {FICHE.map(([terme, valeur]) => (
                  <div key={terme}>
                    <dt>{terme}</dt>
                    <dd>{valeur}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <section className={styles.section} aria-labelledby='t-faq'>
            <div className={styles.deux}>
              <h2 id='t-faq'>Trois questions avant de commencer</h2>
              <div className={styles.faq}>
                {FAQ.map(([question, reponse]) => (
                  <details key={question}>
                    <summary>{question}</summary>
                    <p>{reponse}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <section
            id='presentation'
            className={styles.section}
            aria-labelledby='t-presentation'
          >
            <div className={styles.deux}>
              <h2 id='t-presentation'>Un tiers de confiance</h2>
              <div className={styles.organisation}>
                <p>
                  Tenga Conseil est le tiers entre votre direction et vos
                  équipes. Le consultant restitue, explique et recadre. Il ne
                  transmet rien d’individuel à l’organisation.
                </p>
                <p>
                  Pour votre organisation, demandez une présentation&nbsp;:
                  Tenga Conseil vous répond pour convenir d’un échange.
                </p>
              </div>
            </div>
          </section>

          <p className={styles.signature}>Comprendre avant de juger.</p>
        </div>
      </div>
    </div>
  );
}
