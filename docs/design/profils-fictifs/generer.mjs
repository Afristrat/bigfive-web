// Génère docs/design/profils-fictifs/rapport-comparatif.html
//   node generer.mjs        (depuis web/ : le moteur de score vient de @bigfive-org/*)
// Trois profils FICTIFS (Karim B., Salma R., Hind T.) et le profil ESTIMÉ d'Amine (AM).
// Aucun pourcentage de compatibilité : la formule des rapports de référence n'est pas
// vérifiable (bases-rapports-individuel-et-binome.md, F1). Seuils : § 7.2 (conventions).
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { radarSvg, dumbbellSvg, heatmapSvg, CSS_VISUELS, SCRIPT_TETE, SCRIPT_MOUVEMENT } from './visuels.mjs';

const web = process.env.WEB_DIR || path.resolve(process.cwd());
const require = createRequire(path.join(web, '/'));
const { getItems } = require('@bigfive-org/questions');
const scoreLib = require('@bigfive-org/score');
const calc = scoreLib.default || scoreLib;
const results = require('@bigfive-org/results');
const here = path.dirname(fileURLToPath(import.meta.url));
const lib = JSON.parse(fs.readFileSync(path.join(here, '..', 'bibliotheque-textes', 'facettes-pilote.json'), 'utf-8'));

const MODE = process.env.MODE || 'html'; // 'docx' : variante pour pandoc (avatars en PNG, sans barres)
const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
const NOM_DOMAINE = { N: 'Névrosisme', E: 'Extraversion', O: 'Ouverture', A: 'Agréabilité', C: 'Conscience' };
const items = getItems('fr');

// Libellés des 30 facettes (moteur de résultats de l'application)
const facetteTitre = {};
for (const d of DOMAINES) for (let f = 1; f <= 6; f++) facetteTitre[d + f] = results.getFacet({ language: 'fr', domain: d, facet: f }).title;

// ---------- Profils ----------
const ordre = (d) => [1, 2, 3, 4, 5, 6].map((f) => d + f);
const vecteur = (n, e, o, a, c) => Object.fromEntries([...ordre('N').map((k, i) => [k, n[i]]), ...ordre('E').map((k, i) => [k, e[i]]), ...ordre('O').map((k, i) => [k, o[i]]), ...ordre('A').map((k, i) => [k, a[i]]), ...ordre('C').map((k, i) => [k, c[i]])]);

// Profil estimé d'Amine : MÊMES réponses que celles saisies dans le test en production
const cibleAM = { N1: 3, N2: 3, N3: 2, N4: 2, N5: 3, N6: 2, E1: 4, E2: 3, E3: 5, E4: 5, E5: 4, E6: 4, O1: 4, O2: 4, O3: 4, O4: 4, O5: 5, O6: 3, A1: 3, A2: 2, A3: 4, A4: 2, A5: 3, A6: 4, C1: 5, C2: 4, C3: 5, C4: 5, C5: 4, C6: 2 };
const delta = [0, 0, 1, -1, 0, 0, -1, 1];
const reponsesAM = items.map((it, i) => {
  const f = it.domain + it.facet;
  const hi = Math.max(1, Math.min(5, cibleAM[f] + (cibleAM[f] >= 4 || cibleAM[f] <= 2 ? 0 : delta[i % 8])));
  return { id: it.id, score: hi, domain: it.domain, facet: it.facet };
});
// Profils fictifs : moyennes de facette (multiples de 0,25) transformées en 4 réponses entières
function reponsesDepuisMoyennes(moy) {
  const parFacette = {};
  return items.map((it) => {
    const f = it.domain + it.facet;
    const m = moy[f];
    const base = Math.floor(m);
    const reste = Math.round((m - base) * 4);
    const rang = parFacette[f] = (parFacette[f] ?? -1) + 1;
    return { id: it.id, score: Math.min(5, base + (rang < reste ? 1 : 0)), domain: it.domain, facet: it.facet };
  });
}

