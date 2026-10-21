import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fmt, accorder, liste, paragraphe, recommandation, bloc, bilanRelecture, blocRelu, sourceControlee, dateIso, dateFr, instantaneBlocs } from './outils.mjs';

const bib = JSON.parse(fs.readFileSync(new URL('../../bibliotheque-textes/facettes.json', import.meta.url), 'utf-8'));
const ok = { donnee: 'd', contexte: 'c', risque: 'r', responsable: 'rôle', horizon: '30 jours', indicateur: 'i' };

test('fmt : virgule décimale, deux décimales au plus', () => {
  assert.equal(fmt(3), '3');
  assert.equal(fmt(3.25), '3,25');
  assert.equal(fmt(0.4583), '0,46');
  assert.equal(fmt(1.5), '1,5');
  assert.throws(() => fmt(NaN));
});

test('accorder : trois formes, défaut sans accord', () => {
  assert.equal(accorder('x {a|b|c} y', 'm'), 'x a y');
  assert.equal(accorder('x {a|b|c} y', 'f'), 'x b y');
  assert.equal(accorder('x {a|b|c} y'), 'x c y');
  assert.equal(accorder('x {a|b|c} y', '?'), 'x c y');
});

test('liste', () => {
  assert.equal(liste(['a']), 'a');
  assert.equal(liste(['a', 'b']), 'a et b');
  assert.equal(liste(['a', 'b', 'c']), 'a, b et c');
});

test('paragraphe : hypothèse sans confiance ou vérification refusée', () => {
  assert.throws(() => paragraphe('p', 't', { statut: 'hypothese' }));
  assert.throws(() => paragraphe('p', 't', { statut: 'hypothese', confiance: 'moyenne' }));
  assert.throws(() => paragraphe('p', 't', { statut: 'hypothese', confiance: 'haute', verification: 'v' }));
  assert.equal(paragraphe('p', 't', { statut: 'hypothese', confiance: 'faible', verification: 'v' }).confiance, 'faible');
  assert.throws(() => paragraphe('p', ''));
});

test('recommandation : chacun des 7 attributs est requis ; une source exige une référence', () => {
  assert.equal(recommandation('R', 'n1', 't', ok).preuve.niveau, 'hypothese');
  for (const k of Object.keys(ok)) assert.throws(() => recommandation('R', 'n1', 't', { ...ok, [k]: '' }), new RegExp(k));
  assert.throws(() => recommandation('R', 'n1', 't', { ...ok, preuve: { niveau: 'source' } }));
  assert.equal(recommandation('R', 'n1', 't', { ...ok, preuve: { niveau: 'source', reference_id: 'edmondson-1999' } }).preuve.reference_id, 'edmondson-1999');
});

test('bloc : lit la bibliothèque, marque « non relue », refuse un code inconnu', () => {
  const b = bloc(bib, 'N6', 'haut');
  assert.equal(b.id, 'N6/haut');
  assert.equal(b.relecture, 'non relue');
  assert.equal(b.relue_par, null);
  assert.equal(b.relue_le, null);
  assert.equal(b.description.length, 2);
  assert.throws(() => bloc(bib, 'Z9', 'haut'));
  assert.throws(() => bloc(bib, 'N6', 'extreme'));
});

// ------------------------------------------------ relecture : états et bilan calculé
const para = (id, bloc_ids) => ({ id, texte: 't', statut: 'constate', bloc_ids });
const niv = (id, ...blocs) => ({ id, titre: id, sections: [{ id: id + '-s', titre: 's', paragraphes: blocs.map((b, i) => para(id + '-p' + i, b)) }] });
const relu = { relecture: 'relue', relue_par: 'Nezha Bentara', relue_le: '2026-10-21' };
const ref = (id, extra = {}) => ({ id, citation: id, statut: 'source à contrôler', ...extra });

