import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construire } from './niveau1-individuel.mjs';
import { auditer } from '../audit/audit.mjs';

const lire = (chemin) => JSON.parse(fs.readFileSync(new URL(chemin, import.meta.url), 'utf-8'));
const charger = () => ({
  cas: lire('../cas/cas-demo.json'),
  faits: lire('../sortie/faits.json'),
  profils: lire('../../profils-fictifs/profils.json'),
  bib: lire('../../bibliotheque-textes/facettes.json'),
  regles: lire('../moteur/regles.json'),
  refs: lire('../references-autorisees.json')
});

const paragraphes = (niveau) => niveau.sections.flatMap((s) => s.paragraphes);
const codesDesChapitres = (niveau) => [...new Set(niveau.sections.map((s) => s.id.split('-')[0]))];
const CATEGORIES_CONTENU = [
  'chiffre_absent_des_entrees',
  'terme_interdit',
  'comparaison_population',
  'pourcentage_compatibilite',
  'decision_emploi',
  'moyenne_nationale_a_personne',
  'references'
];

function rapportFactice(ctx, { niveau, recommandations }) {
  return {
    version: 'r-test',
    empreinte_entrees: ctx.faits.empreinte_entrees,
    etiquette_fictif: ctx.cas.etiquette,
    avertissements: ['Ce rapport prépare le travail d’un consultant qualifié, qui le relit et le signe.'],
    niveaux: [niveau],
    recommandations,
    references: []
  };
}

function auditerNiveau(ctx, sortie) {
  return auditer({ rapport: rapportFactice(ctx, sortie), faits: ctx.faits, cas: ctx.cas, profils: ctx.profils, references: ctx.refs });
}

test('le niveau a l’id et un titre attendus', () => {
  const { niveau } = construire(charger());
  assert.equal(niveau.id, 'n1-individuel');
  assert.ok(niveau.titre.length > 0);
  assert.ok(niveau.sections.length > 0);
});

test('un chapitre par personne consentante : 4 chapitres, dans l’ordre du cas', () => {
  const { niveau } = construire(charger());
  assert.deepEqual(codesDesChapitres(niveau), ['AM', 'KB', 'SR', 'HT']);
});

test('une personne qui retire son consentement n’a aucun chapitre', () => {
  const ctx = charger();
  ctx.cas = structuredClone(ctx.cas);
  ctx.cas.personnes.find((p) => p.code === 'KB').consentements.individuel = false;
  const { niveau, recommandations } = construire(ctx);
  assert.deepEqual(codesDesChapitres(niveau), ['AM', 'SR', 'HT']);
  assert.equal(recommandations.filter((r) => r.id.includes('-KB-')).length, 0);
  const tout = JSON.stringify(niveau);
  assert.ok(!tout.includes('Karim'));
});

test('aucun consentement : un seul paragraphe qui le dit, aucune recommandation', () => {
  const ctx = charger();
  ctx.cas = structuredClone(ctx.cas);
  for (const p of ctx.cas.personnes) p.consentements.individuel = false;
  const { niveau, recommandations } = construire(ctx);
  assert.equal(paragraphes(niveau).length, 1);
  assert.equal(recommandations.length, 0);
  const rapport = auditerNiveau(ctx, { niveau, recommandations });
  for (const c of CATEGORIES_CONTENU) assert.equal(rapport.comptes[c], 0, c);
});

test('chaque chapitre : 30 facettes lues, chacune avec son bloc et la mention « bloc non relu »', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const facettes = niveau.sections.filter((s) => s.id.startsWith(`${code}-facettes-`)).flatMap((s) => s.paragraphes);
    assert.equal(facettes.length, 30, code);
    for (const p of facettes) {
      assert.equal(p.bloc_ids.length, 1);
      assert.match(p.texte, /bloc non relu/);
      assert.match(p.texte, /Question pour l’entretien/);
    }
    const attendus = Object.values(ctx.faits.personnes[code].facettes).map((f) => f.bloc_id).sort();
    assert.deepEqual(facettes.map((p) => p.bloc_ids[0]).sort(), attendus);
  }
});

