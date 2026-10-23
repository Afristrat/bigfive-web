import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { construire, facettesRetenues } from './niveau2-relations.mjs';
import { auditer } from '../audit/audit.mjs';

const ici = (p) => fileURLToPath(new URL(p, import.meta.url));
const lire = (p) => JSON.parse(readFileSync(ici(p), 'utf8'));
const ctx = {
  cas: lire('../cas/cas-demo.json'),
  faits: lire('../sortie/faits.json'),
  profils: lire('../../profils-fictifs/profils.json'),
  bib: lire('../../bibliotheque-textes/facettes.json'),
  regles: lire('../moteur/regles.json'),
  refs: lire('../references-autorisees.json')
};
const copie = (x) => structuredClone(x);
const RELATIONS = ctx.faits.relations.map((r) => r.id);
const sortie = construire(ctx);
const chapitres = (niveau) => {
  const m = new Map();
  for (const s of niveau.sections) if (s.relation_id) m.set(s.relation_id, [...(m.get(s.relation_id) ?? []), s]);
  return m;
};
const paragraphes = (niveau) => niveau.sections.flatMap((s) => s.paragraphes);
const texteChapitre = (niveau, id, rubrique) =>
  niveau.sections.filter((s) => s.relation_id === id && (rubrique === undefined || s.rubrique === rubrique)).flatMap((s) => s.paragraphes.map((p) => p.texte)).join('\n');

test('le niveau a l’id n2-relations et un titre', () => {
  assert.equal(sortie.niveau.id, 'n2-relations');
  assert.ok(sortie.niveau.titre.length > 0);
  assert.ok(Array.isArray(sortie.niveau.sections) && sortie.niveau.sections.length > 0);
});

test('six chapitres pour six relations consenties, dans l’ordre des faits', () => {
  assert.equal(RELATIONS.length, 6);
  assert.deepEqual([...chapitres(sortie.niveau).keys()], RELATIONS);
});

test('un consentement retiré supprime exactement les chapitres concernés', () => {
  const c = copie(ctx);
  c.cas.personnes.find((p) => p.code === 'KB').consentements.binome = false;
  const r = construire(c);
  const attendus = RELATIONS.filter((id) => !id.split('-').includes('KB'));
  assert.deepEqual([...chapitres(r.niveau).keys()], attendus);
  assert.equal(attendus.length, 3);
  const omission = r.niveau.sections[0].paragraphes.map((p) => p.texte).join(' ');
  for (const id of RELATIONS.filter((x) => x.split('-').includes('KB'))) assert.ok(omission.includes(id), `omission de ${id} dite`);
  assert.ok(/omis/.test(omission));
  for (const rec of r.recommandations) assert.ok(!/\bKB\b/.test(rec.donnee), `${rec.id} ne mentionne pas KB`);
  // les recommandations des chapitres omis disparaissent aussi
  assert.ok(r.recommandations.length < sortie.recommandations.length);
});

test('aucun consentement : seul le cadre reste, et il le dit', () => {
  const c = copie(ctx);
  for (const p of c.cas.personnes) p.consentements.binome = false;
  const r = construire(c);
  assert.equal(chapitres(r.niveau).size, 0);
  assert.equal(r.recommandations.length, 0);
  assert.ok(/omis/.test(r.niveau.sections[0].paragraphes.map((p) => p.texte).join(' ')));
});

test('chaque chapitre porte le cadre et les cinq rubriques de l’annexe A', () => {
  for (const [id, secs] of chapitres(sortie.niveau)) {
    assert.deepEqual(secs.map((s) => s.rubrique), [0, 1, 2, 3, 4, 5], id);
    for (const s of secs) assert.ok(s.paragraphes.length > 0, `${id} rubrique ${s.rubrique} non vide`);
    assert.ok(/synergies probables sur la tâche/.test(secs[1].titre));
    assert.ok(/frictions probables sur la tâche/.test(secs[2].titre));
    assert.ok(/règles de fonctionnement proposées/.test(secs[3].titre));
    assert.ok(/scénarios et pré-mortem/.test(secs[4].titre));
    assert.ok(/recommandations/.test(secs[5].titre));
  }
});

