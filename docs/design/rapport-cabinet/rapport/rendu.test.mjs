// node --test "docs/design/rapport-cabinet/rapport/rendu.test.mjs"
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rendreHtml } from './rendu.mjs';
import { AVERTISSEMENTS } from './generer-rapport.mjs';

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

test('les références forment un tableau avec la colonne « Source contrôlée » ; la preuve source y renvoie', () => {
  assert.ok(html.includes('<tr id="ref-edmondson-1999">'));
  assert.ok(html.includes('href="#ref-edmondson-1999"'));
  assert.ok(/<th scope="col">Source contrôlée<\/th>/.test(html));
  for (const x of rapport.references) {
    const ligne = new RegExp(`<tr id="ref-${x.id}">([^]*?)</tr>`).exec(html)[1];
    assert.ok(ligne.includes('data-controle="non">Non</td>'), x.id);
  }
  assert.ok(!html.includes('(à vérifier)'), 'plus de « (à vérifier) » répété');
});

test('une source contrôlée affiche Oui, le contrôleur et la date, et perd son repère « source à contrôler »', () => {
  const r = structuredClone(rapport);
  r.references[0] = { ...r.references[0], statut: 'source contrôlée', controlee_par: 'Amine <b>Mansouri</b>', controlee_le: '2026-10-22' };
  const h = rendreHtml({ ...entree, rapport: r });
  const ligne = /<tr id="ref-edmondson-1999">([^]*?)<\/tr>/.exec(h)[1];
  assert.ok(ligne.includes('data-controle="oui">Oui, par Amine &lt;b&gt;Mansouri&lt;/b&gt; le 22/10/2026'));
  const carte = /<article class="reco" id="[^"]*">(?:(?!<\/article>)[^])*href="#ref-edmondson-1999"[^]*?<\/article>/.exec(h)[0];
  assert.ok(!carte.includes('source à contrôler'));
  const carteK = /<article class="reco" id="[^"]*">(?:(?!<\/article>)[^])*href="#ref-kirkpatrick"[^]*?<\/article>/.exec(h)[0];
  assert.ok(carteK.includes('(source à contrôler)'));
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

test('plus aucune étiquette « bloc non relu » sous les paragraphes : le texte type reste tracé, sans statut', () => {
  assert.ok(html.includes('<code>E6/milieu</code>'));
  assert.ok(!/bloc non relu|blocs non relus|class="nonrelu"/.test(html));
  const sans = structuredClone(rapport);
  for (const n of sans.niveaux) for (const s of n.sections) for (const p of s.paragraphes) p.bloc_ids = [];
  assert.ok(!rendreHtml({ ...entree, rapport: sans }).includes('class="blocs"'));
});

test('aucun avatar animé : pas de classe avatar, pas de cligne ni de flotte', () => {
  assert.ok(html.includes('class="initiales"'));
  assert.ok(!/class="avatar|\.avatar|@keyframes (cligne|flotte)|class="oeil/.test(html));
});

test('avertissements en tête, avant la navigation, en une seule liste', () => {
  const h = rendreHtml({ ...entree, rapport: { ...rapport, avertissements: AVERTISSEMENTS } });
  const iAvert = h.indexOf('class="avert"');
  assert.ok(iAvert > 0 && iAvert < h.indexOf('class="toc '));
  for (const motif of ['sont fictifs', 'profil estimé', 'aucune personne n’y est comparée', 'décision d’emploi', 'non calibrées', 'consultant qualifié', 'Document de travail du consultant']) {
    assert.ok(h.includes(motif), motif);
  }
  assert.ok(!h.includes('ne sont pas relus') && !h.includes('non vérifiées'), 'la relecture et les sources vivent dans le bandeau, pas dans les avertissements');
  assert.equal(h.split('class="avert"').length - 1, 1, 'une seule liste d’avertissements');
  assert.equal(h.split('décision d’emploi').length - 1, 1, 'aucun avertissement répété');
});

