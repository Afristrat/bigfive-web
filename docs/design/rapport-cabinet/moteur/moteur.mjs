// Moteur déterministe du rapport « cabinet » (mandat § 4.4) : aucun modèle, aucune date, aucun aléa.
// Même entrée (cas, profils, règles) = même sortie, octet pour octet.
// Conventions de niveaux, d'écarts et de dispersion : bases-rapports-individuel-et-binome.md § 7.2.
// Tensions internes : § 7.4 (seuil de 1,5 : choix du moteur, voir regles.json et le rapport de livraison).
import { createHash } from 'node:crypto';

export const VERSION_MOTEUR = 'm-1.0';
export const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
export const NIVEAUX = ['bas', 'plutot_bas', 'milieu', 'plutot_haut', 'haut'];
export const FACETTES = DOMAINES.flatMap((d) => [1, 2, 3, 4, 5, 6].map((f) => d + f));
export const CODES = ['AM', 'KB', 'SR', 'HT'];

export const STRUCTURES = ['structure simple', 'bureaucratie mécaniste', 'bureaucratie professionnelle', 'forme divisionnalisée', 'adhocratie'];
export const CULTURES = ['clan', 'adhocratie', 'marché', 'hiérarchie'];
export const ORIENTATIONS = ['exploration', 'exploitation', 'redressement', 'croissance', 'conformite'];
export const TYPES_CONTRAINTE = ['budget', 'delai', 'reglementation', 'ressources', 'culture', 'heritage', 'syndical'];
export const DURETES = ['dure', 'negociable'];
export const NATURES = ['ligne', 'fonctionnel', 'pairs', 'client-fournisseur', 'mentorat', 'co-direction'];
export const SENS = ['a->b', 'b->a', 'reciproque'];
export const INTERDEPENDANCES = ['mise-en-commun', 'sequentielle', 'reciproque'];
export const NATURES_TACHE = ['routine', 'creative', 'urgence', 'projet'];
const NIVEAUX_CONSENTEMENT = ['individuel', 'binome', 'equipe', 'organisation'];
const AVERTISSEMENT = 'conventions non calibrées, aucune norme de population';
const NIVEAU_FR = { bas: 'bas', plutot_bas: 'plutôt bas', milieu: 'milieu', plutot_haut: 'plutôt haut', haut: 'haut' };

export const SEUILS_DEFAUT = {
  niveaux: { bas: 2.0, plutot_bas: 2.6, milieu: 3.4, plutot_haut: 4.0 },
  ecarts: { proche: 0.5, notable: 1.0 },
  dispersion: { homogene: 0.5, diverse: 1.0 },
  tension: { ecart_min: 1.5 },
  contribution: { n_max: 5 },
  anonymat: { seuil: 5 }
};

// ---------- Utilitaires numériques ----------
// Arrondi à 6 décimales avant toute comparaison à un seuil : 83/24 - 71/24 ne doit pas passer sous 0,5 par erreur de flottant.
const proche = (x) => Math.round(x * 1e6) / 1e6;
const arr = (x) => Number(proche(x).toFixed(4));
const fr = (x) => x.toFixed(2).replace('.', ',');
const ordre = (d) => [1, 2, 3, 4, 5, 6].map((f) => d + f);
const maj = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ---------- Niveaux, écarts, dispersion ----------
export function niveau(m, s = SEUILS_DEFAUT.niveaux) {
  m = proche(m);
  if (m < s.bas) return 'bas';
  if (m < s.plutot_bas) return 'plutot_bas';
  if (m < s.milieu) return 'milieu';
  if (m < s.plutot_haut) return 'plutot_haut';
  return 'haut';
}

export function ecart(d, s = SEUILS_DEFAUT.ecarts) {
  const a = proche(Math.abs(d));
  if (a <= s.proche) return 'proche';
  if (a >= s.notable) return 'notable';
  return 'intermediaire';
}

export function dispersion(d, s = SEUILS_DEFAUT.dispersion) {
  d = proche(d);
  if (d <= s.homogene) return 'homogene';
  if (d >= s.diverse) return 'diverse';
  return 'intermediaire';
}

