import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { auditer, CATEGORIES } from './audit.mjs';
import { rendreHtml } from '../rapport/rendu.mjs';

const ici = (p) => fileURLToPath(new URL(p, import.meta.url));
const lire = (p) => JSON.parse(readFileSync(ici(p), 'utf8'));
const faits = lire('./fixtures/faits.json');
const cas = lire('./fixtures/cas.json');
const profils = lire('./fixtures/profils.json');
const references = lire('../references-autorisees.json');
const sain = lire('./fixtures/rapport-sain.json');

const copie = (x) => structuredClone(x);
const run = (rapport) => auditer({ rapport, faits, cas, profils, references });
// rapport sain dont le premier paragraphe est remplacé par un texte donné (statut constate)
const avecTexte = (texte) => {
  const r = copie(sain);
  const p = r.niveaux[0].sections[0].paragraphes[0];
  p.texte = texte;
  p.statut = 'constate';
  return r;
};
const rouge = (rapport, categorie) =>
  assert.ok(run(rapport).comptes[categorie] > 0, `${categorie} devrait être rouge : ${JSON.stringify(run(rapport).defauts)}`);
const vert = (rapport) => assert.deepEqual(run(rapport).defauts, []);

test('rapport témoin sain : 0 défaut, six catégories à zéro', () => {
  const { defauts, comptes } = run(sain);
  assert.deepEqual(defauts, []);
  for (const cat of CATEGORIES) assert.equal(comptes[cat], 0);
  assert.equal(comptes.references, 0);
  assert.equal(comptes.structure, 0);
});

// ------------------------------------------------ mutations rouges, une par catégorie
test('mutation rouge 1 : chiffre absent des entrées', () => {
  rouge(avecTexte("KB se situe à 3,6 sur l'échelle."), 'chiffre_absent_des_entrees');
  rouge(avecTexte('Le cas compte 251 salariés.'), 'chiffre_absent_des_entrees');
});
test('mutation rouge 1 : chiffre dans une recommandation', () => {
  const r = copie(sain);
  r.recommandations[0].texte = 'Instaurer un point de 45 minutes.';
  rouge(r, 'chiffre_absent_des_entrees');
});
test('mutation rouge 1 : code de facette inexistant', () => rouge(avecTexte('La facette N7 est notable.'), 'chiffre_absent_des_entrees'));
test('mutation rouge 2 : terme interdit', () => {
  for (const t of [
    'La moyenne de KB est élevée.',
    'Le score de KB est de 3,25.',
    'Le meilleur profil est AM.',
    'KB est un type de personnalité réservé.',
    'KB est une personne névrosée.',
    'Ce rapport permet de prédire la performance.',
    'Un percentile élevé.',
    'Un mauvais profil.',
  ]) rouge(avecTexte(t), 'terme_interdit');
});
test('mutation rouge 3 : comparaison à une population', () => {
  for (const t of [
    'KB est plus réservé que la plupart des gens.',
    'KB se situe au-dessus de la moyenne.',
    'Par rapport à la population, AM est élevé.',
    'Un comportement typique.',
    'KB comparé aux autres personnes est discret.',
  ]) rouge(avecTexte(t), 'comparaison_population');
});
test('mutation rouge 4 : pourcentage de compatibilité', () => {
  rouge(avecTexte("AM et KB affichent 80 % d'affinité."), 'pourcentage_compatibilite');
  rouge(avecTexte('La compatibilité entre AM et KB est bonne.'), 'pourcentage_compatibilite');
  rouge(avecTexte("Un taux de synergie de 12 pour cent est observé."), 'pourcentage_compatibilite');
});
test("mutation rouge 5 : décision d'emploi", () => {
  for (const t of [
    'Nous recommandons de recruter KB.',
    'Il faut promouvoir AM.',
    'Licencier SR est envisageable.',
    'Une affectation de HT à un autre poste est conseillée.',
    'Nous suggérons de sélectionner le candidat le plus ouvert.',
    "Il convient d'évaluer la performance des salariés.",
    'Muter KB serait utile.',
  ]) rouge(avecTexte(t), 'decision_emploi');
});
test('mutation rouge 6 : moyenne nationale rattachée à une personne', () => {
  for (const t of [
    'KB, de culture marocaine, préfère la hiérarchie.',
    "Selon Hofstede, AM tolère mal l'incertitude.",
    'SR est de nationalité française.',
    "Karim vient d'un pays à forte distance hiérarchique.",
  ]) rouge(avecTexte(t), 'moyenne_nationale_a_personne');
});

