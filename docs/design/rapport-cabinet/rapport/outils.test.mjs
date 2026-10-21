import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fmt, accorder, liste, paragraphe, recommandation, bloc } from './outils.mjs';

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
  assert.equal(b.description.length, 2);
  assert.throws(() => bloc(bib, 'Z9', 'haut'));
  assert.throws(() => bloc(bib, 'N6', 'extreme'));
});
