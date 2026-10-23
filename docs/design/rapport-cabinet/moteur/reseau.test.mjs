// Tests du moteur du réseau réel (contrat-reseau §3) : seuils, réciprocité, oppositions, carte nominative, écarts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  lireReseau, suffisance, relaisPrevus, ajouterReseau, perimetreAJour, nominatifAutorise,
  REPONDANTS_MIN, TAUX_REPONSE_MIN_PCT, VALEUR_SIGNIFICATIVE, VALEUR_HEBDOMADAIRE, LIENS
} from './reseau.mjs';

const CAS = JSON.parse(fs.readFileSync(new URL('../cas/cas-demo.json', import.meta.url), 'utf-8'));
const copie = (x) => structuredClone(x);

// Petit cas synthétique : n personnes P1..Pn, toutes consentantes à l'analyse d'équipe, aucune relation prévue.
function casSynthetique(n, { relations = [] } = {}) {
  const codes = Array.from({ length: n }, (_, i) => `P${i + 1}`);
  return {
    personnes: codes.map((code) => ({ code, consentements: { equipe: true } })),
    relations,
    reseau_reel: {
      statut: 'fictif',
      membres: codes.map((code) => ({ code, informe: true, oppose: false, accord_repondre: true, accord_carte: true, a_repondu: true })),
      reponses: []
    }
  };
}
const membre = (cas, code) => cas.reseau_reel.membres.find((m) => m.code === code);
const rep = (de, vers, lien, valeur) => ({ de, vers, lien, valeur });

test('constantes du contrat', () => {
  assert.equal(REPONDANTS_MIN, 4);
  assert.equal(TAUX_REPONSE_MIN_PCT, 80);
  assert.equal(VALEUR_SIGNIFICATIVE, 2);
  assert.equal(VALEUR_HEBDOMADAIRE, 3);
  assert.deepEqual(LIENS, ['conseil', 'information', 'confiance', 'dependance']);
});

test('suffisance : 4 répondants et 80 pour cent, bornes comprises', () => {
  assert.equal(suffisance(4, 4), true);
  assert.equal(suffisance(4, 5), true, '80 pile');
  assert.equal(suffisance(3, 3), false, 'moins de 4 répondants, même à 100');
  assert.equal(suffisance(79, 100), false, '79 pour cent');
  assert.equal(suffisance(80, 100), true);
  assert.equal(suffisance(0, 0), false);
});

test('aucune donnée : pas de relevé, seuils seulement', () => {
  const cas = copie(CAS);
  delete cas.reseau_reel;
  const r = lireReseau(cas);
  assert.equal(r.releve, false);
  assert.equal(r.suffisant, false);
  assert.deepEqual(r.seuils, { repondants_min: 4, taux_reponse_min_pct: 80, valeur_significative: 2, valeur_hebdomadaire: 3 });
  assert.equal(r.liens, undefined);
});

test('3 répondants : relevé insuffisant et aucune lecture', () => {
  const cas = casSynthetique(4);
  membre(cas, 'P4').accord_repondre = false;
  membre(cas, 'P4').a_repondu = false;
  cas.reseau_reel.reponses = [rep('P1', 'P2', 'conseil', 4)];
  const r = lireReseau(cas);
  assert.equal(r.releve, true);
  assert.equal(r.n_repondants, 3);
  assert.equal(r.n_representes, 4);
  assert.equal(r.suffisant, false);
  for (const k of ['liens', 'indicateurs', 'ecarts', 'carte_nominative']) assert.equal(r[k], undefined, k);
});

test('79 pour cent : insuffisant ; 80 pour cent : suffisant', () => {
  const cas = casSynthetique(19);
  for (const c of ['P16', 'P17', 'P18', 'P19']) { membre(cas, c).accord_repondre = false; membre(cas, c).a_repondu = false; }
  const r79 = lireReseau(cas); // 15 sur 19 : 78,9
  assert.equal(r79.n_repondants, 15);
  assert.equal(r79.suffisant, false);
  const cas80 = casSynthetique(5);
  membre(cas80, 'P5').a_repondu = false; // 4 sur 5
  const r80 = lireReseau(cas80);
  assert.equal(r80.taux_reponse_pct, 80);
  assert.equal(r80.suffisant, true);
});

