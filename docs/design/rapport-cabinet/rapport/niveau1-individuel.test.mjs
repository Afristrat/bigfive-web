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
  assert.ok(texte.includes(regleC.texte.replace(/(\p{L})'(\p{L})/gu, '$1’$2')));
  const sansTension = niveau.sections.find((s) => s.id === 'KB-tensions');
  assert.match(sansTension.paragraphes[0].texte, /Aucun couple de facettes/);
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
    assert.ok(n > 15000 && n < 55000, `${code} : ${n} caractères`);
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



const SUIVI_HUMEUR = /relevé hebdomadaire|tenir un (?:court )?relevé|journal|moments de tension/i;
const aSuiviHumeur = (paragraphesPlan) => paragraphesPlan.some((p) => SUIVI_HUMEUR.test(p.texte));
const planDe = (niveau, code) => niveau.sections.find((s) => s.id === `${code}-plan`).paragraphes;
const NON_CIBLEES = ['O6', 'A2', 'N3'];
const CONSULTANT = 'Consultant qualifié désigné par Tenga Conseil';

function avecTensions(ctx, code, tensions) {
  const c = { ...ctx, faits: structuredClone(ctx.faits) };
  c.faits.personnes[code].tensions = tensions;
  return c;
}
const tension = (a, b, ecart, regle) => ({ id: `${a}-${b}`, domaine: a[0], facettes: [a, b], ecart, regle });

test('chaque chapitre : 30 facettes lues entre guillemets, chacune avec son bloc ; aucune mention de relecture dans la prose', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  for (const code of ['AM', 'KB', 'SR', 'HT']) {
    const sections = niveau.sections.filter((s) => s.id.startsWith(`${code}-facettes-`));
    assert.equal(sections.length, 5);
    for (const s of sections) {
      assert.equal(s.paragraphes.filter((p) => /non relus?|relecture|à vérifier/.test(p.texte)).length, 0, s.id);
      assert.equal(s.paragraphes[0].statut, 'constate');
    }
    const facettes = sections.flatMap((s) => s.paragraphes).filter((p) => p.bloc_ids);
    assert.equal(facettes.length, 30, code);
    for (const p of facettes) {
      assert.equal(p.bloc_ids.length, 1);
      assert.match(p.texte, /Question pour l’entretien : «/);
      assert.match(p.texte, /Description de la bibliothèque : «/);
    }
    const attendus = Object.values(ctx.faits.personnes[code].facettes).map((f) => f.bloc_id).sort();
    assert.deepEqual(facettes.map((p) => p.bloc_ids[0]).sort(), attendus);
  }
});

test('plan : AM a trois priorités à 30, 60 et 90 jours ; sans tension relevée, entretien de restitution seul', () => {
  const { niveau } = construire(charger());
  const am = planDe(niveau, 'AM').map((p) => p.texte).join(' ');
  for (const k of [1, 2, 3]) assert.match(am, new RegExp(`Priorité ${k}\\b`));
  assert.ok(!/Priorité 4\b/.test(am));
  for (const mot of ['À 30 jours', 'À 60 jours', 'À 90 jours', 'Indicateurs', 'Soutiens']) assert.equal((am.match(new RegExp(mot, 'g')) || []).length, 3, mot);
  for (const code of ['KB', 'SR', 'HT']) {
    const plan = planDe(niveau, code);
    assert.equal(plan.length, 1, code);
    assert.match(plan[0].texte, /Pas de priorité de développement ; entretien de restitution seul/);
    assert.ok(!/Priorité \d/.test(plan[0].texte));
  }
});

test('plan : chaque priorité est une tension relevée de faits, sans O6, A2, N3 ni domaine N, à facettes distinctes', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  const ids = new Map(ctx.faits.personnes.AM.tensions.map((t) => [t.id, t]));
  const priorites = planDe(niveau, 'AM').filter((p) => /^Priorité \d/.test(p.texte));
  assert.equal(priorites.length, 3);
  const vues = new Set();
  for (const p of priorites) {
    const m = p.texte.match(/tension ([NEOAC]\d-[NEOAC]\d) relevée/);
    assert.ok(m && ids.has(m[1]), p.id);
    const t = ids.get(m[1]);
    assert.notEqual(t.domaine, 'N');
    for (const c of t.facettes) {
      assert.ok(!NON_CIBLEES.includes(c), `${m[1]} cible ${c}`);
      assert.ok(!vues.has(c), `facette ${c} réutilisée`);
      vues.add(c);
    }
    assert.equal(p.bloc_ids.length, 2);
    assert.ok(!/point d’attention/.test(p.texte));
  }
  assert.match(priorites[0].texte, /tension C1-C6/);
});

test('plan : mutations de faits, une tension sur O6, A2, N3 ou sur le domaine N ne donne aucune priorité ; une tension éligible en donne une', () => {
  const ctx = charger();
  const priorites = (c, code) => planDe(construire(c).niveau, code).filter((p) => /^Priorité \d/.test(p.texte));
  assert.equal(priorites(avecTensions(ctx, 'KB', [tension('O5', 'O6', 2, 'TENS-O')]), 'KB').length, 0);
  assert.equal(priorites(avecTensions(ctx, 'KB', [tension('A2', 'A3', 2, 'TENS-A')]), 'KB').length, 0);
  assert.equal(priorites(avecTensions(ctx, 'KB', [tension('N3', 'N5', 2, 'TENS-N')]), 'KB').length, 0);
  assert.equal(priorites(avecTensions(ctx, 'KB', [tension('N1', 'N2', 2, 'TENS-N')]), 'KB').length, 0);
  const ecartee = planDe(construire(avecTensions(ctx, 'KB', [tension('N1', 'N2', 2, 'TENS-N')])).niveau, 'KB')[0].texte;
  assert.match(ecartee, /ne sont pas instruites par le plan/);
  const eligibles = priorites(avecTensions(ctx, 'KB', [tension('C1', 'C2', 2, 'TENS-C')]), 'KB');
  assert.equal(eligibles.length, 1);
  assert.match(eligibles[0].texte, /tension C1-C2 relevée/);
});

test('plan : l’action à 60 jours découle de la paire de facettes, jamais d’un gabarit par domaine', () => {
  const ctx = charger();
  const { niveau } = construire(ctx);
  const am = planDe(niveau, 'AM');
  const actions = am.filter((p) => /^À 30 jours/.test(p.texte));
  assert.equal(actions.length, 3);
  const lib = (c) => ctx.bib.facettes.find((f) => f.code === c).libelle.fr;
  const paires = [['C1', 'C6'], ['E3', 'E2'], ['A3', 'A4']];
  actions.forEach((p, i) => {
    assert.equal(p.statut, 'hypothese');
    assert.equal(p.bloc_ids.length, 2);
    const soixante = p.texte.split('À 60 jours :')[1].split('À 90 jours')[0];
    assert.ok(paires[i].every((c) => soixante.includes(lib(c)) || p.texte.includes(lib(c))), `paire ${i}`);
    assert.ok(soixante.includes('coût possible de «'));
  });
  const tout = JSON.stringify(niveau);
  for (const gabarit of ['choisir une idée nouvelle et un sujet à cadrer', 'formuler un désaccord et une demande d’aide', 'choisir un type de réunion', 'point d’étape sur une tâche avec un critère de fin']) {
    assert.ok(!tout.includes(gabarit), gabarit);
  }
  assert.ok(!tout.includes('la manière dont ces deux facettes s’expriment'));
  assert.ok(!tout.includes('Règle de lecture'));
});

test('plan : aucun relevé ni journal de l’état émotionnel', () => {
  const ctx = charger();
  const { niveau, recommandations } = construire(ctx);
  for (const code of ['AM', 'KB', 'SR', 'HT']) assert.equal(aSuiviHumeur(planDe(niveau, code)), false, code);
  for (const r of recommandations) assert.ok(!SUIVI_HUMEUR.test(JSON.stringify(r)), r.id);
});

test('mutation : réintroduire le relevé hebdomadaire fait échouer le contrôle', () => {
  const { niveau } = construire(charger());
  const plan = structuredClone(planDe(niveau, 'AM'));
  assert.equal(aSuiviHumeur(plan), false);
  plan[2].texte += ' À 60 jours : tenir un court relevé hebdomadaire des moments de tension et de ce qui les a apaisés.';
  assert.equal(aSuiviHumeur(plan), true);
});

test('recommandations : 7 attributs, responsable du cas, donnée chiffrée ; AM en a 4, les autres seulement l’entretien de restitution', () => {
  const ctx = charger();
  const { recommandations } = construire(ctx);
  const roles = new Set(ctx.cas.personnes.map((p) => p.role_equipe));
  const attendu = { AM: 4, KB: 1, SR: 1, HT: 1 };
  for (const code of Object.keys(attendu)) {
    const recs = recommandations.filter((r) => r.id.startsWith(`REC-N1-${code}-`));
    assert.equal(recs.length, attendu[code], code);
    for (const r of recs) {
      for (const k of ['texte', 'donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
        assert.ok(typeof r[k] === 'string' && r[k].trim() !== '', `${r.id} ${k}`);
      }
      assert.ok(['source', 'hypothese'].includes(r.preuve.niveau));
      if (r.preuve.niveau === 'source') assert.ok(r.preuve.reference_id);
      assert.equal(r.niveau, 'n1-individuel');
      assert.match(r.donnee, /\d/);
      assert.match(r.horizon, /^(30|60|90) jours$/);
    }
    const restitution = recs[recs.length - 1];
    assert.equal(restitution.responsable, CONSULTANT);
    for (const r of recs.slice(0, -1)) assert.ok(roles.has(r.responsable), `${r.id} ${r.responsable}`);
  }
});

test('recommandations : un risque propre à chaque recommandation et à chaque personne', () => {
  const { recommandations } = construire(charger());
  const risques = recommandations.map((r) => r.risque);
  assert.equal(new Set(risques).size, risques.length);
});

test('« Chapitre privé d’Amine » : élision correcte du nom', () => {
  const { niveau } = construire(charger());
  const cadre = (code) => niveau.sections.find((s) => s.id === `${code}-cadre`).paragraphes[0].texte;
  assert.match(cadre('AM'), /^Chapitre privé d’Amine \(estimation\)/);
  assert.match(cadre('KB'), /^Chapitre privé de Karim B\./);
  assert.match(cadre('HT'), /^Chapitre privé d’Hind T\./);
  assert.ok(!JSON.stringify(niveau).includes('de Amine'));
});

test('registre : à la personne ; « vous » seulement dans les passages de la bibliothèque entre guillemets', () => {
  const { niveau, recommandations } = construire(charger());
  const horsGuillemets = (texte) => {
    let profondeur = 0;
    let sortie = '';
    for (const ch of texte) {
      if (ch === '«') profondeur += 1;
      else if (ch === '»') profondeur -= 1;
      else if (profondeur === 0) sortie += ch;
    }
    return sortie;
  };
  const tous = [...niveau.sections.flatMap((s) => s.paragraphes).flatMap((p) => [p.texte, p.verification || '']), ...recommandations.flatMap((r) => Object.values(r).filter((v) => typeof v === 'string'))];
  for (const t of tous) assert.ok(!/(?<![\p{L}])(vous|votre|vos)(?![\p{L}])/iu.test(horsGuillemets(t)), t.slice(0, 120));
});

test('typographie : apostrophes courbes dans tous les textes écrits par le module', () => {
  const ctx = charger();
  const { niveau, recommandations } = construire(ctx);
  const donneesCas = [];
  const visiter = (v) => {
    if (typeof v === 'string') donneesCas.push(v);
    else if (Array.isArray(v)) v.forEach(visiter);
    else if (v && typeof v === 'object') Object.values(v).forEach(visiter);
  };
  visiter(ctx.cas);
  const nettoyer = (t) => donneesCas.filter((d) => d.includes("'")).sort((a, b) => b.length - a.length).reduce((acc, d) => acc.split(d).join(''), t);
  const textes = [...niveau.sections.flatMap((s) => [s.titre, ...s.paragraphes.flatMap((p) => [p.texte, p.verification || ''])]), ...recommandations.flatMap((r) => Object.entries(r).filter(([k, v]) => typeof v === 'string' && k !== 'responsable').map(([, v]) => v))];
  for (const t of textes) assert.ok(!/\p{L}'\p{L}/u.test(nettoyer(t)), t.slice(0, 160));
});
