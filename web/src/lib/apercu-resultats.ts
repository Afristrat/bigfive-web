import donnees from '@/data/apercu-resultats.json';
import {
  DOMAINES,
  lireScores,
  type DomainCode,
  type FacetIndex,
  type ScoreFacette,
  type ScoresTenga
} from '@/lib/moteur';
import {
  aggregateRows,
  assemblerGroupes,
  groupRows,
  type GroupeSynthese
} from '@/lib/synthese-data';

// Données fictives de la page /admin/apercu-resultats. Aucun accès à la base :
// les profils sont la copie de docs/design/profils-fictifs/profils.json (absent
// de l'image), les groupes sont inventés sous la forme des lignes que lit le
// chargeur de la synthèse.

// SHA-256 du fichier copié ; le test compare au fichier.
export const APERCU: { version: string; empreinte: string } = {
  version: donnees.version,
  empreinte: '370c5892f3b2396a5ea8755b14fbb4a41dd4178b09308002d18d145490faca0c'
};

export const PROFILS_APERCU = ['AM', 'KB', 'SR', 'HT'] as const;
export type ProfilApercu = (typeof PROFILS_APERCU)[number];

export const VUES_APERCU = ['participant', 'consultant', 'groupe'] as const;
export type VueApercu = (typeof VUES_APERCU)[number];

export type ReglagesApercu = {
  vue: VueApercu;
  profil: ProfilApercu;
  /** Simule BIBLIOTHEQUE_NON_RELUS_PERSONNES=afficher pour la vue participant. */
  simulation: boolean;
};

const CHEMIN = '/admin/apercu-resultats';
const INDEX: readonly FacetIndex[] = [1, 2, 3, 4, 5, 6];

type Profil = {
  code: string;
  nom: string;
  domaine: Record<string, number>;
  facette: Record<string, number>;
};

const profils: readonly Profil[] = donnees.profils;

const estProfil = (valeur: unknown): valeur is ProfilApercu =>
  PROFILS_APERCU.some((p) => p === valeur);
const estVue = (valeur: unknown): valeur is VueApercu =>
  VUES_APERCU.some((v) => v === valeur);

type Recherche = Record<string, string | string[] | undefined>;

/** Réglages d'URL ; toute valeur inconnue ou multiple retombe sur le défaut. */
export function lireReglagesApercu(recherche: Recherche): ReglagesApercu {
  const { vue, profil, simulation } = recherche;
  return {
    vue: estVue(vue) ? vue : 'participant',
    profil: estProfil(profil) ? profil : 'AM',
    simulation: simulation === 'afficher'
  };
}

/** Lien vers la page ; la simulation ne vaut que pour la vue participant. */
export function lienApercu(reglages: ReglagesApercu): string {
  const base = `${CHEMIN}?vue=${reglages.vue}&profil=${reglages.profil}`;
  return reglages.vue === 'participant' && reglages.simulation
    ? `${base}&simulation=afficher`
    : base;
}

const profilDe = (code: ProfilApercu): Profil => {
  const trouve = profils.find((p) => p.code === code);
  if (!trouve) throw new RangeError(`Profil fictif inconnu : ${code}`);
  return trouve;
};

export function nomProfilApercu(code: ProfilApercu): string {
  return profilDe(code).nom;
}

/**
 * Scores du profil fictif sous la forme `tenga-scores-1`. Chaque facette porte
 * sa moyenne (de 1 à 5) sur quatre réponses ; le total du domaine est celui de
 * profils.json, sur vingt-quatre réponses. `lireScores` valide le résultat.
 */
export function scoresApercu(code: ProfilApercu): ScoresTenga {
  const profil = profilDe(code);
  const domaine = (d: DomainCode): unknown => {
    const facettes = Object.fromEntries(
      INDEX.map((f): [string, ScoreFacette] => {
        const moyenne = profil.facette[`${d}${f}`] ?? Number.NaN;
        return [`${f}`, { score: moyenne * 4, count: 4, moyenne }];
      })
    );
    const score = profil.domaine[d] ?? Number.NaN;
    return { score, count: 24, moyenne: score / 24, facettes };
  };
  const brut = {
    format: 'tenga-scores-1',
    meta: { duree_secondes: null },
    ...Object.fromEntries(DOMAINES.map((d) => [d, domaine(d)]))
  };
  const lu = lireScores(brut);
  if (!lu) throw new RangeError(`Profil fictif illisible : ${code}`);
  return lu;
}

/** Trois groupes fictifs, dont un sans aucune ligne (sous le seuil d'anonymat). */
export function groupesApercu(): GroupeSynthese[] {
  return assemblerGroupes(
    groupRows.parse(donnees.groupes),
    aggregateRows.parse(donnees.agregats)
  );
}