test('relue : exige un relecteur nommé ET une date ISO réelle, sinon le bloc reste en attente', () => {
  assert.equal(blocRelu(relu), true);
  assert.equal(blocRelu({ relecture: 'relue' }), false);
  assert.equal(blocRelu({ ...relu, relue_par: ' ' }), false);
  assert.equal(blocRelu({ ...relu, relue_le: null }), false);
  assert.equal(blocRelu({ ...relu, relue_le: '2026-02-30' }), false);
  assert.equal(blocRelu({ ...relu, relue_le: '21/10/2026' }), false);
  assert.equal(blocRelu({ relecture: 'non relue', relue_par: 'X', relue_le: '2026-10-21' }), false);
  assert.equal(dateIso('2026-10-21'), true);
  assert.equal(dateFr('2026-10-21'), '21/10/2026');
});

test('source contrôlée : même exigence (statut, contrôleur, date)', () => {
  assert.equal(sourceControlee({ statut: 'source contrôlée', controlee_par: 'Amine', controlee_le: '2026-10-21' }), true);
  assert.equal(sourceControlee({ statut: 'source contrôlée', controlee_le: '2026-10-21' }), false);
  assert.equal(sourceControlee({ statut: 'source à contrôler', controlee_par: 'Amine', controlee_le: '2026-10-21' }), false);
});

test('bilan : les compteurs sont calculés sur les blocs cités (sans doublon) et les références listées', () => {
  const rapport = { niveaux: [niv('n1-individuel', ['N1/bas', 'N2/bas'], ['N1/bas']), niv('n2-relations', ['N3/haut'])], references: [ref('a'), ref('b'), ref('c')] };
  const b = bilanRelecture(rapport, bib);
  assert.equal(b.textes, 3);
  assert.equal(b.textesEnAttente, 3);
  assert.equal(b.references, 3);
  assert.equal(b.referencesEnAttente, 3);
  assert.deepEqual(b.parNiveau['n1-individuel'], { cites: 2, enAttente: 2 });
  assert.equal(b.complet, false);
  // un bloc de plus cité : le compteur suit, rien n'est écrit en dur
  rapport.niveaux[1] = niv('n2-relations', ['N3/haut', 'N4/haut']);
  assert.equal(bilanRelecture(rapport, bib).textesEnAttente, 4);
});

test('bilan : l’instantané du rapport prime sur la bibliothèque ; complet seulement si tout est relu ET contrôlé', () => {
  const rapport = { niveaux: [niv('n1-individuel', ['N1/bas', 'N2/bas'])], references: [ref('a')] };
  rapport.relecture = { blocs: { 'N1/bas': relu, 'N2/bas': relu } };
  let b = bilanRelecture(rapport, bib);
  assert.equal(b.textesEnAttente, 0);
  assert.equal(b.referencesEnAttente, 1);
  assert.equal(b.complet, false);
  rapport.references = [ref('a', { statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' })];
  b = bilanRelecture(rapport, bib);
  assert.equal(b.complet, true);
  assert.deepEqual(b.relecteurs, ['Amine Mansouri', 'Nezha Bentara']);
  assert.equal(b.date, '2026-10-22');
  // un seul bloc sans date : le bilan redevient incomplet
  rapport.relecture.blocs['N2/bas'] = { ...relu, relue_le: null };
  assert.equal(bilanRelecture(rapport, bib).complet, false);
});

test('bilan : rien de cité et rien à contrôler ne vaut pas « tout relu » (aucun relecteur nommé)', () => {
  assert.equal(bilanRelecture({ niveaux: [niv('n1-individuel')], references: [] }, bib).complet, false);
});

test('instantané : états des blocs cités depuis la bibliothèque, « non relue » par défaut', () => {
  const s = instantaneBlocs(bib, [niv('n1-individuel', ['N1/bas', 'Z9/bas'])]);
  assert.deepEqual(Object.keys(s), ['N1/bas', 'Z9/bas']);
  assert.equal(s['N1/bas'].relecture, 'non relue');
  assert.equal(s['Z9/bas'].relecture, 'non relue');
});