test('une opposition : la personne est non représentée, ses liens entrants et sortants disparaissent, jamais isolée', () => {
  const cas = casSynthetique(6);
  Object.assign(membre(cas, 'P6'), { oppose: true, accord_repondre: false, accord_carte: false, a_repondu: false });
  cas.reseau_reel.reponses = [rep('P1', 'P6', 'conseil', 4), rep('P6', 'P1', 'conseil', 4), rep('P1', 'P2', 'conseil', 3), rep('P2', 'P1', 'conseil', 3)];
  const r = lireReseau(cas);
  assert.deepEqual(r.non_representes, ['P6']);
  assert.equal(r.n_representes, 5);
  assert.equal(r.suffisant, true);
  const tous = LIENS.flatMap((l) => r.liens[l]);
  assert.ok(!tous.some((x) => x.a === 'P6' || x.b === 'P6'), 'aucun lien de P6');
  assert.equal(r.paires_possibles, 10, 'paires entre personnes représentées seulement');
  assert.ok(!JSON.stringify(r).includes('isol'), 'jamais dite isolée');
  assert.equal(r.carte_nominative, false, 'carte nominative seulement sur accord de chaque membre : une personne opposée ne l’a pas donné');
});

test('une personne non informée est non représentée ; une personne hors périmètre est ignorée', () => {
  const cas = casSynthetique(5);
  membre(cas, 'P5').informe = false;
  cas.personnes.push({ code: 'X9', consentements: { equipe: false } });
  cas.reseau_reel.membres.push({ code: 'X9', informe: true, oppose: false, accord_repondre: true, accord_carte: true, a_repondu: true });
  cas.reseau_reel.reponses = [rep('X9', 'P1', 'conseil', 4)];
  const r = lireReseau(cas);
  assert.deepEqual(r.perimetre, ['P1', 'P2', 'P3', 'P4', 'P5']);
  assert.deepEqual(r.non_representes, ['P5']);
  assert.ok(!JSON.stringify(r.liens).includes('X9'));
});

test('un refus de carte : indicateurs sans noms seulement (carte_nominative faux)', () => {
  const cas = casSynthetique(4);
  membre(cas, 'P3').accord_carte = false;
  const r = lireReseau(cas);
  assert.equal(r.suffisant, true);
  assert.equal(r.carte_nominative, false);
});

test('réciprocité : déclaré des deux côtés pour le même type ; un lien d’un seul côté garde son déclarant', () => {
  const cas = casSynthetique(4);
  cas.reseau_reel.reponses = [
    rep('P1', 'P2', 'conseil', 2), rep('P2', 'P1', 'conseil', 4), // réciproque
    rep('P3', 'P4', 'conseil', 3), rep('P4', 'P3', 'conseil', 1), // d'un seul côté, P3
    rep('P1', 'P3', 'information', 3), rep('P3', 'P1', 'conseil', 3), // types différents : pas réciproques
    rep('P2', 'P4', 'confiance', 2), rep('P4', 'P2', 'confiance', 2), // confiance « plutôt oui » des deux côtés
    rep('P1', 'P4', 'dependance', 1) // rarement : non retenu
  ];
  const r = lireReseau(cas);
  const conseil = r.liens.conseil;
  const p12 = conseil.find((x) => x.a === 'P1' && x.b === 'P2');
  assert.deepEqual(p12, { a: 'P1', b: 'P2', a_vers_b: 2, b_vers_a: 4, reciproque: true, declare_par: null });
  const p34 = conseil.find((x) => x.a === 'P3' && x.b === 'P4');
  assert.equal(p34.reciproque, false);
  assert.equal(p34.declare_par, 'P3');
  assert.equal(p34.b_vers_a, 1, 'la réponse de P4 est conservée telle quelle, jamais corrigée');
  const p13c = conseil.find((x) => x.a === 'P1' && x.b === 'P3');
  assert.equal(p13c.declare_par, 'P3');
  assert.equal(r.liens.information.find((x) => x.a === 'P1' && x.b === 'P3').declare_par, 'P1');
  assert.equal(r.liens.confiance[0].reciproque, true);
  assert.equal(r.liens.dependance.length, 0);
  assert.deepEqual(r.indicateurs.conseil, { paires_reliees: 3, reciproques: 1, un_seul_cote: 2 });
  assert.equal(r.liens_reciproques_total, 2);
});

