import test from 'node:test';
import assert from 'node:assert/strict';
import { assembler, AVERTISSEMENTS, ORDRE_NIVEAUX, chargerContexte, chargerModules } from './generer-rapport.mjs';
import { paragraphe, recommandation, section } from './outils.mjs';

const refs = {
  references: [
    { id: 'edmondson-1999', auteurs: ['Edmondson'], annee: 1999, citation: 'Edmondson, 1999, Administrative Science Quarterly' },
    { id: 'hofstede', auteurs: ['Hofstede'], annee: null, citation: 'Hofstede (dimensions culturelles nationales)' }
  ]
};
const ok = { donnee: 'd', contexte: 'c', risque: 'r', responsable: 'rôle', horizon: '30 jours', indicateur: 'i' };
const faux = (id, titre, texte, reco) => ({
  construire: () => ({
    niveau: { id, titre, sections: [section(`${id}-s`, 'S', [paragraphe(`${id}-p1`, texte)])] },
    recommandations: reco ? [recommandation(`REC-${id}`, id, 't', { ...ok, preuve: { niveau: 'source', reference_id: reco } })] : []
  })
});
const ctx = { cas: { etiquette: 'FICTIF' }, faits: { empreinte_entrees: 'abc' }, refs };

test('assemblage : niveaux triés dans l’ordre du mandat, références citées marquées « à vérifier »', () => {
  const r = assembler(ctx, [faux('n5-accompagnement', 'Plan', 'x'), faux('n1-individuel', 'Ind', 'Selon Edmondson 1999, un climat sûr aide.', 'edmondson-1999')]);
  assert.deepEqual(r.niveaux.map((n) => n.id), ['n1-individuel', 'n5-accompagnement']);
  assert.deepEqual(r.references, [{ id: 'edmondson-1999', citation: 'Edmondson, 1999, Administrative Science Quarterly', statut: 'à vérifier' }]);
  assert.equal(r.empreinte_entrees, 'abc');
  assert.equal(r.avertissements, AVERTISSEMENTS);
});

test('assemblage : une référence citée dans un texte sans recommandation est tout de même listée', () => {
  const r = assembler(ctx, [faux('n3-equipe', 'E', 'Les grilles de Hofstede décrivent des pays, non des personnes.')]);
  assert.deepEqual(r.references.map((x) => x.id), ['hofstede']);
});

test('assemblage : un nom d’auteur seul, sans année, suffit à lister la référence', () => {
  const r = assembler(ctx, [faux('n4-organisation', 'O', 'La culture est lue avec Edmondson et avec les grilles de Hofstede.')]);
  assert.deepEqual(r.references.map((x) => x.id).sort(), ['edmondson-1999', 'hofstede']);
});

test('assemblage : aucun doublon d’identifiant toléré', () => {
  assert.throws(() => assembler(ctx, [faux('n1-individuel', 'A', 'x'), faux('n1-individuel', 'B', 'y')]), /double/);
});

test('assemblage réel : les cinq niveaux dans l’ordre, déterministe', async () => {
  const c = chargerContexte();
  const m = await chargerModules();
  const a = JSON.stringify(assembler(c, m));
  const b = JSON.stringify(assembler(chargerContexte(), await chargerModules()));
  assert.equal(a, b);
  assert.deepEqual(JSON.parse(a).niveaux.map((n) => n.id), ORDRE_NIVEAUX);
});
