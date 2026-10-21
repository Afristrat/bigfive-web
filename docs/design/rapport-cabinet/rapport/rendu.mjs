// Rendu HTML du rapport « cabinet » : document autonome (un seul fichier), thème clair et sombre,
// responsive, imprimable, visuels animés de profils-fictifs/visuels.mjs, avatars STATIQUES.
//   import { rendreHtml } from './rendu.mjs';
//   rendreHtml({ rapport, cas, faits, profils, bib })           -> HTML complet
//   rendreHtml({ ..., variante: 'docx' })                         -> variante sans SVG ni script (pandoc)
// Fonction pure : aucune date, aucun hasard, aucune lecture de fichier.
import { radarSvg, dumbbellSvg, heatmapSvg, CSS_VISUELS, SCRIPT_TETE, SCRIPT_MOUVEMENT } from '../../profils-fictifs/visuels.mjs';

const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
const NIVEAUX = [
  { id: 'n1-individuel', court: 'Individuel', titre: 'Analyse individuelle' },
  { id: 'n2-relations', court: 'Relations', titre: 'Analyse de relation' },
  { id: 'n3-equipe', court: 'Équipe', titre: 'Analyse d\'équipe' },
  { id: 'n4-organisation', court: 'Organisation', titre: 'Lecture organisationnelle' },
  { id: 'n5-accompagnement', court: 'Accompagnement', titre: 'Plan d\'accompagnement' }
];
const COULEURS = { AM: '#0b6e6e', KB: '#8a5a00', SR: '#a3306b', HT: '#3a4fa3' };
const PALETTE = ['#0b6e6e', '#8a5a00', '#a3306b', '#3a4fa3', '#5a7d1f', '#7a3b8f'];
const CONFIANCE = { faible: 'faible', moyenne: 'moyenne', elevee: 'élevée', 'élevée': 'élevée' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
const idSur = (s) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '_');
const numNiveau = (id) => { const m = /^n([1-5])/.exec(String(id ?? '')); return m ? Number(m[1]) : 0; };
const ecart = (d) => { const a = Math.abs(d); return a <= 0.5 ? 'proche' : a >= 1 ? 'notable' : 'intermédiaire'; };

// Visuels : seuls les avatars animés sont retirés de la feuille de style partagée (aucun avatar animé).
const CSS_SANS_AVATAR = CSS_VISUELS.split('\n')
  .filter((l) => !l.startsWith('.avatar') && !l.startsWith('@keyframes cligne') && !l.startsWith('@keyframes flotte'))
  .join('\n');

const CSS = `
:root{--bg:#f7f6f2;--fg:#1d1f21;--mut:#5d636b;--card:#fff;--ln:#dedbd2;--ok:#1f7a4d;--mid:#9a6b00;--no:#a8321f}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#15171a;--fg:#ecece8;--mut:#9aa0a8;--card:#1f2226;--ln:#34383e;--ok:#5fcf97;--mid:#e0b24a;--no:#ff8c78}}
:root[data-theme=dark]{--bg:#15171a;--fg:#ecece8;--mut:#9aa0a8;--card:#1f2226;--ln:#34383e;--ok:#5fcf97;--mid:#e0b24a;--no:#ff8c78}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:1040px;margin:0 auto;padding:24px 16px 80px}
h1{font-size:1.9rem;margin:.2em 0}h2{margin:0 0 .6em;border-bottom:2px solid var(--ln);padding-bottom:.2em}h3{margin:1.4em 0 .4em}h4{margin:0 0 .4em}
.muet{color:var(--mut);font-size:.92rem}
.etiq{display:inline-block;font-size:.8rem;padding:2px 10px;border-radius:999px;border:1px solid var(--no);color:var(--no);font-weight:600}
.avert{background:var(--card);border:1px solid var(--ln);border-left:6px solid var(--mid);border-radius:10px;padding:14px 18px;margin:16px 0}
.avert li{margin:.25em 0}
.toc{position:sticky;top:0;background:var(--bg);padding:8px 0;display:flex;flex-wrap:wrap;gap:8px;z-index:3;border-bottom:1px solid var(--ln)}
.toc a{padding:4px 10px;border:1px solid var(--ln);border-radius:999px;text-decoration:none;color:var(--fg);font-size:.88rem;background:var(--card)}
.toc a:focus-visible,.toc a:hover{border-color:var(--mut)}
section.niveau{background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:18px;margin:22px 0}
.visuels{margin:8px 0 16px}
.paire{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.initiales{flex:none;vertical-align:middle}
.para{border-left:4px solid var(--ln);padding:6px 0 6px 12px;margin:12px 0}
.para.constate{border-left-color:var(--ok)}.para.hypothese{border-left-color:var(--mid)}
.para p{margin:.3em 0}
.statut{display:inline-block;font-size:.78rem;font-weight:700;padding:1px 9px;border-radius:999px;border:1px solid currentColor;text-transform:uppercase;letter-spacing:.03em}
.constate>.statut{color:var(--ok)}.hypothese>.statut{color:var(--mid)}
.meta{margin:.3em 0;font-size:.92rem}.meta dt{display:inline;font-weight:700}.meta dd{display:inline;margin:0 14px 0 4px}
.blocs{font-size:.86rem;color:var(--mut)}.blocs code{background:var(--bg);border:1px solid var(--ln);border-radius:5px;padding:0 5px}
.nonrelu{color:var(--no);font-weight:700}
.recos{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin:12px 0}
.reco{border:1px solid var(--ln);border-top:5px solid var(--mid);border-radius:12px;padding:14px;background:var(--bg)}
.reco dl{margin:.4em 0 0}.reco dt{font-weight:700;font-size:.82rem;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;margin-top:.6em}.reco dd{margin:0}
.verif{color:var(--no);font-weight:600}
.refs li{margin:.3em 0}
.absent{color:var(--mut);font-style:italic}
footer{margin-top:32px}
@media (max-width:760px){main{padding:16px}h1{font-size:1.5rem}section.niveau{padding:12px}}
@media print{.toc{display:none}body{background:#fff}section.niveau,.para,.reco{break-inside:avoid}section.niveau{border:0;padding:0}}
${CSS_SANS_AVATAR}`;