test('les réponses d’un membre sans accord de répondre ne sont pas lues', () => {
  const cas = casSynthetique(5);
  Object.assign(membre(cas, 'P5'), { accord_repondre: false, a_repondu: false });
  cas.reseau_reel.reponses = [rep('P5', 'P1', 'conseil', 4)];
  const r = lireReseau(cas);
  assert.equal(r.liens.conseil.length, 0);
});

test('erreurs nettes : lien inconnu, valeur hors échelle, doublon, code inconnu, réponse à soi-même', () => {
  const avec = (reponses) => { const c = casSynthetique(4); c.reseau_reel.reponses = reponses; return c; };
  assert.throws(() => lireReseau(avec([rep('P1', 'P2', 'blocage', 2)])), /lien inconnu/);
  assert.throws(() => lireReseau(avec([rep('P1', 'P2', 'confiance', 4)])), /valeur/);
  assert.throws(() => lireReseau(avec([rep('P1', 'P2', 'conseil', 5)])), /valeur/);
  assert.throws(() => lireReseau(avec([rep('P1', 'P2', 'conseil', 2), rep('P1', 'P2', 'conseil', 3)])), /doublon/);
  assert.throws(() => lireReseau(avec([rep('P1', 'ZZ', 'conseil', 2)])), /code inconnu/);
  assert.throws(() => lireReseau(avec([rep('P1', 'P1', 'conseil', 2)])), /soi-même/);
});

test('relais prévus : milieu d’une chaîne de séquence orientée (même règle que l’étape 1)', () => {
  const rels = [
    { a: 'P1', b: 'P2', sens: 'a->b', interdependance: 'sequentielle' },
    { a: 'P2', b: 'P3', sens: 'a->b', interdependance: 'sequentielle' },
    { a: 'P3', b: 'P4', sens: 'reciproque', interdependance: 'sequentielle' }
  ];
  assert.deepEqual(relaisPrevus(rels, ['P1', 'P2', 'P3', 'P4']), ['P2']);
  assert.deepEqual(relaisPrevus([{ ...rels[0], sens: 'b->a' }, rels[1]], ['P1', 'P2', 'P3']), []);
});

test('écart (a) : lien prévu sans aucun lien réel significatif ; non lisible si aucun des deux n’a répondu', () => {
  const relations = [
    { id: 'P1-P2', a: 'P1', b: 'P2', nature: 'pairs', sens: 'reciproque', frequence: 'hebdomadaire', interdependance: 'reciproque' },
    { id: 'P3-P4', a: 'P3', b: 'P4', nature: 'pairs', sens: 'reciproque', frequence: 'hebdomadaire', interdependance: 'reciproque' },
    { id: 'P5-P6', a: 'P5', b: 'P6', nature: 'pairs', sens: 'reciproque', frequence: 'mensuelle', interdependance: 'reciproque' }
  ];
  const cas = casSynthetique(10, { relations });
  for (const c of ['P5', 'P6']) membre(cas, c).a_repondu = false;
  cas.reseau_reel.reponses = [rep('P1', 'P2', 'information', 2), rep('P3', 'P4', 'conseil', 1)];
  const r = lireReseau(cas);
  assert.equal(r.suffisant, true);
  assert.deepEqual(r.ecarts.prevus_sans_lien_reel.map((x) => x.id), ['P3-P4']);
  assert.deepEqual(r.ecarts.prevus_non_lisibles, ['P5-P6']);
});