test('le contenu varie réellement avec la nature de la relation', () => {
  const frictions = (id) => new Set(sortie.niveau.sections.find((s) => s.relation_id === id && s.rubrique === 2).paragraphes.filter((p) => /^Sur le domaine/.test(p.texte)).map((p) => p.texte.replace(/^.*?\. (Il se peut)/, '$1').replace(/\b[A-Z]{2}\b/g, 'X')));
  const regles = (id) => texteChapitre(sortie.niveau, id, 3);
  const ligne = texteChapitre(sortie.niveau, 'AM-KB');
  const pairs = texteChapitre(sortie.niveau, 'KB-HT');
  const mentorat = texteChapitre(sortie.niveau, 'AM-HT');
  // phrases propres à la nature
  assert.ok(ligne.includes('ligne hiérarchique'));
  assert.ok(ligne.includes('ne doit pas alimenter l’évaluation'));
  assert.ok(regles('AM-KB').includes('les priorités de la semaine sont écrites'));
  assert.ok(!regles('KB-HT').includes('les priorités de la semaine'));
  assert.ok(regles('KB-HT').includes('tierce personne désignée à l’avance'));
  assert.ok(regles('AM-HT').includes('objectifs d’apprentissage écrits'));
  assert.ok(!pairs.includes('ne doit pas alimenter l’évaluation'));
  assert.ok(!mentorat.includes('ne doit pas alimenter l’évaluation'));
  // les paragraphes de frictions ne se recouvrent pas entre nature différentes (variables personnelles neutralisées)
  const fl = frictions('AM-KB');
  const fp = frictions('KB-HT');
  const fm = frictions('AM-HT');
  assert.equal([...fl].filter((t) => fp.has(t)).length, 0);
  assert.equal([...fl].filter((t) => fm.has(t)).length, 0);
  assert.equal([...fp].filter((t) => fm.has(t)).length, 0);
});

test('une même différence de domaine se lit autrement selon la nature', () => {
  // les cinq domaines × six natures : gabarits de friction tous distincts
  const c = copie(ctx);
  const vus = new Map();
  for (const rel of c.faits.relations) {
    const ft = texteChapitre(construire(c).niveau, rel.id, 2);
    vus.set(rel.nature, ft);
  }
  assert.equal(new Set(vus.values()).size, 6);
});

test('la nature, le sens et l’interdépendance sont cités par leur règle de calibrage', () => {
  for (const rel of ctx.faits.relations) {
    const cadre = texteChapitre(sortie.niveau, rel.id, 0);
    for (const r of rel.calibrage.regles) assert.ok(cadre.includes(r.id), `${rel.id} cadre cite ${r.id}`);
  }
});

test('toute lecture est une hypothèse avec confiance, vérification et règle citée', () => {
  for (const s of sortie.niveau.sections) {
    for (const p of s.paragraphes) {
      assert.ok(['constate', 'hypothese'].includes(p.statut), p.id);
      if (p.statut === 'hypothese') {
        assert.ok(['faible', 'moyenne', 'elevee'].includes(p.confiance), `${p.id} confiance`);
        assert.ok(p.verification && p.verification.length > 20, `${p.id} verification`);
        if (s.rubrique >= 0 && s.rubrique <= 4) assert.match(p.texte, /(CAL|ECART|GARDE)-[A-Za-z-]+/, `${p.id} cite sa règle`);
      } else {
        assert.equal(p.confiance, undefined, `${p.id} constaté sans confiance`);
      }
    }
  }
});

test('seuls des constats reprennent des chiffres de faits ; les lectures restent des hypothèses', () => {
  for (const id of RELATIONS) {
    const cadre = sortie.niveau.sections.find((s) => s.relation_id === id && s.rubrique === 0);
    const ecarts = cadre.paragraphes.find((p) => /Écarts entre/.test(p.texte));
    assert.equal(ecarts.statut, 'constate');
    const rel = ctx.faits.relations.find((r) => r.id === id);
    for (const d of rel.domaines) assert.ok(ecarts.texte.includes(String(Number(d.ecart.toFixed(2))).replace('.', ',')), `${id} écart ${d.d}`);
    for (const f of facettesRetenues(rel)) assert.ok(ecarts.texte.includes(f.k), `${id} facette ${f.k}`);
  }
});