export function seuilAtteint(n, seuil) {
  return n >= seuil;
}

// Tensions internes : deux facettes d'un même domaine dont l'écart absolu atteint le seuil.
export function tensions(facettes, seuils = SEUILS_DEFAUT) {
  const t = seuils.tension;
  const sortie = [];
  for (const d of DOMAINES) {
    const ks = ordre(d);
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const ecartAbs = proche(Math.abs(facettes[ks[i]] - facettes[ks[j]]));
        if (ecartAbs >= t.ecart_min) {
          sortie.push({ id: `${ks[i]}-${ks[j]}`, domaine: d, facettes: [ks[i], ks[j]], ecart: arr(ecartAbs), regle: `TENS-${d}` });
        }
      }
    }
  }
  return sortie;
}

// ---------- Empreinte ----------
export function canonique(x) {
  if (Array.isArray(x)) return `[${x.map(canonique).join(',')}]`;
  if (x && typeof x === 'object') return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${canonique(x[k])}`).join(',')}}`;
  return JSON.stringify(x);
}
export const empreinte = (x) => createHash('sha256').update(canonique(x)).digest('hex');

// ---------- Validation du cas et des règles ----------
export function validerCas(cas, profils) {
  const e = [];
  if (!cas || typeof cas !== 'object') return ['cas absent'];
  if (typeof cas.fictif !== 'boolean') e.push('le champ fictif (booléen) est obligatoire');
  const o = cas.organisation ?? {};
  if (!STRUCTURES.includes(o.structure)) e.push(`structure inconnue : ${o.structure}`);
  if (!CULTURES.includes(o.culture)) e.push(`culture inconnue : ${o.culture}`);
  if (!ORIENTATIONS.includes(cas.strategie?.orientation)) e.push(`orientation inconnue : ${cas.strategie?.orientation}`);
  for (const c of cas.contraintes ?? []) {
    if (!DURETES.includes(c.durete)) e.push(`dureté inconnue pour ${c.id} : ${c.durete}`);
    if (!TYPES_CONTRAINTE.includes(c.type)) e.push(`type de contrainte inconnu pour ${c.id} : ${c.type}`);
  }
  if (!NATURES_TACHE.includes(cas.tache?.nature)) e.push(`nature de la tâche inconnue : ${cas.tache?.nature}`);

  const ic = cas.interculturel ?? {};
  if (ic.actif === true) {
    if (!Array.isArray(ic.sites) || ic.sites.length === 0) e.push('interculturel actif sans site');
    if (!Array.isArray(ic.langues_travail) || ic.langues_travail.length === 0) e.push('interculturel actif sans langue de travail');
    for (const k of ['culture_maison_mere', 'culture_locale']) if (ic[k] !== undefined && !CULTURES.includes(ic[k])) e.push(`${k} hors liste : ${ic[k]}`);
  }

  const personnes = cas.personnes ?? [];
  if (personnes.length !== CODES.length) e.push(`${CODES.length} personnes attendues (${CODES.join(', ')}), ${personnes.length} trouvées`);
  const vus = new Set();
  for (const p of personnes) {
    if (!CODES.includes(p.code)) e.push(`code de personne inconnu : ${p.code}`);
    if (vus.has(p.code)) e.push(`code de personne en doublon : ${p.code} (chaque code doit être unique)`);
    vus.add(p.code);
    for (const n of NIVEAUX_CONSENTEMENT) {
      if (typeof p.consentements?.[n] !== 'boolean') e.push(`consentement manquant ou non booléen pour ${p.code} : ${n}`);
    }
    if (ic.actif === true && !(ic.langues_travail ?? []).includes(p.langue_passation)) {
      e.push(`langue de passation de ${p.code} (${p.langue_passation}) absente des langues de travail`);
    }
  }
  for (const c of CODES) if (!vus.has(c)) e.push(`personne ${c} absente`);

  const attendues = (personnes.length * (personnes.length - 1)) / 2;
  const relations = cas.relations ?? [];
  if (relations.length !== attendues) e.push(`exactement ${attendues} relations pour ${personnes.length} personnes (une par paire), ${relations.length} trouvées`);
  const paires = new Set();
  for (const r of relations) {
    for (const c of [r.a, r.b]) if (!vus.has(c)) e.push(`code inconnu ${c} dans la relation ${r.id}`);
    if (r.a === r.b) e.push(`relation ${r.id} : les deux personnes doivent être distinctes, une personne ne peut pas être en relation avec elle-même`);
    if (r.id !== `${r.a}-${r.b}`) e.push(`relation ${r.id} : id attendu ${r.a}-${r.b}`);
    const cle = [r.a, r.b].sort().join('-');
    if (paires.has(cle)) e.push(`paire en double : ${cle}`);
    paires.add(cle);
    if (!NATURES.includes(r.nature)) e.push(`nature inconnue « ${r.nature} » dans la relation ${r.id}`);
    if (!SENS.includes(r.sens)) e.push(`sens inconnu « ${r.sens} » dans la relation ${r.id}`);
    if (!INTERDEPENDANCES.includes(r.interdependance)) e.push(`interdépendance inconnue « ${r.interdependance} » dans la relation ${r.id}`);
  }
  for (let i = 0; i < CODES.length; i++) {
    for (let j = i + 1; j < CODES.length; j++) {
      const cle = `${CODES[i]}-${CODES[j]}`;
      if (!paires.has(cle) && !paires.has(`${CODES[j]}-${CODES[i]}`)) e.push(`paire manquante : ${cle}`);
    }
  }

  const parCode = new Map((Array.isArray(profils) ? profils : []).map((p) => [p.code, p]));
  for (const c of CODES) {
    const p = parCode.get(c);
    if (!p) { e.push(`profil ${c} absent`); continue; }
    let facettesOk = true;
    for (const k of FACETTES) {
      const v = p.facette?.[k];
      if (typeof v !== 'number' || v < 1 || v > 5) { e.push(`profil ${c} : facette ${k} absente ou hors de 1 à 5`); facettesOk = false; }
    }
    for (const d of DOMAINES) {
      const s = p.domaine?.[d];
      if (typeof s !== 'number' || s < 24 || s > 120) { e.push(`profil ${c} : score de domaine ${d} absent ou hors de 24 à 120`); continue; }
      if (facettesOk) {
        const moy = ordre(d).reduce((a, k) => a + p.facette[k], 0) / 6;
        if (Math.abs(s / 24 - moy) > 1e-6) e.push(`profil ${c} : domaine ${d} incohérent avec ses facettes`);
      }
    }
  }
  return e;
}

