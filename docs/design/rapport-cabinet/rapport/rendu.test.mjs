// node --test "docs/design/rapport-cabinet/rapport/rendu.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rendreHtml } from './rendu.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const lire = (...p) => JSON.parse(fs.readFileSync(path.join(here, ...p), 'utf-8'));
const rapport = lire('fixtures', 'rapport-rendu.json');
const cas = lire('..', 'audit', 'fixtures', 'cas.json');
const faits = lire('..', 'audit', 'fixtures', 'faits.json');
const profils = lire('..', '..', 'profils-fictifs', 'profils.json');
const bib = lire('..', '..', 'bibliotheque-textes', 'facettes.json');
const entree = { rapport, cas, faits, profils, bib };
const html = rendreHtml(entree);

test('les cinq ancres de niveaux sont présentes, dans l\'ordre, chacune sur une section avec un h2', () => {
  const ids = ['n1-individuel', 'n2-relations', 'n3-equipe', 'n4-organisation', 'n5-accompagnement'];
  let pos = -1;
  for (const id of ids) {
    const re = new RegExp(`<section class="niveau[^"]*" id="${id}"><h2>`);
    const m = re.exec(html);
    assert.ok(m, `section ${id} avec h2`);
    assert.ok(m.index > pos, `${id} dans l'ordre`);
    pos = m.index;
    assert.ok(html.includes(`href="#${id}"`), `lien de navigation vers ${id}`);
  }
});

test('un niveau absent du rapport garde son ancre', () => {
  const h = rendreHtml({ ...entree, rapport: { ...rapport, niveaux: rapport.niveaux.slice(0, 2), recommandations: [] } });
  for (const id of ['n3-equipe', 'n4-organisation', 'n5-accompagnement']) assert.ok(h.includes(`id="${id}"`));
  assert.ok(h.includes('n\'est pas produit'));
});

test('échappement : < et & d\'un titre, et aucune injection depuis le rapport', () => {
  assert.ok(html.includes('Diversité &amp; angles morts &lt;test&gt;'));
  const piege = structuredClone(rapport);
  piege.niveaux[0].sections[0].titre = '<img src=x onerror=alert(1)>';
  piege.niveaux[0].sections[0].paragraphes[0].texte = '<script>alert(2)</script>';
  piege.recommandations[0].risque = '"><script>alert(3)</script>';
  piege.avertissements = ['<b onclick=x>'];
  const h = rendreHtml({ ...entree, rapport: piege });
  assert.ok(!h.includes('<img src=x'));
  assert.ok(!h.includes('<script>alert'));
  assert.ok(!h.includes('<b onclick'));
  assert.ok(h.includes('&lt;script&gt;alert(2)&lt;/script&gt;'));
});

test('chaque recommandation porte ses sept libellés', () => {
  const cartes = html.split('<article class="reco"').slice(1);
  assert.equal(cartes.length, rapport.recommandations.length);
  for (const c of cartes) {
    for (const l of ['Donnée', 'Contexte', 'Preuve', 'Risque', 'Responsable', 'Horizon', 'Indicateur']) assert.ok(c.includes(`<dt>${l}</dt>`), l);
  }
});

test('les références sont listées avec « à vérifier » et la preuve source y renvoie', () => {
  assert.ok(html.includes('id="ref-edmondson-1999"'));
  assert.ok(html.includes('href="#ref-edmondson-1999"'));
  assert.ok((html.match(/\(à vérifier\)/g) ?? []).length >= rapport.references.length);
});

test('chaque hypothèse affiche statut, confiance et vérification ; un constaté n\'en affiche pas', () => {
  const paras = html.split('<div class="para ').slice(1).map((s) => s.split('</div>')[0]);
  const hyp = paras.filter((p) => p.startsWith('hypothese'));
  const nbHyp = rapport.niveaux.flatMap((n) => n.sections).flatMap((s) => s.paragraphes).filter((p) => p.statut === 'hypothese').length;
  assert.equal(hyp.length, nbHyp);
  for (const p of hyp) {
    assert.ok(p.includes('>Hypothèse</span>'));
    assert.ok(p.includes('<dt>Confiance</dt>') && p.includes('<dt>Vérification</dt>'));
  }
  for (const p of paras.filter((q) => q.startsWith('constate'))) {
    assert.ok(p.includes('>Constaté</span>'));
    assert.ok(!p.includes('<dt>Confiance</dt>'));
  }
});

test('« bloc non relu » apparaît quand des bloc_ids sont cités, pas autrement', () => {
  assert.ok(html.includes('<code>E6/milieu</code>') && html.includes('bloc non relu</span>'));
  const sans = structuredClone(rapport);
  for (const n of sans.niveaux) for (const s of n.sections) for (const p of s.paragraphes) p.bloc_ids = [];
  assert.ok(!rendreHtml({ ...entree, rapport: sans }).includes('class="blocs"'));
});

test('aucun avatar animé : pas de classe avatar, pas de cligne ni de flotte', () => {
  assert.ok(html.includes('class="initiales"'));
  assert.ok(!/class="avatar|\.avatar|@keyframes (cligne|flotte)|class="oeil/.test(html));
});

test('avertissements en tête, avant la navigation', () => {
  const iAvert = html.indexOf('class="avert"');
  assert.ok(iAvert > 0 && iAvert < html.indexOf('class="toc"'));
  for (const motif of ['Cas fictif', 'AM est estimé', 'comparaison à une population', 'décision d\'emploi', 'non relus', 'non calibrées', 'consultant qualifié']) {
    assert.ok(html.includes(motif), motif);
  }
});

test('visuels animés réutilisés, mouvement coupé sous reduced-motion et à l\'impression, liens internes interceptés', () => {
  assert.ok(html.includes('class="radar anim"') && html.includes('class="halteres anim"') && html.includes('class="chaleur anim"'));
  assert.ok(html.includes('prefers-reduced-motion:reduce') && html.includes('@media print'));
  assert.ok(html.includes('a[href^="#"]') && html.includes('beforeprint'));
  assert.ok(html.includes('prefers-color-scheme:dark') && html.includes('name="viewport"'));
});

test('aucun tiret cadratin ni demi-cadratin dans le document produit', () => {
  assert.ok(!/[–—]/.test(html));
});

test('déterminisme', () => {
  assert.equal(rendreHtml(entree), rendreHtml(structuredClone(entree)));
});

test('variante docx : ni svg, ni script, ni style', () => {
  const d = rendreHtml({ ...entree, variante: 'docx' });
  assert.ok(!/<svg|<script|<style/.test(d));
  assert.ok(d.includes('id="n1-individuel"') && d.includes('<dt>Donnée</dt>'));
});

test('le document porte une politique CSP qui ferme toute sortie réseau', async () => {
  const { rendreHtml } = await import('./rendu.mjs');
  const rapport = JSON.parse(fs.readFileSync(new URL('./fixtures/rapport-rendu.json', import.meta.url), 'utf-8'));
  const html = rendreHtml({ rapport, cas: { organisation: { nom: 'X (fictif)' }, etiquette: 'FICTIF' }, faits: {}, profils: [], bib: { facettes: [] } });
  assert.match(html, /Content-Security-Policy" content="default-src 'none'/);
  assert.doesNotMatch(html, /connect-src|img-src https?:/);
});