test('chaque chapitre contient les cinq domaines, les tensions, la contribution, l’épanouissement, la fiabilité et le plan', () => {
  const { niveau } = construire(charger());
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const ids = niveau.sections.filter((s) => s.id.startsWith(`${code}-`)).map((s) => s.id);
    for (const attendu of ['cadre', 'domaines', 'tensions', 'contribution', 'epanouissement', 'fiabilite', 'plan']) {
      assert.ok(ids.includes(`${code}-${attendu}`), `${code}-${attendu}`);
    }
    const domaines = niveau.sections.find((s) => s.id === `${code}-domaines`);
    assert.equal(domaines.paragraphes.filter((p) => p.statut === 'constate').length, 5);
  }
});

test('les valeurs de domaine citées viennent de faits (échelle de 24 à 120)', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const domaines = niveau.sections.find((s) => s.id === `${code}-domaines`);
    const constates = domaines.paragraphes.filter((p) => p.statut === 'constate');
    ['N', 'E', 'O', 'A', 'C'].forEach((d, i) => {
      assert.match(constates[i].texte, new RegExp(`valeur ${ctx.faits.personnes[code].domaines[d].score} sur l’échelle de 24 à 120`));
    });
  }
});

test('étiquettes : AM est une estimation, les trois autres des profils fictifs', () => {
  const { niveau } = construire(charger());
  const cadre = (code) => niveau.sections.find((s) => s.id === `${code}-cadre`).paragraphes.map((p) => p.texte).join(' ');
  assert.match(cadre('AM'), /Estimation, pas une mesure/);
  for (const code of ['KB', 'SR', 'HT']) assert.match(cadre(code), /Profil fictif/);
});

test('les tensions de faits sont reprises avec le texte de leur règle', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  const tensions = niveau.sections.find((s) => s.id === 'AM-tensions');
  const texte = tensions.paragraphes.map((p) => p.texte).join(' ');
  for (const t of ctx.faits.personnes.AM.tensions) assert.ok(texte.includes(t.id), t.id);
  const regleC = ctx.regles.regles.find((r) => r.id === 'TENS-C');
  assert.ok(texte.includes(regleC.texte));
  const sansTension = niveau.sections.find((s) => s.id === 'KB-tensions');
  assert.match(sansTension.paragraphes[0].texte, /Aucun couple de facettes/);
});

test('le plan de développement a 3 priorités, des jalons à 30, 60 et 90 jours, des indicateurs et des soutiens', () => {
  const { niveau } = construire(charger());
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const plan = niveau.sections.find((s) => s.id === `${code}-plan`).paragraphes.map((p) => p.texte);
    const tout = plan.join(' ');
    for (const k of [1, 2, 3]) assert.match(tout, new RegExp(`Priorité ${k}\\b`));
    assert.ok(!/Priorité 4\b/.test(tout));
    assert.equal((tout.match(/À 30 jours/g) || []).length, 3);
    assert.equal((tout.match(/À 60 jours/g) || []).length, 3);
    assert.equal((tout.match(/À 90 jours/g) || []).length, 3);
    assert.equal((tout.match(/Indicateurs/g) || []).length, 3);
    assert.equal((tout.match(/Soutiens/g) || []).length, 3);
  }
});

test('la fiabilité dit honnêtement que les indices ne sont pas calculés', () => {
  const { niveau } = construire(charger());
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const f = niveau.sections.find((s) => s.id === `${code}-fiabilite`).paragraphes.map((p) => p.texte).join(' ');
    assert.match(f, /ne sont pas calculés/);
    assert.match(f, /données réelles/);
  }
  const sr = niveau.sections.find((s) => s.id === 'SR-fiabilite').paragraphes.map((p) => p.texte).join(' ');
  assert.match(sr, /arabe/);
});

test('chaque paragraphe a un statut ; toute hypothèse a confiance et vérification', () => {
  const { niveau } = construire(charger());
  const tous = paragraphes(niveau);
  assert.ok(tous.length > 200);
  for (const p of tous) {
    assert.ok(['constate', 'hypothese'].includes(p.statut), p.id);
    if (p.statut === 'hypothese') {
      assert.ok(['faible', 'moyenne', 'elevee'].includes(p.confiance), p.id);
      assert.ok(typeof p.verification === 'string' && p.verification.length > 10, p.id);
    }
  }
  assert.ok(tous.some((p) => p.statut === 'constate') && tous.some((p) => p.statut === 'hypothese'));
});

