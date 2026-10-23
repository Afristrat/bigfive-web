import 'server-only';
import { createHash } from 'node:crypto';
import donnees from '@/data/bibliotheque-facettes.json';
import type { FacetteCode, Niveau } from '@/lib/moteur';

// Bibliothèque de textes par facette et par niveau (copie de
// docs/design/bibliotheque-textes/facettes.json, absente de l'image). Module
// serveur : jamais importé depuis un composant client (voir le test).
//
// Relecture (migration 0022) : le fichier reste la seule source du TEXTE ; la
// base seule dit, pour une empreinte du texte, « relu » ou « à corriger ». Un
// bloc n'est relu QUE par un verdict « relu » en base sur l'empreinte du texte
// servi : le champ « relecture » du fichier n'est jamais lu. Sans état chargé
// (démarrage, base injoignable), tout bloc est non relu, donc masqué à la
// personne. Un texte modifié change d'empreinte et n'hérite d'aucun verdict.

export type Audience = 'personne' | 'consultant' | 'administrateur';
export type Accord = 'm' | 'f' | 'n';
export type BlocResolu = {
  description: readonly string[];
  apport: readonly string[];
  cout: readonly string[];
  question: string;
};
export type EtatBloc =
  | { etat: 'affiche'; bloc: BlocResolu; nonRelu: boolean }
  | { etat: 'en_relecture' }
  | { etat: 'langue_absente' };

type TexteBrut = {
  description: readonly string[];
  apport: readonly string[];
  cout: readonly string[];
  question: string;
};
type BlocBrut = {
  fr: TexteBrut;
};
type FacetteBrute = {
  code: string;
  definition: { fr: string };
  avertissement: { fr: string } | null;
  niveaux: Record<string, BlocBrut>;
};

const facettes: readonly FacetteBrute[] = donnees.facettes;

// SHA-256 du fichier copié ; le test compare à la source de docs/ et au fichier.
export const BIBLIOTHEQUE: { version: string; empreinte: string } = {
  version: donnees.version,
  empreinte: '1f8fe4cd78116805f2218d506e4935cedb11f0a1e0705a106df6fa9293c3e808'
};

const ORDRE_NIVEAUX: readonly Niveau[] = [
  'bas',
  'plutot_bas',
  'milieu',
  'plutot_haut',
  'haut'
];

export type IdBloc = `${FacetteCode}/${Niveau}`;

const estFrancais = (locale: string): boolean =>
  locale.split('-')[0]?.toLowerCase() === 'fr';

const facette = (code: string): FacetteBrute | undefined =>
  facettes.find((f) => f.code === code);

// Proche de docs/design/rapport-cabinet/rapport/outils.mjs (accorder) :
// {masculin|féminin|sans accord}, forme sans accord par défaut. Écart voulu :
// quand la partie demandée manque ({ouvert|ouverte} sans forme sans accord), on
// rend la première forme, jamais la dernière (la féminine) par défaut.
export function accorder(texte: string, accord: Accord): string {
  const i = { m: 0, f: 1, n: 2 }[accord] ?? 2;
  return texte.replace(/\{([^{}]*)\}/g, (_, g: string) => {
    const p = g.split('|');
    return p[i] ?? p[0] ?? '';
  });
}

const MARQUE_ACCORD = /\{[^{}]*\|[^{}]*\}/;

const resoudre = (texte: TexteBrut, accord: Accord): BlocResolu => {
  const a = (t: string): string => accorder(t, accord);
  return {
    description: texte.description.map(a),
    apport: texte.apport.map(a),
    cout: texte.cout.map(a),
    question: a(texte.question)
  };
};

/**
 * Empreinte du texte d'un bloc : SHA-256 (hexadécimal) du JSON de
 * [description, apport, cout, question], texte brut avec ses marques
 * d'accord. Un seul caractère changé change l'empreinte.
 */
export function empreinteTexte(texte: TexteBrut): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        texte.description,
        texte.apport,
        texte.cout,
        texte.question
      ])
    )
    .digest('hex');
}