test('écart (b) : lien réel au moins hebdomadaire sur une paire que la structure prévue ne relie pas', () => {
  const relations = [{ id: 'P1-P2', a: 'P1', b: 'P2', nature: 'pairs', sens: 'reciproque', frequence: 'hebdomadaire', interdependance: 'reciproque' }];
  const cas = casSynthetique(4, { relations });
  cas.reseau_reel.reponses = [
    rep('P1', 'P2', 'conseil', 4), // paire prévue : pas un écart
    rep('P3', 'P4', 'dependance', 3), // hebdomadaire hors structure : écart
    rep('P1', 'P3', 'information', 2), // mensuel hors structure : pas un écart (b)
    rep('P2', 'P4', 'confiance', 3) // confiance : pas une fréquence, hors (b)
  ];
  const r = lireReseau(cas);
  assert.equal(r.ecarts.structure_prevue_complete, false);
  assert.deepEqual(r.ecarts.reels_hors_prevu, [{ a: 'P3', b: 'P4', liens: [{ lien: 'dependance', de: 'P3', valeur: 3 }] }]);
});

test('écart (c) : relais réel de conseil comparé aux relais prévus', () => {
  const relations = [
    { id: 'P1-P2', a: 'P1', b: 'P2', nature: 'ligne', sens: 'a->b', frequence: 'quotidienne', interdependance: 'sequentielle' },
    { id: 'P2-P3', a: 'P2', b: 'P3', nature: 'ligne', sens: 'a->b', frequence: 'quotidienne', interdependance: 'sequentielle' }
  ];
  const cas = casSynthetique(4, { relations });
  cas.reseau_reel.reponses = [rep('P1', 'P4', 'conseil', 3), rep('P3', 'P4', 'conseil', 2), rep('P1', 'P3', 'conseil', 1)];
  const r = lireReseau(cas);
  assert.deepEqual(r.ecarts.relais_reels, [{ code: 'P4', demandeurs: ['P1', 'P3'] }]);
  assert.deepEqual(r.ecarts.relais_prevus, ['P2']);
  assert.deepEqual(r.ecarts.relais_reels_non_prevus, ['P4']);
  assert.deepEqual(r.ecarts.relais_prevus_non_reels, ['P2']);
  // Si les deux demandeurs se demandent conseil entre eux, P4 n'est plus un relais.
  cas.reseau_reel.reponses.push(rep('P3', 'P1', 'conseil', 2));
  assert.deepEqual(lireReseau(cas).ecarts.relais_reels, []);
});

test('cas de démonstration : fictif, suffisant, carte nominative, écarts (a) et (c), (b) impossible car chaque paire est prévue', () => {
  const r = lireReseau(CAS);
  assert.equal(r.statut, 'fictif');
  assert.equal(r.suffisant, true);
  assert.equal(r.n_repondants, 4);
  assert.equal(r.carte_nominative, true);
  assert.deepEqual(r.ecarts.prevus_sans_lien_reel.map((x) => x.id), ['AM-HT']);
  assert.equal(r.ecarts.structure_prevue_complete, true);
  assert.deepEqual(r.ecarts.reels_hors_prevu, []);
  assert.deepEqual(r.ecarts.relais_reels_non_prevus, ['HT']);
  assert.deepEqual(r.ecarts.relais_prevus_non_reels, ['KB']);
  assert.equal(r.ecarts.n_ecarts, 3);
  assert.ok(LIENS.some((l) => r.liens[l].some((x) => !x.reciproque)), 'au moins un lien d’un seul côté');
});