const PROFILS = [
  { code: 'AM', nom: 'Amine (estimation)', sexe: 'h', fictif: false, couleur: '#0b6e6e', peau: '#e0b48f', cheveux: '#2b2018', style: 'court', barbe: true,
    note: 'Profil ESTIMÉ par Claude à partir de ce que l\'on sait d\'Amine, saisi dans le vrai test en production. Ce n\'est pas une mesure : seules ses propres réponses font foi.',
    reponses: reponsesAM },
  { code: 'KB', nom: 'Karim B.', sexe: 'h', fictif: true, couleur: '#8a5a00', peau: '#c98f65', cheveux: '#1d1a17', style: 'court', barbe: false,
    note: 'Profil FICTIF, construit pour la démonstration : méthodique, posé, très organisé, peu tourné vers la nouveauté.',
    reponses: reponsesDepuisMoyennes(vecteur([2, 2.25, 1.75, 2, 2.5, 1.75], [3.5, 3, 3.75, 3.5, 3, 3.25], [2.5, 2.25, 2.75, 2.25, 2, 3], [3.5, 2.75, 3.5, 3.25, 3.25, 3.5], [4.25, 4.5, 4.5, 4.25, 4, 4])) },
  { code: 'SR', nom: 'Salma R.', sexe: 'f', fictif: true, couleur: '#a3306b', peau: '#e8c4a0', cheveux: '#3a1f12', style: 'long', barbe: false,
    note: 'Profil FICTIF, construit pour la démonstration : énergique, curieuse, très ouverte aux idées nouvelles, plus spontanée que planificatrice.',
    reponses: reponsesDepuisMoyennes(vecteur([3.25, 3.5, 3, 2.75, 3.5, 3], [4.25, 4, 3.5, 4, 4.5, 4.5], [4.75, 4.5, 4.25, 4.75, 4, 4], [3, 2.5, 3.25, 3, 2.75, 3.25], [3, 2.75, 3.25, 3.5, 2.75, 2.25])) },
  { code: 'HT', nom: 'Hind T.', sexe: 'f', fictif: true, couleur: '#3a4fa3', peau: '#d9a77d', cheveux: '#14100d', style: 'foulard', barbe: false,
    note: 'Profil FICTIF, construit pour la démonstration : réservée, attentive aux autres, sensible à la pression, réfléchie et consciencieuse.',
    reponses: reponsesDepuisMoyennes(vecteur([4, 3.5, 3.5, 4.25, 3, 3.75], [2.5, 2.25, 2, 2.75, 1.75, 2.5], [3.75, 4, 4.25, 3.5, 3.75, 3], [4.25, 4.5, 4, 4.5, 4, 4.5], [3.75, 4.25, 4, 4, 3.75, 3.5])) },
];

for (const p of PROFILS) {
  const out = calc({ answers: p.reponses, lang: 'fr' });
  p.domaine = Object.fromEntries(DOMAINES.map((d) => [d, out[d].score]));            // 24 à 120
  p.facette = {};
  for (const d of DOMAINES) for (let f = 1; f <= 6; f++) p.facette[d + f] = out[d].facet[f].score / 4; // moyenne 1 à 5
  p.domMoy = Object.fromEntries(DOMAINES.map((d) => [d, p.domaine[d] / 24]));
}

// ---------- Niveaux et écarts (conventions § 7.2, à calibrer) ----------
const NIV = ['bas', 'plutot_bas', 'milieu', 'plutot_haut', 'haut'];
const NIV_FR = { bas: 'bas', plutot_bas: 'plutôt bas', milieu: 'milieu', plutot_haut: 'plutôt haut', haut: 'haut' };
const niveau = (m) => (m < 2 ? 'bas' : m < 2.6 ? 'plutot_bas' : m < 3.4 ? 'milieu' : m < 4 ? 'plutot_haut' : 'haut');
const dispersion = (d) => (d <= 0.5 ? 'homogène' : d >= 1 ? 'diverse' : 'intermédiaire');
const ecart = (d) => { const a = Math.abs(d); return a <= 0.5 ? 'proche' : a >= 1 ? 'notable' : 'intermédiaire'; };
const fmt = (x) => x.toFixed(2).replace('.', ',');
const sansAccord = (t) => t.replace(/\{([^{}|]*)\|([^{}|]*)\|([^{}|]*)\}/g, '$3');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const facettePilote = Object.fromEntries(lib.facettes.map((f) => [f.code, f]));
const bloc = (code, m) => { const f = facettePilote[code]; if (!f) return null; const n = f.niveaux[niveau(m)]; return n ? n.fr : null; };

