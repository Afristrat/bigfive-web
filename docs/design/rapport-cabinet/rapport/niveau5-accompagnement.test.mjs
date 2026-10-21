import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { construire, FAMILLES, CONDITION_CNDP } from './niveau5-accompagnement.mjs';
import { auditer } from '../audit/audit.mjs';

const lire = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
const cas = lire('../cas/cas-demo.json');
const faits = lire('../sortie/faits.json');
const profils = lire('../../profils-fictifs/profils.json');
const bib = lire('../../bibliotheque-textes/facettes.json');
const regles = lire('../moteur/regles.json');
const refs = lire('../references-autorisees.json');

const copie = (x) => structuredClone(x);
const ctx = () => ({ cas: copie(cas), faits: copie(faits), profils: copie(profils), bib, regles, refs });
const sortie = construire(ctx());
const { niveau, recommandations } = sortie;
const paragraphes = niveau.sections.flatMap((s) => s.paragraphes);

const ROLES = cas.personnes.flatMap((p) => [p.role_equipe, p.fonction.replace(/\s*\((?:fictif|fonction fictive)\)\s*$/, '')]).map((x) => x.replace(/'/g, '’'));
const HORIZONS = ['30 jours', '60 jours', '90 jours', ...cas.tache.echeances];
const famille = (r) => FAMILLES.find((f) => r.texte.startsWith(f));

test('identifiant et titre du niveau, sections non vides', () => {
  assert.equal(niveau.id, 'n5-accompagnement');
  assert.ok(niveau.titre.length > 0);
  assert.ok(niveau.sections.length >= 7);
  for (const s of niveau.sections) assert.ok(s.paragraphes.length > 0, `section ${s.id} vide`);
});

test('au moins 12 recommandations, toutes à 7 attributs', () => {
  assert.ok(recommandations.length >= 12, `${recommandations.length} recommandations`);
  for (const r of recommandations) {
    for (const k of ['id', 'niveau', 'texte', 'donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) {
      assert.ok(typeof r[k] === 'string' && r[k].trim() !== '', `${r.id} : ${k}`);
    }
    assert.equal(r.niveau, 'n5');
    assert.ok(['source', 'hypothese'].includes(r.preuve.niveau));
    assert.ok(r.id.startsWith('REC-N5-'));
  }
});

test('les cinq familles sont présentes', () => {
  assert.deepEqual(FAMILLES, ['Coaching', 'Mentorat', 'Formation', 'Organisation', 'Mesure']);
  for (const f of FAMILLES) assert.ok(recommandations.some((r) => famille(r) === f), `famille ${f} absente`);
  for (const r of recommandations) assert.ok(famille(r), `${r.id} sans famille`);
});

const horizonValide = (h) => HORIZONS.includes(h) || (h.startsWith(`${CONDITION_CNDP}, puis `) && HORIZONS.includes(h.slice(CONDITION_CNDP.length + 7)));
const fondeeSurRelationOuEquipe = (r) => /^(Mentorat|Coaching de binôme|Coaching d’équipe)/.test(r.texte) || /retour d’information|planification partagée/.test(r.texte);
const conditionnelle = (r) => r.horizon.startsWith(CONDITION_CNDP);

test('horizons : 30, 60, 90 jours ou échéance du cas', () => {
  for (const r of recommandations) assert.ok(horizonValide(r.horizon), `${r.id} : horizon « ${r.horizon} »`);
  assert.ok(recommandations.some((r) => r.horizon === '30 jours'));
  assert.ok(recommandations.some((r) => r.horizon === '60 jours'));
  assert.ok(recommandations.some((r) => r.horizon === '90 jours'));
});

test('toute recommandation fondée sur une relation ou l’équipe est conditionnée à l’autorisation de la CNDP', () => {
  const visees = recommandations.filter(fondeeSurRelationOuEquipe);
  assert.ok(visees.length >= 5);
  for (const r of visees) assert.ok(conditionnelle(r), `${r.id} : horizon « ${r.horizon} » sans condition CNDP`);
  const cal = niveau.sections.find((s) => s.id === 'calendrier').paragraphes.map((p) => p.texte).join(' ');
  assert.match(cal, /Actions conditionnelles à l’autorisation de la CNDP/);
  const depart = niveau.sections.find((s) => s.id === 'depart').paragraphes.map((p) => p.texte).join(' ');
  assert.match(depart, /conditionnée, dans le calendrier lui-même, à l’autorisation de la CNDP/);
});

test('mutation : remettre « 60 jours » nu sur le mentorat fait échouer le contrôle', () => {
  const m = copie(recommandations.find((r) => /^Mentorat/.test(r.texte)));
  assert.ok(conditionnelle(m));
  m.horizon = '60 jours';
  assert.ok(fondeeSurRelationOuEquipe(m) && !conditionnelle(m));
});

test('chaque responsable contient au moins un rôle du cas', () => {
  for (const r of recommandations) assert.ok(ROLES.some((role) => r.responsable.includes(role)), `${r.id} : responsable « ${r.responsable} »`);
});

test('une source a toujours un reference_id valide, Kirkpatrick présent', () => {
  const valides = new Set(refs.references.map((x) => x.id));
  for (const r of recommandations) {
    if (r.preuve.niveau === 'source') assert.ok(valides.has(r.preuve.reference_id), `${r.id} : référence invalide`);
    else assert.equal(r.preuve.reference_id, null);
  }
  assert.ok(recommandations.some((r) => r.preuve.reference_id === 'kirkpatrick'));
  assert.ok(niveau.sections.some((s) => s.paragraphes.some((p) => /Kirkpatrick/.test(p.texte))));
});

test('chaque recommandation cite une donnée chiffrée ou une contrainte du cas', () => {
  for (const r of recommandations) assert.ok(/\d/.test(r.donnee) || /CT-\d\d/.test(r.donnee), `${r.id} : donnée sans chiffre ni contrainte`);
});

test('paragraphes : statut valide, hypothèses avec confiance et vérification', () => {
  for (const p of paragraphes) {
    assert.ok(['constate', 'hypothese'].includes(p.statut), p.id);
    if (p.statut === 'hypothese') {
      assert.ok(['faible', 'moyenne', 'elevee'].includes(p.confiance), p.id);
      assert.ok(p.verification && p.verification.length > 10, p.id);
    }
  }
  assert.ok(paragraphes.some((p) => p.statut === 'hypothese'));
  assert.ok(paragraphes.some((p) => p.statut === 'constate'));
});

test('ids uniques (paragraphes et recommandations) et bien préfixés', () => {
  const ids = paragraphes.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^n5-[a-z-]+-\d+$/);
  const rids = recommandations.map((r) => r.id);
  assert.equal(new Set(rids).size, rids.length);
});

test('calendrier : jalons à 30, 60 et 90 jours en hypothèses, échéances du cas en fait constaté', () => {
  const cal = niveau.sections.find((s) => s.id === 'calendrier');
  assert.ok(cal);
  for (const j of ['30', '60', '90']) {
    const p = cal.paragraphes.find((x) => x.texte.startsWith(`À ${j} jours`));
    assert.ok(p, `jalon ${j}`);
    assert.equal(p.statut, 'hypothese');
  }
  const constate = cal.paragraphes.filter((p) => p.statut === 'constate').map((p) => p.texte).join(' ');
  for (const e of cas.tache.echeances) assert.ok(constate.includes(e), e);
});

test('la mesure d’impact donne moment de mesure et source de la donnée', () => {
  const mesure = niveau.sections.find((s) => s.id === 'mesure');
  const texte = mesure.paragraphes.map((p) => p.texte).join(' ');
  assert.match(texte, /avant/);
  assert.match(texte, /après/);
  assert.match(texte, /source/i);
  for (const i of cas.strategie.indicateurs) assert.ok(texte.includes(i.replace(/'/g, '’')), i);
});

test('garde-fous : décision d’emploi, consentement, signature, ISO 10667, base juridique', () => {
  const g = niveau.sections.find((s) => s.id === 'garde-fous');
  assert.ok(g.paragraphes.every((p) => p.statut === 'constate'));
  const t = g.paragraphes.map((p) => p.texte).join(' ');
  for (const motif of [/Aucune décision d’emploi/, /consentement/, /consultant qualifié désigné par Tenga Conseil/, /ISO 10667/, /loi 09-08/, /CNDP/, /loi 65-99/, /siège/, /avis juridique/]) {
    assert.match(t, motif);
  }
});

test('le texte du niveau ne contient ni tiret cadratin, ni « compétence », ni « % »', () => {
  const tout = JSON.stringify({ niveau, recommandations });
  assert.ok(!/[–—]/.test(tout));
  assert.ok(!/compétence/i.test(tout));
  assert.ok(!tout.includes('%'));
  assert.match(tout, /savoir-faire comportementaux/);
});

test('déterminisme : deux appels donnent le même résultat', () => {
  assert.deepEqual(construire(ctx()), construire(ctx()));
  assert.equal(JSON.stringify(construire(ctx())), JSON.stringify(sortie));
});

test('l’entrée n’est pas modifiée', () => {
  const c = ctx();
  const avant = JSON.stringify(c);
  construire(c);
  assert.equal(JSON.stringify(c), avant);
});

test('sans consentement individuel d’AM, la tension d’AM n’est plus citée ni coachée', () => {
  const c = ctx();
  c.cas.personnes.find((p) => p.code === 'AM').consentements.individuel = false;
  const r = construire(c);
  const tout = JSON.stringify(r);
  assert.ok(!r.recommandations.some((x) => /^Coaching individuel/.test(x.texte)));
  assert.ok(!/Coaching individuel de AM/.test(tout));
  assert.ok(!/Tension interne la plus nette/.test(tout));
  assert.ok(r.recommandations.length >= 12);
});

test('sans consentement de binôme, ni mentorat ni coaching de binôme', () => {
  const c = ctx();
  for (const p of c.cas.personnes) p.consentements.binome = false;
  const r = construire(c);
  assert.ok(!r.recommandations.some((x) => /^(Mentorat|Coaching de binôme)/.test(x.texte)));
  for (const s of r.niveau.sections) assert.ok(s.paragraphes.length > 0);
});

const texteDe = (id) => niveau.sections.find((s) => s.id === id).paragraphes.map((p) => p.texte).join(' ');

test('I4 : la règle sur les décisions d’emploi est posée par l’outil, non une contrainte dure du cas', () => {
  const g = texteDe('garde-fous');
  assert.match(g, /règle posée par l’outil/);
  assert.match(g, /à instruire par Tenga Conseil/);
  assert.ok(!/contrainte dure du cas \(CT-03/.test(g));
});

test('I8 : Kirkpatrick, niveaux 1 et 2 dans le plan, niveaux 3 et 4 hors plan partout', () => {
  const cible = [texteDe('mesure'), texteDe('calendrier'), ...recommandations.filter((r) => /Kirkpatrick/.test(r.texte)).map((r) => `${r.texte} ${r.indicateur} ${r.risque}`)].join(' ');
  assert.match(cible, /niveaux 1 et 2/);
  assert.match(cible, /niveaux 3 et 4 (restant )?hors (du )?plan|hors du plan/);
  assert.ok(!/niveau 3 à 30 jours|niveau 4 à 90 jours|quatre niveaux/.test(cible));
  assert.ok(!/niveaux 3 et 4 de Kirkpatrick \(référence à vérifier\), décision/.test(cible));
  const k = recommandations.find((r) => r.preuve.reference_id === 'kirkpatrick');
  assert.ok(!/30 jours/.test(k.indicateur));
});

test('I6 : charge répartie, chaque indicateur a une cible, aucune échéance hors liste nommée', () => {
  const parRole = new Map();
  for (const r of recommandations) for (const role of ROLES) if (r.responsable.includes(role)) parRole.set(role, (parRole.get(role) ?? 0) + 1);
  const pilote = cas.personnes.find((p) => p.role_equipe === 'Pilote du programme').role_equipe;
  assert.ok(parRole.get(pilote) <= Math.ceil(recommandations.length / 3), `pilote ${parRole.get(pilote)}`);
  const roles = new Set(recommandations.flatMap((r) => ROLES.filter((x) => r.responsable.includes(x))));
  assert.ok(roles.size >= 4);
  for (const r of recommandations) assert.match(r.indicateur, /Cible :/, r.id);
  assert.match(texteDe('calendrier'), /Charge des responsables/);
  const f3 = recommandations.find((r) => /planification partagée/.test(r.texte));
  assert.ok(horizonValide(f3.horizon));
  assert.ok(f3.indicateur.includes(cas.tache.echeances[1]));
});

test('mineurs : accords de « contact », apostrophes courbes, mention après Edmondson', () => {
  const tout = JSON.stringify({ niveau, recommandations });
  assert.ok(!/contact (mensuelle|quotidienne)|est (quotidienne|mensuelle)/.test(tout));
  assert.match(tout, /contact mensuel/);
  assert.match(tout, /Le contact est quotidien/);
  assert.ok(!/[a-zé]'[a-zé]/i.test(tout.replace(/\\"/g, '')), 'apostrophe droite');
  const f2 = recommandations.find((r) => /sécurité psychologique/.test(r.texte));
  assert.match(f2.texte, /Edmondson, référence à vérifier\), en lien avec la méfiance héritée du précédent outil\./);
  assert.ok(!/mémoire/.test(tout));
});

test('audit : 0 défaut de contenu sur un rapport factice contenant le seul niveau 5', () => {
  const rapport = rapportFactice(niveau, recommandations);
  const { defauts, comptes } = auditer({ rapport, faits, cas, profils, references: refs });
  for (const cat of ['chiffre_absent_des_entrees', 'terme_interdit', 'comparaison_population', 'pourcentage_compatibilite', 'decision_emploi', 'moyenne_nationale_a_personne', 'references']) {
    assert.equal(comptes[cat], 0, `${cat} : ${JSON.stringify(defauts.filter((d) => d.categorie === cat))}`);
  }
  const structure = defauts.filter((d) => d.categorie === 'structure' && !/^n[1-4]-/.test(d.id));
  assert.deepEqual(structure, []);
});

test('mutation : un nombre non sourcé fait échouer l’audit', () => {
  const n = copie(niveau);
  n.sections[0].paragraphes[0].texte += ' Le chantier mobilise 47 personnes.';
  const { comptes } = auditer({ rapport: rapportFactice(n, recommandations), faits, cas, profils, references: refs });
  assert.ok(comptes.chiffre_absent_des_entrees > 0);
});

test('mutation : un terme interdit, une décision d’emploi et une référence inconnue font échouer l’audit', () => {
  const n = copie(niveau);
  n.sections[1].paragraphes[0].texte += ' Le score sert à décider de la promotion de la personne.';
  let { comptes } = auditer({ rapport: rapportFactice(n, recommandations), faits, cas, profils, references: refs });
  assert.ok(comptes.terme_interdit > 0);
  assert.ok(comptes.decision_emploi > 0);
  const recs = copie(recommandations);
  recs[0].preuve = { niveau: 'source', reference_id: 'inconnu-2020' };
  ({ comptes } = auditer({ rapport: rapportFactice(niveau, recs), faits, cas, profils, references: refs }));
  assert.ok(comptes.references > 0);
});

function rapportFactice(n, recs) {
  const ids = [...new Set(recs.map((r) => r.preuve.reference_id).filter(Boolean))];
  const textes = JSON.stringify(n);
  for (const r of refs.references) if (textes.includes(r.auteurs[0]) && !ids.includes(r.id)) ids.push(r.id);
  return {
    version: 'r-test',
    empreinte_entrees: faits.empreinte_entrees,
    etiquette_fictif: cas.etiquette,
    avertissements: [],
    niveaux: [n],
    recommandations: recs,
    references: refs.references.filter((r) => ids.includes(r.id)).map((r) => ({ id: r.id, citation: r.citation, statut: 'à vérifier' }))
  };
}