// Identifiants de règles que le moteur appelle : chacun doit exister dans regles.json.
export function reglesRequises() {
  return [
    ...NIVEAUX.map((n) => `NIV-${n}`),
    'ECART-proche', 'ECART-intermediaire', 'ECART-notable',
    'DISP-homogene', 'DISP-intermediaire', 'DISP-diverse',
    ...DOMAINES.map((d) => `TENS-${d}`),
    'CONTRIB-1',
    ...NATURES.map((n) => `CAL-NAT-${n}`),
    'CAL-SENS-asymetrique', 'CAL-SENS-reciproque',
    ...INTERDEPENDANCES.map((n) => `CAL-INT-${n}`),
    ...NATURES_TACHE.map((n) => `CAL-TACHE-${n}`),
    ...ORIENTATIONS.map((n) => `CAL-ORI-${n}`),
    'CAL-DURETE-dure', 'CAL-DURETE-negociable', 'CAL-IC-PASSATION',
    ...STRUCTURES.map((n) => `ADEQ-STRUCT-${n}`),
    ...CULTURES.map((n) => `ADEQ-CULT-${n}`),
    ...TYPES_CONTRAINTE.map((n) => `CONTR-${n}`),
    'IC-SITES', 'IC-LANGUES', 'IC-SIEGE', 'IC-EXPATRIES', 'IC-FUSEAUX', 'IC-CULTURES', 'IC-PASSATION',
    ...NIVEAUX_CONSENTEMENT.map((n) => `CONS-${n.toUpperCase()}`),
    'SEUIL-ANONYMAT', 'SEUIL-DEROGATION',
    'GARDE-NATIONALE', 'GARDE-EMPLOI', 'GARDE-POPULATION'
  ];
}

