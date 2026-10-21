// Assemble sortie/rapport.json à partir des quatre modules de niveau.
//   node docs/design/rapport-cabinet/rapport/generer-rapport.mjs   (depuis la racine du dépôt)
// Aucun nombre n'est calculé ici : tout vient de faits.json, du cas ou des profils. Sortie déterministe.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.resolve(ici, '..');
const lire = (...p) => JSON.parse(fs.readFileSync(path.join(racine, ...p), 'utf-8'));

export const ORDRE_NIVEAUX = ['n1-individuel', 'n2-relations', 'n3-equipe', 'n4-organisation', 'n5-accompagnement'];

export const AVERTISSEMENTS = [
  'Cas de démonstration : l’organisation, KB, SR et HT sont fictifs. AM est un profil estimé, pas une mesure ni un fictif : seules les réponses de la personne font foi.',
  'Ce rapport est préparé par des scripts à partir de faits calculés et de textes rédigés d’avance. Il ne formule aucune prévision et ne classe personne ; faute de référentiel établi pour ce questionnaire, aucune personne n’y est comparée à d’autres personnes que celles du cas.',
  'Aucune décision d’emploi (recrutement, promotion, licenciement, affectation) ne peut s’appuyer sur ce rapport.',
  'Les blocs de la bibliothèque de textes ne sont pas relus par un humain. Les niveaux et les écarts sont des conventions de l’outil, non calibrées. Les références citées sont non vérifiées à la date du rapport.',
  'Toute lecture est une hypothèse, avec son niveau de confiance et la façon de la vérifier en entretien. Un consultant qualifié désigné par Tenga Conseil relit et signe avant tout usage.',
  'Document de travail du consultant : il réunit des chapitres privés et des lectures de relation, il n’est jamais remis tel quel à un supérieur hiérarchique d’une personne citée.'
];

/** Une référence est incluse si une recommandation la cite par id, ou si le nom d’un de ses auteurs figure dans un texte (l’audit signale toute citation absente de la liste). */
function referencesCitees(refs, textes, recommandations) {
  const ids = new Set(recommandations.map((r) => r.preuve && r.preuve.reference_id).filter(Boolean));
  const tout = textes.join('\n');
  for (const r of refs.references) {
    const noms = [...r.auteurs, ...(r.id === 'house-2004' ? ['GLOBE'] : [])];
    if (noms.some((nom) => new RegExp(`\\b${nom}\\b`).test(tout))) ids.add(r.id);
  }
  return refs.references.filter((r) => ids.has(r.id)).map((r) => ({ id: r.id, citation: r.citation, statut: 'à vérifier' }));
}

function toutesLesChaines(valeur, sortie = []) {
  if (typeof valeur === 'string') sortie.push(valeur);
  else if (Array.isArray(valeur)) valeur.forEach((v) => toutesLesChaines(v, sortie));
  else if (valeur && typeof valeur === 'object') Object.values(valeur).forEach((v) => toutesLesChaines(v, sortie));
  return sortie;
}

/** modules : [{ construire }] dans l'ordre des niveaux ; chaque construire(ctx) renvoie {niveau} ou {niveaux}, et recommandations. */
export function assembler(ctx, modules) {
  const niveaux = [];
  const recommandations = [];
  for (const m of modules) {
    const r = m.construire(ctx);
    for (const n of r.niveaux || [r.niveau]) niveaux.push(n);
    recommandations.push(...r.recommandations);
  }
  niveaux.sort((a, b) => ORDRE_NIVEAUX.indexOf(a.id) - ORDRE_NIVEAUX.indexOf(b.id));
  const idsReco = recommandations.map((r) => r.id);
  if (new Set(idsReco).size !== idsReco.length) throw new Error('ids de recommandation en double');
  const idsPar = niveaux.flatMap((n) => n.sections.flatMap((s) => s.paragraphes.map((p) => p.id)));
  if (new Set(idsPar).size !== idsPar.length) throw new Error('ids de paragraphe en double');
  // Typographie : apostrophes courbes dans les textes lus par des personnes ; les identifiants ne sont pas touchés.
  const CHAMPS_TEXTE = new Set(['texte', 'titre', 'verification', 'donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']);
  const courbes = (v, cle) => {
    if (typeof v === 'string') return CHAMPS_TEXTE.has(cle) ? v.replace(/'/g, '’') : v;
    if (Array.isArray(v)) return v.map((x) => courbes(x, cle));
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, courbes(x, k)]));
    return v;
  };
  const rapport = {
    version: 'rapport-cabinet-1.0',
    empreinte_entrees: ctx.faits.empreinte_entrees,
    etiquette_fictif: ctx.cas.etiquette,
    avertissements: AVERTISSEMENTS,
    niveaux: courbes(niveaux, ''),
    recommandations: courbes(recommandations, ''),
    references: []
  };
  rapport.references = referencesCitees(ctx.refs, toutesLesChaines({ niveaux: rapport.niveaux, recommandations: rapport.recommandations }), rapport.recommandations);
  return rapport;
}

export function chargerContexte() {
  const bibCandidates = path.join(racine, '..', 'bibliotheque-textes', 'facettes.json');
  return {
    cas: lire('cas', 'cas-demo.json'),
    faits: lire('sortie', 'faits.json'),
    profils: JSON.parse(fs.readFileSync(path.join(racine, '..', 'profils-fictifs', 'profils.json'), 'utf-8')),
    bib: JSON.parse(fs.readFileSync(bibCandidates, 'utf-8')),
    regles: lire('moteur', 'regles.json'),
    refs: lire('references-autorisees.json')
  };
}

export async function chargerModules() {
  const noms = ['niveau1-individuel', 'niveau2-relations', 'niveau34-equipe-organisation', 'niveau5-accompagnement'];
  return Promise.all(noms.map((n) => import(pathToFileURL(path.join(ici, `${n}.mjs`)).href)));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ctx = chargerContexte();
  const rapport = assembler(ctx, await chargerModules());
  const sortie = path.join(racine, 'sortie', 'rapport.json');
  fs.writeFileSync(sortie, JSON.stringify(rapport, null, 1) + '\n', 'utf-8');
  const nPar = rapport.niveaux.reduce((s, n) => s + n.sections.reduce((t, x) => t + x.paragraphes.length, 0), 0);
  const empreinte = crypto.createHash('sha256').update(fs.readFileSync(sortie)).digest('hex').slice(0, 16);
  console.log(`rapport.json écrit : ${rapport.niveaux.length} niveaux, ${nPar} paragraphes, ${rapport.recommandations.length} recommandations, ${rapport.references.length} références, sha256 ${empreinte}`);
}
