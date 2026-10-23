// Audit déterministe d'un rapport « cabinet » (mandat § 4.4, 4.6, 4.8). Aucun modèle, aucune dépendance.
// auditer({rapport, faits, cas, profils, references}) -> { defauts: [{categorie, id, extrait, message}], comptes }
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sourceControlee, STATUT_SOURCE_A_CONTROLER, STATUT_SOURCE_CONTROLEE } from '../rapport/outils.mjs';

export const CATEGORIES = [
  'chiffre_absent_des_entrees',
  'terme_interdit',
  'comparaison_population',
  'pourcentage_compatibilite',
  'decision_emploi',
  'moyenne_nationale_a_personne',
];
export const COMPLEMENTS = ['references', 'structure'];

export const STRUCTUREL = JSON.parse(
  readFileSync(fileURLToPath(new URL('./structurel.json', import.meta.url)), 'utf8'),
);

const NIVEAUX_REQUIS = ['n1-individuel', 'n2-relations', 'n3-equipe', 'n4-organisation', 'n5-accompagnement'];
const CLES_TECHNIQUES = new Set(['id', 'version', 'empreinte_entrees', 'bloc_ids', 'reference_id', 'niveau', 'statut', 'confiance', 'relecture', 'relue_par', 'relue_le', 'controlee_par', 'controlee_le']);
const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const L = '\\p{L}';
const deb = '(?<![\\p{L}\\d_])';
const fin = '(?![\\p{L}\\d_])';
const re = (src, flags = 'giu') => new RegExp(src, flags);
const echapper = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mot = (src) => re(`${deb}(?:${src})${fin}`);

// ---------------------------------------------------------------- lexiques
// Base : controle.py (INTERDITS_FR). Retirés car le mandat les emploie lui-même dans le rapport :
// coach, psychologue, compétence (coaching, formation), test, passation (langue de passation),
// note, item, feedback, debrief. faible/fort(s) restent hors lexique : « confiance faible » et
// « points forts » sont des termes du contrat ; limite connue.
const TERMES_INTERDITS = [
  ['moyenne', `moyennes?`],
  ['norme', `normes?`],
  ['percentile', `percentiles?`],
  ['score', `scores?`],
  ['population', `populations?`],
  ['meilleur', `meilleur${L}*`],
  ['pire', `pires?`],
  ['mauvais', `mauvais${L}*`],
  ['excellent', `excellent${L}*`],
  ['médiocre', `médiocres?`],
  ['bon score', `bon score`],
  ['bon profil', `bons? (profil|candidat)s?`],
  ['aptitude', `aptitudes?`],
  ['diagnostic', `diagnostic${L}*`],
  ['prédiction', `pr[ée]dic${L}*|pr[ée]dit${L}*|pr[ée]dir${L}*|pr[ée]dis${L}*|garantit|garantissent`],
  ['type de personnalité', `types? de personnalité|personnalité de type|profils? de type|(?:in|ex)trover${L}*|extrover${L}*|extrovert${L}*|névrosé${L}*`],
  ['compatibilité', `compatibilit${L}*`],
  ['jugement sur autrui', `(plus|moins|mieux|davantage|autant) que (les|d['’])autres|vous [êe]tes`],
];
const LEXIQUE = TERMES_INTERDITS.map(([nom, src]) => [nom, mot(src)]);

const COMPARAISON_POPULATION = [
  re(`par rapport (?:à|aux?) (?:la |l['’]|les |une |aux )?(?:moyenne|population|norme|autres|gens|échantillon)`),
  re(`la plupart des (?:gens|personnes)|que la plupart`),
  mot(`populations?`), mot(`normes?`), mot(`percentiles?`), mot(`typiques?`),
  re(`compar${L}* aux autres personnes`),
  re(`(?:au[- ]dessus|en[- ]dessous|au[- ]dessous|en dessous) de la moyenne`),
  re(`(?:plus|moins|mieux|davantage|autant) que (?:les|d['’])autres`),
  re(`échantillon normatif`),
];