test('calculer.mjs écrit faits.reseau_reel, seuils compris, pour que l’audit retrouve chaque nombre affiché', async () => {
  const { calculer } = await import('./moteur.mjs');
  const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
  const brut = calculer(CAS, lire('../../profils-fictifs/profils.json'), lire('./regles.json'));
  const avant = JSON.stringify(brut);
  const faits = ajouterReseau(brut, CAS);
  assert.equal(JSON.stringify(brut), avant, 'faits du moteur non modifiés');
  assert.deepEqual(faits.reseau_reel, lireReseau(CAS));
  assert.equal(Object.keys(faits).at(-1), 'reseau_reel');
  assert.equal(faits.reseau_reel.seuils.repondants_min, 4);
  assert.equal(faits.reseau_reel.seuils.taux_reponse_min_pct, 80);
  assert.match(fs.readFileSync(new URL('./calculer.mjs', import.meta.url), 'utf-8'), /ajouterReseau\(calculer\(/);
  assert.deepEqual(lire('../sortie/faits.json').reseau_reel, lireReseau(CAS), 'faits.json committé à jour');
  const sans = copie(CAS);
  delete sans.reseau_reel;
  assert.equal(ajouterReseau(brut, sans).reseau_reel.releve, false);
});

test('déterminisme : même entrée, même sortie, entrée non modifiée', () => {
  const avant = JSON.stringify(CAS);
  assert.equal(JSON.stringify(lireReseau(copie(CAS))), JSON.stringify(lireReseau(copie(CAS))));
  lireReseau(CAS);
  assert.equal(JSON.stringify(CAS), avant);
});

test('perimetreAJour : vrai seulement si le relevé couvre exactement les personnes qui consentent à l’analyse d’équipe', () => {
  const rr = lireReseau(copie(CAS));
  assert.equal(perimetreAJour(rr, CAS), true);
  assert.equal(perimetreAJour({ ...rr, perimetre: [...rr.perimetre].reverse() }, CAS), true, 'l’ordre ne compte pas');
  const retire = copie(CAS);
  retire.personnes.find((p) => p.code === 'KB').consentements.equipe = false;
  assert.equal(perimetreAJour(rr, retire), false, 'consentement retiré après le relevé');
  assert.equal(perimetreAJour(lireReseau(retire), CAS), false, 'consentement donné après le relevé');
  assert.equal(perimetreAJour({ ...rr, perimetre: ['AM', 'AM', 'KB', 'SR'] }, CAS), false, 'même taille, code en doublon');
  assert.equal(perimetreAJour({ ...rr, perimetre: ['AM', 'KB', 'SR', 'ZZ'] }, CAS), false, 'même taille, code étranger');
  assert.equal(perimetreAJour({ releve: true }, CAS), false, 'périmètre absent');
  assert.equal(perimetreAJour(undefined, CAS), false);
  assert.equal(perimetreAJour(rr, undefined), false);
});

test('carte nominative : seulement si chaque membre du périmètre est représenté et a accepté la carte', () => {
  const tous = lireReseau(casSynthetique(5));
  assert.equal(tous.carte_nominative, true);
  assert.equal(nominatifAutorise(tous), true);
  const nonInforme = casSynthetique(5);
  Object.assign(membre(nonInforme, 'P5'), { informe: false });
  const r = lireReseau(nonInforme);
  assert.deepEqual([r.non_representes, r.carte_nominative, nominatifAutorise(r)], [['P5'], false, false]);
  // Défense en profondeur : des faits anciens qui diraient carte_nominative vrai avec une personne non représentée.
  assert.equal(nominatifAutorise({ ...tous, non_representes: ['P5'], representes: tous.representes.slice(0, 4) }), false);
  assert.equal(nominatifAutorise({ ...tous, representes: tous.representes.slice(0, 4) }), false, 'représentés plus courts que le périmètre');
  assert.equal(nominatifAutorise({ ...tous, carte_nominative: false }), false);
  assert.equal(nominatifAutorise({ ...tous, non_representes: undefined }), false);
  assert.equal(nominatifAutorise(undefined), false);
});

test('nominatifAutorise : représentés et périmètre doivent être le même ensemble, pas seulement de même taille', () => {
  const tous = lireReseau(casSynthetique(5));
  assert.equal(nominatifAutorise({ ...tous, representes: [...tous.representes].reverse() }), true, 'l’ordre ne compte pas');
  assert.equal(nominatifAutorise({ ...tous, representes: ['P1', 'P2', 'P3', 'P4', 'X9'] }), false, 'même taille, un code différent');
  assert.equal(nominatifAutorise({ ...tous, representes: ['P1', 'P1', 'P2', 'P3', 'P4'] }), false, 'même taille, un doublon');
  assert.equal(nominatifAutorise({ ...tous, perimetre: ['P1', 'P1', 'P2', 'P3', 'P4'], representes: ['P1', 'P2', 'P3', 'P4', 'P4'] }), false, 'doublons des deux côtés');
});
