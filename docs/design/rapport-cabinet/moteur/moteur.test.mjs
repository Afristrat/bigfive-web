// Tests du moteur déterministe (node --test "docs/design/rapport-cabinet/moteur/*.test.mjs").
// Principe : une liste de contrôles nommés (CONTROLES) s'exécute contre le vrai moteur (tout doit passer)
// puis contre des mutants (une valeur de seuil ou une règle modifiée : au moins un contrôle doit échouer).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as moteurReel from './moteur.mjs';
import { ajouterReseau } from './reseau.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const lire = (...p) => fs.readFileSync(path.join(ici, ...p), 'utf-8');
const SRC_MOTEUR = lire('moteur.mjs');
const TXT_REGLES = lire('regles.json');
const CAS = JSON.parse(lire('..', 'cas', 'cas-demo.json'));
const PROFILS = JSON.parse(lire('..', '..', 'profils-fictifs', 'profils.json'));
const REGLES = JSON.parse(TXT_REGLES);
const META = { bibliotheque: { version: 'bib-test', empreinte: 'abc123' } };
const clone = (x) => structuredClone(x);

// Lexique interdit (bases 8.1, règle 4) appliqué aux textes de règles et aux faits produits
const MOTS_INTERDITS = ['moyenne', 'norme', 'normes', 'percentile', 'meilleur', 'meilleure', 'pire', 'bon score', 'mauvais score', 'faible', 'faibles', 'fort', 'forte', 'forts', 'fortes', 'diagnostic', 'trouble', 'troubles', 'aptitude', 'aptitudes', 'compétence', 'compétences', 'prédit', 'prédire', 'prédiction', 'garantit', 'vous êtes', 'compatibilité', 'introverti', 'extraverti', 'leader naturel'];
const reMot = (m) => new RegExp(`(?<![\\p{L}])${m}(?![\\p{L}])`, 'iu');
const textes = (x, acc = []) => {
  if (typeof x === 'string') acc.push(x);
  else if (Array.isArray(x)) x.forEach((v) => textes(v, acc));
  else if (x && typeof x === 'object') Object.values(x).forEach((v) => textes(v, acc));
  return acc;
};
const ordre = (d) => [1, 2, 3, 4, 5, 6].map((f) => d + f);