export function verifierRegles(regles) {
  const e = [];
  const liste = regles?.regles;
  if (!Array.isArray(liste)) return ['regles.json : tableau « regles » absent'];
  const ids = new Set();
  for (const r of liste) {
    if (ids.has(r.id)) e.push(`règle en double : ${r.id}`);
    ids.add(r.id);
    for (const champ of ['id', 'famille', 'declencheur', 'texte']) if (typeof r[champ] !== 'string' || !r[champ]) e.push(`règle ${r.id} : champ « ${champ} » absent`);
  }
  for (const id of reglesRequises()) if (!ids.has(id)) e.push(`règle requise absente : ${id}`);
  const s = regles.seuils;
  const nombres = [s?.niveaux?.bas, s?.niveaux?.plutot_bas, s?.niveaux?.milieu, s?.niveaux?.plutot_haut, s?.ecarts?.proche, s?.ecarts?.notable, s?.dispersion?.homogene, s?.dispersion?.diverse, s?.tension?.ecart_min, s?.contribution?.n_max, s?.anonymat?.seuil];
  if (nombres.some((x) => typeof x !== 'number' || Number.isNaN(x))) e.push('seuils : valeur numérique manquante');
  else {
    const n = s.niveaux;
    if (!(n.bas < n.plutot_bas && n.plutot_bas < n.milieu && n.milieu < n.plutot_haut)) e.push('seuils de niveaux : ordre croissant requis');
    if (!(s.ecarts.proche < s.ecarts.notable)) e.push('seuils d\'écarts : proche < notable requis');
    if (!(s.dispersion.homogene < s.dispersion.diverse)) e.push('seuils de dispersion : homogène < diverse requis');
  }
  for (const r of liste) {
    if (['calibrage', 'adequation', 'contrainte', 'interculturel'].includes(r.famille) && !(Array.isArray(r.critere) && r.critere.length > 0)) e.push(`règle ${r.id} : critère absent`);
  }
  return e;
}

// ---------- Critères de règles ----------
const lire = (objet, chemin) => chemin.split('.').reduce((o, k) => (o == null ? undefined : o[k]), objet);

function critereOk(critere, ctx) {
  return critere.every(({ chemin, op, valeur }) => {
    const v = lire(ctx, chemin);
    switch (op) {
      case 'eq': return v === valeur;
      case 'ne': return v !== valeur;
      case 'gte': return typeof v === 'number' && v >= valeur;
      case 'nonvide': return typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) ? v.length > 0 : v != null;
      default: throw new Error(`Opérateur de critère inconnu : ${op}`);
    }
  });
}

function gabarit(texte, vars) {
  return texte.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`Variable de déclencheur inconnue : {${k}}`);
    return String(vars[k]);
  });
}

const CLASSES = ['proche', 'intermediaire', 'notable'];
const POIDS = ['limité', 'modéré', 'élevé'];
function poids(regle, classes) {
  const d = regle.domaines_pertinents;
  if (!Array.isArray(d) || d.length === 0) return 'contextuel';
  return POIDS[Math.max(...d.map((x) => CLASSES.indexOf(classes[x])))];
}

function contexteCommun(cas, consentantsOrg) {
  const ic = cas.interculturel ?? {};
  const dures = cas.contraintes.filter((c) => c.durete === 'dure').map((c) => c.id);
  const negociables = cas.contraintes.filter((c) => c.durete === 'negociable').map((c) => c.id);
  const langues = [...new Set(consentantsOrg.map((p) => p.langue_passation))];
  return {
    calcule: {
      nb_contraintes_dures: dures.length,
      nb_contraintes_negociables: negociables.length,
      n_sites: (ic.sites ?? []).length,
      n_langues_travail: (ic.langues_travail ?? []).length,
      n_fuseaux: (ic.fuseaux ?? []).length,
      cultures_differentes: ic.culture_maison_mere !== undefined && ic.culture_maison_mere !== ic.culture_locale,
      n_langues_passation: langues.length
    },
    vars: {
      contraintes_dures: dures.join(', '),
      contraintes_negociables: negociables.join(', '),
      n_sites: (ic.sites ?? []).length,
      n_langues_travail: (ic.langues_travail ?? []).length,
      n_fuseaux: (ic.fuseaux ?? []).length,
      culture_maison_mere: ic.culture_maison_mere ?? '',
      culture_locale: ic.culture_locale ?? '',
      langues_passation: consentantsOrg.map((p) => `${p.code} ${p.langue_passation}`).join(', '),
      langue_a: '',
      langue_b: ''
    }
  };
}