const PROX_COMPAT = `compatibilit${L}*|affinit${L}*|ad[ée]quation|match${L}*|synergies?`;
const POURCENT = re(`%|pour ?cent${L}*|pourcentages?`);
const COMPAT_MOT = mot(`compatibilit${L}*`);
const COMPAT_PROX = mot(PROX_COMPAT);

const DECISION_EMPLOI = [
  mot(`recrut${L}*|embauch${L}*|licenci${L}*|promouv${L}*|promotions?|mut(?:er|ation|ations)`),
  mot(`affectations?`),
  re(`${deb}affect(?:er|ons|ez)(?: ${L}+){0,3} à (?:un|une|le|la|l['’]) ?(?:poste|équipe|fonction|projet)${fin}`),
  re(`${deb}écart(?:er|ons|ez)(?: ${L}+){0,2} (?:candidat|salarié|personne|collaborat|profil)${L}*`),
  re(`${deb}sélection(?:ner|nons|nez)?(?: ${L}+){0,2} (?:de |des |d['’])?(?:candidat|salarié|personne|collaborat|profil|personnel)${L}*`),
  re(`évalu${L}*(?: ${L}+){0,2} la performance (?:de|des|d['’])`),
  re(`évaluation de la performance`),
];

const NATIONAL_BASE = [
  mot(`nationalit${L}*|pays|nationale?s?|hofstede|globe|meyer|hall`),
  re(`culture[s]? nationale?s?`),
  mot(`maroc|marocain${L}*|algérien${L}*|tunisien${L}*|égyptien${L}*|sénégalais${L}*|ivoirien${L}*|camerounais${L}*|libanais${L}*|émirati${L}*|saoudien${L}*|britannique${L}*|allemand${L}*|espagnol${L}*|italien${L}*|américain${L}*|canadien${L}*|belge${L}*|suisse${L}*|chinois${L}*|indien${L}*|japonais${L}*|france|émirats`),
];

// Négation : un repère de négation précède le terme dans la même proposition (avant . ; : ! ?).
const REPERE_NEGATION = re(`${deb}(?:aucun(?:e|s|es)?|ni|sans|jamais|pas|interdit(?:e|s|es)?|interdiction|exclu(?:t|e|s|es)?|ne saurait)${fin}`, 'iu');
// « ne prédit pas », « n'est pas » : le verbe nié disparaît du texte examiné (longueur conservée).
const VERBE_NIE = re(`${deb}n(?:e|['’]) ?(?:${L}+ ){0,2}?${L}+ (?:pas|jamais|plus)${fin}`);

function masquer(texte, motifs) {
  let t = texte;
  for (const m of motifs) t = t.replace(m, (x) => '_'.repeat(x.length));
  return t;
}

// La négation ne couvre que sa proposition : une virgule hors parenthèses entre le repère et le terme la coupe.
function estNie(phrase, idx) {
  const avant = phrase.slice(0, idx);
  const coupe = Math.max(avant.lastIndexOf('.'), avant.lastIndexOf(';'), avant.lastIndexOf(':'), avant.lastIndexOf('!'), avant.lastIndexOf('?'));
  const seg = avant.slice(coupe + 1).slice(-160);
  const reperes = new RegExp(REPERE_NEGATION.source, 'giu');
  for (const m of seg.matchAll(reperes)) {
    let profondeur = 0;
    let coupee = false;
    for (const c of seg.slice(m.index + m[0].length)) {
      if (c === '(') profondeur += 1;
      else if (c === ')') profondeur -= 1;
      else if (c === ',' && profondeur <= 0) { coupee = true; break; }
    }
    if (!coupee) return true;
  }
  return false;
}

function trouver(phrase, motif) {
  const res = [];
  const r = new RegExp(motif.source, motif.flags.includes('g') ? motif.flags : motif.flags + 'g');
  for (const m of phrase.matchAll(r)) if (m[0].length) res.push({ idx: m.index, texte: m[0] });
  return res;
}