const CONTROLES = [
  ['niveau : bornes 2,0 / 2,6 / 3,4 / 4,0', (m) => {
    const cas = [[1, 'bas'], [1.9999, 'bas'], [2.0, 'plutot_bas'], [2.5999, 'plutot_bas'], [2.6, 'milieu'], [3.3999, 'milieu'], [3.4, 'plutot_haut'], [3.9999, 'plutot_haut'], [4.0, 'haut'], [5, 'haut']];
    for (const [v, attendu] of cas) assert.equal(m.niveau(v), attendu, `niveau(${v})`);
  }],
  ['écart : bornes 0,5 / 1,0, signe indifférent', (m) => {
    const cas = [[0, 'proche'], [0.5, 'proche'], [-0.5, 'proche'], [0.5001, 'intermediaire'], [0.75, 'intermediaire'], [0.9999, 'intermediaire'], [1.0, 'notable'], [-1.0, 'notable'], [2.5, 'notable']];
    for (const [v, attendu] of cas) assert.equal(m.ecart(v), attendu, `ecart(${v})`);
  }],
  ['dispersion : bornes 0,5 / 1,0', (m) => {
    const cas = [[0, 'homogene'], [0.5, 'homogene'], [0.5001, 'intermediaire'], [0.9999, 'intermediaire'], [1.0, 'diverse'], [3, 'diverse']];
    for (const [v, attendu] of cas) assert.equal(m.dispersion(v), attendu, `dispersion(${v})`);
  }],
  ['écart : flottants des domaines (score/24) ne faussent pas la borne', (m) => {
    // 12/24 = 0,5 exactement ; 83/24 - 71/24 = 0,5 en flottant approché
    assert.equal(m.ecart(83 / 24 - 71 / 24), 'proche');
    assert.equal(m.ecart(95 / 24 - 71 / 24), 'notable');
  }],
  ['tensions : AM a 12 tensions réparties E2, O1, A4, C5, aucune en N', (m, c) => {
    const t = m.tensions(c.profils.find((p) => p.code === 'AM').facette);
    assert.equal(t.length, 12);
    const parDomaine = Object.fromEntries(['N', 'E', 'O', 'A', 'C'].map((d) => [d, t.filter((x) => x.domaine === d).length]));
    assert.deepEqual(parDomaine, { N: 0, E: 2, O: 1, A: 4, C: 5 });
    const c6 = t.find((x) => x.id === 'C1-C6');
    assert.deepEqual(c6, { id: 'C1-C6', domaine: 'C', facettes: ['C1', 'C6'], ecart: 3, regle: 'TENS-C' });
  }],
  ['tensions : borne à |Δ| = 1,5 entre deux facettes du même domaine', (m) => {
    const plat = Object.fromEntries(['N', 'E', 'O', 'A', 'C'].flatMap((d) => ordre(d).map((k) => [k, 3])));
    assert.deepEqual(m.tensions(plat), []);
    const base = { ...plat, N3: 3.75, N4: 3.75, N5: 3.75, N6: 3.75 };
    assert.equal(m.tensions({ ...base, N1: 3.0, N2: 4.5 }).length, 1); // Δ = 1,5 : tension
    assert.equal(m.tensions({ ...base, N1: 3.0, N2: 4.4 }).length, 0); // Δ = 1,4
    assert.deepEqual(m.tensions({ ...base, N1: 3.0, N2: 4.5 })[0], { id: 'N1-N2', domaine: 'N', facettes: ['N1', 'N2'], ecart: 1.5, regle: 'TENS-N' });
    // deux domaines différents ne forment jamais une tension
    const deuxBlocs = { ...plat, ...Object.fromEntries(ordre('N').map((k) => [k, 1])), ...Object.fromEntries(ordre('E').map((k) => [k, 5])) };
    assert.equal(m.tensions(deuxBlocs).length, 0);
  }],
  ['seuil d\'anonymat : 4 refusé, 5 et 6 atteints', (m) => {
    assert.equal(m.seuilAtteint(0, 5), false);
    assert.equal(m.seuilAtteint(4, 5), false);
    assert.equal(m.seuilAtteint(5, 5), true);
    assert.equal(m.seuilAtteint(6, 5), true);
  }],
  ['faits : conventions recopiées des règles, avertissement et gardes', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    assert.equal(f.version_moteur, 'm-1.0');
    assert.deepEqual(f.bibliotheque, META.bibliotheque);
    assert.match(f.empreinte_entrees, /^[0-9a-f]{64}$/);
    assert.equal(f.conventions.niveaux.bas.max_exclu, 2.0);
    assert.equal(f.conventions.niveaux.plutot_bas.max_exclu, 2.6);
    assert.equal(f.conventions.niveaux.milieu.max_exclu, 3.4);
    assert.equal(f.conventions.niveaux.plutot_haut.max_exclu, 4.0);
    assert.equal(f.conventions.niveaux.haut.min, 4.0);
    assert.deepEqual(f.conventions.ecarts, { proche_max: 0.5, notable_min: 1.0, regles: ['ECART-proche', 'ECART-intermediaire', 'ECART-notable'] });
    assert.deepEqual(f.conventions.dispersion, { homogene_max: 0.5, diverse_min: 1.0, regles: ['DISP-homogene', 'DISP-intermediaire', 'DISP-diverse'] });
    assert.deepEqual(f.conventions.tension, { ecart_min: 1.5 });
    assert.equal(f.conventions.avertissement, 'conventions non calibrées, aucune norme de population');
    assert.deepEqual(f.conventions.gardes, ['GARDE-NATIONALE', 'GARDE-EMPLOI', 'GARDE-POPULATION']);
  }],
  ['personnes : domaines, facettes et bloc_id', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    assert.deepEqual(Object.keys(f.personnes), ['AM', 'KB', 'SR', 'HT']);
    assert.deepEqual(f.personnes.AM.domaines.O, { score: 96, moy: 4, niveau: 'haut' });
    assert.equal(f.personnes.AM.domaines.N.niveau, 'plutot_bas');
    assert.equal(f.personnes.AM.domaines.A.niveau, 'milieu');
    assert.equal(f.personnes.HT.domaines.N.niveau, 'plutot_haut');
    assert.equal(Object.keys(f.personnes.AM.facettes).length, 30);
    assert.deepEqual(f.personnes.AM.facettes.O5, { moy: 5, niveau: 'haut', bloc_id: 'O5/haut' });
    assert.equal(f.personnes.KB.facettes.O5.bloc_id, 'O5/plutot_bas');
    assert.equal(f.personnes.KB.facettes.O6.bloc_id, 'O6/milieu');
  }],
  ['contribution : 5 facettes les plus éloignées du milieu, coûts = facettes en tension', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    assert.deepEqual(f.personnes.AM.contribution.points_forts_hypothese, ['E3', 'E4', 'O5', 'C1', 'C3']);
    assert.deepEqual(f.personnes.AM.contribution.couts_hypothese, ['E2', 'E3', 'E4', 'O5', 'O6', 'A2', 'A3', 'A4', 'A6', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
    assert.equal(f.personnes.AM.tensions.length, 12);
  }],
  ['relation AM-KB : domaines, 11 facettes notables triées', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const r = f.relations.find((x) => x.id === 'AM-KB');
    assert.equal(f.relations.length, 6);
    const o = r.domaines.find((d) => d.d === 'O');
    assert.deepEqual(o, { d: 'O', ecart: 1.5417, classe: 'notable' });
    assert.equal(r.domaines.find((d) => d.d === 'N').classe, 'proche');
    assert.equal(r.domaines.find((d) => d.d === 'E').classe, 'intermediaire');
    assert.equal(r.facettes_notables.length, 11);
    assert.deepEqual(r.facettes_notables[0], { k: 'O5', ecart: 3, niveau_a: 'haut', niveau_b: 'plutot_bas' });
    assert.equal(r.nature, 'ligne');
    assert.equal(r.sens, 'a->b');
  }],
  ['calibrage par nature : chaque nature déclenche sa règle et seulement elle', (m, c) => {
    for (const nature of ['ligne', 'fonctionnel', 'pairs', 'client-fournisseur', 'mentorat', 'co-direction']) {
      const cas = clone(c.cas);
      cas.relations[0].nature = nature;
      const f = m.calculer(cas, c.profils, c.regles, META);
      const ids = f.relations[0].calibrage.regles.map((r) => r.id).filter((id) => id.startsWith('CAL-NAT-'));
      assert.deepEqual(ids, [`CAL-NAT-${nature}`], nature);
    }
  }],
  ['calibrage par sens, interdépendance, tâche, orientation, dureté', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const ids = (id) => f.relations.find((r) => r.id === id).calibrage.regles.map((r) => r.id);
    assert.deepEqual(ids('AM-KB').filter((x) => /^CAL-(SENS|INT|TACHE|ORI|DURETE)/.test(x)), ['CAL-SENS-asymetrique', 'CAL-INT-sequentielle', 'CAL-TACHE-projet', 'CAL-ORI-croissance', 'CAL-DURETE-dure', 'CAL-DURETE-negociable']);
    assert.ok(ids('KB-HT').includes('CAL-SENS-reciproque'));
    assert.ok(!ids('KB-HT').includes('CAL-SENS-asymetrique'));
    assert.ok(ids('KB-HT').includes('CAL-INT-mise-en-commun'));
    assert.ok(ids('SR-HT').includes('CAL-INT-reciproque'));
    const cas = clone(c.cas);
    cas.tache.nature = 'urgence';
    cas.strategie.orientation = 'redressement';
    cas.contraintes.forEach((x) => { x.durete = 'negociable'; });
    const g = m.calculer(cas, c.profils, c.regles, META);
    const gi = g.relations[0].calibrage.regles.map((r) => r.id);
    assert.ok(gi.includes('CAL-TACHE-urgence') && gi.includes('CAL-ORI-redressement') && !gi.includes('CAL-DURETE-dure'));
  }],
  ['poids du calibrage : classe la plus marquée des domaines pertinents', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const poids = (rel, id) => f.relations.find((r) => r.id === rel).calibrage.regles.find((r) => r.id === id).poids;
    assert.equal(poids('AM-KB', 'CAL-NAT-ligne'), 'limité'); // C, A, N tous proches
    assert.equal(poids('AM-SR', 'CAL-NAT-fonctionnel'), 'élevé'); // C : 1,25
    assert.equal(poids('AM-KB', 'CAL-SENS-asymetrique'), 'contextuel'); // aucun domaine pertinent
    assert.equal(poids('AM-KB', 'CAL-TACHE-projet'), 'modéré'); // C proche, E intermédiaire
    assert.ok(f.relations[0].calibrage.regles.every((r) => r.declencheur && !r.declencheur.includes('{')));
  }],
  ['interculturel : réserve de passation uniquement pour les relations avec SR', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    for (const r of f.relations) {
      const a = r.calibrage.regles.some((x) => x.id === 'CAL-IC-PASSATION');
      assert.equal(a, r.a === 'SR' || r.b === 'SR', r.id);
    }
    const cas = clone(c.cas);
    cas.interculturel.actif = false;
    const g = m.calculer(cas, c.profils, c.regles, META);
    assert.ok(g.relations.every((r) => !r.calibrage.regles.some((x) => x.id.startsWith('CAL-IC-'))));
    assert.ok(g.organisation.adequation.every((x) => !x.regle.startsWith('IC-')));
  }],
  ['interculturel : lectures au niveau des organisations et des sites seulement', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const ids = f.organisation.adequation.map((x) => x.regle);
    for (const id of ['IC-SITES', 'IC-LANGUES', 'IC-SIEGE', 'IC-EXPATRIES', 'IC-FUSEAUX', 'IC-CULTURES', 'IC-PASSATION']) assert.ok(ids.includes(id), id);
    const ic = f.organisation.adequation.filter((x) => x.regle.startsWith('IC-')).map((x) => x.lecture).join(' ');
    assert.doesNotMatch(ic, /marocain|français(?:e|es)?\b.*tend|nationalit/i);
    const pass = f.organisation.adequation.find((x) => x.regle === 'IC-PASSATION').lecture;
    assert.match(pass, /arabe/);
    assert.match(pass, /français/);
  }],
  ['équipe : étendues, dispersion, couverture', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    assert.deepEqual(f.equipe.domaines.O, { min: 2.4583, max: 4.375, etendue: 1.9167, dispersion: 'diverse' });
    assert.deepEqual(f.equipe.couverture.O, { hauts: ['AM', 'SR', 'HT'], bas: ['KB'] });
    assert.equal(f.equipe.n_personnes, 4);
    assert.ok(f.equipe.facettes_diverses.includes('O5'));
    assert.ok(f.equipe.facettes_homogenes.includes('C5') === false);
    assert.equal(f.equipe.facettes_diverses.length + f.equipe.facettes_homogenes.length <= 30, true);
  }],
  ['organisation : seuil non atteint, dérogation explicite car cas fictif et consenti', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const o = f.organisation;
    assert.equal(o.n_personnes, 4);
    assert.equal(o.seuil_anonymat, 5);
    assert.equal(o.seuil_atteint, false);
    assert.match(o.derogation_demonstration, /fictif/);
    assert.match(o.derogation_demonstration, /consenti/);
    assert.ok(o.agregats && o.agregats.domaines.C);
    const ids = o.adequation.map((x) => x.regle);
    assert.ok(ids.includes('ADEQ-STRUCT-bureaucratie mécaniste') && ids.includes('ADEQ-CULT-hiérarchie') && ids.includes('CAL-ORI-croissance'));
    assert.ok(ids.includes('CONTR-reglementation') && ids.includes('CONTR-syndical'));
  }],
  ['organisation réelle sous le seuil : aucun agrégat, aucune dérogation', (m, c) => {
    const cas = clone(c.cas);
    cas.fictif = false;
    const f = m.calculer(cas, c.profils, c.regles, META);
    assert.equal(f.organisation.seuil_atteint, false);
    assert.equal(f.organisation.agregats, null);
    assert.equal(f.organisation.derogation_demonstration, null);
  }],
  ['cas fictif mais une personne sans consentement organisation : pas de dérogation', (m, c) => {
    const cas = clone(c.cas);
    cas.personnes[3].consentements.organisation = false;
    const f = m.calculer(cas, c.profils, c.regles, META);
    assert.equal(f.organisation.n_personnes, 3);
    assert.equal(f.organisation.agregats, null);
    assert.equal(f.organisation.derogation_demonstration, null);
    assert.ok(f.consentements.bloquants.some((b) => b.niveau === 'organisation' && b.personnes.includes('HT')));
  }],
  ['consentement binôme : relation exclue et listée comme bloquante', (m, c) => {
    const cas = clone(c.cas);
    cas.personnes.find((p) => p.code === 'KB').consentements.binome = false;
    const f = m.calculer(cas, c.profils, c.regles, META);
    assert.deepEqual(f.relations.map((r) => r.id), ['AM-SR', 'AM-HT', 'SR-HT']);
    const b = f.consentements.bloquants.filter((x) => x.niveau === 'binome').map((x) => x.cible);
    assert.deepEqual(b, ['AM-KB', 'KB-SR', 'KB-HT']);
    assert.deepEqual(f.consentements.bloquants[0], { niveau: 'binome', cible: 'AM-KB', personnes: ['KB'], regle: 'CONS-BINOME' });
  }],
  ['consentement individuel et équipe : exclusion et listage', (m, c) => {
    const cas = clone(c.cas);
    cas.personnes.find((p) => p.code === 'HT').consentements.individuel = false;
    cas.personnes.find((p) => p.code === 'SR').consentements.equipe = false;
    const f = m.calculer(cas, c.profils, c.regles, META);
    assert.deepEqual(Object.keys(f.personnes), ['AM', 'KB', 'SR']);
    assert.equal(f.equipe.n_personnes, 3);
    assert.ok(!f.equipe.couverture.O.hauts.includes('SR'));
    const niveaux = f.consentements.bloquants.map((x) => `${x.niveau}:${x.cible}`);
    assert.ok(niveaux.includes('individuel:HT'));
    assert.ok(niveaux.includes('equipe:SR'));
    assert.equal(f.consentements.bloquants.find((x) => x.niveau === 'equipe').regle, 'CONS-EQUIPE');
  }],
  ['consentement : demo entièrement consenti, aucun bloquant', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    assert.deepEqual(f.consentements.bloquants, []);
  }],
  ['équipe de moins de 2 personnes consentantes : pas d\'analyse', (m, c) => {
    const cas = clone(c.cas);
    for (const p of cas.personnes.slice(1)) p.consentements.equipe = false;
    const f = m.calculer(cas, c.profils, c.regles, META);
    assert.equal(f.equipe.n_personnes, 1);
    assert.equal(f.equipe.domaines, null);
  }],
  ['déterminisme : deux exécutions identiques octet pour octet, ordre des clés indifférent', (m, c) => {
    const a = JSON.stringify(m.calculer(c.cas, c.profils, c.regles, META));
    const b = JSON.stringify(m.calculer(clone(c.cas), clone(c.profils), clone(c.regles), META));
    assert.equal(a, b);
    const inverse = (x) => (Array.isArray(x) ? x.map(inverse) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).reverse().map((k) => [k, inverse(x[k])])) : x);
    assert.equal(JSON.stringify(m.calculer(inverse(c.cas), inverse(c.profils), inverse(c.regles), META)), a);
  }],
  ['empreinte : change si une entrée change, stable sinon', (m, c) => {
    const f1 = m.calculer(c.cas, c.profils, c.regles, META).empreinte_entrees;
    const cas = clone(c.cas);
    cas.tache.nature = 'routine';
    assert.notEqual(m.calculer(cas, c.profils, c.regles, META).empreinte_entrees, f1);
    const profils = clone(c.profils);
    profils[0].facette.N1 = 3.25;
    profils[0].domaine.N += 1;
    assert.notEqual(m.calculer(c.cas, profils, c.regles, META).empreinte_entrees, f1);
    const regles = clone(c.regles);
    regles.regles[0].texte += ' ';
    assert.notEqual(m.calculer(c.cas, c.profils, regles, META).empreinte_entrees, f1);
    assert.equal(m.calculer(c.cas, c.profils, c.regles, META).empreinte_entrees, f1);
    assert.equal(m.empreinte({ b: 1, a: [2, { d: 1, c: 2 }] }), m.empreinte({ a: [2, { c: 2, d: 1 }], b: 1 }));
  }],
  ['aucune date ni aléa dans les faits', (m, c) => {
    const s = JSON.stringify(m.calculer(c.cas, c.profils, c.regles, META));
    assert.doesNotMatch(s, /"(date|genere|generee|horodatage|alea)[a-z_]*"/i);
    assert.doesNotMatch(s, /20\d\d-\d\d-\d\dT/);
  }],
  ['validation du cas : le cas de démonstration est valide', (m, c) => {
    assert.deepEqual(m.validerCas(c.cas, c.profils), []);
  }],
  ['validation du cas : exactement 6 relations pour 4 personnes, paires uniques, codes connus', (m, c) => {
    const err = (mod) => { const cas = clone(c.cas); mod(cas); return m.validerCas(cas, c.profils); };
    assert.ok(err((x) => x.relations.pop()).some((e) => /6 relations/.test(e)));
    assert.ok(err((x) => x.relations.push({ ...x.relations[0], id: 'AM-KB' })).some((e) => /6 relations|paire/.test(e)));
    assert.ok(err((x) => { x.relations[1] = { ...x.relations[1], a: 'KB', b: 'AM', id: 'KB-AM' }; }).some((e) => /paire/.test(e)));
    assert.ok(err((x) => { x.relations[0].b = 'ZZ'; x.relations[0].id = 'AM-ZZ'; }).some((e) => /ZZ/.test(e)));
    assert.ok(err((x) => { x.relations[0].b = 'AM'; x.relations[0].id = 'AM-AM'; }).some((e) => /elle-même|distinct/.test(e)));
    assert.ok(err((x) => { x.relations[0].id = 'AM-XX'; }).some((e) => /id/.test(e)));
    assert.ok(err((x) => { x.relations[0].nature = 'amitié'; }).some((e) => /nature/.test(e)));
    assert.ok(err((x) => { x.relations[0].sens = 'haut'; }).some((e) => /sens/.test(e)));
    assert.ok(err((x) => { x.relations[0].interdependance = 'x'; }).some((e) => /interdépendance/.test(e)));
    assert.ok(err((x) => x.personnes.pop()).some((e) => /4 personnes/.test(e)));
    assert.ok(err((x) => { x.personnes[0].code = 'ZZ'; }).some((e) => /ZZ/.test(e)));
    assert.ok(err((x) => { x.personnes[1].code = 'AM'; }).some((e) => /doublon|unique/.test(e)));
    assert.ok(err((x) => { delete x.personnes[0].consentements.equipe; }).some((e) => /consentement/.test(e)));
    assert.ok(err((x) => { x.organisation.structure = 'pyramide'; }).some((e) => /structure/.test(e)));
    assert.ok(err((x) => { x.organisation.culture = 'famille'; }).some((e) => /culture/.test(e)));
    assert.ok(err((x) => { x.strategie.orientation = 'x'; }).some((e) => /orientation/.test(e)));
    assert.ok(err((x) => { x.contraintes[0].durete = 'molle'; }).some((e) => /dureté/.test(e)));
    assert.ok(err((x) => { x.contraintes[0].type = 'x'; }).some((e) => /type/.test(e)));
    assert.ok(err((x) => { x.tache.nature = 'x'; }).some((e) => /tâche/.test(e)));
    assert.ok(err((x) => { x.fictif = 'oui'; }).some((e) => /fictif/.test(e)));
    assert.ok(err((x) => { x.personnes[0].langue_passation = 'klingon'; }).some((e) => /langue/.test(e)));
    const profils = clone(c.profils);
    delete profils[1].facette.N3;
    assert.ok(m.validerCas(c.cas, profils).some((e) => /N3/.test(e)));
    const hors = clone(c.profils);
    hors[2].facette.C1 = 6;
    assert.ok(m.validerCas(c.cas, hors).some((e) => /C1/.test(e)));
    const incoh = clone(c.profils);
    incoh[0].domaine.N = 90;
    assert.ok(m.validerCas(c.cas, incoh).some((e) => /domaine N/.test(e)));
    assert.throws(() => m.calculer(Object.assign(clone(c.cas), { relations: [] }), c.profils, c.regles, META), /6 relations/);
  }],
  ['règles : intégrité (ids uniques, ids requis présents, critères, domaines)', (m, c) => {
    assert.deepEqual(m.verifierRegles(c.regles), []);
    const ids = c.regles.regles.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const r of c.regles.regles) {
      assert.ok(r.id && r.famille && r.declencheur && r.texte, r.id);
      if (r.famille === 'calibrage' || r.famille === 'adequation' || r.famille === 'contrainte' || r.famille === 'interculturel') assert.ok(Array.isArray(r.critere) && r.critere.length > 0, `critère de ${r.id}`);
      for (const d of r.domaines_pertinents ?? []) assert.ok(['N', 'E', 'O', 'A', 'C'].includes(d), r.id);
    }
    const sans = clone(c.regles);
    sans.regles = sans.regles.filter((r) => r.id !== 'TENS-C');
    assert.ok(m.verifierRegles(sans).some((e) => /TENS-C/.test(e)));
    assert.throws(() => m.calculer(c.cas, c.profils, sans, META), /TENS-C/);
  }],
  ['règles : lexique interdit, pas de tiret cadratin, pas de pourcentage, formulation d\'hypothèse', (m, c) => {
    for (const r of c.regles.regles) {
      for (const champ of [r.declencheur, r.texte]) {
        for (const mot of MOTS_INTERDITS) assert.doesNotMatch(champ, reMot(mot), `${r.id} : « ${mot} »`);
        assert.doesNotMatch(champ, /[—–]/, r.id);
        assert.doesNotMatch(champ, /%/, r.id);
      }
      if (['calibrage', 'tension', 'contribution', 'adequation', 'interculturel'].includes(r.famille) && r.id !== 'CAL-DURETE-dure') {
        assert.match(r.texte, /il se peut|à confirmer|à instruire|à explorer|priorisées|ne se négocie/i, `${r.id} doit être une hypothèse`);
      }
    }
  }],
  ['faits : lexique interdit et typographie respectés dans toutes les chaînes produites', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const sansAvertissement = clone(f);
    delete sansAvertissement.conventions.avertissement;
    for (const t of textes(sansAvertissement)) {
      for (const mot of MOTS_INTERDITS) assert.doesNotMatch(t, reMot(mot), `« ${mot} » dans « ${t} »`);
      assert.doesNotMatch(t, /[—–]/);
      assert.doesNotMatch(t, /%/);
    }
  }],
  ['sortie : chaque règle citée existe dans regles.json', (m, c) => {
    const f = m.calculer(c.cas, c.profils, c.regles, META);
    const connues = new Set(c.regles.regles.map((r) => r.id));
    const cites = [];
    for (const p of Object.values(f.personnes)) for (const t of p.tensions) cites.push(t.regle);
    for (const r of f.relations) for (const x of r.calibrage.regles) cites.push(x.id);
    for (const a of f.organisation.adequation) cites.push(a.regle);
    for (const b of f.consentements.bloquants) cites.push(b.regle);
    assert.ok(cites.length > 40);
    for (const id of cites) assert.ok(connues.has(id), id);
  }]
];

