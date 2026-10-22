import 'server-only';
import donnees from '@/data/bibliotheque-facettes.json';
import type { FacetteCode, Niveau } from '@/lib/moteur';

// Bibliothèque de textes par facette et par niveau (copie de
// docs/design/bibliotheque-textes/facettes.json, absente de l'image). Module
// serveur : jamais importé depuis un composant client (voir le test).

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

type BlocBrut = {
  relecture: string;
  fr: {
    description: string[];
    apport: string[];
    cout: string[];
    question: string;
  };
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

const NON_RELU = 'non relue';

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
  const nonRelu = brut.relecture === NON_RELU;
  const afficherAuxPersonnes =
    options.afficherNonRelus ??
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES === 'afficher';
  if (nonRelu && audience === 'personne' && !afficherAuxPersonnes) {
    return { etat: 'en_relecture' };
  }
  const a = (t: string): string => accorder(t, accord);
  const { description, apport, cout, question } = brut.fr;
  return {
    etat: 'affiche',
    nonRelu,
    bloc: {
      description: description.map(a),
      apport: apport.map(a),
      cout: cout.map(a),
      question: a(question)
    }
  };
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
