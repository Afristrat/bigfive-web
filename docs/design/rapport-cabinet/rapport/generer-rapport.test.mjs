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

test('assemblage : niveaux triés dans l’ordre du mandat, références citées « source à contrôler »', () => {
  const r = assembler(ctx, [faux('n5-accompagnement', 'Plan', 'x'), faux('n1-individuel', 'Ind', 'Selon Edmondson 1999, un climat sûr aide.', 'edmondson-1999')]);
  assert.deepEqual(r.niveaux.map((n) => n.id), ['n1-individuel', 'n5-accompagnement']);
  assert.deepEqual(r.references, [{ id: 'edmondson-1999', citation: 'Edmondson, 1999, Administrative Science Quarterly', statut: 'source à contrôler' }]);
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

test('assemblage : apostrophes courbes dans les textes, identifiants intacts', () => {
  const m = { construire: () => ({ niveau: { id: 'n1-individuel', titre: "Titre d'un chapitre", sections: [section('n1-s', "Section d'essai", [paragraphe('n1-p1', "L'équipe d'AM")])] }, recommandations: [] }) };
  const r = assembler(ctx, [m]);
  assert.equal(r.niveaux[0].titre, 'Titre d’un chapitre');
  assert.equal(r.niveaux[0].sections[0].paragraphes[0].texte, 'L’équipe d’AM');
  assert.equal(r.niveaux[0].id, 'n1-individuel');
});

test('assemblage : une source contrôlée au registre (contrôleur ET date) est reprise ; un contrôle incomplet reste « à contrôler »', () => {
  const registre = (extra) => ({ references: [{ ...refs.references[0], statut: 'source contrôlée', ...extra }] });
  const m = faux('n1-individuel', 'Ind', 'Selon Edmondson 1999, un climat sûr aide.', 'edmondson-1999');
  const ok = assembler({ ...ctx, refs: registre({ controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' }) }, [m]);
  assert.deepEqual(ok.references, [{ id: 'edmondson-1999', citation: 'Edmondson, 1999, Administrative Science Quarterly', statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' }]);
  for (const extra of [{}, { controlee_par: 'Amine Mansouri' }, { controlee_le: '2026-10-22' }, { controlee_par: 'Amine Mansouri', controlee_le: '22/10/2026' }]) {
    const r = assembler({ ...ctx, refs: registre(extra) }, [m]);
    assert.deepEqual(r.references.map((x) => x.statut), ['source à contrôler'], JSON.stringify(extra));
    assert.equal(r.references[0].controlee_par, undefined);
  }
});

test('assemblage : l’état de relecture des blocs cités est figé dans le rapport, depuis la bibliothèque', () => {
  const bib = { facettes: [{ code: 'N1', niveaux: { bas: { relecture: 'relue', relue_par: 'Nezha Bentara', relue_le: '2026-10-21' }, haut: { relecture: 'non relue' } } }] };
  const m = { construire: () => ({ niveau: { id: 'n1-individuel', titre: 'T', sections: [section('s', 'S', [paragraphe('p1', 'x', { bloc_ids: ['N1/haut', 'N1/bas', 'N1/bas'] })])] }, recommandations: [] }) };
  const r = assembler({ ...ctx, bib }, [m]);
  assert.deepEqual(Object.keys(r.relecture.blocs), ['N1/bas', 'N1/haut']);
  assert.equal(r.relecture.blocs['N1/bas'].relue_par, 'Nezha Bentara');
  assert.equal(r.relecture.blocs['N1/haut'].relecture, 'non relue');
  assert.equal(assembler(ctx, [m]).relecture, undefined, 'sans bibliothèque, aucun état inventé');
});

test('les avertissements ne portent plus la relecture ni les sources : le bandeau s’en charge', () => {
  const tout = AVERTISSEMENTS.join(' ');
  assert.ok(!/relus par un humain|non vérifiées|bloc non relu/.test(tout));
  assert.ok(/non calibrées/.test(tout));
});

test('assemblage réel : aucun « bloc non relu » ni « à vérifier » de contrôle dans le rapport, un instantané de relecture pour chaque bloc cité', async () => {
  const rapport = assembler(chargerContexte(), await chargerModules());
  const json = JSON.stringify(rapport);
  assert.equal((json.match(/non relus?\b/g) ?? []).length, 0);
  assert.equal((json.match(/référence[s]? à vérifier|, à vérifier\)|\(à vérifier\)/g) ?? []).length, 0);
  const cites = new Set(rapport.niveaux.flatMap((n) => n.sections).flatMap((s) => s.paragraphes).flatMap((p) => p.bloc_ids ?? []));
  assert.deepEqual(Object.keys(rapport.relecture.blocs).sort(), [...cites].sort());
  assert.ok(rapport.references.length > 0 && rapport.references.every((x) => x.statut === 'source à contrôler'));
});