const CTX_REEL = { cas: CAS, profils: PROFILS, regles: REGLES };

function executer(mod, ctx) {
  const echecs = [];
  for (const [nom, fn] of CONTROLES) {
    try { fn(mod, ctx); } catch (e) { echecs.push(`${nom} : ${e.message.split('\n')[0]}`); }
  }
  return echecs;
}

for (const [nom, fn] of CONTROLES) {
  test(nom, () => fn(moteurReel, CTX_REEL));
}

// ---------- Mutations : une erreur volontaire doit faire échouer au moins un contrôle ----------
const dossierMutants = fs.mkdtempSync(path.join(os.tmpdir(), 'moteur-mutants-'));
let compteur = 0;
async function mutantMoteur(de, vers) {
  assert.ok(SRC_MOTEUR.includes(de), `mutation inapplicable, texte absent de moteur.mjs : ${de}`);
  const fichier = path.join(dossierMutants, `m${compteur++}.mjs`);
  fs.writeFileSync(fichier, SRC_MOTEUR.replace(de, vers));
  return import(pathToFileURL(fichier).href);
}

const MUTATIONS_MOTEUR = [
  ['m < s.bas', 'm <= s.bas'],
  ['m < s.plutot_bas', 'm <= s.plutot_bas'],
  ['m < s.milieu', 'm <= s.milieu'],
  ['m < s.plutot_haut', 'm <= s.plutot_haut'],
  ['a <= s.proche', 'a < s.proche'],
  ['a >= s.notable', 'a > s.notable'],
  ['d <= s.homogene', 'd < s.homogene'],
  ['d >= s.diverse', 'd > s.diverse'],
  ['n >= seuil', 'n > seuil'],
  ['ecartAbs >= t.ecart_min', 'ecartAbs > t.ecart_min'],
  ['plutot_bas: 2.6', 'plutot_bas: 2.5'],
  ['ecart_min: 1.5', 'ecart_min: 2.5'],
  ['version_moteur: VERSION_MOTEUR,', 'version_moteur: VERSION_MOTEUR, alea: Math.random(),'],
  ['p.consentements.binome', 'true'],
  ['p.consentements.individuel', 'true'],
  ['p.consentements.organisation', 'true'],
  ['cas.fictif === true', 'true'],
  ['.slice(0, seuils.contribution.n_max)', '.slice(0, 3)'],
  ['/ 24', '/ 25']
];
for (const [de, vers] of MUTATIONS_MOTEUR) {
  test(`mutation du moteur « ${de} » → « ${vers} » est détectée`, async () => {
    const mod = await mutantMoteur(de, vers);
    const echecs = executer(mod, CTX_REEL);
    assert.ok(echecs.length > 0, 'aucun contrôle n\'a échoué : mutation non détectée');
  });
}