// ---------- Avatars dessinés (SVG) ----------
function avatar(p, taille = 96, badge = true) {
  if (MODE === 'docx') return `<img src="avatars/${p.code}.png" alt="Avatar de ${esc(p.nom)}, initiales ${p.code}" width="${Math.round(taille * 0.75)}" />`;
  const h = p.sexe === 'h';
  const cheveuxHaut = p.style === 'court'
    ? `<path d="M30 46 C30 24 70 24 70 46 C66 36 34 36 30 46 Z" fill="${p.cheveux}"/>`
    : p.style === 'long'
      ? `<path d="M27 52 C22 20 78 20 73 52 L73 78 C70 74 68 62 68 56 C60 40 40 40 32 56 C32 62 30 74 27 78 Z" fill="${p.cheveux}"/>`
      : `<path d="M24 64 C18 12 82 12 76 64 L76 84 L24 84 Z" fill="${p.couleur}"/>`;
  const barbe = p.barbe ? `<path d="M34 58 C36 74 64 74 66 58 C60 66 40 66 34 58 Z" fill="${p.cheveux}" opacity=".9"/>` : '';
  const epaules = `<path d="M10 100 C12 82 30 76 50 76 C70 76 88 82 90 100 Z" fill="${p.couleur}"/>`;
  const col = h ? `<path d="M42 76 L50 86 L58 76 Z" fill="#ffffff" opacity=".9"/>` : `<path d="M40 76 C46 84 54 84 60 76 Z" fill="#ffffff" opacity=".35"/>`;
  const visage = `<ellipse cx="50" cy="52" rx="19" ry="23" fill="${p.peau}"/>`;
  const cou = `<rect x="44" y="68" width="12" height="12" rx="4" fill="${p.peau}"/>`;
  const yeux = `<circle class="oeil" cx="43" cy="51" r="2" fill="#2a1d14"/><circle class="oeil" cx="57" cy="51" r="2" fill="#2a1d14"/>`;
  const sourcils = `<path d="M38 45 Q43 42 47 45" stroke="${p.cheveux}" stroke-width="1.6" fill="none"/><path d="M53 45 Q57 42 62 45" stroke="${p.cheveux}" stroke-width="1.6" fill="none"/>`;
  const bouche = `<path d="M44 62 Q50 67 56 62" stroke="#7a3b2e" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  const bandeau = `<path d="M31 47 C32 31 68 31 69 47 C60 40 40 40 31 47 Z" fill="${p.couleur}"/>`;
  const cheveuxDessous = p.style === 'long' || p.style === 'foulard' ? cheveuxHaut : '';
  const cheveuxDessus = p.style === 'long' ? '' : p.style === 'foulard' ? bandeau : cheveuxHaut;
  const pastille = badge ? `<g><circle cx="78" cy="80" r="16" fill="#fff" stroke="${p.couleur}" stroke-width="3"/><text x="78" y="85" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-size="13" font-weight="700" fill="${p.couleur}">${p.code}</text></g>` : '';
  return `<svg class="avatar" width="${taille}" height="${taille}" viewBox="0 0 100 100" role="img" aria-label="Avatar dessiné de ${esc(p.nom)}, initiales ${p.code}"><circle cx="50" cy="50" r="49" fill="${p.couleur}" opacity=".14"/>${cheveuxDessous}${epaules}${col}${cou}${visage}${cheveuxDessus}${barbe}${sourcils}${yeux}${bouche}${pastille}</svg>`;
}

// ---------- Éléments de rendu ----------
const barre = (m, couleur, etiquette) => MODE === 'docx' ? '' : `<div class="barre" title="${esc(etiquette)}"><span style="width:${((m - 1) / 4 * 100).toFixed(1)}%;background:${couleur}"></span></div>`;
function carteDomaines(p) {
  return `<table class="dom">${DOMAINES.map((d) => `<tr><th>${NOM_DOMAINE[d]}</th><td>${barre(p.domMoy[d], p.couleur, NOM_DOMAINE[d])}</td><td class="n"><span data-count="${p.domaine[d]}">${p.domaine[d]}</span></td><td>${NIV_FR[niveau(p.domMoy[d])]}</td></tr>`).join('')}</table>`;
}
function tableFacettes(a, b) {
  const lignes = [];
  for (const d of DOMAINES) for (let f = 1; f <= 6; f++) {
    const k = d + f; const x = a.facette[k]; const y = b.facette[k]; const e = ecart(x - y);
    lignes.push({ k, d, x, y, delta: x - y, e });
  }
  return lignes;
}
const MODELE_DOMAINE = {
  N: { notable: 'L\'un ressent et exprime plus vite l\'inquiétude et la tension que l\'autre. Hypothèse : convenir d\'avance de la manière de signaler qu\'une échéance ou une charge devient lourde, pour que ni la tension ne soit minimisée ni l\'alerte surinterprétée.', proche: 'Réactions proches face à la pression : peu de risque de malentendu sur le niveau d\'alerte, mais aussi peu de contrepoids si le groupe s\'emballe ou se rassure à l\'excès.' },
  E: { notable: 'L\'un cherche davantage l\'échange, l\'énergie et la prise de parole que l\'autre. Hypothèse : prévoir des temps de discussion ouverte pour l\'un et des temps d\'écrit ou de réflexion préalable pour l\'autre.', proche: 'Besoins d\'échange et de prise de parole proches : rythme de contact facile à caler, à condition de ne pas oublier les voix extérieures au binôme.' },
  O: { notable: 'L\'un recherche la nouveauté et les idées abstraites plus que l\'autre. Hypothèse : séparer explicitement le temps d\'exploration des options du temps de décision, et nommer ce qui doit rester stable.', proche: 'Goût pour la nouveauté ou pour le connu proche : accord rapide sur la méthode, avec le risque de ne pas remettre en cause les habitudes communes.' },
  A: { notable: 'Les réponses diffèrent sur la confiance accordée aux autres et la façon d\'aborder le désaccord. Hypothèse : convenir d\'une règle simple pour exprimer un désaccord (quand, sous quelle forme) avant d\'en avoir besoin.', proche: 'Façons proches d\'aborder la coopération et le désaccord : peu de frottement de style attendu ; surveiller la tendance commune à éviter ou à durcir un désaccord.' },
  C: { notable: 'L\'un planifie, organise et tient ses engagements plus strictement que l\'autre. Hypothèse : partager le plan et les jalons dès le départ, et convenir de ce qui est négociable dans l\'organisation.', proche: 'Organisation et rigueur proches : répartition des tâches simple ; vérifier que personne ne porte seul la relance des échéances.' }
};

function rapportBinome(a, b) {
  const l = tableFacettes(a, b);
  const nb = (e) => l.filter((x) => x.e === e).length;
  const notables = l.filter((x) => x.e === 'notable').sort((p, q) => Math.abs(q.delta) - Math.abs(p.delta));
  const dom = DOMAINES.map((d) => {
    const dd = a.domMoy[d] - b.domMoy[d]; const e = ecart(dd);
    const m = MODELE_DOMAINE[d];
    return `<tr><th>${NOM_DOMAINE[d]}</th><td>${barre(a.domMoy[d], a.couleur, a.nom)}${barre(b.domMoy[d], b.couleur, b.nom)}</td><td class="n">${a.domaine[d]} / ${b.domaine[d]}</td><td><span class="pastille ${e}">${e}</span> (Δ ${fmt(Math.abs(dd))})</td><td class="texte">${e === 'notable' ? m.notable : e === 'proche' ? m.proche : 'Écart intermédiaire : à regarder facette par facette ci-dessous, sans conclure.'}</td></tr>`;
  }).join('');
  const lignesNotables = notables.slice(0, 6).map((x) => {
    const A = NIV_FR[niveau(x.x)], B = NIV_FR[niveau(x.y)];
    return `<tr><th>${facetteTitre[x.k]} <small>(${x.k})</small></th><td class="n">${fmt(x.x)}</td><td class="n">${fmt(x.y)}</td><td class="n">${fmt(Math.abs(x.delta))}</td><td>${esc(a.code)} : ${A} / ${esc(b.code)} : ${B}</td></tr>`;
  }).join('') || '<tr><td colspan="5">Aucun écart notable (|Δ| ≥ 1,0) sur les 30 facettes.</td></tr>';
  const pilotes = ['N6', 'E3', 'O5', 'A4', 'C5'].filter((k) => notables.some((x) => x.k === k));
  const blocs = pilotes.map((k) => {
    const x = l.find((y) => y.k === k);
    const ba = bloc(k, x.x), bb = bloc(k, x.y);
    if (!ba || !bb) return '';
    const lis = (n, p) => `<div class="bloc"><h5>${avatar(p, 28, false)} ${niveau(x.x) === niveau(x.y) ? esc(a.code) + ' et ' + esc(b.code) : esc(p.code)} · ${NIV_FR[niveau(n)]}</h5><p>${esc(sansAccord(ba === null ? '' : (p === a ? ba : bb).description.join(' ')))}</p><p><strong>Apport possible.</strong> ${esc(sansAccord((p === a ? ba : bb).apport.join(' ')))}</p><p><strong>Coût possible.</strong> ${esc(sansAccord((p === a ? ba : bb).cout.join(' ')))}</p></div>`;
    const question = sansAccord((niveau(x.x) !== 'milieu' ? ba : bb).question);
    const memeNiveau = niveau(x.x) === niveau(x.y);
    const corps = memeNiveau
      ? `<p class="muet">Les deux personnes tombent dans le même niveau de lecture (${NIV_FR[niveau(x.x)]}) : l'écart de ${fmt(Math.abs(x.delta))} franchit le seuil de 1,0 sans changer de niveau, ce qui est un effet de convention à ne pas surinterpréter.</p><div class="deux">${lis(x.x, a)}</div>`
      : `<div class="deux">${lis(x.x, a)}${lis(x.y, b)}</div>`;
    return `<div class="pilote"><h4>${facetteTitre[k]} (${k}) : écart notable de ${fmt(Math.abs(x.delta))}</h4>${corps}<p class="question"><strong>Question pour l'entretien.</strong> ${esc(question)}</p></div>`;
  }).join('');
  return `<section class="binome reveal" id="b-${a.code}-${b.code}">
    <header class="entete"><div class="duo">${avatar(a, 84)}<span class="et">×</span>${avatar(b, 84)}</div><div><h3>${esc(a.nom)} et ${esc(b.nom)}</h3><p class="sous">Rapport de binôme · ${nb('proche')} facettes proches, ${nb('intermédiaire')} intermédiaires, ${nb('notable')} notables sur 30</p></div></header>
    ${MODE === 'docx' ? '' : radarSvg([a, b], { titre: 'Radar de ' + a.nom + ' et ' + b.nom })}
    <h4>Les cinq domaines</h4>
    <div class="defil"><table class="comp"><thead><tr><th></th><th><span class="leg" style="background:${a.couleur}"></span>${esc(a.code)} <span class="leg" style="background:${b.couleur}"></span>${esc(b.code)}</th><th>Scores (24 à 120)</th><th>Écart</th><th>Lecture (hypothèse à confirmer en entretien)</th></tr></thead><tbody>${dom}</tbody></table></div>
    ${MODE === 'docx' ? '' : "<h4>Les 30 facettes d'un coup d'œil</h4>" + dumbbellSvg(a, b, facetteTitre, ecart)}
    <h4>Les écarts les plus nets</h4>
    <div class="defil"><table class="comp"><thead><tr><th>Facette</th><th>${esc(a.code)}</th><th>${esc(b.code)}</th><th>Δ</th><th>Niveaux</th></tr></thead><tbody>${lignesNotables}</tbody></table></div>
    ${blocs ? `<h4>Textes de la bibliothèque (facettes pilotes, version ${esc(lib.version)}, non relus)</h4>${blocs}` : '<p class="muet">Aucun écart notable sur les cinq facettes dotées d\'un texte dans la bibliothèque pilote : les autres facettes ne sont décrites que par leurs chiffres, volontairement, tant que la bibliothèque n\'est pas étendue et relue.</p>'}
  </section>`;
}