test('visuels animés réutilisés, mouvement coupé sous reduced-motion et à l\'impression, liens internes interceptés', () => {
  assert.ok(html.includes('class="radar anim"') && html.includes('class="halteres anim"') && html.includes('class="chaleur anim"'));
  assert.ok(html.includes('prefers-reduced-motion:reduce') && html.includes('@media print'));
  assert.ok(html.includes('a[href^="#"]') && html.includes('beforeprint'));
  assert.ok(html.includes('name="viewport"'));
});

test('thème clair par défaut, bascule à trois états en aria-pressed, aucune règle prefers-color-scheme dans la feuille de style', () => {
  assert.ok(html.includes('<html lang="fr" data-theme="light">') && html.includes('name="color-scheme"'));
  for (const v of ['light', 'dark', 'auto']) assert.ok(html.includes('data-theme-choix="' + v + '" aria-pressed='), v);
  assert.ok(html.includes('id="anim" aria-pressed="false"'));
  assert.ok(!/@media \(prefers-color-scheme/.test(html));
});

test('règle d\'or : aucun état masqué hors du bloc @media (prefers-reduced-motion:no-preference)', () => {
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'));
  const marque = '@media (prefers-reduced-motion:no-preference)';
  assert.ok(css.includes(marque));
  const avant = css.slice(0, css.indexOf(marque)).replace(/@keyframes[^\n]*/g, '');
  assert.ok(!/opacity:0[;}]/.test(avant), 'aucun opacity:0 hors du bloc de mouvement');
  assert.ok(css.includes('.js:not(.sans-anim) .reveal{opacity:0'));
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

// ------------------------------------------------ bandeau de relecture, pied de section
const citer = (r, ...ids) => { const c = structuredClone(r); c.niveaux[0].sections[0].paragraphes[0].bloc_ids = ids; return c; };
const bandeauDe = (h) => /<div class="bandeau[^"]*" id="bandeau-relecture"[^>]*>([^]*?)<\/div>/.exec(h)[0];
const texteDe = (h) => h.replace(/<[^>]+>/g, '');
const NB = '\u00a0';
const relu = { relecture: 'relue', relue_par: 'Nezha Bentara', relue_le: '2026-10-21' };
const controlee = { statut: 'source contrôlée', controlee_par: 'Amine Mansouri', controlee_le: '2026-10-22' };

test('bandeau unique en tête, neutre, avant les avertissements : compteurs calculés sur les blocs cités et les références', () => {
  assert.equal(html.split('id="bandeau-relecture"').length - 1, 1);
  assert.ok(html.indexOf('id="bandeau-relecture"') < html.indexOf('class="avert"'));
  const cites = new Set(rapport.niveaux.flatMap((n) => n.sections).flatMap((s) => s.paragraphes).flatMap((p) => p.bloc_ids ?? []));
  const n = cites.size;
  assert.ok(n >= 1);
  const t = texteDe(bandeauDe(html));
  assert.equal(t, `Version de travail, à relire avant remise. ${n} texte${n > 1 ? 's' : ''} type${n > 1 ? 's' : ''} en attente de relecture, ${rapport.references.length} références à contrôler. Relecture et signature${NB}: à faire.`);
  assert.ok(!bandeauDe(html).includes('bandeau ok'));
});

test('bandeau : les compteurs suivent les données (un bloc de plus, un bloc relu, une référence contrôlée)', () => {
  const h3 = rendreHtml({ ...entree, rapport: citer(rapport, 'E6/milieu', 'N1/bas', 'N2/haut') });
  assert.ok(texteDe(bandeauDe(h3)).includes('3 textes types en attente de relecture, 2 références à contrôler.'));
  const r = citer(rapport, 'E6/milieu', 'N1/bas', 'N2/haut');
  r.relecture = { blocs: { 'E6/milieu': relu } };
  r.references[0] = { ...r.references[0], ...controlee };
  const t = texteDe(bandeauDe(rendreHtml({ ...entree, rapport: r })));
  assert.ok(t.includes('2 textes types en attente de relecture, 1 référence à contrôler.'), t);
  const un = texteDe(bandeauDe(rendreHtml({ ...entree, rapport: citer(rapport, 'E6/milieu') })));
  assert.ok(un.includes('1 texte type en attente de relecture'), un);
});

test('bandeau vert uniquement si tout est relu ET contrôlé, avec relecteur(s) et date ; jamais vert sinon', () => {
  const r = citer(rapport, 'E6/milieu', 'N1/bas');
  r.relecture = { blocs: { 'E6/milieu': relu, 'N1/bas': relu } };
  // textes relus, références non contrôlées : pas vert
  let b = bandeauDe(rendreHtml({ ...entree, rapport: r }));
  assert.ok(!b.includes('bandeau ok') && b.includes('Version de travail') && b.includes('Aucun texte type en attente de relecture, 2 références à contrôler'));
  // références contrôlées, un bloc relu sans date : pas vert
  const r2 = structuredClone(r);
  r2.references = r2.references.map((x) => ({ ...x, ...controlee }));
  r2.relecture.blocs['N1/bas'] = { relecture: 'relue', relue_par: 'Nezha Bentara' };
  b = bandeauDe(rendreHtml({ ...entree, rapport: r2 }));
  assert.ok(!b.includes('bandeau ok') && b.includes('1 texte type en attente'));
  // tout relu et contrôlé : vert
  r2.relecture.blocs['N1/bas'] = relu;
  b = bandeauDe(rendreHtml({ ...entree, rapport: r2 }));
  assert.ok(b.includes('class="bandeau ok"'));
  assert.equal(texteDe(b), `Version relue et contrôlée. Relecture${NB}: Amine Mansouri, Nezha Bentara, le 22/10/2026.`);
  assert.ok(!b.includes('Version de travail'));
});

test('bandeau : le nom du relecteur est échappé, la mise en forme reste calme (bordure fine, aucun rouge)', () => {
  const r = citer(rapport, 'E6/milieu');
  r.relecture = { blocs: { 'E6/milieu': { ...relu, relue_par: '<img src=x>' } } };
  r.references = r.references.map((x) => ({ ...x, ...controlee }));
  const h = rendreHtml({ ...entree, rapport: r });
  assert.ok(!h.includes('<img src=x>') && h.includes('&lt;img src=x&gt;'));
  const regle = /\.bandeau\{[^}]*\}/.exec(h)[0];
  assert.ok(regle.includes('border:1px solid var(--ln)'));
  assert.ok(!/red|#[ef][0-9a-f]{2}[0-4][0-9a-f]{3}|border:[2-9]px/i.test(regle));
});

test('pied de section : au plus un repère discret par chapitre, seulement si le chapitre cite des textes types', () => {
  const pieds = html.match(/<p class="pied">[^<]*<\/p>/g) ?? [];
  assert.equal(pieds.length, 1, 'un seul chapitre de la fixture cite un bloc');
  assert.equal(texteDe(pieds[0]), `Textes types de ce chapitre${NB}: relecture en attente`);
  assert.ok(html.indexOf('class="pied"') > html.indexOf('<section class="niveau" id="n1-individuel">') && html.indexOf('class="pied"') < html.indexOf('id="n2-relations"'));
  const r = citer(rapport, 'E6/milieu');
  r.relecture = { blocs: { 'E6/milieu': relu } };
  assert.ok(rendreHtml({ ...entree, rapport: r }).includes(`Textes types de ce chapitre${NB}: relus`));
  const sans = structuredClone(rapport);
  for (const n of sans.niveaux) for (const s of n.sections) for (const p of s.paragraphes) p.bloc_ids = [];
  assert.ok(!rendreHtml({ ...entree, rapport: sans }).includes('class="pied"'));
});

test('variante docx : bandeau et colonne « Source contrôlée » présents, sans svg ni script', () => {
  const d = rendreHtml({ ...entree, variante: 'docx' });
  assert.ok(d.includes('id="bandeau-relecture"') && /<th scope="col">Source contrôlée<\/th>/.test(d));
  assert.ok(!/<svg|<script|<style/.test(d));
});