// Avatar statique : initiales dans un cercle, aucune classe d'animation.
function avatar(p, taille, variante) {
  if (variante === 'docx') return `<strong>[${esc(p.code)}]</strong>`;
  const t = Math.round(taille * 0.4);
  return `<svg class="initiales" width="${taille}" height="${taille}" viewBox="0 0 100 100" role="img" aria-label="Initiales ${esc(p.code)}, ${esc(p.nom)}"><circle cx="50" cy="50" r="46" fill="${p.couleur}" fill-opacity=".16" stroke="${p.couleur}" stroke-width="4"/><text x="50" y="${50 + t * 0.36}" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-size="${t}" font-weight="700" fill="${p.couleur}">${esc(p.code)}</text></svg>`;
}

function preparerProfils(profils, cas) {
  const nomCas = Object.fromEntries((cas?.personnes ?? []).map((p) => [p.code, p]));
  return (profils ?? []).filter((p) => p && p.code && DOMAINES.every((d) => Number.isFinite(p.domaine?.[d]) && [1, 2, 3, 4, 5, 6].every((k) => Number.isFinite(p.facette?.[d + k])))).map((p, i) => ({
    ...p,
    nom: p.nom ?? nomCas[p.code]?.nom ?? p.code,
    couleur: COULEURS[p.code] ?? PALETTE[i % PALETTE.length],
    domMoy: Object.fromEntries(DOMAINES.map((d) => [d, p.domaine[d] / 24]))
  }));
}

function titresFacettes(bib) {
  const t = {};
  for (const f of bib?.facettes ?? []) t[f.code] = f.libelle?.fr ?? f.libelle_plateforme ?? f.code;
  for (const d of DOMAINES) for (let k = 1; k <= 6; k++) t[d + k] ??= d + k;
  return t;
}

// Codes de personnes cités dans un texte (mots entiers), dans l'ordre d'apparition.
const codesCites = (texte, codes) => {
  const trouves = [];
  for (const m of String(texte).matchAll(/[A-Za-z]{2}/g)) {
    const avant = texte[m.index - 1]; const apres = texte[m.index + 2];
    if (/[A-Za-z0-9]/.test(avant ?? '') || /[A-Za-z0-9]/.test(apres ?? '')) continue;
    if (codes.includes(m[0]) && !trouves.includes(m[0])) trouves.push(m[0]);
  }
  return trouves;
};

