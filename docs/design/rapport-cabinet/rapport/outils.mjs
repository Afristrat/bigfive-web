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