/** Un bloc de la bibliothèque, tel que l'atelier de relecture le montre. */
export type BlocBibliotheque = {
  id: IdBloc;
  facette: FacetteCode;
  niveau: Niveau;
  /** Texte sans accord (forme servie quand le genre n'est pas renseigné). */
  texte: BlocResolu;
  /** Formes accordées, seulement si le texte porte des marques d'accord. */
  accords: { m: BlocResolu; f: BlocResolu } | null;
  empreinte: string;
};

const catalogue: readonly BlocBibliotheque[] = facettes.flatMap((f) =>
  ORDRE_NIVEAUX.flatMap((niveau): BlocBibliotheque[] => {
    const brut = f.niveaux[niveau];
    if (!brut) return [];
    const marque = [
      ...brut.fr.description,
      ...brut.fr.apport,
      ...brut.fr.cout,
      brut.fr.question
    ].some((t) => MARQUE_ACCORD.test(t));
    // Les codes du fichier sont vérifiés par le test (30 facettes N1 à C6).
    const code = f.code as FacetteCode;
    return [
      {
        id: `${code}/${niveau}`,
        facette: code,
        niveau,
        texte: resoudre(brut.fr, 'n'),
        accords: marque
          ? { m: resoudre(brut.fr, 'm'), f: resoudre(brut.fr, 'f') }
          : null,
        empreinte: empreinteTexte(brut.fr)
      }
    ];
  })
);
const empreintes = new Map<string, string>(
  catalogue.map((b) => [b.id, b.empreinte])
);

/** Les 150 blocs, dans l'ordre de la bibliothèque (facette, puis niveau). */
export const blocsBibliotheque = (): readonly BlocBibliotheque[] => catalogue;

/** Empreinte du texte servi pour ce bloc ; null pour un identifiant inconnu. */
export const empreinteBloc = (id: string): string | null =>
  empreintes.get(id) ?? null;

// --- État de relecture lu en base ---------------------------------------------

export type VerdictRelecture = 'relu' | 'a_corriger';
/** Dernier verdict d'un couple (bloc, empreinte) : app.etat_relecture_blocs. */
export type LigneEtatRelecture = {
  bloc: string;
  empreinte: string;
  verdict: VerdictRelecture;
};
type ChargeurEtat = () => Promise<readonly LigneEtatRelecture[]>;

// Durée de validité de l'état en mémoire : un verdict rendu dans un autre
// processus s'applique au plus tard après ce délai (l'action de verdict
// rafraîchit l'état aussitôt dans le sien).
// ponytail: une seule instance de l'application ; plafond : une minute d'écart
// entre deux instances ; réexamen : passage à plusieurs réplicas.
const DUREE_ETAT_MS = 60_000;

type EtatPartage = {
  verdicts: ReadonlyMap<string, VerdictRelecture> | null;
  chargeLe: number;
  enCours: Promise<boolean> | null;
};
// Sur globalThis : pages et actions serveur sont des paquets distincts qui
// doivent partager le même état (même principe que rate-limit.ts).
const partage = globalThis as typeof globalThis & {
  __tengaRelecture?: EtatPartage;
};
const etatPartage = (): EtatPartage =>
  (partage.__tengaRelecture ??= {
    verdicts: null,
    chargeLe: 0,
    enCours: null
  });
const cle = (bloc: string, empreinte: string): string => `${bloc}|${empreinte}`;

/** Remplace l'état en mémoire ; null : état inconnu, le fichier fait foi. */
export function appliquerEtatRelecture(
  lignes: readonly LigneEtatRelecture[] | null,
  maintenant: number = Date.now()
): void {
  const etat = etatPartage();
  etat.verdicts =
    lignes === null
      ? null
      : new Map(lignes.map((l) => [cle(l.bloc, l.empreinte), l.verdict]));
  etat.chargeLe = lignes === null ? 0 : maintenant;
}

const chargeurParDefaut: ChargeurEtat = async () =>
  (await import('@/lib/relecture-etat')).chargerEtatRelecture();