// Calibrage d'une relation : règles dont le critère est vérifié, avec un poids déduit des domaines pertinents.
export function calibrerRelation(relation, cas, classes, regles, consentantsOrg = cas.personnes) {
  const commun = contexteCommun(cas, consentantsOrg);
  const parCode = Object.fromEntries(cas.personnes.map((p) => [p.code, p]));
  const la = parCode[relation.a].langue_passation;
  const lb = parCode[relation.b].langue_passation;
  const ctx = {
    relation, tache: cas.tache, strategie: cas.strategie, organisation: cas.organisation, interculturel: cas.interculturel,
    calcule: { ...commun.calcule, sens_asymetrique: relation.sens !== 'reciproque', langues_passation_differentes: la !== lb }
  };
  const vars = { ...commun.vars, langue_a: la, langue_b: lb };
  return regles.regles
    .filter((r) => r.famille === 'calibrage' && (r.portee ?? []).includes('relation') && critereOk(r.critere, ctx))
    .map((r) => ({ id: r.id, declencheur: gabarit(r.declencheur, vars), poids: poids(r, classes) }));
}

// ---------- Calcul principal ----------
function profilPersonne(profil, seuils) {
  const domaines = {};
  const domMoy = {};
  for (const d of DOMAINES) {
    const score = profil.domaine[d];
    const moy = score / 24;
    domMoy[d] = moy;
    domaines[d] = { score, moy: arr(moy), niveau: niveau(moy, seuils.niveaux) };
  }
  const facettes = {};
  for (const k of FACETTES) {
    const n = niveau(profil.facette[k], seuils.niveaux);
    facettes[k] = { moy: arr(profil.facette[k]), niveau: n, bloc_id: `${k}/${n}` };
  }
  const tens = tensions(profil.facette, seuils);
  const extremes = FACETTES
    .filter((k) => ['bas', 'haut'].includes(facettes[k].niveau))
    .sort((x, y) => Math.abs(profil.facette[y] - 3) - Math.abs(profil.facette[x] - 3));
  const enTension = new Set(tens.flatMap((t) => t.facettes));
  return {
    domMoy,
    sortie: {
      domaines,
      facettes,
      tensions: tens,
      contribution: {
        points_forts_hypothese: extremes.slice(0, seuils.contribution.n_max),
        couts_hypothese: FACETTES.filter((k) => enTension.has(k))
      }
    }
  };
}

function analyserEquipe(membres, seuils) {
  if (membres.length < 2) {
    return { n_personnes: membres.length, domaines: null, facettes_diverses: [], facettes_homogenes: [], facettes_etendue: {}, couverture: {} };
  }
  const domaines = {};
  const couverture = {};
  for (const d of DOMAINES) {
    const valeurs = membres.map((m) => m.calc.domMoy[d]);
    const min = Math.min(...valeurs);
    const max = Math.max(...valeurs);
    const etendue = max - min;
    domaines[d] = { min: arr(min), max: arr(max), etendue: arr(etendue), dispersion: dispersion(etendue, seuils.dispersion) };
    const niv = (m) => niveau(m.calc.domMoy[d], seuils.niveaux);
    couverture[d] = {
      hauts: membres.filter((m) => ['plutot_haut', 'haut'].includes(niv(m))).map((m) => m.code),
      bas: membres.filter((m) => ['bas', 'plutot_bas'].includes(niv(m))).map((m) => m.code)
    };
  }
  const facettesEtendue = {};
  const diverses = [];
  const homogenes = [];
  for (const k of FACETTES) {
    const v = membres.map((m) => m.profil.facette[k]);
    const etendue = Math.max(...v) - Math.min(...v);
    facettesEtendue[k] = arr(etendue);
    const disp = dispersion(etendue, seuils.dispersion);
    if (disp === 'diverse') diverses.push(k);
    if (disp === 'homogene') homogenes.push(k);
  }
  return { n_personnes: membres.length, domaines, facettes_diverses: diverses, facettes_homogenes: homogenes, facettes_etendue: facettesEtendue, couverture };
}

