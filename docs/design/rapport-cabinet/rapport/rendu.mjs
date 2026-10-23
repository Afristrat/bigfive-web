// Rendu HTML du rapport « cabinet » : document autonome (un seul fichier), thème CLAIR par défaut, sombre et auto
// au choix (boutons à trois états, aria-pressed), responsive, imprimable (toujours en clair), visuels animés de profils-fictifs/visuels.mjs, avatars STATIQUES.
//   import { rendreHtml } from './rendu.mjs';
//   rendreHtml({ rapport, cas, faits, profils, bib })           -> HTML complet
//   rendreHtml({ ..., variante: 'docx' })                         -> variante sans SVG ni script (pandoc)
// Fonction pure : aucune date, aucun hasard, aucune lecture de fichier.
import { radarSvg, dumbbellSvg, heatmapSvg, CSS_VISUELS, SCRIPT_TETE, SCRIPT_MOUVEMENT } from '../../profils-fictifs/visuels.mjs';
import { bilanRelecture, sourceControlee, dateFr } from './outils.mjs';

const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
const NIVEAUX = [
  { id: 'n1-individuel', court: 'Individuel', titre: 'Analyse individuelle' },
  { id: 'n2-relations', court: 'Relations', titre: 'Analyse de relation' },
  { id: 'n3-equipe', court: 'Équipe', titre: 'Analyse d\'équipe' },
  { id: 'n4-organisation', court: 'Organisation', titre: 'Lecture organisationnelle' },
  { id: 'n5-accompagnement', court: 'Accompagnement', titre: 'Plan d\'accompagnement' }
];
// Couleur de profil : [clair, sombre]. Clair >= 5:1 sur fond clair, sombre >= 6,8:1 sur carte sombre.
const COULEURS = { AM: ['#141a33', '#c8cde0'], KB: ['#b07514', '#e0a640'], SR: ['#a3306b', '#f08cb9'], HT: ['#3a4fa3', '#8fa6f5'] };
const PALETTE = [['#0b6e6e', '#4fc3c3'], ['#8a5a00', '#e0a83a'], ['#a3306b', '#f08cb9'], ['#3a4fa3', '#8fa6f5'], ['#4d6b17', '#a6d05c'], ['#7a3b8f', '#d29be6']];
const NBSP = ' '; // espace insécable avant : ; ? !
const CONFIANCE = { faible: 'faible', moyenne: 'moyenne', elevee: 'élevée', 'élevée': 'élevée' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
const idSur = (s) => String(s ?? '').replace(/[^A-Za-z0-9_-]/g, '_');
const numNiveau = (id) => { const m = /^n([1-5])/.exec(String(id ?? '')); return m ? Number(m[1]) : 0; };
const ecart = (d) => { const a = Math.abs(d); return a <= 0.5 ? 'proche' : a >= 1 ? 'notable' : 'intermédiaire'; };

// Visuels : seuls les avatars animés sont retirés de la feuille de style partagée (aucun avatar animé).
const CSS_SANS_AVATAR = CSS_VISUELS.split('\n')
  .filter((l) => !l.startsWith('.avatar') && !l.startsWith('@keyframes cligne') && !l.startsWith('@keyframes flotte'))
  .join('\n');

const CLAIR = '--bg:#f7f6f2;--fg:#1d1f21;--mut:#545a62;--card:#fff;--ln:#dedbd2;--grid:#7f858c;--ok:#1f7a4d;--mid:#8a5a00;--no:#545a62;--ecart:#5b3f9a;--focus:#1d4ed8;--link:#1d4ed8;color-scheme:light';
const SOMBRE = '--bg:#15171a;--fg:#ecece8;--mut:#9aa0a8;--card:#1f2226;--ln:#363b41;--grid:#7b828a;--ok:#5fcf97;--mid:#e0b24a;--no:#9aa0a8;--ecart:#c4b8f5;--focus:#8fb4ff;--link:#8fb4ff;color-scheme:dark';
const CSS = `
:root{${CLAIR}}
:root[data-theme=dark]{${SOMBRE}}
html{scroll-padding-top:72px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:18px/1.6 system-ui,"Segoe UI",Roboto,Arial,sans-serif}
main{max-width:1040px;margin:0 auto;padding:24px 16px 80px;overflow-wrap:break-word}
a{color:var(--link);text-decoration:underline;text-underline-offset:2px}
a:focus-visible,button:focus-visible,summary:focus-visible,[tabindex]:focus-visible{outline:3px solid var(--focus);outline-offset:2px}
h1{font-size:1.9rem;line-height:1.25;margin:.2em 0}h2{margin:0 0 .6em;border-bottom:2px solid var(--ln);padding-bottom:.2em;line-height:1.3}h3{margin:1.4em 0 .4em;line-height:1.35}h4{margin:0 0 .4em}
.muet{color:var(--mut);font-size:.9rem}
.etiq{display:inline-block;font-size:.85rem;padding:2px 10px;border-radius:999px;border:1px solid var(--mut);color:var(--mut);font-weight:600}
.avert{background:var(--card);border:1px solid var(--ln);border-radius:10px;padding:14px 18px;margin:16px 0}
.avert ul{margin:.4em 0 0;padding-left:1.2em}.avert li{margin:.25em 0}
.chiffres{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}
.chiffres div{background:var(--card);border:1px solid var(--ln);border-radius:10px;padding:10px 14px}
.chiffres dt{color:var(--mut);font-size:.85rem}.chiffres dd{margin:0;font-size:1.8rem;font-weight:700;font-variant-numeric:tabular-nums}
.toc{position:sticky;top:0;background:var(--bg);padding:8px 0;display:flex;flex-wrap:wrap;gap:8px;z-index:3;border-bottom:1px solid var(--ln);align-items:center}
.toc.cabinet{flex-wrap:wrap;overflow:visible}
.toc a,.toc button{display:inline-flex;align-items:center;min-height:44px;padding:4px 12px;border:1px solid var(--ln);border-radius:999px;text-decoration:none;color:var(--fg);font:inherit;font-size:.9rem;background:var(--card)}
.toc button{cursor:pointer}.toc a:hover,.toc button:hover{border-color:var(--mut)}
.toc button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
.theme{display:inline-flex;gap:4px;align-items:center;margin-left:auto}.theme .muet{margin-right:4px;white-space:nowrap}
.toc .theme+button{flex:none}
section.niveau{background:var(--card);border:1px solid var(--ln);border-radius:14px;padding:18px;margin:22px 0}
.visuels{margin:8px 0 16px}
.paire{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.initiales{flex:none;vertical-align:middle}
.para{border-left:4px solid var(--ln);padding:6px 0 6px 12px;margin:12px 0}
.para.constate{border-left-color:var(--ok)}.para.hypothese{border-left-color:var(--mid)}
.para p{margin:.3em 0}
.statut{display:inline-block;font-size:.85rem;font-weight:700;padding:1px 9px;border-radius:999px;border:1px solid currentColor;text-transform:uppercase;letter-spacing:.03em}
.constate>.statut{color:var(--ok)}.hypothese>.statut{color:var(--mid)}
.meta{margin:.3em 0;font-size:.9rem}.meta dt{display:inline;font-weight:700}.meta dd{display:inline;margin:0 14px 0 4px}
.blocs{font-size:.85rem;color:var(--mut)}.blocs code{background:var(--bg);border:1px solid var(--ln);border-radius:5px;padding:0 5px}
.meta dd.verif{color:var(--fg);font-weight:400}
span.verif{display:inline-block;font-size:.85rem;padding:0 8px;border:1px solid var(--ln);border-radius:999px;color:var(--mut);background:var(--bg);font-weight:600}
.recos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr));gap:14px;margin:12px 0}
.reco{border:1px solid var(--ln);border-top:5px solid var(--mid);border-radius:12px;padding:14px;background:var(--bg)}
.reco dl{margin:.4em 0 0}.reco dt{font-weight:700;font-size:.85rem;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;margin-top:.6em}.reco dd{margin:0}
.bandeau{background:var(--card);border:1px solid var(--ln);border-radius:10px;padding:10px 16px;margin:16px 0;font-size:.95rem;color:var(--mut)}
.bandeau strong{color:var(--fg)}.bandeau.ok{border-color:var(--ok)}.bandeau.ok strong{color:var(--ok)}
.pied{margin:16px 0 0;font-size:.85rem;color:var(--mut)}
table.refs{width:100%;border-collapse:collapse;font-size:.95rem}
table.refs th,table.refs td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--ln);vertical-align:top}
table.refs th{color:var(--mut);font-size:.85rem;font-weight:700}
table.refs td[data-controle]{white-space:nowrap}
.absent{color:var(--mut);font-style:italic}
footer{margin-top:32px}
@media (max-width:760px){main{padding:16px}h1{font-size:1.5rem}section.niveau{padding:12px}}
@media print{:root,:root[data-theme=dark]{${CLAIR}}.toc{display:none}body{background:#fff;color:#1d1f21}section.niveau,.para,.reco{break-inside:avoid}section.niveau{border:0;padding:0}.recos{grid-template-columns:1fr}.reco dl{display:grid;grid-template-columns:9em 1fr;gap:.15em 1em;align-items:baseline}.reco dt{margin-top:0}#n2-relations .radar svg{width:min(100%,210px)}#n2-relations .halteres{max-width:none}#n2-relations .halteres svg{display:block;width:85%;margin:0 auto}}
${CSS_SANS_AVATAR}`;

// Couleurs de profil en variables : une valeur claire, une valeur sombre, claire à l'impression.
const cssProfils = (ps) => {
  const v = (i) => ps.map((p) => `--pc-${idSur(p.code)}:${p[i]}`).join(';');
  return `:root{${v('clair')}}:root[data-theme=dark]{${v('sombre')}}@media print{:root,:root[data-theme=dark]{${v('clair')}}}`;
};


// Thème : clair par défaut, choix à trois états (clair, sombre, auto) posé sur <html data-theme>.
// Le choix est mémorisé dans le document ; localStorage est un confort en try/catch (inaccessible dans un iframe sans allow-same-origin).
const SCRIPT_THEME = `
(function () {
  var r = document.documentElement, bs = [].slice.call(document.querySelectorAll('[data-theme-choix]'));
  var mq = window.matchMedia && matchMedia('(prefers-color-scheme: dark)'), choix = 'light';
  function appliquer() {
    var t = choix === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : choix;
    r.setAttribute('data-theme', t); r.setAttribute('data-choix', choix);
    bs.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-theme-choix') === choix ? 'true' : 'false'); });
  }
  try { var v = localStorage.getItem('rapport-theme'); if (v === 'dark' || v === 'auto') choix = v; } catch (e) { /* stockage indisponible */ }
  appliquer();
  bs.forEach(function (b) { b.addEventListener('click', function () { choix = b.getAttribute('data-theme-choix'); try { localStorage.setItem('rapport-theme', choix); } catch (e) { /* stockage indisponible */ } appliquer(); }); });
  if (mq && mq.addEventListener) mq.addEventListener('change', function () { if (choix === 'auto') appliquer(); });
  var a = document.getElementById('anim');
  if (a) a.addEventListener('click', function () { var coupe = !r.classList.contains('sans-anim'); r.classList.toggle('sans-anim', coupe); a.setAttribute('aria-pressed', coupe ? 'true' : 'false'); });
})();
`;

// Avatar statique : initiales dans un cercle, aucune classe d'animation.
function avatar(p, taille, variante) {
  if (variante === 'docx') return `<strong>[${esc(p.code)}]</strong>`;
  const t = 30; // unités du viewBox : 14 px rendus pour un avatar de 48 px, jamais sous 12 px
  return `<svg class="initiales" width="${taille}" height="${taille}" viewBox="0 0 100 100" role="img" aria-label="Initiales ${esc(p.code)}, ${esc(p.nom)}"><circle cx="50" cy="50" r="46" fill="${p.couleur}" fill-opacity=".16" stroke="${p.couleur}" stroke-width="4"/><text x="50" y="${50 + t * 0.35}" text-anchor="middle" font-family="system-ui,Segoe UI,Arial" font-size="${t}" font-weight="700" fill="${p.couleur}">${esc(p.code)}</text></svg>`;
}

function preparerProfils(profils, cas) {
  const nomCas = Object.fromEntries((cas?.personnes ?? []).map((p) => [p.code, p]));
  return (profils ?? []).filter((p) => p && p.code && DOMAINES.every((d) => Number.isFinite(p.domaine?.[d]) && [1, 2, 3, 4, 5, 6].every((k) => Number.isFinite(p.facette?.[d + k])))).map((p, i) => ({
    ...p,
    nom: p.nom ?? nomCas[p.code]?.nom ?? p.code,
    clair: (COULEURS[p.code] ?? PALETTE[i % PALETTE.length])[0],
    sombre: (COULEURS[p.code] ?? PALETTE[i % PALETTE.length])[1],
    forme: i % 4, // cercle, carré, triangle, losange : jamais la teinte seule
    couleur: `var(--pc-${idSur(p.code)})`,
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
    ? `<p class="blocs">Texte type de la bibliothèque${NBSP}: ${ids.map((b) => `<code>${esc(b)}</code>`).join(' ')}</p>`
    : '';
  return `<div class="para ${hyp ? 'hypothese' : 'constate'}" id="${idSur(p.id)}"><span class="statut">${hyp ? 'Hypothèse' : 'Constaté'}</span><p>${esc(p.texte)}</p>${meta}${blocs}</div>`;
}

function carteReco(r, refsParId) {
  const pr = r.preuve ?? {};
  const ref = refsParId.get(pr.reference_id);
  const preuve = pr.niveau === 'source' && pr.reference_id
    ? `Source${NBSP}: ${ref ? `<a href="#ref-${idSur(pr.reference_id)}">${esc(pr.reference_id)}</a>` : esc(pr.reference_id)}${sourceControlee(ref) ? '' : ' <span class="verif">(source à contrôler)</span>'}`
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
  const refsParId = new Map(refs.map((x) => [x.id, x]));
  const bilan = bilanRelecture(r, bib);
  const recs = Array.isArray(r.recommandations) ? r.recommandations : [];
  const niveaux = Array.isArray(r.niveaux) ? r.niveaux : [];

  // Avertissements : le socle est imposé, ceux du rapport s'y ajoutent sans doublon.
  const socle = [];
  if (cas?.fictif !== false) socle.push('<strong>Cas fictif de démonstration.</strong> Les personnes, l\'organisation et les contraintes sont inventées pour illustrer le rapport.');
  if ((cas?.personnes ?? []).some((p) => p.code === 'AM' && p.fictif === false) || (!cas && codes.includes('AM'))) socle.push('<strong>Le profil AM est estimé</strong>, ce n\'est pas une mesure : seules les réponses de la personne font foi.');
  socle.push('<strong>Aucune comparaison à une population.</strong> Les niveaux sont des conventions de l\'outil, non calibrées, sans norme de référence.');
  socle.push('<strong>Aucune décision d\'emploi</strong> (recrutement, promotion, licenciement, affectation) ne peut s\'appuyer sur ce rapport.');
  socle.push('<strong>Les lectures sont des hypothèses</strong> à vérifier en entretien. Ce rapport est relu et signé par un consultant qualifié avant tout usage.');
  const deja = socle.map((s) => s.replace(/<[^>]+>/g, '').toLowerCase());
  const supp = (r.avertissements ?? []).filter((a) => !deja.some((d) => d.includes(String(a).toLowerCase().slice(0, 40))));
  // Une seule liste : celle du rapport quand il en porte une, le socle seulement à défaut.
  const liste = (r.avertissements ?? []).length
    ? r.avertissements.map((a) => `<li>${esc(a)}</li>`).join('')
    : socle.map((s) => `<li>${s}</li>`).join('') + supp.map((a) => `<li>${esc(a)}</li>`).join('');
  const avert = `<div class="avert" role="note"><strong>À lire avant tout.</strong><ul>${liste}</ul></div>`;

  // Bandeau unique de relecture : compteurs CALCULÉS (bilanRelecture), vert seulement si tout est relu ET contrôlé, relecteur et date nommés.
  const nTextes = bilan.textesEnAttente;
  const nRefs = bilan.referencesEnAttente;
  const bandeau = bilan.complet
    ? `<div class="bandeau ok" id="bandeau-relecture" role="status"><strong>Version relue et contrôlée.</strong> Relecture${NBSP}: ${esc(bilan.relecteurs.join(', '))}, le ${dateFr(bilan.date)}.</div>`
    : `<div class="bandeau" id="bandeau-relecture" role="status"><strong>Version de travail, à relire avant remise.</strong> `
      + `${nTextes ? `${nTextes} texte${nTextes > 1 ? 's' : ''} type${nTextes > 1 ? 's' : ''} en attente de relecture` : 'Aucun texte type en attente de relecture'}, `
      + `${nRefs ? `${nRefs} référence${nRefs > 1 ? 's' : ''} à contrôler` : 'aucune référence à contrôler'}. Relecture et signature${NBSP}: à faire.</div>`;

  const choix = (v, l) => `<button type="button" data-theme-choix="${v}" aria-pressed="${v === 'light'}">${l}</button>`;
  const toc = docx ? '' : `<nav class="toc cabinet" aria-label="Niveaux du rapport et affichage">${NIVEAUX.map((n) => `<a href="#${n.id}">${n.court}</a>`).join('')}<a href="#references">Références</a>`
    + `<span class="theme" role="group" aria-label="Thème d'affichage"><span class="muet" aria-hidden="true">Thème</span>${choix('light', 'Clair')}${choix('dark', 'Sombre')}${choix('auto', 'Auto')}</span>`
    + '<button type="button" id="anim" aria-pressed="false">Désactiver les animations</button></nav>';

  // Chiffres du rapport : décomptes exacts du rapport, animés (compteurs) quand ils entrent à l'écran.
  const paras = niveaux.flatMap((n) => (n.sections ?? []).flatMap((x) => x.paragraphes ?? []));
  const compte = [['Constats', paras.filter((p) => p.statut !== 'hypothese').length], ['Hypothèses à vérifier', paras.filter((p) => p.statut === 'hypothese').length], ['Recommandations', recs.length], ['Références', refs.length]];
  const chiffres = docx ? '' : `<dl class="chiffres reveal anim" aria-label="Chiffres du rapport">${compte.map(([l, n]) => `<div><dt>${l}</dt><dd><span data-count="${n}">${n}</span></dd></div>`).join('')}</dl>`;

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
      `<div class="sec reveal"><h3 id="${idSur(s.id)}">${esc(s.titre)}</h3>${visuelSection(num, s.titre, s.id)}${(s.paragraphes ?? []).map(paragraphe).join('')}</div>`).join('');
    const pn = bilan.parNiveau[donnees?.id];
    const pied = pn?.cites ? `<p class="pied">Textes types de ce chapitre${NBSP}: ${pn.enAttente ? 'relecture en attente' : 'relus'}</p>` : '';
    const vide = donnees ? '' : '<p class="absent">Ce niveau n\'est pas produit dans ce rapport (consentement absent ou contenu non généré).</p>';
    const bloc = recsN.length ? `<h3>Recommandations</h3><div class="recos reveal">${recsN.map((x) => carteReco(x, refsParId)).join('')}</div>` : '';
    return `<section class="niveau" id="${n.id}"><h2>${esc(donnees?.titre ?? n.titre)}</h2>${tete}${sections}${vide}${bloc}${pied}</section>`;
  };

  const ligneRef = (x) => {
    const ok = sourceControlee(x);
    return `<tr id="ref-${idSur(x.id)}"><td>${esc(x.citation)}</td><td data-controle="${ok ? 'oui' : 'non'}">${ok ? `Oui, par ${esc(x.controlee_par)} le ${dateFr(x.controlee_le)}` : 'Non'}</td></tr>`;
  };
  const refsHtml = `<section class="niveau" id="references"><h2>Références</h2>${refs.length
    ? `<table class="refs" aria-label="Références citées et contrôle de leur source"><thead><tr><th scope="col">Référence</th><th scope="col">Source contrôlée</th></tr></thead><tbody>${refs.map(ligneRef).join('')}</tbody></table>`
    : '<p class="absent">Aucune référence citée.</p>'}${nRefs ? `<p class="muet">« Non »${NBSP}: la référence est citée de mémoire et sa source n'a pas été contrôlée. À contrôler avant toute citation externe.</p>` : ''}</section>`;

  const titre = 'Rapport cabinet : ' + (cas?.organisation?.nom ?? 'cas de démonstration');
  const etiquette = r.etiquette_fictif ?? cas?.etiquette ?? '';
  const meta = `Version du rapport ${esc(r.version ?? 'non renseignée')} · empreinte des entrées ${esc(r.empreinte_entrees ?? 'non renseignée')}`;
  const tete = `<!doctype html><html lang="fr" data-theme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"><title>${esc(titre)}</title>`
    + (docx ? '' : `<style>${CSS}${cssProfils(ps)}</style><script>${SCRIPT_TETE}</script>`) + '</head>';
  const corps = `<body><main><h1>${esc(titre)}</h1>${etiquette ? `<p><span class="etiq">${esc(etiquette)}</span></p>` : ''}`
    + (docx ? '' : '<div class="outils"><button id="imprimer" type="button">Imprimer ou enregistrer en PDF</button></div>')
    + `<p class="muet">${meta}</p>${bandeau}${avert}${chiffres}${toc}${NIVEAUX.map(corpsNiveau).join('')}${refsHtml}`
    + '<footer class="muet">Rapport produit par script à partir des faits du moteur ; aucun nombre n\'est calculé par un modèle.</footer></main>'
    + (docx ? '' : `<script>${SCRIPT_THEME}</script><script>${SCRIPT_MOUVEMENT}</script>`) + '</body></html>';
  return tete + corps;
}