function rapportEquipe(ps) {
  const lignesDom = DOMAINES.map((d) => {
    const v = ps.map((p) => p.domMoy[d]); const min = Math.min(...v), max = Math.max(...v);
    const moy = v.reduce((s, x) => s + x, 0) / v.length;
    return `<tr><th>${NOM_DOMAINE[d]}</th><td>${ps.map((p) => barre(p.domMoy[d], p.couleur, `${p.nom} : ${p.domaine[d]}`)).join('')}</td><td class="n">${ps.map((p) => p.domaine[d]).join(' · ')}</td><td>${fmt(moy)} <small>(${fmt(min)} à ${fmt(max)})</small></td><td><span class="pastille ${dispersion(max - min) === 'homogène' ? 'proche' : dispersion(max - min) === 'diverse' ? 'notable' : 'intermédiaire'}">${dispersion(max - min)}</span></td></tr>`;
  }).join('');
  const facs = Object.keys(facetteTitre).map((k) => { const v = ps.map((p) => p.facette[k]); return { k, min: Math.min(...v), max: Math.max(...v), v }; });
  const diversite = facs.filter((f) => f.max - f.min >= 2).sort((a, b) => (b.max - b.min) - (a.max - a.min)).slice(0, 8);
  const convergence = facs.filter((f) => f.max - f.min <= 0.5);
  const carte = (f) => `<li><strong>${facetteTitre[f.k]}</strong> (${f.k}) : ${ps.map((p, i) => `${p.code} ${fmt(f.v[i])}`).join(', ')}</li>`;
  const manques = DOMAINES.map((d) => { const bas = ps.filter((p) => p.domMoy[d] < 2.6).map((p) => p.code); const haut = ps.filter((p) => p.domMoy[d] >= 3.4).map((p) => p.code); return `<tr><th>${NOM_DOMAINE[d]}</th><td>${haut.join(', ') || 'aucun'}</td><td>${bas.join(', ') || 'aucun'}</td></tr>`; }).join('');
  return `<section class="equipe reveal" id="equipe">
    <header class="entete"><div class="groupe">${ps.map((p) => avatar(p, 72)).join('')}</div><div><h3>Rapport d'équipe : ${ps.map((p) => p.code).join(', ')}</h3><p class="sous">Quatre personnes, ${ps.filter((p) => p.sexe === 'f').length} femmes et ${ps.filter((p) => p.sexe === 'h').length} hommes · une personne estimée, trois fictives</p></div></header>
    ${MODE === 'docx' ? '' : radarSvg(ps, { taille: 340, titre: 'Radar de ' + ps.map((q) => q.nom).join(', ') })}
    <h4>Cinq domaines : position de chacun et dispersion</h4>
    <div class="defil"><table class="comp"><thead><tr><th></th><th>${ps.map((p) => `<span class="leg" style="background:${p.couleur}"></span>${p.code}`).join(' ')}</th><th>Scores</th><th>Moyenne (étendue)</th><th>Dispersion</th></tr></thead><tbody>${lignesDom}</tbody></table></div>
    ${MODE === 'docx' ? '' : "<h4>Les 30 facettes de l'équipe en une carte</h4>" + heatmapSvg(ps, facetteTitre)}
    <h4>Qui se situe haut, qui se situe bas</h4>
    <div class="defil"><table class="comp"><thead><tr><th></th><th>Plutôt haut ou haut (moyenne ≥ 3,4)</th><th>Plutôt bas ou bas (moyenne &lt; 2,6)</th></tr></thead><tbody>${manques}</tbody></table></div>
    <h4>Là où l'équipe est diverse (étendue ≥ 2,0 sur une facette)</h4>
    <ul class="liste">${diversite.map(carte).join('') || '<li>Aucune facette n\'atteint 2,0 d\'étendue.</li>'}</ul>
    <p class="muet">Hypothèse à confirmer : une diversité marquée peut enrichir la tâche si les différences sont nommées, et devenir une source de frottement si elles ne le sont pas. Rien ici ne dit qui a « raison ».</p>
    <h4>Là où l'équipe est homogène (étendue ≤ 0,5 sur une facette)</h4>
    <ul class="liste">${convergence.map(carte).join('') || '<li>Aucune facette n\'est aussi homogène.</li>'}</ul>
    <p class="muet">Hypothèse à confirmer : une homogénéité forte facilite l'accord, mais prive l'équipe d'un contrepoids sur ce point précis.</p>
    <p class="muet">Dans l'application réelle, un rapport d'équipe n'est jamais rendu à un employeur au niveau individuel : seuil d'anonymat de 5 personnes minimum et consentement de chacun (migration 0005). Cette démonstration de quatre personnes ne vaut qu'avec des profils fictifs ou consentants.</p>
  </section>`;
}

