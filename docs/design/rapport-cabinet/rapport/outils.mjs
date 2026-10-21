// Outils partagés par les modules de niveau du rapport « cabinet ». Fonctions pures, aucun aléa.
export const NIVEAUX = ['bas', 'plutot_bas', 'milieu', 'plutot_haut', 'haut'];
export const NIVEAU_FR = { bas: 'bas', plutot_bas: 'plutôt bas', milieu: 'milieu de l’échelle', plutot_haut: 'plutôt haut', haut: 'haut' };
export const NOM_DOMAINE = { N: 'Névrosisme', E: 'Extraversion', O: 'Ouverture', A: 'Agréabilité', C: 'Conscience' };
export const DOMAINES = ['N', 'E', 'O', 'A', 'C'];

/** Nombre au format français : virgule décimale, deux décimales au plus, sans zéro final inutile. */
export function fmt(x) {
  if (!Number.isFinite(x)) throw new Error(`fmt : nombre attendu, reçu ${x}`);
  return String(Math.round(x * 100) / 100).replace('.', ',');
}

/** Résout les marqueurs d’accord {m|f|n} : forme sans accord (n) par défaut. */
export function accorder(texte, accord = 'n') {
  const i = { m: 0, f: 1, n: 2 }[accord] ?? 2;
  return texte.replace(/\{([^{}]*)\}/g, (_, g) => {
    const p = g.split('|');
    return p[i] ?? p[p.length - 1];
  });
}

/** Énumération française : « a », « a et b », « a, b et c ». */
export function liste(items) {
  if (items.length <= 1) return items.join('');
  return items.slice(0, -1).join(', ') + ' et ' + items[items.length - 1];
}

/** Bloc de la bibliothèque pour une facette et un niveau, accord résolu en forme sans accord. */
export function bloc(bib, code, niveau) {
  const f = bib.facettes.find((x) => x.code === code);
  if (!f) throw new Error(`facette inconnue ${code}`);
  const n = f.niveaux[niveau];
  if (!n || !n.fr) throw new Error(`bloc manquant ${code}/${niveau}`);
  const b = n.fr;
  return {
    id: `${code}/${niveau}`,
    libelle: f.libelle.fr,
    avertissement: f.avertissement ? f.avertissement.fr : null,
    relecture: n.relecture,
    relue_par: n.relue_par ?? null,
    relue_le: n.relue_le ?? null,
    description: b.description.map((t) => accorder(t)),
    apport: b.apport.map((t) => accorder(t)),
    cout: b.cout.map((t) => accorder(t)),
    question: accorder(b.question)
  };
}

/** Paragraphe du rapport. Un paragraphe « hypothese » exige confiance et verification (sinon exception). */
export function paragraphe(id, texte, { statut = 'constate', confiance, verification, bloc_ids } = {}) {
  if (!texte || typeof texte !== 'string') throw new Error(`paragraphe ${id} : texte vide`);
  if (statut !== 'constate' && statut !== 'hypothese') throw new Error(`paragraphe ${id} : statut ${statut}`);
  if (statut === 'hypothese') {
    if (!['faible', 'moyenne', 'elevee'].includes(confiance)) throw new Error(`paragraphe ${id} : confiance requise`);
    if (!verification) throw new Error(`paragraphe ${id} : verification requise`);
  }
  const p = { id, texte, statut };
  if (statut === 'hypothese') {
    p.confiance = confiance;
    p.verification = verification;
  }
  if (bloc_ids && bloc_ids.length) p.bloc_ids = bloc_ids;
  return p;
}