test('les blocs de la bibliothèque (apport, coût, question) sont repris avec bloc_ids, sans mention de relecture dans la prose', () => {
  for (const rel of ctx.faits.relations) {
    for (const rubrique of [1, 2]) {
      const avecBloc = sortie.niveau.sections.find((s) => s.relation_id === rel.id && s.rubrique === rubrique).paragraphes.filter((p) => p.bloc_ids);
      assert.equal(avecBloc.length, facettesRetenues(rel).length, `${rel.id} rubrique ${rubrique} : facettes retenues`);
      assert.ok(avecBloc.length >= 2 && avecBloc.length <= 3, `${rel.id} : deux à trois facettes`);
      avecBloc.forEach((p, i) => {
        assert.ok(!/non relus?/.test(p.texte), p.id);
        assert.ok(p.texte.includes(`bloc ${p.bloc_ids[0]}`), p.id);
        assert.ok(p.verification.includes('«'), `${p.id} question d’entretien`);
        const k = facettesRetenues(rel)[i].k;
        assert.ok(p.bloc_ids.every((b) => b.startsWith(`${k}/`)), `${p.id} ${p.bloc_ids}`);
        for (const b of p.bloc_ids) {
          const [code, niveau] = b.split('/');
          const f = ctx.bib.facettes.find((x) => x.code === code);
          const texte = rubrique === 1 ? f.niveaux[niveau].fr.apport[0] : f.niveaux[niveau].fr.cout[0];
          assert.ok(p.texte.includes(texte.replace(/\{[^{}]*\|[^{}]*\|([^{}]*)\}/g, '$1')), `${p.id} reprend le bloc ${b}`);
        }
      });
    }
  }
});

test('la langue de passation est rappelée quand elle diffère, jamais une valeur nationale', () => {
  const langues = Object.fromEntries(ctx.cas.personnes.map((p) => [p.code, p.langue_passation]));
  for (const rel of ctx.faits.relations) {
    const diff = langues[rel.a] !== langues[rel.b];
    const t = texteChapitre(sortie.niveau, rel.id);
    assert.equal(/réserve de comparaison/.test(t), diff, `${rel.id}`);
    assert.equal(t.includes('CAL-IC-PASSATION'), diff, `${rel.id} règle de passation`);
    if (diff) assert.ok(t.includes(`${rel.a} a répondu en ${langues[rel.a]}`) && t.includes(`${rel.b} en ${langues[rel.b]}`));
  }
  assert.ok(ctx.faits.relations.filter((r) => langues[r.a] !== langues[r.b]).length >= 2);
});

test('lecture croisée dans les deux sens pour une relation asymétrique, lecture symétrique sinon', () => {
  assert.ok(/Lecture croisée dans les deux sens/.test(texteChapitre(sortie.niveau, 'AM-KB', 2)));
  assert.ok(/Lecture croisée dans les deux sens/.test(texteChapitre(sortie.niveau, 'KB-SR', 2)));
  assert.ok(!/Lecture croisée dans les deux sens/.test(texteChapitre(sortie.niveau, 'KB-HT', 2)));
  assert.ok(/lecture de l’écart est symétrique/.test(texteChapitre(sortie.niveau, 'SR-HT', 2)));
});

test('recommandations : au moins deux par relation, sept attributs, responsable pris dans les rôles du cas', () => {
  const roles = new Set(ctx.cas.personnes.map((p) => p.role_equipe));
  const rolesOk = (resp) => resp.split(' et ').every((r) => roles.has(r));
  assert.ok(sortie.recommandations.length >= 12);
  const parRelation = new Map();
  for (const r of sortie.recommandations) {
    for (const k of ['donnee', 'contexte', 'risque', 'responsable', 'horizon', 'indicateur']) assert.ok(typeof r[k] === 'string' && r[k].length > 0, `${r.id} ${k}`);
    assert.ok(['source', 'hypothese'].includes(r.preuve.niveau));
    if (r.preuve.niveau === 'source') assert.ok(ctx.refs.references.some((x) => x.id === r.preuve.reference_id), `${r.id} référence valide`);
    else assert.equal(r.preuve.reference_id, null);
    assert.equal(r.niveau, 'n2');
    assert.match(r.id, /^REC-N2-\d+$/);
    assert.ok(rolesOk(r.responsable), `${r.id} responsable ${r.responsable}`);
    assert.match(r.horizon, /^(30|60|90) jours$/);
    assert.match(r.indicateur, /(30|60|90) jours|échéance/);
    const rel = RELATIONS.find((id) => r.donnee.includes(id));
    assert.ok(rel, `${r.id} rattachée à une relation : ${r.donnee}`);
    parRelation.set(rel, (parRelation.get(rel) ?? 0) + 1);
  }
  for (const id of RELATIONS) assert.ok((parRelation.get(id) ?? 0) >= 2, `${id} : au moins deux recommandations`);
  const types = texteChapitre(sortie.niveau, 'AM-KB', 5);
  assert.ok(/Recommandation coaching/.test(types) && /Recommandation formation/.test(types) && /Recommandation organisation/.test(types));
});