function paragraphe(p) {
  const hyp = p.statut === 'hypothese';
  const meta = hyp
    ? `<dl class="meta"><dt>Confiance</dt><dd>${esc(CONFIANCE[p.confiance] ?? 'non renseignée')}</dd><dt>Vérification</dt><dd class="verif">${esc(p.verification ?? 'non renseignée')}</dd></dl>`
    : '';
  const ids = Array.isArray(p.bloc_ids) ? p.bloc_ids : [];
  const blocs = ids.length
    ? `<p class="blocs">Bloc de la bibliothèque : ${ids.map((b) => `<code>${esc(b)}</code>`).join(' ')} <span class="nonrelu">bloc non relu</span></p>`
    : '';
  return `<div class="para ${hyp ? 'hypothese' : 'constate'}" id="${idSur(p.id)}"><span class="statut">${hyp ? 'Hypothèse' : 'Constaté'}</span><p>${esc(p.texte)}</p>${meta}${blocs}</div>`;
}

function carteReco(r, refsIds) {
  const pr = r.preuve ?? {};
  const preuve = pr.niveau === 'source' && pr.reference_id
    ? `Source : ${refsIds.has(pr.reference_id) ? `<a href="#ref-${idSur(pr.reference_id)}">${esc(pr.reference_id)}</a>` : esc(pr.reference_id)} <span class="verif">(à vérifier)</span>`
    : 'Hypothèse, sans source';
  const ligne = (l, v) => `<dt>${l}</dt><dd>${v}</dd>`;
  return `<article class="reco" id="${idSur(r.id)}"><h4>${esc(r.texte)}</h4><dl>`
    + ligne('Donnée', esc(r.donnee)) + ligne('Contexte', esc(r.contexte)) + ligne('Preuve', preuve)
    + ligne('Risque', esc(r.risque)) + ligne('Responsable', esc(r.responsable))
    + ligne('Horizon', esc(r.horizon)) + ligne('Indicateur', esc(r.indicateur))
    + '</dl></article>';
}