/** Recommandation à 7 attributs. Exception si un attribut manque ou si une « source » n’a pas de référence. */
export function recommandation(id, niveau, texte, a) {
  for (const k of ['donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
    if (!a[k] || typeof a[k] !== 'string') throw new Error(`recommandation ${id} : ${k} requis`);
  }
  const preuve = a.preuve || { niveau: 'hypothese', reference_id: null };
  if (preuve.niveau !== 'source' && preuve.niveau !== 'hypothese') throw new Error(`recommandation ${id} : preuve.niveau`);
  if (preuve.niveau === 'source' && !preuve.reference_id) throw new Error(`recommandation ${id} : source sans reference_id`);
  return {
    id,
    niveau,
    texte,
    donnee: a.donnee,
    contexte: a.contexte,
    preuve: { niveau: preuve.niveau, reference_id: preuve.reference_id ?? null },
    risque: a.risque,
    responsable: a.responsable,
    horizon: a.horizon,
    indicateur: a.indicateur
  };
}

/** Section : { id, titre, paragraphes }. */
export const section = (id, titre, paragraphes) => ({ id, titre, paragraphes });

/** Personne du cas par code. */
export function personne(cas, code) {
  const p = cas.personnes.find((x) => x.code === code);
  if (!p) throw new Error(`personne inconnue ${code}`);
  return p;
}

// ---------------------------------------------------------------- relecture et contrôle des sources
// Un bloc est « relu » seulement avec un relecteur nommé ET une date ISO réelle ; une source est « contrôlée »
// de la même façon. Toute autre combinaison compte comme « en attente » : un oubli ne peut jamais passer pour une relecture.
export const STATUT_SOURCE_A_CONTROLER = 'source à contrôler';
export const STATUT_SOURCE_CONTROLEE = 'source contrôlée';
const nomPose = (v) => typeof v === 'string' && v.trim() !== '';
export const dateIso = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v;
/** « 2026-10-21 » -> « 21/10/2026 ». */
export const dateFr = (iso) => iso.split('-').reverse().join('/');
export const blocRelu = (b) => b?.relecture === 'relue' && nomPose(b.relue_par) && dateIso(b.relue_le);
export const sourceControlee = (r) => r?.statut === STATUT_SOURCE_CONTROLEE && nomPose(r.controlee_par) && dateIso(r.controlee_le);

/** État de relecture d'un bloc « N6/haut » dans la bibliothèque, ou null s'il n'y est pas. */
export function etatBlocBib(bib, id) {
  const [code, niveau] = String(id).split('/');
  const n = bib?.facettes?.find((x) => x.code === code)?.niveaux?.[niveau];
  return n ? { relecture: n.relecture, relue_par: n.relue_par ?? null, relue_le: n.relue_le ?? null } : null;
}

/** Identifiants de blocs cités par un niveau du rapport, sans doublon. */
export const blocsCitesDuNiveau = (niveau) => [...new Set((niveau?.sections ?? []).flatMap((s) => (s.paragraphes ?? []).flatMap((p) => p.bloc_ids ?? [])))];

/** Instantané de l'état de relecture des blocs cités (porté par le rapport, signé avec lui). */
export function instantaneBlocs(bib, niveaux) {
  const ids = [...new Set(niveaux.flatMap(blocsCitesDuNiveau))].sort();
  return Object.fromEntries(ids.map((id) => [id, etatBlocBib(bib, id) ?? { relecture: 'non relue', relue_par: null, relue_le: null }]));
}

/**
 * Bilan de relecture d'un rapport : tous les compteurs sont CALCULÉS ici, jamais écrits en dur.
 * L'état d'un bloc vient de rapport.relecture.blocs, à défaut de la bibliothèque, à défaut « non relue ».
 */
export function bilanRelecture(rapport, bib) {
  const instantane = rapport?.relecture?.blocs ?? {};
  const etat = (id) => instantane[id] ?? etatBlocBib(bib, id) ?? { relecture: 'non relue' };
  const tous = new Set();
  const parNiveau = {};
  for (const n of rapport?.niveaux ?? []) {
    const ids = blocsCitesDuNiveau(n);
    ids.forEach((i) => tous.add(i));
    parNiveau[n.id] = { cites: ids.length, enAttente: ids.filter((i) => !blocRelu(etat(i))).length };
  }
  const relus = [...tous].map(etat).filter(blocRelu);
  const refs = rapport?.references ?? [];
  const controlees = refs.filter(sourceControlee);
  const signatures = [...relus.map((b) => [b.relue_par, b.relue_le]), ...controlees.map((r) => [r.controlee_par, r.controlee_le])];
  const textesEnAttente = tous.size - relus.length;
  const referencesEnAttente = refs.length - controlees.length;
  return {
    textes: tous.size,
    textesEnAttente,
    references: refs.length,
    referencesEnAttente,
    parNiveau,
    relecteurs: [...new Set(signatures.map((s) => s[0].trim()))].sort(),
    date: signatures.map((s) => s[1]).sort().at(-1) ?? null,
    complet: textesEnAttente === 0 && referencesEnAttente === 0 && signatures.length > 0
  };
}