// ---------------------------------------------------------------- textes visibles
export function textesVisibles(rapport) {
  const sortie = [];
  const parcourir = (valeur, chemin, idCourant) => {
    if (typeof valeur === 'string') {
      sortie.push({ id: chemin.join('/'), texte: valeur });
    } else if (Array.isArray(valeur)) {
      valeur.forEach((v, i) => {
        const cle = v && typeof v === 'object' && typeof v.id === 'string' ? v.id : String(i);
        parcourir(v, [...chemin, cle], cle);
      });
    } else if (valeur && typeof valeur === 'object') {
      for (const [k, v] of Object.entries(valeur)) {
        if (CLES_TECHNIQUES.has(k)) continue;
        parcourir(v, [...chemin, k], idCourant);
      }
    }
  };
  parcourir(rapport, [], '');
  return sortie;
}

const phrasesDe = (texte) => texte.split(/(?<=[.!?])\s+/).filter(Boolean);
const extrait = (s) => (s.length > 140 ? s.slice(0, 137) + '...' : s);

// ---------------------------------------------------------------- nombres
const NOMBRE = /(?<![\p{L}\d_.,])\d+(?:[.,]\d+)?(?![\p{L}\d_])/gu;
const canon = (s) => String(Number(s.replace(',', '.')));