export function rendreHtml({ rapport, cas, faits, profils, bib, variante } = {}) {
  void faits; // les nombres viennent déjà du rapport ; faits reste dans la signature du contrat
  const docx = variante === 'docx';
  const r = rapport ?? {};
  const ps = preparerProfils(profils, cas);
  const parCode = Object.fromEntries(ps.map((p) => [p.code, p]));
  const codes = ps.map((p) => p.code);
  const titres = titresFacettes(bib);
  const visuel = (svg) => (docx ? '' : svg);
  const refs = Array.isArray(r.references) ? r.references : [];
  const refsIds = new Set(refs.map((x) => x.id));
  const recs = Array.isArray(r.recommandations) ? r.recommandations : [];
  const niveaux = Array.isArray(r.niveaux) ? r.niveaux : [];

  // Avertissements : le socle est imposé, ceux du rapport s'y ajoutent sans doublon.
  const socle = [];
  if (cas?.fictif !== false) socle.push('<strong>Cas fictif de démonstration.</strong> Les personnes, l\'organisation et les contraintes sont inventées pour illustrer le rapport.');
  if ((cas?.personnes ?? []).some((p) => p.code === 'AM' && p.fictif === false) || (!cas && codes.includes('AM'))) socle.push('<strong>Le profil AM est estimé</strong>, ce n\'est pas une mesure : seules les réponses de la personne font foi.');
  socle.push('<strong>Aucune comparaison à une population.</strong> Les niveaux sont des conventions de l\'outil, non calibrées, sans norme de référence.');
  socle.push('<strong>Aucune décision d\'emploi</strong> (recrutement, promotion, licenciement, affectation) ne peut s\'appuyer sur ce rapport.');
  socle.push('<strong>Blocs de la bibliothèque non relus</strong> par un humain : chaque bloc cité est signalé « bloc non relu ».');
  socle.push('<strong>Les lectures sont des hypothèses</strong> à vérifier en entretien. Ce rapport est relu et signé par un consultant qualifié avant tout usage.');
  const deja = socle.map((s) => s.replace(/<[^>]+>/g, '').toLowerCase());
  const supp = (r.avertissements ?? []).filter((a) => !deja.some((d) => d.includes(String(a).toLowerCase().slice(0, 40))));
  // Une seule liste : celle du rapport quand il en porte une, le socle seulement à défaut.
  const liste = (r.avertissements ?? []).length
    ? r.avertissements.map((a) => `<li>${esc(a)}</li>`).join('')
    : socle.map((s) => `<li>${s}</li>`).join('') + supp.map((a) => `<li>${esc(a)}</li>`).join('');
  const avert = `<div class="avert" role="note"><strong>À lire avant tout.</strong><ul>${liste}</ul></div>`;

  const toc = docx ? '' : `<nav class="toc" aria-label="Niveaux du rapport">${NIVEAUX.map((n) => `<a href="#${n.id}">${n.court}</a>`).join('')}<a href="#references">Références</a></nav>`;

  // Visuels par niveau
  const dejaRadar = new Set();
  const visuelSection = (num, titreSection, idSection) => {
    const cites = codesCites(`${titreSection} ${idSection}`.replace(/[-_/×]/g, ' '), codes);
    if (num === 1 && cites.length >= 1 && !dejaRadar.has(cites[0])) {
      const p = parCode[cites[0]]; dejaRadar.add(p.code);
      return `<div class="visuels paire">${avatar(p, 56, variante)}${visuel(radarSvg([p], { taille: 260, titre: 'Radar de ' + p.nom }))}</div>`;
    }
    if (num === 2 && cites.length >= 2) {
      const [a, b] = [parCode[cites[0]], parCode[cites[1]]];
      return `<div class="visuels"><div class="paire">${avatar(a, 48, variante)}<span aria-hidden="true">×</span>${avatar(b, 48, variante)}</div>`
        + visuel(radarSvg([a, b], { titre: 'Radar de ' + a.nom + ' et ' + b.nom }))
        + visuel(dumbbellSvg(a, b, titres, ecart)) + '</div>';
    }
    return '';
  };

  const corpsNiveau = (n) => {
    const num = numNiveau(n.id);
    const donnees = niveaux.find((x) => x.id === n.id || (numNiveau(x.id) === num && num > 0));
    const recsN = recs.filter((x) => numNiveau(x.niveau) === num);
    let tete = '';
    if (num === 3 && ps.length >= 2) {
      tete = `<div class="visuels">${visuel(radarSvg(ps, { taille: 340, titre: 'Radar de l\'équipe' }))}${visuel(heatmapSvg(ps, titres))}</div>`;
    }
    const sections = (donnees?.sections ?? []).map((s) =>
      `<h3 id="${idSur(s.id)}">${esc(s.titre)}</h3>${visuelSection(num, s.titre, s.id)}${(s.paragraphes ?? []).map(paragraphe).join('')}`).join('');
    const vide = donnees ? '' : '<p class="absent">Ce niveau n\'est pas produit dans ce rapport (consentement absent ou contenu non généré).</p>';
    const bloc = recsN.length ? `<h3>Recommandations</h3><div class="recos">${recsN.map((x) => carteReco(x, refsIds)).join('')}</div>` : '';
    return `<section class="niveau reveal" id="${n.id}"><h2>${esc(donnees?.titre ?? n.titre)}</h2>${tete}${sections}${vide}${bloc}</section>`;
  };

  const refsHtml = `<section class="niveau" id="references"><h2>Références</h2>${refs.length
    ? `<ul class="refs">${refs.map((x) => `<li id="ref-${idSur(x.id)}">${esc(x.citation)} <span class="verif">(${esc(x.statut ?? 'à vérifier')})</span></li>`).join('')}</ul>`
    : '<p class="absent">Aucune référence citée.</p>'}<p class="muet">Références non vérifiées à la date du rapport : à vérifier avant toute citation externe.</p></section>`;

  const titre = 'Rapport cabinet : ' + (cas?.organisation?.nom ?? 'cas de démonstration');
  const etiquette = r.etiquette_fictif ?? cas?.etiquette ?? '';
  const meta = `Version du rapport ${esc(r.version ?? 'non renseignée')} · empreinte des entrées ${esc(r.empreinte_entrees ?? 'non renseignée')}`;
  const tete = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"><title>${esc(titre)}</title>`
    + (docx ? '' : `<style>${CSS}</style><script>${SCRIPT_TETE}</script>`) + '</head>';
  const corps = `<body><main><h1>${esc(titre)}</h1>${etiquette ? `<p><span class="etiq">${esc(etiquette)}</span></p>` : ''}`
    + (docx ? '' : '<div class="outils"><button id="imprimer" type="button">Imprimer ou enregistrer en PDF</button></div>')
    + `<p class="muet">${meta}</p>${avert}${toc}${NIVEAUX.map(corpsNiveau).join('')}${refsHtml}`
    + '<footer class="muet">Rapport produit par script à partir des faits du moteur ; aucun nombre n\'est calculé par un modèle.</footer></main>'
    + (docx ? '' : `<script>${SCRIPT_MOUVEMENT}</script>`) + '</body></html>';
  return tete + corps;
}