function agreger(membres, seuils) {
  const domaines = {};
  const repartition = {};
  for (const d of DOMAINES) {
    const moy = membres.reduce((a, m) => a + m.calc.domMoy[d], 0) / membres.length;
    domaines[d] = { moy: arr(moy), niveau: niveau(moy, seuils.niveaux) };
    repartition[d] = Object.fromEntries(NIVEAUX.map((n) => [n, membres.filter((m) => niveau(m.calc.domMoy[d], seuils.niveaux) === n).length]));
  }
  return { n_personnes: membres.length, domaines, repartition };
}

function faitsDomaines(regle, agregats) {
  return ` Faits : ${regle.domaines_pertinents.map((d) => `domaine ${d}, niveau ${NIVEAU_FR[agregats.domaines[d].niveau]} (valeur d'équipe ${fr(agregats.domaines[d].moy)})`).join(' ; ')}.`;
}

function adequation(cas, regles, agregats, consentantsOrg) {
  const commun = contexteCommun(cas, consentantsOrg);
  const ctx = { tache: cas.tache, strategie: cas.strategie, organisation: cas.organisation, interculturel: cas.interculturel, calcule: commun.calcule };
  const sortie = [];
  for (const r of regles.regles) {
    if (!['calibrage', 'adequation', 'interculturel'].includes(r.famille) || !(r.portee ?? []).includes('organisation')) continue;
    if (!critereOk(r.critere, ctx)) continue;
    const avecDomaines = Array.isArray(r.domaines_pertinents) && r.domaines_pertinents.length > 0;
    if (avecDomaines && !agregats) continue;
    sortie.push({ regle: r.id, lecture: `${maj(gabarit(r.declencheur, commun.vars))}. ${r.texte}${avecDomaines ? faitsDomaines(r, agregats) : ''}` });
  }
  for (const c of cas.contraintes) {
    const r = regles.regles.find((x) => x.famille === 'contrainte' && critereOk(x.critere, { contrainte: c }));
    if (r) sortie.push({ regle: r.id, contrainte: c.id, lecture: `${c.libelle} (dureté : ${c.durete === 'dure' ? 'dure' : 'négociable'}). ${r.texte}` });
  }
  return sortie;
}

export function calculer(cas, profils, regles, meta = {}) {
  const erreursCas = validerCas(cas, profils);
  if (erreursCas.length > 0) throw new Error(`Cas invalide : ${erreursCas.join(' ; ')}`);
  const erreursRegles = verifierRegles(regles);
  if (erreursRegles.length > 0) throw new Error(`Règles invalides : ${erreursRegles.join(' ; ')}`);

  const seuils = regles.seuils;
  const parCodeProfil = Object.fromEntries(profils.map((p) => [p.code, p]));
  const membres = cas.personnes.map((p) => ({ ...p, profil: parCodeProfil[p.code], calc: profilPersonne(parCodeProfil[p.code], seuils) }));
  const parCode = Object.fromEntries(membres.map((m) => [m.code, m]));

  const consentantsOrg = membres.filter((p) => p.consentements.organisation);
  const bloquants = [];
  const bloquer = (niveauRapport, cible, personnes, regle) => bloquants.push({ niveau: niveauRapport, cible, personnes, regle });

  // Individuel
  const personnes = {};
  for (const p of membres) {
    if (p.consentements.individuel) personnes[p.code] = p.calc.sortie;
    else bloquer('individuel', p.code, [p.code], 'CONS-INDIVIDUEL');
  }

  // Relations (double consentement)
  const relations = [];
  for (const r of cas.relations) {
    const pa = parCode[r.a];
    const pb = parCode[r.b];
    const manquants = [pa, pb].filter((p) => !p.consentements.binome).map((p) => p.code);
    if (manquants.length > 0) { bloquer('binome', r.id, manquants, 'CONS-BINOME'); continue; }
    const domaines = DOMAINES.map((d) => {
      const delta = pa.calc.domMoy[d] - pb.calc.domMoy[d];
      return { d, ecart: arr(Math.abs(delta)), classe: ecart(delta, seuils.ecarts) };
    });
    const notables = FACETTES
      .map((k) => ({ k, delta: Math.abs(pa.profil.facette[k] - pb.profil.facette[k]) }))
      .filter((x) => ecart(x.delta, seuils.ecarts) === 'notable')
      .sort((x, y) => y.delta - x.delta)
      .map((x) => ({ k: x.k, ecart: arr(x.delta), niveau_a: pa.calc.sortie.facettes[x.k].niveau, niveau_b: pb.calc.sortie.facettes[x.k].niveau }));
    const classes = Object.fromEntries(domaines.map((x) => [x.d, x.classe]));
    relations.push({
      id: r.id, a: r.a, b: r.b, nature: r.nature, sens: r.sens, interdependance: r.interdependance,
      domaines,
      facettes_notables: notables,
      calibrage: { regles: calibrerRelation(r, cas, classes, regles, consentantsOrg) }
    });
  }

  // Équipe
  const equipe = membres.filter((p) => p.consentements.equipe);
  for (const p of membres) if (!p.consentements.equipe) bloquer('equipe', p.code, [p.code], 'CONS-EQUIPE');

  // Organisation
  for (const p of membres) if (!p.consentements.organisation) bloquer('organisation', p.code, [p.code], 'CONS-ORGANISATION');
  const seuil = seuils.anonymat.seuil;
  const atteint = seuilAtteint(consentantsOrg.length, seuil);
  const fictif = cas.fictif === true;
  const derogation = !atteint && fictif && consentantsOrg.length === membres.length;
  const montrer = (atteint || derogation) && consentantsOrg.length > 0;
  const agregats = montrer ? agreger(consentantsOrg, seuils) : null;

  return {
    version_moteur: VERSION_MOTEUR,
    bibliotheque: meta.bibliotheque ?? { version: null, empreinte: null },
    empreinte_entrees: empreinte({ cas, profils, regles }),
    conventions: {
      niveaux: {
        bas: { min: 1, max_exclu: seuils.niveaux.bas, regle: 'NIV-bas' },
        plutot_bas: { min: seuils.niveaux.bas, max_exclu: seuils.niveaux.plutot_bas, regle: 'NIV-plutot_bas' },
        milieu: { min: seuils.niveaux.plutot_bas, max_exclu: seuils.niveaux.milieu, regle: 'NIV-milieu' },
        plutot_haut: { min: seuils.niveaux.milieu, max_exclu: seuils.niveaux.plutot_haut, regle: 'NIV-plutot_haut' },
        haut: { min: seuils.niveaux.plutot_haut, max: 5, regle: 'NIV-haut' }
      },
      ecarts: { proche_max: seuils.ecarts.proche, notable_min: seuils.ecarts.notable, regles: ['ECART-proche', 'ECART-intermediaire', 'ECART-notable'] },
      dispersion: { homogene_max: seuils.dispersion.homogene, diverse_min: seuils.dispersion.diverse, regles: ['DISP-homogene', 'DISP-intermediaire', 'DISP-diverse'] },
      tension: { ecart_min: seuils.tension.ecart_min },
      avertissement: AVERTISSEMENT,
      gardes: regles.regles.filter((r) => r.famille === 'garde').map((r) => r.id)
    },
    personnes,
    relations,
    equipe: analyserEquipe(equipe, seuils),
    organisation: {
      n_personnes: consentantsOrg.length,
      seuil_anonymat: seuil,
      seuil_atteint: atteint,
      derogation_demonstration: derogation
        ? `Agrégat montré malgré un effectif de ${consentantsOrg.length} personnes, inférieur au seuil de ${seuil}, uniquement parce que le cas est fictif et consenti. Cette dérogation ne s'applique à aucune organisation réelle.`
        : null,
      agregats,
      adequation: adequation(cas, regles, agregats, consentantsOrg)
    },
    consentements: { bloquants }
  };
}