test('recommandations : au moins 3 par personne, 7 attributs, responsable parmi les rôles du cas, donnée chiffrée', () => {
  const ctx = charger();
  const { recommandations } = construire(ctx);
  const roles = new Set(ctx.cas.personnes.map((p) => p.role_equipe));
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const recs = recommandations.filter((r) => r.id.startsWith(`REC-N1-${code}-`));
    assert.ok(recs.length >= 3, code);
    for (const r of recs) {
      for (const k of ['texte', 'donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
        assert.ok(typeof r[k] === 'string' && r[k].trim() !== '', `${r.id} ${k}`);
      }
      assert.ok(['source', 'hypothese'].includes(r.preuve.niveau));
      if (r.preuve.niveau === 'source') assert.ok(r.preuve.reference_id);
      assert.equal(r.niveau, 'n1-individuel');
      assert.ok(roles.has(r.responsable), `${r.id} responsable ${r.responsable}`);
      assert.match(r.donnee, /\d/);
      assert.match(r.horizon, /^(30|60|90) jours$/);
    }
  }
});

test('tous les ids sont uniques et préfixés', () => {
  const { niveau, recommandations } = construire(charger());
  const ids = [...paragraphes(niveau).map((p) => p.id), ...niveau.sections.map((s) => s.id), ...recommandations.map((r) => r.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const p of paragraphes(niveau)) assert.match(p.id, /^n1-/);
  for (const r of recommandations) assert.match(r.id, /^REC-N1-/);
});

test('déterminisme : deux exécutions identiques, octet pour octet', () => {
  const a = JSON.stringify(construire(charger()));
  const b = JSON.stringify(construire(charger()));
  assert.equal(a, b);
});

test('le texte ne contient ni tiret cadratin ni demi-cadratin', () => {
  const sortie = JSON.stringify(construire(charger()));
  assert.ok(!/[—–]/.test(sortie));
});

test('la taille d’un chapitre reste raisonnable', () => {
  const { niveau } = construire(charger());
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const n = niveau.sections.filter((s) => s.id.startsWith(`${code}-`)).flatMap((s) => s.paragraphes).reduce((t, p) => t + p.texte.length, 0);
    assert.ok(n > 15000 && n < 50000, `${code} : ${n} caractères`);
  }
});

test('audit : 0 défaut de contenu sur le niveau et ses recommandations', () => {
  const ctx = charger();
  const sortie = construire(ctx);
  const { defauts, comptes } = auditerNiveau(ctx, sortie);
  const gravite = defauts.filter((d) => CATEGORIES_CONTENU.includes(d.categorie));
  assert.deepEqual(gravite, []);
  for (const c of CATEGORIES_CONTENU) assert.equal(comptes[c], 0, c);
});

test('mutation : un nombre non sourcé dans un paragraphe fait échouer l’audit', () => {
  const ctx = charger();
  const sortie = structuredClone(construire(ctx));
  sortie.niveau.sections[0].paragraphes[0].texte += ' Un écart de 777 points est observé.';
  const { comptes } = auditerNiveau(ctx, sortie);
  assert.ok(comptes.chiffre_absent_des_entrees > 0);
});

test('mutation : un nombre non sourcé dans une recommandation fait échouer l’audit', () => {
  const ctx = charger();
  const sortie = structuredClone(construire(ctx));
  sortie.recommandations[0].donnee = 'Écart de 777 points.';
  const { comptes } = auditerNiveau(ctx, sortie);
  assert.ok(comptes.chiffre_absent_des_entrees > 0);
});

test('mutation : un terme interdit, une comparaison à la population et une décision d’emploi sont détectés', () => {
  const ctx = charger();
  const sortie = structuredClone(construire(ctx));
  sortie.niveau.sections[0].paragraphes[0].texte += ' La valeur est au-dessus de la moyenne. Cela justifie une promotion.';
  const { comptes } = auditerNiveau(ctx, sortie);
  assert.ok(comptes.terme_interdit > 0);
  assert.ok(comptes.comparaison_population > 0);
  assert.ok(comptes.decision_emploi > 0);
});