// ---------- Assemblage ----------
const paires = [];
for (let i = 0; i < PROFILS.length; i++) for (let j = i + 1; j < PROFILS.length; j++) paires.push([PROFILS[i], PROFILS[j]]);
const cartes = PROFILS.map((p) => `<article class="carte reveal" style="--c:${p.couleur}"><div class="tete">${avatar(p, 96)}<div><h3>${esc(p.nom)}</h3><span class="etiq ${p.fictif ? 'fic' : 'est'}">${p.fictif ? 'Profil fictif' : 'Estimation, pas une mesure'}</span></div></div><p class="muet">${esc(p.note)}</p>${MODE === 'docx' ? '' : radarSvg([p], { taille: 260, titre: 'Radar de ' + p.nom })}${carteDomaines(p)}</article>`).join('');
const toc = MODE === 'docx' ? '' : `<nav class="toc"><a href="#profils">Profils</a>${paires.map(([a, b]) => `<a href="#b-${a.code}-${b.code}">${a.code} × ${b.code}</a>`).join('')}<a href="#equipe">Équipe</a></nav>`;
const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rapports comparatifs Big Five, démonstration</title>
<style>
:root{--bg:#f7f6f2;--fg:#1d1f21;--mut:#5d636b;--card:#fff;--ln:#dedbd2;--ok:#1f7a4d;--mid:#9a6b00;--no:#a8321f}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#15171a;--fg:#ecece8;--mut:#9aa0a8;--card:#1f2226;--ln:#34383e;--ok:#5fcf97;--mid:#e0b24a;--no:#ff8c78}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:1040px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:1.9rem;margin:.2em 0}h2{margin:2.2em 0 .6em;border-bottom:2px solid var(--ln);padding-bottom:.2em}h3{margin:0}h4{margin:1.4em 0 .4em}
.avert{background:var(--card);border:1px solid var(--ln);border-left:6px solid var(--mid);border-radius:10px;padding:14px 18px;margin:16px 0}
.avert li{margin:.25em 0}.muet{color:var(--mut);font-size:.92rem}
.toc{position:sticky;top:0;background:var(--bg);padding:8px 0;display:flex;flex-wrap:wrap;gap:8px;z-index:3;border-bottom:1px solid var(--ln)}
.toc a{padding:4px 10px;border:1px solid var(--ln);border-radius:999px;text-decoration:none;color:var(--fg);font-size:.88rem;background:var(--card)}
.grille{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.carte{background:var(--card);border:1px solid var(--ln);border-top:5px solid var(--c);border-radius:12px;padding:16px}
.tete{display:flex;gap:14px;align-items:center}.etiq{display:inline-block;font-size:.78rem;padding:2px 8px;border-radius:999px;border:1px solid var(--ln);margin-top:4px}.etiq.fic{color:var(--mid)}.etiq.est{color:var(--no)}
.avatar{flex:none}
table{border-collapse:collapse;width:100%}th,td{padding:6px 8px;text-align:left;vertical-align:top;border-bottom:1px solid var(--ln)}th{font-weight:600}
.dom th{width:34%}.dom td.n,.comp td.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.barre{height:9px;background:var(--ln);border-radius:5px;overflow:hidden;margin:3px 0;min-width:70px}.barre span{display:block;height:100%}
.defil{overflow-x:auto;background:var(--card);border:1px solid var(--ln);border-radius:10px}.comp{width:100%}
.comp td.texte{min-width:260px;font-size:.92rem}.leg{display:inline-block;width:10px;height:10px;border-radius:50%;margin:0 4px 0 8px}
.pastille{padding:1px 8px;border-radius:999px;font-size:.8rem;border:1px solid currentColor}.pastille.proche{color:var(--ok)}.pastille.intermédiaire{color:var(--mid)}.pastille.notable{color:var(--no)}
section.binome,section.equipe{background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:18px;margin:22px 0}
.entete{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.duo{display:flex;align-items:center;gap:6px}.et{font-size:1.6rem;color:var(--mut)}.groupe{display:flex;gap:4px;flex-wrap:wrap}.sous{margin:.2em 0;color:var(--mut)}
.deux{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.bloc{border:1px solid var(--ln);border-radius:10px;padding:10px 12px}.bloc h5{display:flex;align-items:center;gap:8px;margin:0 0 6px}
.pilote{border-left:4px solid var(--mid);padding-left:12px;margin:14px 0}.question{background:var(--bg);padding:8px 12px;border-radius:8px}
.liste li{margin:.3em 0}small{color:var(--mut)}
@media print{.toc{display:none}body{background:#fff}section,.carte{break-inside:avoid}}
${MODE === 'docx' ? '' : CSS_VISUELS}</style>${MODE === 'docx' ? '' : '<script>' + SCRIPT_TETE + '</script>'}</head><body><main>
<h1>Rapports comparatifs Big Five : démonstration</h1>
${MODE === 'docx' ? '' : '<div class="outils"><button id="imprimer" type="button">Imprimer ou enregistrer en PDF</button></div>'}
<p class="muet">Généré le 20 octobre 2026 avec le moteur de score de l'application (IPIP-NEO-120) et la bibliothèque de textes pilote ${esc(lib.version)}.</p>
<div class="avert"><strong>À lire avant tout.</strong><ul>
<li><strong>Trois des quatre profils sont fictifs</strong> (KB, SR, HT), construits pour illustrer les rapports. Ce ne sont pas des personnes réelles.</li>
<li><strong>Le profil AM est une estimation</strong> faite par Claude, pas une mesure d'Amine. Il correspond au résultat enregistré dans le test en production.</li>
<li><strong>Aucun pourcentage de compatibilité.</strong> Les rapports de référence en affichent un dont la formule n'est pas vérifiable ; celui-ci n'en invente pas.</li>
<li><strong>Textes : seules 5 facettes sur 30</strong> (N6, E3, O5, A4, C5) disposent d'un texte de la bibliothèque pilote (non relu par un humain). Les autres facettes ne sont décrites que par leurs chiffres et leurs niveaux. Les lectures par domaine sont des hypothèses à confirmer en entretien.</li>
<li><strong>Conventions non calibrées</strong> : niveaux (bas &lt; 2,0 ; plutôt bas &lt; 2,6 ; milieu &lt; 3,4 ; plutôt haut &lt; 4,0 ; haut) et écarts (proche ≤ 0,5 ; notable ≥ 1,0). Aucune norme de population n'existe encore : aucune comparaison avec « la moyenne ».</li>
<li>Avatars : dessins génériques, sans lien avec une personne réelle. Aucune image animée, aucune voix.</li></ul></div>
${toc}
<h2 id="profils">Les quatre profils</h2><div class="grille">${cartes}</div>
<h2>Rapports de binôme, un à un</h2>${paires.map(([a, b]) => rapportBinome(a, b)).join('')}
<h2>Rapport d'équipe</h2>${rapportEquipe(PROFILS)}
</main>${MODE === 'docx' ? '' : '<script>' + SCRIPT_MOUVEMENT + '</script>'}</body></html>`;
// Variante Word : les barres n'existent pas, on retire la colonne vide et son en-tête de légende.
const htmlSortie = MODE === 'docx'
  ? html.replace(/<td><\/td>/g, '').replace(/<th><span class="leg"[^>]*><\/span>[^<]*(?:<span class="leg"[^>]*><\/span>[^<]*)*<\/th>/g, '')
  : html;
fs.writeFileSync(path.join(here, MODE === 'docx' ? 'rapport-comparatif.docx.html' : 'rapport-comparatif.html'), htmlSortie, 'utf-8');
// Aperçu dans la plateforme : la page /admin/apercu-rapport affiche ce HTML dans un iframe isolé.
if (MODE !== 'docx') {
  const cible = path.resolve(here, '..', '..', '..', 'web', 'src', 'data');
  fs.mkdirSync(cible, { recursive: true });
  const NL = String.fromCharCode(10);
  const entete = ['// Généré par docs/design/profils-fictifs/generer.mjs : ne pas éditer à la main.',
    '// Profils FICTIFS (KB, SR, HT) et profil ESTIMÉ (AM), aucune donnée de personne réelle.'].join(NL);
  fs.writeFileSync(path.join(cible, 'rapport-apercu-html.ts'), entete + NL + 'export const rapportApercuHtml: string =' + NL + '  ' + JSON.stringify(html) + ';' + NL, 'utf-8');
}
if (MODE !== 'docx') fs.writeFileSync(path.join(here, 'profils.json'), JSON.stringify(PROFILS.map((p) => ({ code: p.code, nom: p.nom, fictif: p.fictif, sexe: p.sexe, domaine: p.domaine, facette: p.facette })), null, 2), 'utf-8');
console.log('ok', html.length, 'octets,', paires.length, 'binômes');
for (const p of PROFILS) console.log(p.code, JSON.stringify(p.domaine));