function masquerNormes(texte, references) {
  const citables = references?.normes_citables_sans_annee ?? [];
  const motifs = citables.map((n) => new RegExp(`(?:normes? )?${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'giu'));
  return masquer(texte, motifs);
}

export function nombresDe(texte, references) {
  const t = masquerNormes(texte, references);
  const res = [];
  for (const m of t.matchAll(NOMBRE)) res.push({ brut: m[0], valeur: canon(m[0]), idx: m.index, avant: t.slice(Math.max(0, m.index - 24), m.index) });
  return res;
}

function nombresDesEntrees({ faits, cas, profils, references }) {
  const set = new Set();
  const visiter = (v) => {
    // Un fait peut être affiché arrondi à une ou deux décimales : l'arrondi reste traçable.
    if (typeof v === 'number') for (const x of [v, Number(v.toFixed(2)), Number(v.toFixed(1))]) set.add(String(x));
    else if (typeof v === 'string') for (const n of nombresDe(v, references)) set.add(n.valeur);
    else if (Array.isArray(v)) v.forEach(visiter);
    else if (v && typeof v === 'object') Object.values(v).forEach(visiter);
  };
  [faits, cas, profils].forEach((x) => x && visiter(x));
  for (const r of references?.references ?? []) if (typeof r.annee === 'number') set.add(String(r.annee));
  return set;
}

const CODES_VALIDES = new Set([...'NEOAC'].flatMap((d) => [1, 2, 3, 4, 5, 6].map((i) => d + i)));

// ---------------------------------------------------------------- références
function indexAuteurs(references) {
  const idx = []; // [nom, refId]
  for (const r of references?.references ?? []) for (const a of r.auteurs) idx.push([a, r.id]);
  idx.push(['GLOBE', 'house-2004'], ['Culture Map', 'meyer-2014']);
  return idx;
}

function citationsDe(texte, ctx) {
  const trouvees = []; // {refId|null, nom, annee|null}
  const parNom = new Map(ctx.auteurs.map(([n, id]) => [n, id]));
  for (const [nom, refId] of ctx.auteurs) {
    if (new RegExp(`${deb}${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${fin}`, 'u').test(texte)) trouvees.push({ refId, nom, annee: null });
  }
  const motifAnnee = /(?<![\p{L}])([A-ZÉ][\p{L}'’-]+)(?:\s+et\s+(?:[A-ZÉ][\p{L}'’-]+|al\.))?(?:\s*[,(]\s*|\s+)((?:1[5-9]|20)\d{2})(?!\d)/gu;
  for (const m of texte.matchAll(motifAnnee)) {
    const nom = m[1];
    if (ctx.exclus.has(nom)) continue;
    trouvees.push({ refId: parNom.get(nom) ?? null, nom, annee: Number(m[2]), inconnu: !parNom.has(nom) });
  }
  const motifAl = /(?<![\p{L}])([A-ZÉ][\p{L}'’-]+) et al\./gu;
  for (const m of texte.matchAll(motifAl)) {
    if (!parNom.has(m[1])) trouvees.push({ refId: null, nom: m[1], annee: null, inconnu: true });
  }
  return trouvees;
}

// ---------------------------------------------------------------- audit
/**
 * html (facultatif) : le HTML rendu du rapport. S'il est fourni, l'audit exige aussi que le statut de contrôle de
 * chaque référence soit VISIBLE dans la liste des références (ligne, colonne « Source contrôlée ») et que le bandeau
 * de tête annonce le nombre exact de références à contrôler tant qu'il en reste.
 */
export function auditer({ rapport, faits, cas, profils, references, html }) {
  const defauts = [];
  const ajouter = (categorie, id, ext, message) => defauts.push({ categorie, id, extrait: extrait(ext), message });
  const textes = textesVisibles(rapport);

  // 1. chiffres
  const autorises = nombresDesEntrees({ faits, cas, profils, references });
  const structurel = STRUCTUREL.entrees.map((e) => ({ valeur: canon(e.valeur), avant: e.avant ? new RegExp(e.avant, 'iu') : null }));
  for (const { id, texte } of textes) {
    for (const n of nombresDe(texte, references)) {
      if (autorises.has(n.valeur)) continue;
      if (structurel.some((s) => s.valeur === n.valeur && (!s.avant || s.avant.test(n.avant)))) continue;
      ajouter('chiffre_absent_des_entrees', id, texte.slice(Math.max(0, n.idx - 40), n.idx + 40), `nombre « ${n.brut} » absent des faits, du cas, des profils et de la liste structurelle`);
    }
    const masque = masquerNormes(texte, references);
    for (const m of masque.matchAll(/(?<![\p{L}\d_])([NEOAC]\d+)(?![\p{L}\d_])/gu)) {
      if (!CODES_VALIDES.has(m[1])) ajouter('chiffre_absent_des_entrees', id, texte.slice(Math.max(0, m.index - 40), m.index + 40), `code de facette inexistant « ${m[1]} »`);
    }
  }

  // personnes et vocabulaire national (catégorie 6)
  const personnes = cas?.personnes ?? [];
  const noms = new Set();
  for (const p of personnes) {
    noms.add(p.code);
    const nom = String(p.nom ?? '').replace(/\(.*?\)/g, '').trim();
    if (nom) { noms.add(nom); noms.add(nom.split(/\s+/)[0]); }
  }
  const motifPersonne = noms.size ? mot([...noms].map(echapper).join('|')) : null;
  const specifiques = [...(cas?.interculturel?.nationalites ?? []), cas?.organisation?.pays].filter(Boolean);
  const nationaux = [...NATIONAL_BASE];
  if (specifiques.length) nationaux.push(mot(specifiques.map(echapper).join('|')));

  const nonNees = (phrase, motifs, masquee) => {
    const hits = [];
    for (const motif of motifs) for (const h of trouver(masquee, motif)) if (!estNie(phrase, h.idx)) hits.push(h);
    return hits;
  };

  const ctxRefs = {
    auteurs: indexAuteurs(references),
    exclus: new Set([...MOIS, ...(cas?.interculturel?.sites ?? []), ...String(cas?.organisation?.nom ?? '').split(/\s+/), ...[...noms]]),
  };

  for (const { id, texte } of textes) {
    for (const phrase of phrasesDe(texte)) {
      const base = masquerNormes(phrase, references);
      const masquee = masquer(base, [VERBE_NIE]);
      const sansDiag = masquee.replace(/(jamais d.un|non un|ni d.un|pas un|n.est pas un) diagnostic/giu, (x) => '_'.repeat(x.length));

      // 2. lexique interdit
      for (const [nom, motif] of LEXIQUE) {
        for (const h of trouver(sansDiag, motif)) {
          if (!estNie(base, h.idx)) ajouter('terme_interdit', id, phrase, `terme interdit « ${h.texte} » (${nom})`);
        }
      }
      // 3. comparaison à une population
      for (const h of nonNees(base, COMPARAISON_POPULATION, masquee)) ajouter('comparaison_population', id, phrase, `comparaison à une population : « ${h.texte} »`);

      // 4. pourcentage de compatibilité
      for (const h of trouver(masquee, COMPAT_MOT)) if (!estNie(base, h.idx)) ajouter('pourcentage_compatibilite', id, phrase, `mot « ${h.texte} » hors négation`);
      for (const p of trouver(masquee, POURCENT)) {
        for (const c of trouver(masquee, COMPAT_PROX)) {
          if (Math.abs(c.idx - p.idx) <= 60 && !estNie(base, p.idx)) { ajouter('pourcentage_compatibilite', id, phrase, `pourcentage « ${p.texte} » près de « ${c.texte} »`); break; }
        }
      }

      // 5. décision d'emploi
      for (const h of nonNees(base, DECISION_EMPLOI, masquee)) ajouter('decision_emploi', id, phrase, `décision d'emploi : « ${h.texte} »`);

      // 6. moyenne nationale rattachée à une personne
      if (motifPersonne && trouver(masquee, new RegExp(motifPersonne.source, 'giu')).length) {
        for (const h of nonNees(base, nationaux, masquee)) ajouter('moyenne_nationale_a_personne', id, phrase, `personne et notion nationale dans la même phrase : « ${h.texte} »`);
      }
    }
  }

  // références
  const autorisees = new Map((references?.references ?? []).map((r) => [r.id, r]));
  const dansRapport = new Map((rapport?.references ?? []).map((r) => [r.id, r]));
  for (const r of rapport?.references ?? []) {
    if (!autorisees.has(r.id)) ajouter('references', `references/${r.id}`, r.citation ?? r.id, 'référence hors de la liste autorisée');
    if (r.statut !== STATUT_SOURCE_A_CONTROLER && r.statut !== STATUT_SOURCE_CONTROLEE) {
      ajouter('references', `references/${r.id}`, r.citation ?? r.id, `statut de contrôle de la source absent ou invalide (« ${STATUT_SOURCE_A_CONTROLER} » ou « ${STATUT_SOURCE_CONTROLEE} » attendu)`);
    } else if (r.statut === STATUT_SOURCE_CONTROLEE) {
      if (!sourceControlee(r)) ajouter('references', `references/${r.id}`, r.citation ?? r.id, 'source contrôlée sans contrôleur nommé ou sans date ISO');
      else if (autorisees.has(r.id) && !sourceControlee(autorisees.get(r.id))) ajouter('references', `references/${r.id}`, r.citation ?? r.id, 'contrôle revendiqué par le rapport mais absent du registre des références autorisées');
    } else if (autorisees.has(r.id) && sourceControlee(autorisees.get(r.id))) {
      ajouter('references', `references/${r.id}`, r.citation ?? r.id, 'source contrôlée dans le registre mais présentée « à contrôler » dans le rapport');
    }
  }
  if (typeof html === 'string') {
    const aControler = (rapport?.references ?? []).filter((r) => !sourceControlee(r));
    const bandeau = /<div class="bandeau[^"]*" id="bandeau-relecture"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
    if (!bandeau) ajouter('references', 'rendu/bandeau', 'bandeau de relecture', 'bandeau de relecture absent du rendu');
    else if (aControler.length) {
      const attendu = `${aControler.length} référence${aControler.length > 1 ? 's' : ''} à contrôler`;
      if (!bandeau.includes(attendu)) ajouter('references', 'rendu/bandeau', bandeau.replace(/<[^>]+>/g, ''), `bandeau sans le compteur « ${attendu} »`);
    }
    if ((rapport?.references ?? []).length && !/<th[^>]*>Source contrôlée<\/th>/.test(html)) ajouter('references', 'rendu/references', 'liste des références', 'colonne « Source contrôlée » absente de la liste des références');
    for (const r of rapport?.references ?? []) {
      const ligne = new RegExp(`<tr id="ref-${r.id.replace(/[^A-Za-z0-9_-]/g, '_')}"[^>]*>([^]*?)</tr>`).exec(html)?.[1] ?? '';
      const attendu = sourceControlee(r) ? 'oui' : 'non';
      if (!ligne.includes(`data-controle="${attendu}"`)) ajouter('references', `rendu/references/${r.id}`, r.citation ?? r.id, `statut de contrôle « ${attendu === 'oui' ? 'contrôlée' : 'à contrôler'} » non visible dans la liste des références`);
    }
  }
  for (const { id, texte } of textes) {
    const dansListe = id.startsWith('references/');
    for (const c of citationsDe(texte, ctxRefs)) {
      if (c.inconnu || !c.refId) { ajouter('references', id, texte, `citation hors de la liste autorisée : « ${c.nom}${c.annee ? ', ' + c.annee : ''} »`); continue; }
      const ref = autorisees.get(c.refId);
      if (c.annee !== null && ref && ref.annee !== c.annee) ajouter('references', id, texte, `année « ${c.annee} » différente de la référence autorisée « ${c.nom} »${ref.annee ? ' (' + ref.annee + ')' : ' (sans année)'}`);
      if (!dansListe && !dansRapport.has(c.refId)) ajouter('references', id, texte, `référence « ${c.nom} » citée sans figurer dans references du rapport`);
    }
  }
  for (const rec of rapport?.recommandations ?? []) {
    const rid = rec?.preuve?.reference_id;
    if (rid) {
      if (!autorisees.has(rid)) ajouter('references', `recommandations/${rec.id}/preuve`, rid, 'reference_id hors de la liste autorisée');
      else if (!dansRapport.has(rid)) ajouter('references', `recommandations/${rec.id}/preuve`, rid, 'reference_id absent de references du rapport');
    }
  }

  // structure
  const vide = (v) => typeof v !== 'string' || v.trim() === '';
  for (const rec of rapport?.recommandations ?? []) {
    for (const k of ['donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
      if (vide(rec?.[k])) ajouter('structure', `recommandations/${rec?.id}/${k}`, String(rec?.texte ?? ''), `attribut « ${k} » vide ou absent`);
    }
    const niv = rec?.preuve?.niveau;
    if (niv !== 'source' && niv !== 'hypothese') ajouter('structure', `recommandations/${rec?.id}/preuve.niveau`, String(rec?.texte ?? ''), 'attribut « preuve.niveau » vide ou invalide');
    if (niv === 'source' && !rec?.preuve?.reference_id) ajouter('structure', `recommandations/${rec?.id}/preuve`, String(rec?.texte ?? ''), 'preuve de niveau source sans reference_id');
  }
  const presents = new Set();
  for (const n of rapport?.niveaux ?? []) {
    presents.add(n?.id);
    for (const s of n?.sections ?? []) for (const p of s?.paragraphes ?? []) {
      if (p?.statut !== 'constate' && p?.statut !== 'hypothese') ajouter('structure', `${n.id}/${s.id}/${p?.id}`, String(p?.texte ?? ''), 'statut du paragraphe absent ou invalide');
      if (p?.statut === 'hypothese') {
        if (!['faible', 'moyenne', 'elevee'].includes(p?.confiance)) ajouter('structure', `${n.id}/${s.id}/${p?.id}`, String(p?.texte ?? ''), 'hypothèse sans confiance valide');
        if (vide(p?.verification)) ajouter('structure', `${n.id}/${s.id}/${p?.id}`, String(p?.texte ?? ''), 'hypothèse sans vérification');
      }
    }
  }
  for (const n of NIVEAUX_REQUIS) if (!presents.has(n)) ajouter('structure', n, n, `niveau « ${n} » absent du rapport`);

  const comptes = Object.fromEntries([...CATEGORIES, ...COMPLEMENTS].map((c) => [c, 0]));
  for (const d of defauts) comptes[d.categorie] += 1;
  return { defauts, comptes };
}