const MUTATIONS_REGLES = [
  ['"plutot_bas": 2.6', '"plutot_bas": 2.5'],
  ['"bas": 2.0', '"bas": 1.9'],
  ['"proche": 0.5', '"proche": 0.6'],
  ['"notable": 1.0', '"notable": 1.1'],
  ['"homogene": 0.5', '"homogene": 0.4'],
  ['"diverse": 1.0', '"diverse": 1.2'],
  ['"ecart_min": 1.5', '"ecart_min": 2.5'],
  ['"ecart_min": 1.5', '"ecart_min": 1.6'],
  ['"seuil": 5', '"seuil": 4'],
  ['"id": "CAL-NAT-ligne"', '"id": "CAL-NAT-lignex"'],
  ['{ "chemin": "relation.nature", "op": "eq", "valeur": "pairs" }', '{ "chemin": "relation.nature", "op": "eq", "valeur": "ligne" }'],
  ['"domaines_pertinents": ["C", "E", "A"]', '"domaines_pertinents": ["N"]'],
  ['mentorat', 'mentoratx']
];
for (const [de, vers] of MUTATIONS_REGLES) {
  test(`mutation de regles.json « ${de} » est détectée`, () => {
    assert.ok(TXT_REGLES.includes(de), `mutation inapplicable : ${de}`);
    const regles = JSON.parse(TXT_REGLES.replace(de, vers));
    const echecs = executer(moteurReel, { ...CTX_REEL, regles });
    assert.ok(echecs.length > 0, 'aucun contrôle n\'a échoué : mutation non détectée');
  });
}

test('le fichier de sortie committé correspond au calcul actuel', { skip: !fs.existsSync(path.join(ici, '..', 'sortie', 'faits.json')) }, () => {
  const f = JSON.parse(lire('..', 'sortie', 'faits.json'));
  // calculer.mjs ajoute le réseau réel (moteur/reseau.mjs) ; moteur.mjs reste sans import, pour ses mutants copiés seuls.
  const recalcul = ajouterReseau(moteurReel.calculer(CAS, PROFILS, REGLES, { bibliotheque: f.bibliotheque }), CAS);
  assert.equal(JSON.stringify(f, null, 2), JSON.stringify(recalcul, null, 2));
});