// ------------------------------------------------ références
test('mutation rouge references : auteur et année hors liste', () => {
  rouge(avecTexte('Voir Smith, 2010 pour le détail.'), 'references');
  rouge(avecTexte('Voir Smith et al. pour le détail.'), 'references');
  rouge(avecTexte('Voir Edmondson, 2005 pour le détail.'), 'references');
});
test('mutation rouge references : statut de contrôle retiré ou invalide', () => {
  for (const statut of ['vérifiée', 'à vérifier', undefined]) {
    const r = copie(sain);
    if (statut === undefined) delete r.references[0].statut; else r.references[0].statut = statut;
    rouge(r, 'references');
  }
});
test('mutation rouge references : « source contrôlée » sans contrôleur, sans date ou absente du registre', () => {
  const r = copie(sain);
  r.references[0].statut = 'source contrôlée';
  rouge(r, 'references');
  r.references[0].controlee_par = 'Amine Mansouri';
  rouge(r, 'references');
  r.references[0].controlee_le = '2026-10-22';
  rouge(r, 'references'); // contrôle revendiqué mais le registre ne le porte pas
  const registre = copie(references);
  Object.assign(registre.references.find((x) => x.id === r.references[0].id), { statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' });
  assert.deepEqual(auditer({ rapport: r, faits, cas, profils, references: registre }).defauts, []);
  // l'inverse : le registre porte le contrôle, le rapport présente encore « à contrôler »
  const r2 = copie(sain);
  assert.ok(auditer({ rapport: r2, faits, cas, profils, references: registre }).comptes.references > 0);
});
test('mutation rouge references : id hors liste', () => {
  const r = copie(sain);
  r.references.push({ id: 'dupont-2020', citation: 'Dupont, 2020', statut: 'source à contrôler' });
  rouge(r, 'references');
});
test('mutation rouge references : référence citée mais absente de references', () => {
  const r = copie(sain);
  r.references = r.references.filter((x) => x.id !== 'edmondson-1999');
  rouge(r, 'references');
});
test('mutation rouge references : reference_id de recommandation hors liste ou non listé', () => {
  const r = copie(sain);
  r.recommandations[0].preuve.reference_id = 'inventee-2020';
  rouge(r, 'references');
  const r2 = copie(sain);
  r2.recommandations[0].preuve.reference_id = 'bell-2007';
  rouge(r2, 'references');
});
test('référence interculturelle citée sans liste : défaut ; avec liste et mention : vert', () => {
  const texte = 'La carte culturelle de Meyer éclaire les frottements entre sites.';
  rouge(avecTexte(texte), 'references');
  const r = avecTexte(texte);
  r.references.push({ id: 'meyer-2014', citation: 'Meyer, 2014, The Culture Map', statut: 'source à contrôler' });
  vert(r);
});

// ------------------------------------------------ structure
test('mutation rouge structure : chaque attribut de recommandation retiré', () => {
  for (const k of ['donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
    const r = copie(sain);
    r.recommandations[0][k] = '  ';
    rouge(r, 'structure');
    const r2 = copie(sain);
    delete r2.recommandations[0][k];
    rouge(r2, 'structure');
  }
  const r = copie(sain);
  delete r.recommandations[0].preuve.niveau;
  rouge(r, 'structure');
});
test('mutation rouge structure : preuve source sans reference_id', () => {
  const r = copie(sain);
  r.recommandations[0].preuve.reference_id = null;
  rouge(r, 'structure');
});
test('mutation rouge structure : statut manquant, hypothèse sans confiance ni vérification', () => {
  const r = copie(sain);
  delete r.niveaux[0].sections[0].paragraphes[1].statut;
  rouge(r, 'structure');
  const r2 = copie(sain);
  r2.niveaux[0].sections[0].paragraphes[0].confiance = '';
  rouge(r2, 'structure');
  const r3 = copie(sain);
  r3.niveaux[0].sections[0].paragraphes[0].verification = ' ';
  rouge(r3, 'structure');
});
test('mutation rouge structure : niveau manquant', () => {
  for (let i = 0; i < 5; i++) {
    const r = copie(sain);
    r.niveaux.splice(i, 1);
    rouge(r, 'structure');
  }
});

// ------------------------------------------------ faux positifs à éviter
test('nombres légitimes : formats 3,25 et 3.25, entiers, codes, horizons, normes, années, ordinaux', () => {
  vert(avecTexte('KB est à 3.25 puis à 3,25 ; 49 et 76 figurent dans les faits ; la facette N6 et le code AM-KB sont des identifiants.'));
  vert(avecTexte('Les jalons sont à 30, 60 et 90 jours ; 5 domaines, 30 facettes, 6 relations, 4 personnes, échelle de 24 à 120.'));
  vert(avecTexte('La loi 65-99, la loi 09-08, le règlement 2024/1689 et la norme ISO 10667 sont cités ; Edmondson, 1999 aussi.'));
  vert(avecTexte('Pour le 1er jalon, voir la section 4 du niveau 3.'));
  vert(avecTexte("L'organisation compte 250 salariés et un site à Dubaï ouvert en 18 mois."));
});
test('faux positifs lexicaux : mots voisins légitimes', () => {
  vert(avecTexte("Écarter l'hypothèse d'un blocage suppose un entretien ; la sélection des blocs est faite par un script."));
  vert(avecTexte('Le dispositif est compatible avec la loi 09-08 ; un coaching et une formation sont proposés pour développer des comportements.'));
  vert(avecTexte('Le supérieur hiérarchique et les sites ne sont pas comparés.'));
});
test('phrases qui nient : tolérées', () => {
  const niees = [
    "Aucune comparaison à une population n'est faite.",
    "Aucune moyenne, aucune norme et aucun percentile ne sont utilisés.",
    'Ce rapport ne prédit pas la performance et ne garantit pas un résultat.',
    "Aucun type de personnalité n'est attribué.",
    "Il n'y a aucun pourcentage de compatibilité.",
    "Aucune compatibilité n'est calculée entre AM et KB.",
    "Aucune décision d'emploi (recrutement, promotion, licenciement, affectation) ne peut s'appuyer sur ce rapport.",
    'Ce rapport ne sert pas à recruter ni à promouvoir.',
    "Aucune moyenne nationale n'est attribuée à AM ni à Karim.",
    "Le propos n'est pas un diagnostic.",
  ];
  for (const t of niees) vert(avecTexte(t));
});
test('une négation qui suit le terme ne le protège pas', () => {
  rouge(avecTexte('Recrutez KB, aucune réserve.'), 'decision_emploi');
});
test('la négation ne couvre que sa proposition (virgule hors parenthèses)', () => {
  rouge(avecTexte('Sans cette précision, nous recommandons de recruter KB.'), 'decision_emploi');
  rouge(avecTexte('Sans cette précision, AM se situe au-dessus de la moyenne.'), 'comparaison_population');
  rouge(avecTexte("Aucune réserve, AM et KB affichent 80 % d'affinité."), 'pourcentage_compatibilite');
  vert(avecTexte("Aucune décision d'emploi (recrutement, promotion, licenciement) ne peut s'appuyer sur ce rapport."));
  vert(avecTexte("Aucune décision de recrutement, ni promotion, ni licenciement ne peut s'appuyer sur ce rapport."));
});
test('un défaut porte catégorie, id, extrait et message', () => {
  const d = run(avecTexte('Nous recommandons de recruter KB.')).defauts[0];
  assert.ok(d.categorie && d.id && d.extrait && d.message);
  assert.ok(d.id.includes('n1-p1'));
});
test('identifiants techniques (version, empreinte, bloc_ids) ne comptent pas comme nombres', () => {
  const r = copie(sain);
  r.version = 'r-1.0';
  r.empreinte_entrees = '9f2c4ab1e77d00123';
  r.niveaux[0].sections[0].paragraphes[0].bloc_ids = ['E6/milieu', 'N1/haut'];
  vert(r);
});
test('entrées vides : l’audit ne plante pas', () => {
  const { comptes } = auditer({ rapport: sain, faits: {}, cas: {}, profils: [], references });
  assert.equal(typeof comptes.chiffre_absent_des_entrees, 'number');
});

// ------------------------------------------------ CLI
const cli = (rapportChemin) =>
  spawnSync(
    process.execPath,
    [ici('./audit-cli.mjs'), rapportChemin, ici('./fixtures/faits.json'), ici('./fixtures/cas.json'), ici('./fixtures/profils.json'), ici('../references-autorisees.json')],
    { encoding: 'utf8' },
  );
test('CLI : rapport sain, code 0 et six catégories affichées à zéro', () => {
  const r = cli(ici('./fixtures/rapport-sain.json'));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const c of CATEGORIES) assert.match(r.stdout, new RegExp(`${c}\\s+0`));
});
test('CLI : rapport muté, code 1', () => {
  const chemin = join(mkdtempSync(join(tmpdir(), 'audit-')), 'rapport.json');
  writeFileSync(chemin, JSON.stringify(avecTexte('Nous recommandons de recruter KB.')));
  const r = cli(chemin);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /decision_emploi\s+[1-9]/);
});
test('CLI : usage incorrect, code 2', () => {
  assert.equal(spawnSync(process.execPath, [ici('./audit-cli.mjs')], { encoding: 'utf8' }).status, 2);
});

test('faux positif évité : le nom du domaine « Névrosisme » n’est pas une étiquette de type', () => {
  const r = run(avecTexte('Le domaine Névrosisme est au milieu de l’échelle pour KB.'));
  assert.equal(r.comptes.terme_interdit ?? 0, 0, JSON.stringify(r.defauts));
});

test('mutation rouge : une source inventée écrite « Nom année » sans virgule est signalée', () => {
  rouge(avecTexte('Voir Smith 2019 pour le détail.'), 'references');
  rouge(avecTexte('Selon Durand 2021, la composition compte.'), 'references');
});

// ------------------------------------------------ visibilité du statut de contrôle dans le rendu (option html)
const fusion = (rapport, html) => auditer({ rapport, faits, cas, profils, references, html });
const rendu = (rapport) => rendreHtml({ rapport, cas: { organisation: { nom: 'X (fictif)' }, etiquette: 'FICTIF' }, faits: {}, profils: [], bib: { facettes: [] } });

test('rendu : le statut de contrôle de chaque référence est visible dans la liste et dans le bandeau (audit vert)', () => {
  const r = copie(sain);
  assert.deepEqual(fusion(r, rendu(r)).defauts, []);
});

test('mutation rouge rendu : bandeau absent, compteur faux, colonne ou cellule de statut retirées', () => {
  const r = copie(sain);
  const html = rendu(r);
  const n = r.references.length;
  const mutations = {
    'bandeau absent': html.replace('id="bandeau-relecture"', 'id="autre"'),
    'compteur faux': html.replace(`${n} références à contrôler`, `${n + 1} références à contrôler`),
    'colonne retirée': html.replace('<th scope="col">Source contrôlée</th>', '<th scope="col">Autre</th>'),
    'cellule retirée': html.replace('data-controle="non"', 'data-x="non"'),
    'cellule inversée': html.replace('data-controle="non"', 'data-controle="oui"')
  };
  for (const [nom, h] of Object.entries(mutations)) {
    assert.notEqual(h, html, nom);
    assert.ok(fusion(r, h).comptes.references > 0, nom);
  }
});

test('rendu : une référence contrôlée est vue « oui » et le bandeau ne réclame plus que celles qui restent', () => {
  const r = copie(sain);
  const registre = copie(references);
  Object.assign(registre.references.find((x) => x.id === r.references[0].id), { statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' });
  Object.assign(r.references[0], { statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' });
  const html = rendu(r);
  assert.ok(html.includes('data-controle="oui"') && html.includes('1 référence à contrôler'));
  assert.deepEqual(auditer({ rapport: r, faits, cas, profils, references: registre, html }).defauts, []);
});

test('CLI avec --html : audit du rendu, code 0 puis code 1 si le compteur du bandeau est faux', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'audit-html-'));
  const r = copie(sain);
  const rapportChemin = join(dossier, 'rapport.json');
  writeFileSync(rapportChemin, JSON.stringify(r));
  const html = rendu(r);
  const bon = join(dossier, 'bon.html');
  const mauvais = join(dossier, 'mauvais.html');
  writeFileSync(bon, html);
  writeFileSync(mauvais, html.replace(`${r.references.length} références à contrôler`, '0 référence à contrôler'));
  const lancer = (h) => spawnSync(process.execPath, [ici('./audit-cli.mjs'), rapportChemin, ici('./fixtures/faits.json'), ici('./fixtures/cas.json'), ici('./fixtures/profils.json'), ici('../references-autorisees.json'), '--html', h], { encoding: 'utf8' });
  assert.equal(lancer(bon).status, 0, lancer(bon).stdout);
  assert.equal(lancer(mauvais).status, 1);
});
