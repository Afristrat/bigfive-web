import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construire } from './niveau34-equipe-organisation.mjs';
import { auditer } from '../audit/audit.mjs';

const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
const base = () => ({
  cas: lire('../cas/cas-demo.json'),
  faits: lire('../sortie/faits.json'),
  profils: lire('../../profils-fictifs/profils.json'),
  bib: lire('../../bibliotheque-textes/facettes.json'),
  regles: lire('../moteur/regles.json'),
  refs: lire('../references-autorisees.json')
});
const copie = (x) => structuredClone(x);

// Les textes sont comparés avec des apostrophes droites ; les apostrophes courbes sont vérifiées à part.
const norm = (t) => t.replace(/’/g, "'");
const paragraphes = (niveau) => niveau.sections.flatMap((s) => s.paragraphes.map((p) => ({ ...p, texte: norm(p.texte) })));
const textesSection = (niveau, id) => niveau.sections.find((x) => x.id === id).paragraphes.map((p) => norm(p.texte)).join('\n');
const texteDe = (niveau) => paragraphes(niveau).map((p) => p.texte).join('\n');
const tout = (r) => [...r.niveaux.flatMap(paragraphes), ...r.recommandations];

// Rapport factice qui ne contient que les deux niveaux et leurs recommandations (forme : audit/fixtures/rapport-sain.json).
function rapportFactice(r, refs) {
  return {
    version: 'r-test',
    empreinte_entrees: 'test',
    etiquette_fictif: 'CAS FICTIF DE DÉMONSTRATION',
    avertissements: ['Ce rapport prépare le travail d’un consultant qualifié, qui le relit et le signe.'],
    niveaux: r.niveaux,
    recommandations: r.recommandations,
    references: r.reference_ids.map((id) => {
      const ref = refs.references.find((x) => x.id === id);
      return { id, citation: ref.citation, statut: 'source à contrôler' };
    })
  };
}
const CATEGORIES_CONTENU = [
  'chiffre_absent_des_entrees',
  'terme_interdit',
  'comparaison_population',
  'pourcentage_compatibilite',
  'decision_emploi',
  'moyenne_nationale_a_personne',
  'references'
];
function auditContenu(ctx, r) {
  const res = auditer({ rapport: rapportFactice(r, ctx.refs), faits: ctx.faits, cas: ctx.cas, profils: ctx.profils, references: ctx.refs });
  return res.defauts.filter((d) => CATEGORIES_CONTENU.includes(d.categorie));
}

test('ids des deux niveaux, titres et sections', () => {
  const ctx = base();
  const r = construire(ctx);
  assert.equal(r.niveaux.length, 2);
  assert.equal(r.niveaux[0].id, 'n3-equipe');
  assert.equal(r.niveaux[1].id, 'n4-organisation');
  for (const n of r.niveaux) {
    assert.ok(n.titre && n.titre.length > 3);
    assert.ok(n.sections.length >= 4, `${n.id} : sections`);
    for (const s of n.sections) assert.ok(s.paragraphes.length >= 1, s.id);
  }
});

test('N4 commence par le seuil de 5 non atteint et reprend la dérogation fidèlement', () => {
  const ctx = base();
  const r = construire(ctx);
  const n4 = r.niveaux[1];
  const premier = paragraphes(n4)[0].texte;
  assert.match(premier, /seuil d'anonymat de 5 personnes n'est pas atteint/);
  assert.match(premier, /4 personnes/);
  const deroge = ctx.faits.organisation.derogation_demonstration;
  assert.ok(paragraphes(n4).some((p) => p.texte === deroge), 'texte de la dérogation repris à l’identique');
  assert.match(premier, /retrouver des personnes/);
});