test('chaque recommandation de la rubrique 5 correspond à une recommandation produite', () => {
  const nb = sortie.niveau.sections.filter((s) => s.rubrique === 5).reduce((n, s) => n + s.paragraphes.length, 0);
  assert.equal(nb, sortie.recommandations.length);
});

test('ids de paragraphes, de sections et de recommandations uniques et bien préfixés', () => {
  const ids = [...sortie.niveau.sections.flatMap((s) => [s.id, ...s.paragraphes.map((p) => p.id)]), ...sortie.recommandations.map((r) => r.id)];
  assert.equal(new Set(ids).size, ids.length);
  for (const p of paragraphes(sortie.niveau)) assert.match(p.id, /^n2-/);
});

test('déterminisme : deux exécutions donnent exactement la même sortie', () => {
  assert.equal(JSON.stringify(construire(copie(ctx))), JSON.stringify(sortie));
});

test('les entrées ne sont pas modifiées', () => {
  const c = copie(ctx);
  construire(c);
  assert.deepEqual(c, ctx);
});

test('forme : aucun tiret cadratin, aucun pourcentage, aucune formule de prédiction ni d’étiquette', () => {
  const tout = JSON.stringify(sortie);
  assert.ok(!/[–—]/.test(tout), 'tiret cadratin ou demi-cadratin');
  assert.ok(!/%/.test(tout));
  assert.ok(!/\bvous\s+êtes\b/i.test(sortie.niveau.sections.flatMap((s) => s.paragraphes.map((p) => p.texte)).join(' ').replace(/«[^»]*»/g, '')));
});

test('la ligne hiérarchique dit que le chapitre ne doit pas alimenter une évaluation', () => {
  const t = texteChapitre(sortie.niveau, 'AM-KB', 0);
  assert.ok(/ne doit pas alimenter l’évaluation du travail de KB par AM/.test(t));
  assert.ok(/aucune décision d’emploi/.test(t));
  assert.ok(/pas un élément de dossier/.test(t));
  assert.ok(/n’est pas versé à un dossier d’évaluation/.test(texteChapitre(sortie.niveau, 'AM-KB', 3)));
});

test('une relation dont une règle de calibrage manque dans les faits est refusée', () => {
  const c = copie(ctx);
  c.faits.relations[0].calibrage.regles = c.faits.relations[0].calibrage.regles.filter((r) => !r.id.startsWith('CAL-NAT'));
  assert.throws(() => construire(c), /CAL-NAT/);
});

// ------------------------------------------------ audit du niveau seul
const rapportFactice = (niveau, recommandations) => {
  const ids = [...new Set(recommandations.map((r) => r.preuve.reference_id).filter(Boolean))];
  return {
    version: 'r-1.0',
    empreinte_entrees: ctx.faits.empreinte_entrees,
    etiquette_fictif: ctx.cas.etiquette,
    avertissements: [],
    niveaux: [niveau],
    recommandations,
    references: ids.map((id) => ({ id, citation: ctx.refs.references.find((x) => x.id === id)?.citation ?? id, statut: 'source à contrôler' }))
  };
};
const CATEGORIES_CONTENU = ['chiffre_absent_des_entrees', 'terme_interdit', 'comparaison_population', 'pourcentage_compatibilite', 'decision_emploi', 'moyenne_nationale_a_personne', 'references'];
const audit = (rapport) => auditer({ rapport, faits: ctx.faits, cas: ctx.cas, profils: ctx.profils, references: ctx.refs });

test('audit : 0 défaut de contenu sur le niveau et ses recommandations', () => {
  const { defauts, comptes } = audit(rapportFactice(sortie.niveau, sortie.recommandations));
  const contenu = defauts.filter((d) => CATEGORIES_CONTENU.includes(d.categorie));
  assert.deepEqual(contenu, []);
  for (const c of CATEGORIES_CONTENU) assert.equal(comptes[c], 0, c);
  // la structure des paragraphes et des recommandations est saine (seuls les autres niveaux manquent)
  const structure = defauts.filter((d) => d.categorie === 'structure' && !/^n[1345]-/.test(d.id));
  assert.deepEqual(structure, []);
});

test('audit, mutation : un nombre non sourcé fait échouer le contrôle de chiffres', () => {
  const niveau = copie(sortie.niveau);
  niveau.sections.find((s) => s.relation_id).paragraphes[0].texte += ' Le taux de réussite atteint 73 points.';
  const { comptes } = audit(rapportFactice(niveau, sortie.recommandations));
  assert.ok(comptes.chiffre_absent_des_entrees > 0);
});