const statutHttp = (error: unknown): number =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number(error.status) || 0
    : 0;

/**
 * Relit l'état en base. Un échec garde l'état précédent (à défaut, le
 * fichier) et n'est journalisé que par son code HTTP ; deux appels simultanés
 * n'en font qu'un. Rend vrai si l'état a été chargé.
 */
export function rafraichirEtatRelecture(
  chargeur: ChargeurEtat = chargeurParDefaut
): Promise<boolean> {
  const etat = etatPartage();
  if (etat.enCours) return etat.enCours;
  // Le chargeur part dans une tâche suivante : `enCours` est posé avant, même
  // si le chargeur échoue aussitôt.
  const enCours = Promise.resolve()
    .then(chargeur)
    .then(
      (lignes) => {
        appliquerEtatRelecture(lignes);
        return true;
      },
      (error: unknown) => {
        // Pas de nouvel essai avant le délai : aucune rafale vers la base.
        etat.chargeLe = Date.now();
        console.warn(
          JSON.stringify({
            event: 'bibliotheque.relecture_indisponible',
            status: statutHttp(error)
          })
        );
        return false;
      }
    )
    .finally(() => {
      etat.enCours = null;
    });
  etat.enCours = enCours;
  return enCours;
}

// Sur le serveur Next.js seulement (ni en test, ni au build) : un état périmé
// est rechargé en arrière-plan ; l'appel en cours lit l'état présent (au pire
// le fichier : blocs non relus masqués à la personne).
function rafraichirSiPerime(): void {
  if (
    process.env.NEXT_RUNTIME !== 'nodejs' ||
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return;
  }
  const etat = etatPartage();
  if (etat.enCours || Date.now() - etat.chargeLe < DUREE_ETAT_MS) return;
  void rafraichirEtatRelecture();
}

/** Relu seulement par un verdict « relu » en base sur l'empreinte du texte servi. */
const estRelu = (id: string): boolean => {
  const empreinte = empreintes.get(id);
  return (
    empreinte !== undefined &&
    etatPartage().verdicts?.get(cle(id, empreinte)) === 'relu'
  );
};

/**
 * Réglage d'appel de la garde de relecture. `afficherNonRelus` remplace, pour
 * cet appel seul, la variable d'exploitation BIBLIOTHEQUE_NON_RELUS_PERSONNES
 * (aperçu interne) ; indéfini, la variable fait foi, comme avant.
 */
export type OptionsBloc = { afficherNonRelus?: boolean };

export function blocFacette(
  id: `${FacetteCode}/${Niveau}`,
  locale: string,
  audience: Audience,
  accord: Accord = 'n',
  options: OptionsBloc = {}
): EtatBloc {
  if (!estFrancais(locale)) return { etat: 'langue_absente' };
  const [code = '', niveau = ''] = id.split('/');
  const brut = facette(code)?.niveaux[niveau];
  if (!brut) {
    // Un identifiant sans bloc ne doit pas faire tomber tout le rapport : le
    // bloc est présenté comme en relecture, l'anomalie est journalisée.
    console.error(`Bloc de bibliothèque inconnu : ${id}`);
    return { etat: 'en_relecture' };
  }
  rafraichirSiPerime();
  const nonRelu = !estRelu(id);
  const afficherAuxPersonnes =
    options.afficherNonRelus ??
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES === 'afficher';
  if (nonRelu && audience === 'personne' && !afficherAuxPersonnes) {
    return { etat: 'en_relecture' };
  }
  return { etat: 'affiche', nonRelu, bloc: resoudre(brut.fr, accord) };
}

export function definitionFacette(
  code: FacetteCode,
  locale: string
): string | null {
  if (!estFrancais(locale)) return null;
  return facette(code)?.definition.fr ?? null;
}

export function avertissementFacette(
  code: FacetteCode,
  locale: string
): string | null {
  if (!estFrancais(locale)) return null;
  return facette(code)?.avertissement?.fr ?? null;
}