test('N4 : adéquation, contraintes, volet interculturel et implications présents', () => {
  const r = construire(base());
  const ids = r.niveaux[1].sections.map((s) => s.id);
  for (const s of ['n4-seuil', 'n4-profils', 'n4-adequation', 'n4-contraintes', 'n4-interculturel', 'n4-implications']) {
    assert.ok(ids.includes(s), s);
  }
  const t = texteDe(r.niveaux[1]);
  for (const mot of ['Mintzberg', 'Cameron', 'Quinn', 'March', 'loi 09-08', 'CNDP', 'loi 65-99']) assert.ok(t.includes(mot), mot);
  assert.match(t, /dureté dure/);
  assert.match(t, /dureté négociable/);
  assert.match(t, /valeur centrale|position d'ensemble/);
});

test('consentement équipe retiré : la personne est exclue de N3 et le texte le dit', () => {
  const ctx = base();
  ctx.cas.personnes.find((p) => p.code === 'KB').consentements.equipe = false;
  const r = construire(ctx);
  const n3 = r.niveaux[0];
  const exclusion = paragraphes(n3).filter((p) => /\bKB\b/.test(p.texte));
  assert.equal(exclusion.length, 1);
  assert.match(exclusion[0].texte, /exclusion/);
  assert.match(exclusion[0].texte, /consentement/);
  const reste = paragraphes(n3).filter((p) => p.id !== exclusion[0].id).map((p) => p.texte).join('\n');
  assert.ok(!/\bKB\b|Karim/.test(reste), 'KB absent du reste de N3');
  const recsN3 = r.recommandations.filter((x) => x.niveau === 'n3');
  assert.ok(!/\bKB\b|Karim|Garant de l.exécution/.test(JSON.stringify(recsN3)), 'KB absent des recommandations N3');
  // la dispersion calculée avant le retrait n'est pas reprise
  assert.match(texteDe(n3), /recalcul/);
  assert.deepEqual(auditContenu(ctx, r), []);
});

test('moins de deux personnes consentantes : aucune lecture d’équipe, sans exception', () => {
  const ctx = base();
  for (const p of ctx.cas.personnes) if (p.code !== 'AM') p.consentements.equipe = false;
  const r = construire(ctx);
  assert.match(texteDe(r.niveaux[0]), /Moins de deux personnes/);
  assert.equal(r.niveaux[0].sections.length, 1);
  assert.ok(r.recommandations.length >= 6);
});

test('effectif de 5 simulé : le seuil est atteint et la mention de dérogation disparaît', () => {
  const ctx = base();
  ctx.faits.organisation.n_personnes = 5;
  ctx.faits.organisation.seuil_atteint = true;
  ctx.faits.organisation.derogation_demonstration = null;
  const r = construire(ctx);
  const t = texteDe(r.niveaux[1]);
  assert.match(paragraphes(r.niveaux[1])[0].texte, /seuil d'anonymat de 5 personnes est atteint/);
  assert.ok(!/pas atteint/.test(paragraphes(r.niveaux[1])[0].texte));
  assert.ok(!/dérogation de démonstration|Agrégat montré malgré/i.test(t.replace(/dérogation de démonstration est réservée/, '')), 'pas de dérogation appliquée');
  assert.ok(r.niveaux[1].sections.some((s) => s.id === 'n4-adequation'));
  assert.deepEqual(auditContenu(ctx, r), []);
  const ref = texteDe(construire(base()).niveaux[1]);
  assert.notEqual(t, ref);
});

test('cas réel sous le seuil : la lecture agrégée n’est pas produite', () => {
  const ctx = base();
  ctx.cas.fictif = false;
  const r = construire(ctx);
  const n4 = r.niveaux[1];
  const ids = n4.sections.map((s) => s.id);
  assert.ok(!ids.includes('n4-profils') && !ids.includes('n4-adequation') && !ids.includes('n4-implications'));
  assert.match(texteDe(n4), /n'est pas produite/);
  assert.ok(!texteDe(n4).includes(ctx.faits.organisation.derogation_demonstration));
  assert.ok(ids.includes('n4-contraintes'));
  assert.deepEqual(auditContenu(ctx, r), []);
});

test('consentement organisation manquant : l’agrégat n’est pas produit', () => {
  const ctx = base();
  ctx.cas.personnes.find((p) => p.code === 'SR').consentements.organisation = false;
  const r = construire(ctx);
  const ids = r.niveaux[1].sections.map((s) => s.id);
  assert.ok(!ids.includes('n4-adequation'));
  assert.match(texteDe(r.niveaux[1]), /n'a pas consenti à la lecture organisationnelle/);
  assert.ok(!/\bSR\b|Salma/.test(texteDe(r.niveaux[1])));
});

test('toute lecture est une hypothèse avec confiance et vérification ; statuts valides', () => {
  const r = construire(base());
  let hyp = 0;
  for (const p of r.niveaux.flatMap(paragraphes)) {
    assert.ok(['constate', 'hypothese'].includes(p.statut), p.id);
    if (p.statut === 'hypothese') {
      hyp += 1;
      assert.ok(['faible', 'moyenne', 'elevee'].includes(p.confiance), p.id);
      assert.ok(p.verification && p.verification.length > 15, p.id);
    } else {
      assert.equal(p.confiance, undefined);
    }
  }
  assert.ok(hyp >= 15, `hypothèses : ${hyp}`);
  for (const n of r.niveaux) assert.ok(paragraphes(n).some((p) => p.statut === 'hypothese'), n.id);
});

test('au moins 6 recommandations à 7 attributs, responsables pris dans les rôles du cas', () => {
  const ctx = base();
  const r = construire(ctx);
  assert.ok(r.recommandations.length >= 6);
  const roles = new Set(ctx.cas.personnes.flatMap((p) => [p.role_equipe, p.fonction]));
  for (const x of r.recommandations) {
    for (const k of ['donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur', 'texte']) {
      assert.ok(typeof x[k] === 'string' && x[k].length > 5, `${x.id}.${k}`);
    }
    assert.ok(['source', 'hypothese'].includes(x.preuve.niveau));
    if (x.preuve.niveau === 'source') assert.ok(x.preuve.reference_id);
    assert.ok(roles.has(x.responsable), `${x.id} : responsable « ${x.responsable} » hors des rôles du cas`);
    assert.match(x.horizon, /^(30|60|90) jours/);
    assert.match(x.id, /^REC-N[34]-\d+$/);
    assert.equal(x.niveau, x.id.startsWith('REC-N3') ? 'n3' : 'n4');
  }
});

test('une recommandation porte sur le rôle du seuil d’anonymat', () => {
  const r = construire(base());
  const x = r.recommandations.find((y) => /seuil/.test(y.texte) && /agrégée/.test(y.texte));
  assert.ok(x, 'recommandation sur le seuil');
  assert.match(x.texte, /jamais/);
  assert.match(x.texte, /inférieur à 5/);
});

test('ids uniques (paragraphes, sections, recommandations) et préfixes', () => {
  const r = construire(base());
  const ids = [...r.niveaux.map((n) => n.id), ...r.niveaux.flatMap((n) => n.sections.map((s) => s.id)), ...r.niveaux.flatMap(paragraphes).map((p) => p.id), ...r.recommandations.map((x) => x.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const [i, n] of r.niveaux.entries()) {
    for (const s of n.sections) {
      assert.ok(s.id.startsWith(`n${i + 3}-`), s.id);
      s.paragraphes.forEach((p) => assert.ok(p.id.startsWith(`${s.id}-`), p.id));
    }
  }
});

test('déterminisme : deux appels, mêmes sorties, entrées non modifiées', () => {
  const ctx = base();
  const avant = JSON.stringify(ctx);
  const a = construire(ctx);
  const b = construire(copie(ctx));
  assert.equal(JSON.stringify(a), JSON.stringify(b));
  assert.equal(JSON.stringify(ctx), avant);
});

test('références : seulement des reference_id autorisés, et chaque auteur cité est déclaré', () => {
  const ctx = base();
  const r = construire(ctx);
  const valides = new Set(ctx.refs.references.map((x) => x.id));
  assert.ok(r.reference_ids.length >= 6);
  for (const id of r.reference_ids) assert.ok(valides.has(id), id);
  for (const x of r.recommandations) if (x.preuve.reference_id) assert.ok(r.reference_ids.includes(x.preuve.reference_id));
  const t = r.niveaux.map(texteDe).join('\n') + JSON.stringify(r.recommandations);
  for (const ref of ctx.refs.references) {
    for (const a of ref.auteurs) {
      if (new RegExp(`(?<![\\p{L}])${a}(?![\\p{L}])`, 'u').test(t)) assert.ok(r.reference_ids.includes(ref.id), `${a} cité sans ${ref.id}`);
    }
  }
  for (const id of ['edmondson-1999', 'thompson-1967', 'mintzberg-1979', 'cameron-quinn-1999', 'march-1991']) assert.ok(r.reference_ids.includes(id), id);
  assert.match(texteDe(r.niveaux[0]), /Edmondson/);
  assert.doesNotMatch(texteDe(r.niveaux[0]), /référence à vérifier|, à vérifier\)/, 'le statut de contrôle vit dans la liste des références, pas dans la prose');
});

test('interculturel lu au niveau des organisations et des sites, jamais d’une personne', () => {
  const ctx = base();
  const r = construire(ctx);
  const s = r.niveaux[1].sections.find((x) => x.id === 'n4-interculturel');
  const t = textesSection(r.niveaux[1], 'n4-interculturel');
  assert.ok(!/\b(AM|KB|SR|HT)\b|Amine|Karim|Salma|Hind/.test(t));
  assert.match(t, /tendances de pays/);
  assert.match(t, /langue de passation/);
  assert.match(t, /maison mère/);
  assert.match(t, /erreur écologique/);
  for (const site of ctx.cas.interculturel.sites) assert.ok(t.includes(site), site);
  assert.ok(s.paragraphes.filter((p) => /^Piège/.test(p.texte)).length === 3, 'trois pièges');
});

test('N3 : la même diversité se lit autrement selon la nature de la tâche', () => {
  const lectures = new Set();
  for (const nature of ['routine', 'creative', 'urgence', 'projet']) {
    const ctx = base();
    ctx.cas.tache.nature = nature;
    const r = construire(ctx);
    const s = r.niveaux[0].sections.find((x) => x.id === 'n3-diversite');
    assert.ok(s, 'section diversité');
    lectures.add(textesSection(r.niveaux[0], 'n3-diversite'));
    assert.deepEqual(auditContenu(ctx, r), [], nature);
  }
  assert.equal(lectures.size, 4);
});

test('N3 : cartographie domaine par domaine d’après la couverture', () => {
  const ctx = base();
  const r = construire(ctx);
  const t = textesSection(r.niveaux[0], 'n3-cartographie');
  for (const d of ['N', 'E', 'O', 'A', 'C']) assert.ok(t.includes(`Domaine ${d} (`), d);
  const n = textesSection(r.niveaux[0], 'n3-perimetre');
  assert.match(n, /arabe/);
  assert.match(n, /équivalence des versions n'est pas établie/);
});

test('formes : accents, pas de tiret cadratin, pas de pourcentage, pas de vocabulaire refusé', () => {
  const r = construire(base());
  const t = JSON.stringify([r.niveaux, r.recommandations], (k, v) => (k === 'confiance' ? undefined : v));
  assert.ok(!/[\u2014\u2013]/.test(t), 'tiret cadratin ou demi-cadratin');
  assert.ok(!/%/.test(t));
  assert.ok(!/moyenne|compatibilité|diagnostic|population|percentile|score/i.test(t));
  assert.ok(!/comparé aux autres équipes/.test(t));
});

test('audit : 0 défaut de contenu sur un rapport factice contenant les deux niveaux et les recommandations', () => {
  const ctx = base();
  const r = construire(ctx);
  const rapport = rapportFactice(r, ctx.refs);
  const res = auditer({ rapport, faits: ctx.faits, cas: ctx.cas, profils: ctx.profils, references: ctx.refs });
  for (const cat of CATEGORIES_CONTENU) assert.equal(res.comptes[cat], 0, `${cat} : ${JSON.stringify(res.defauts.filter((d) => d.categorie === cat))}`);
  // seuls les niveaux absents (n1, n2, n5) restent signalés par la catégorie structure
  const structure = res.defauts.filter((d) => d.categorie === 'structure');
  assert.deepEqual(structure.map((d) => d.id).sort(), ['n1-individuel', 'n2-relations', 'n5-accompagnement']);
});

test('audit : une mutation (nombre non sourcé) fait échouer le contrôle', () => {
  const ctx = base();
  const r = construire(ctx);
  const p = r.niveaux[0].sections[0].paragraphes[0];
  p.texte += ' La cohésion atteindrait 1234 points.';
  const defauts = auditContenu(ctx, r);
  assert.ok(defauts.some((d) => d.categorie === 'chiffre_absent_des_entrees' && /1234/.test(d.message)));
});

test('audit : deux autres mutations (terme interdit, référence non déclarée) sont rouges', () => {
  const ctx = base();
  const r = construire(ctx);
  const m1 = copie(r);
  m1.niveaux[1].sections[0].paragraphes[0].texte += ' La moyenne nationale est supérieure.';
  assert.ok(auditContenu(ctx, m1).some((d) => d.categorie === 'terme_interdit'));
  const m2 = copie(r);
  m2.reference_ids = m2.reference_ids.filter((id) => id !== 'edmondson-1999');
  assert.ok(auditContenu(ctx, m2).some((d) => d.categorie === 'references'));
});

test('audit : 0 défaut aussi avec chaque ligne du cas muté (déterminisme du texte sous variations)', () => {
  const variantes = [
    (c) => { c.cas.personnes.find((p) => p.code === 'HT').consentements.equipe = false; },
    (c) => { c.cas.personnes.find((p) => p.code === 'AM').consentements.equipe = false; },
    (c) => { c.cas.organisation.structure = 'adhocratie'; c.cas.organisation.culture = 'clan'; c.cas.strategie.orientation = 'conformite'; },
    (c) => { c.cas.interculturel.actif = false; }
  ];
  for (const v of variantes) {
    const ctx = base();
    v(ctx);
    const r = construire(ctx);
    assert.deepEqual(auditContenu(ctx, r), []);
    assert.ok(r.recommandations.length >= 6);
  }
});

test('erreur nette si une entrée manque', () => {
  const ctx = base();
  delete ctx.faits.equipe;
  assert.throws(() => construire(ctx), /faits\.equipe/);
});

// ------------------------------------------------------------------ mission corrective
const texteN3 = (r) => norm(r.niveaux[0].sections.flatMap((x) => x.paragraphes).map((p) => p.texte).join('\n'));
const texteN4 = (r) => norm(r.niveaux[1].sections.flatMap((x) => x.paragraphes).map((p) => p.texte).join('\n'));

test('I2 : la suppléance raisonne sur les rôles du cas, pas sur des domaines de personnalité', () => {
  const ctx = base();
  const r = construire(ctx);
  const rec = r.recommandations.find((x) => x.id === 'REC-N3-1');
  assert.match(rec.texte, /chaque rôle/);
  assert.ok(!/domaine|Névros|seule personne en position haute/.test(rec.texte + rec.donnee));
  for (const p of ctx.cas.personnes) assert.ok(norm(rec.donnee).includes(p.role_equipe[0].toLowerCase() + norm(p.role_equipe).slice(1)), p.code);
  const t = texteN3(r);
  assert.ok(!/seule personne en position|point de dépendance|point de fragilité/.test(t), 'plus de dépendance par domaine');
  assert.ok(!/domaine couvert par une seule/.test(JSON.stringify(r.recommandations)));
  const impl = textesSection(r.niveaux[1], 'n4-implications');
  assert.ok(!/domaine ne repose/.test(impl));
});

test('I2 : N et A ne servent plus à lire la tâche', () => {
  for (const nature of ['routine', 'creative', 'urgence', 'projet']) {
    const ctx = base();
    ctx.cas.tache.nature = nature;
    const r = construire(ctx);
    const lecture = textesSection(r.niveaux[0], 'n3-diversite').split('\n').find((x) => /Dans cette équipe,/.test(x));
    assert.ok(lecture, nature);
    assert.ok(!/domaine N|domaine A /.test(lecture), `${nature} : ${lecture}`);
  }
});

test('I3 : aucune absence de niveau n’est affirmée à l’échelle du domaine (contradictions avec les niveaux 1 et 2)', () => {
  const r = construire(base());
  const t = texteN3(r);
  assert.ok(!/Aucune personne ne se situe plutôt (bas|haut) ou (bas|haut) :/.test(t));
  assert.ok(!/peu représentée|ne soit portée par aucun profil|ne soit tenu par aucun profil/.test(t));
  assert.match(t, /une facette peut s'écarter du niveau de son domaine/);
  assert.match(t, /ne sont pas des fonctions d'équipe/);
  const rec = r.recommandations.find((x) => x.id === 'REC-N3-4');
  assert.ok(!/Positions peu représentées/.test(rec.donnee));
  assert.match(rec.donnee, /3 risques/);
  assert.match(rec.donnee, /A4/);
});

test('I3 : la facette A4 de la recommandation vient des faits (niveau de chaque personne)', () => {
  const ctx = base();
  const r = construire(ctx);
  const rec = r.recommandations.find((x) => x.id === 'REC-N3-4');
  const bas = ctx.cas.personnes.filter((p) => ['bas', 'plutot_bas'].includes(ctx.faits.personnes[p.code].facettes.A4.niveau)).map((p) => p.code);
  for (const code of bas) assert.match(rec.donnee, new RegExp(`plutôt basse ou basse pour [^,]*\\b${code}\\b`));
  assert.match(rec.donnee, /A4 \(/, 'libellé de la facette');
});

test('I4 : règle d’emploi posée par l’outil, et loi 09-08 / CNDP formulées sans laisser croire que le niveau 1 y échappe', () => {
  const r = construire(base());
  const t = textesSection(r.niveaux[1], 'n4-contraintes');
  assert.match(t, /CT-03, dureté dure : aucune décision d'emploi ne peut s'appuyer sur ces rapports \(règle posée par l'outil ; son articulation avec le Code du travail \(loi 65-99\) est à instruire par Tenga Conseil\)/);
  assert.ok(!/CT-03, dureté dure : [Cc]ode du travail/.test(t));
  assert.match(t, /Le traitement dans son ensemble est soumis à déclaration ou autorisation préalable \(à confirmer par Tenga Conseil\) ; CT-02 pose en outre cette exigence avant les niveaux 2 et 3/);
  assert.ok(!/ne seraient exploitables qu'après/.test(t));
  assert.match(t, /CT-02, dureté dure : CNDP :/);
  assert.ok(!/cNDP/.test(JSON.stringify(r)));
});

test('I5 : Bell est cité pour le cadre d’étude, l’énoncé sur la tâche vient de la méthode du rapport', () => {
  const r = construire(base());
  const t = texteN3(r);
  assert.match(t, /Bell \(2007\) indique que la composition d'une équipe produit des effets variables selon le cadre d'étude/);
  assert.ok(!/cités de mémoire/.test(t));
  assert.match(t, /énoncé de la méthode de ce rapport, sans attribution à cette référence/);
  assert.ok(!/Bell[^.]*dépendent de la nature de la tâche/.test(t));
});

test('I9 : l’indicateur de dispersion des facettes est déclaré non discriminant, sans être un argument d’accompagnement', () => {
  const r = construire(base());
  const t = textesSection(r.niveaux[0], 'n3-diversite');
  assert.match(t, /toutes les facettes sauf A3 sont classées diverses : cet indicateur ne discrimine rien ici et n'est pas utilisé comme argument d'accompagnement/);
  const recs = JSON.stringify(r.recommandations.filter((x) => x.id !== 'REC-N3-5'));
  assert.ok(!/dispersion|diverses?\b/.test(recs), 'aucune recommandation ne s’appuie sur la dispersion');
});

test('I9 : si l’indicateur discrimine, la mention disparaît', () => {
  const ctx = base();
  ctx.faits.equipe.facettes_diverses = ctx.faits.equipe.facettes_diverses.slice(0, 10);
  const r = construire(ctx);
  assert.ok(!/ne discrimine rien/.test(textesSection(r.niveaux[0], 'n3-diversite')));
});

test('I10 : précision sur le profil estimé de la dérogation, et mention de document de travail en tête de N3', () => {
  const r = construire(base());
  const p4 = paragraphes(r.niveaux[1]);
  const i = p4.findIndex((p) => p.texte.startsWith('Agrégat montré malgré'));
  assert.ok(i >= 1);
  assert.equal(p4[i + 1].texte, "Précision : le cas est fictif, à l'exception du profil estimé de AM, consenti (estimation, pas une mesure).");
  const premier = paragraphes(r.niveaux[0])[0].texte;
  assert.equal(premier, "Document de travail du consultant, jamais remis tel quel à un supérieur hiérarchique d'une personne citée.");
});

test('mineur : accord au singulier quand une seule personne est citée', () => {
  const r = construire(base());
  const hyp = r.niveaux[0].sections.find((s) => s.id === 'n3-cartographie').paragraphes.filter((p) => p.statut === 'hypothese');
  let vu = 0;
  for (const p of hyp) {
    const t = norm(p.texte);
    for (const m of t.matchAll(/Pour ((?:[A-Z]{2}(?:, | et )?)+), ([^.]*\.[^.]*\.)/g)) {
      const n = m[1].split(/, | et /).length;
      if (n === 1) {
        vu += 1;
        assert.ok(!/ces personnes|\bleur\b/.test(m[2]), m[0]);
      }
    }
  }
  assert.ok(vu >= 2, 'au moins deux cas singuliers vérifiés');
  assert.ok(!/Pour [A-Z]{2}, Un niveau/.test(texteN3(r)), 'majuscule indue après la virgule');
});

test('mineur : vocabulaire neutre pour la position d’ensemble, responsable de conformité pris dans les rôles du cas', () => {
  const ctx = base();
  const r = construire(ctx);
  assert.ok(!/valeur centrale/.test(texteN4(r)));
  assert.match(texteN4(r), /position d'ensemble calculée sur l'ensemble des personnes/);
  for (const id of ['REC-N3-5', 'REC-N4-1', 'REC-N4-2']) assert.equal(r.recommandations.find((x) => x.id === id).responsable, 'Garante de la relation client');
  assert.ok(!r.recommandations.some((x) => /Responsable de la relation clients/.test(x.responsable)));
});

test('mineur : apostrophes courbes dans tous les textes, sauf la dérogation reprise à l’identique', () => {
  const ctx = base();
  const r = construire(ctx);
  const deroge = ctx.faits.organisation.derogation_demonstration;
  const textes = [...r.niveaux.flatMap((n) => n.sections.flatMap((s) => s.paragraphes)).filter((p) => p.texte !== deroge).flatMap((p) => [p.texte, p.verification ?? '']), ...r.recommandations.flatMap((x) => [x.texte, x.donnee, x.contexte, x.risque, x.horizon, x.indicateur])];
  for (const t of textes) assert.ok(!t.includes("'"), `apostrophe droite : ${t.slice(0, 80)}`);
  assert.ok(r.niveaux.flatMap((n) => n.sections.flatMap((s) => s.paragraphes)).some((p) => p.texte === deroge), 'dérogation à l’identique');
  const roles = new Set(ctx.cas.personnes.map((p) => p.role_equipe));
  for (const x of r.recommandations) assert.ok(roles.has(x.responsable), x.responsable);
});