test('audit, mutation : un terme interdit, une décision d’emploi et un pourcentage font échouer', () => {
  const muter = (ajout) => {
    const niveau = copie(sortie.niveau);
    niveau.sections.find((s) => s.relation_id).paragraphes[0].texte += ` ${ajout}`;
    return audit(rapportFactice(niveau, sortie.recommandations)).comptes;
  };
  assert.ok(muter('KB est au-dessus de la moyenne.').comparaison_population > 0);
  assert.ok(muter('Ce résultat justifie une promotion de KB.').decision_emploi > 0);
  assert.ok(muter('La compatibilité de AM et KB est de 80 %.').pourcentage_compatibilite > 0);
  assert.ok(muter('KB est typique de la culture marocaine.').moyenne_nationale_a_personne > 0);
});

test('audit, mutation : une référence hors liste fait échouer', () => {
  const recs = copie(sortie.recommandations);
  recs[0].preuve = { niveau: 'source', reference_id: 'inconnue-2020' };
  assert.ok(audit(rapportFactice(sortie.niveau, recs)).comptes.references > 0);
});

test('le titre de chaque section de chapitre contient les deux codes de personnes (« AM et KB »)', () => {
  for (const s of sortie.niveau.sections.filter((x) => x.relation_id)) {
    const [a, b] = s.relation_id.split('-');
    assert.ok(s.titre.startsWith(`${a} et ${b} : `), `${s.id} : ${s.titre}`);
  }
});

// ------------------------------------------------ mission corrective : relecture de contenu
const SENSIBLES = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'O3', 'O6', 'A2'];
const tousTextes = (niveau = sortie.niveau) => niveau.sections.flatMap((s) => s.paragraphes.map((p) => ({ ...p, rel: s.relation_id, rubrique: s.rubrique })));

test('I1 : jamais de bloc d’une facette sensible ni du domaine N cité à un pair ; O2 écartée (sans lien avec la tâche)', () => {
  for (const p of tousTextes()) {
    for (const b of p.bloc_ids ?? []) {
      const k = b.split('/')[0];
      assert.ok(!SENSIBLES.includes(k), `${p.id} cite le bloc sensible ${b}`);
      assert.ok(!k.startsWith('N'), `${p.id} cite un bloc du domaine N`);
      assert.notEqual(k, 'O2', `${p.id} cite O2`);
    }
    if (p.rel) for (const k of [...SENSIBLES, 'O2']) assert.ok(!new RegExp(`\b${k}\b`).test(p.texte), `${p.id} mentionne la facette ${k}`);
  }
  for (const rel of ctx.faits.relations) {
    const ks = facettesRetenues(rel).map((f) => f.k);
    assert.ok(ks.length >= 2, `${rel.id} : au moins deux facettes retenues`);
    for (const k of ks) assert.ok(!SENSIBLES.includes(k) && k !== 'O2');
  }
  // le domaine N reste lu au niveau du domaine
  assert.ok(tousTextes().some((p) => /domaine N/.test(p.texte)));
  for (const r of sortie.recommandations) for (const k of [...SENSIBLES, 'O2']) assert.ok(!new RegExp(`\b${k}\b`).test(`${r.texte} ${r.donnee}`), `${r.id} cite ${k}`);
});

test('I7 : le cadre de chaque relation donne la langue de passation de chacun à côté de la comparaison', () => {
  const langues = Object.fromEntries(ctx.cas.personnes.map((p) => [p.code, p.langue_passation]));
  for (const rel of ctx.faits.relations) {
    const p = sortie.niveau.sections.find((s) => s.relation_id === rel.id && s.rubrique === 0).paragraphes.find((x) => /^Écarts entre/.test(x.texte));
    assert.ok(p.texte.includes(`Langues de passation : ${rel.a} (${langues[rel.a]}), ${rel.b} (${langues[rel.b]}) ; équivalence des versions non établie.`), `${rel.id}`);
  }
});

test('I6 : chaque recommandation a un texte, une donnée et un indicateur propres à sa relation, ancrés dans une échéance et un risque du cas', () => {
  const recs = sortie.recommandations;
  assert.equal(new Set(recs.map((r) => r.texte)).size, recs.length);
  assert.equal(new Set(recs.map((r) => r.indicateur)).size, recs.length);
  assert.equal(new Set(recs.map((r) => `${r.donnee}|${r.texte}`)).size, recs.length);
  for (const r of recs) {
    const rel = RELATIONS.find((id) => r.donnee.includes(id));
    const [a, b] = rel.split('-');
    assert.ok(r.texte.includes(a) && r.texte.includes(b), `${r.id} nomme sa relation`);
    assert.ok(ctx.cas.tache.echeances.some((e) => r.contexte.includes(e)), `${r.id} ancrée dans une échéance du cas`);
    assert.ok(ctx.cas.tache.echeances.some((e) => r.texte.includes(e)), `${r.id} cite l’échéance dans le texte`);
    assert.ok(ctx.cas.tache.risques.some((x) => r.texte.includes(x)) || r.texte.startsWith('Tenir avec'), `${r.id} cite un risque du cas`);
  }
});

test('I6 : les entretiens de vérification ne sont plus du coaching', () => {
  const langue = (c) => ctx.cas.personnes.find((p) => p.code === c).langue_passation;
  const attendu = ctx.faits.relations.filter((r) => langue(r.a) !== langue(r.b)).length;
  const ver = tousTextes().filter((p) => p.rubrique === 5 && /^Recommandation vérification/.test(p.texte));
  assert.equal(ver.length, attendu);
  assert.ok(ver.length >= 2);
  for (const p of ver) assert.ok(/entretien de vérification/.test(p.texte));
  for (const p of tousTextes().filter((x) => x.rubrique === 5 && /^Recommandation coaching/.test(x.texte))) assert.ok(!/entretien de vérification/.test(p.texte));
});

test('I6 : les responsabilités sont réparties entre les quatre rôles, la charge est signalée (CT-07)', () => {
  const parRole = new Map();
  for (const r of sortie.recommandations) for (const role of r.responsable.split(' et ')) parRole.set(role, (parRole.get(role) ?? 0) + 1);
  assert.equal(parRole.size, 4);
  const total = sortie.recommandations.length;
  for (const [role, n] of parRole) assert.ok(n / total <= 0.4, `${role} porte trop de recommandations : ${n} sur ${total}`);
  const charge = sortie.niveau.sections[0].paragraphes.map((p) => p.texte).find((t) => /^Charge des rôles/.test(t));
  assert.ok(charge && charge.includes('CT-07') && charge.includes('sept dixièmes'));
  for (const role of parRole.keys()) assert.ok(charge.includes(role));
});

test('mineur : jamais de code de personne ni de sigle mis en minuscule', () => {
  const tout = JSON.stringify(sortie);
  assert.ok(!/\b(kB|aM|sR|hT|cNDP)\b/.test(tout));
  assert.ok(/AM et KB/.test(tout));
});

test('mineur : l’ordre des personnes suit (a, b) de la relation dans les écarts', () => {
  for (const rel of ctx.faits.relations) {
    const ecarts = sortie.niveau.sections.find((s) => s.relation_id === rel.id && s.rubrique === 0).paragraphes.find((x) => /^Écarts entre/.test(x.texte)).texte;
    assert.ok(ecarts.startsWith(`Écarts entre ${rel.a} et ${rel.b}`));
    for (const m of ecarts.matchAll(/ ; ([A-Z]{2}) [^,;]+, ([A-Z]{2}) [^,;.]+/g)) assert.deepEqual([m[1], m[2]], [rel.a, rel.b], `${rel.id} : ${m[0]}`);
  }
});

test('mineur : les écarts de faits sont repris arrondis à deux décimales, jamais au-delà', () => {
  for (const rel of ctx.faits.relations) {
    const t = texteChapitre(sortie.niveau, rel.id, 0);
    for (const d of rel.domaines) assert.ok(t.includes(String(Number(d.ecart.toFixed(2))).replace('.', ',')));
    assert.ok(!/écart \d+,\d{3,}/.test(t), `${rel.id} : écart à plus de deux décimales`);
  }
});

test('I5 : aucune référence à Bell ; seule la coordination selon l’interdépendance s’appuie sur une source (Thompson)', () => {
  assert.ok(!/Bell/.test(JSON.stringify(sortie)));
  assert.ok(sortie.recommandations.every((r) => r.preuve.reference_id !== 'bell-2007'));
  const sources = sortie.recommandations.filter((r) => r.preuve.niveau === 'source');
  assert.equal(sources.length, ctx.faits.relations.length);
  assert.ok(sources.every((r) => r.preuve.reference_id === 'thompson-1967' && /Interdépendance/.test(r.donnee)));
});
