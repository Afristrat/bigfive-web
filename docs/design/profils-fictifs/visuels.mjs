// Visuels animés du rapport : radar, écarts par facette (haltères), carte de chaleur d'équipe.
// SVG pur, animations CSS déclenchées quand l'élément entre dans l'écran (.vu, posée par un script de
// quelques lignes). Règle d'or : aucun contenu ne dépend d'une animation pour être visible. Les états de
// départ masqués n'existent que si le script tourne, que l'utilisateur n'a pas demandé moins de mouvement
// et qu'il n'a pas désactivé les animations (classe .sans-anim sur <html>) ; à l'impression, états finaux.
// Chaque visuel est suivi d'un tableau de ses valeurs (équivalent textuel, sans info-bulle native).
// En variante Word (MODE=docx), tous les visuels sont omis : pandoc ne sait pas les convertir.

const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
const COURT = { N: 'Névrosisme', E: 'Extraversion', O: 'Ouverture', A: 'Agréabilité', C: 'Conscience' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x) => x.toFixed(2).replace('.', ',');

// Deux profils ne se distinguent jamais par la seule teinte : une forme par profil (cercle, carré, triangle, losange).
function marque(forme, x, y, r, fill, attrs = '') {
  const f = (((forme ?? 0) % 4) + 4) % 4;
  const n = (v) => v.toFixed(1);
  if (f === 1) return `<rect ${attrs} x="${n(x - r)}" y="${n(y - r)}" width="${n(2 * r)}" height="${n(2 * r)}" rx="1" fill="${fill}"/>`;
  if (f === 2) return `<polygon ${attrs} points="${n(x)},${n(y - r * 1.25)} ${n(x + r * 1.15)},${n(y + r * 0.85)} ${n(x - r * 1.15)},${n(y + r * 0.85)}" fill="${fill}"/>`;
  if (f === 3) return `<polygon ${attrs} points="${n(x)},${n(y - r * 1.3)} ${n(x + r * 1.3)},${n(y)} ${n(x)},${n(y + r * 1.3)} ${n(x - r * 1.3)},${n(y)}" fill="${fill}"/>`;
  return `<circle ${attrs} cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${fill}"/>`;
}

// Équivalent textuel : tableau dans un bloc repliable.
function tableau(legende, entetes, lignes) {
  const tete = entetes.map((h) => `<th scope="col">${esc(h)}</th>`).join('');
  const corps = lignes.map((l) => `<tr><th scope="row">${esc(l[0])}</th>${l.slice(1).map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('');
  return `<details class="valeurs"><summary>Valeurs en tableau</summary><table><caption>${esc(legende)}</caption><thead><tr>${tete}</tr></thead><tbody>${corps}</tbody></table></details>`;
}

// ---------- Radar : un ou plusieurs profils superposés ----------
export function radarSvg(ps, { taille = 300, titre = 'Radar des cinq domaines' } = {}) {
  const c = taille / 2;
  const R = taille * 0.33;
  const angle = (i) => (-90 + i * 72) * (Math.PI / 180);
  const pt = (i, v) => { const r = R * ((v - 1) / 4); return [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))]; };
  const anneaux = [2, 3, 4, 5].map((v) => `<polygon class="anneau" points="${DOMAINES.map((_, i) => pt(i, v).map((n) => n.toFixed(1)).join(',')).join(' ')}"/>`).join('');
  const axes = DOMAINES.map((_, i) => { const [x, y] = pt(i, 5); return `<line class="axe" x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const etiquettes = DOMAINES.map((d, i) => {
    const r = R + 22; const x = c + r * Math.cos(angle(i)); const y = c + r * Math.sin(angle(i)) + 4;
    const ancre = Math.abs(Math.cos(angle(i))) < 0.2 ? 'middle' : Math.cos(angle(i)) > 0 ? 'start' : 'end';
    return `<text class="lab" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${ancre}">${COURT[d]}</text>`;
  }).join('');
  const polys = ps.map((p, k) => {
    const points = DOMAINES.map((d, i) => pt(i, p.domMoy[d]).map((n) => n.toFixed(1)).join(',')).join(' ');
    const pastilles = DOMAINES.map((d, i) => { const [x, y] = pt(i, p.domMoy[d]); return marque(p.forme, x, y, 4.6, p.couleur, `class="pt" style="--d:${(0.3 + k * 0.1 + i * 0.04).toFixed(2)}s"`); }).join('');
    return `<g class="forme" style="--d:${(k * 0.1).toFixed(2)}s"><polygon class="contour" pathLength="1" points="${points}" fill="${p.couleur}" fill-opacity=".16" stroke="${p.couleur}" stroke-width="2.4" stroke-linejoin="round"/>${pastilles}</g>`;
  }).join('');
  const hLeg = ps.length > 1 ? 26 : 0;
  const legende = ps.length > 1
    ? `<g transform="translate(${(c - (ps.length * 70) / 2 + 8).toFixed(1)},${taille + 8})">${ps.map((p, k) => `${marque(p.forme, k * 70, 0, 5.5, p.couleur)}<text class="gn" x="${k * 70 + 11}" y="4.5" text-anchor="start">${esc(p.code)}</text>`).join('')}</g>`
    : '';
  const description = ps.map((p) => `${p.nom} : ${DOMAINES.map((d) => `${COURT[d]} ${p.domaine[d]}`).join(', ')}`).join(' ; ');
  const table = tableau(titre, ['Domaine', ...ps.map((p) => `${p.code} (score sur 24, moyenne sur 5)`)], DOMAINES.map((d) => [COURT[d], ...ps.map((p) => `${p.domaine[d]}, ${fmt(p.domMoy[d])}`)]));
  return `<figure class="radar anim" role="region" tabindex="0" aria-label="${esc(titre)}"><svg viewBox="-70 -4 ${taille + 140} ${taille + 8 + hLeg}" style="min-width:${Math.round((taille + 140) * 0.95)}px" role="img" aria-label="${esc(titre)}. ${esc(description)}"><title>${esc(titre)}</title>${anneaux}${axes}${etiquettes}${polys}${legende}</svg>${table}</figure>`;
}

// ---------- Écarts par facette : deux points reliés sur une échelle de 1 à 5 ----------
export function dumbbellSvg(a, b, titres, ecartFn) {
  const L = 780, ligne = 21, gauche = 235, droite = 755, haut = 38;
  const x = (v) => gauche + ((v - 1) / 4) * (droite - gauche);
  let y = haut; let i = 0; let corps = ''; const lignes = [];
  for (const d of DOMAINES) {
    corps += `<text class="grp" x="0" y="${y + 13}">${COURT[d]}</text>`;
    y += ligne + 2;
    for (let f = 1; f <= 6; f++) {
      const k = d + f; const va = a.facette[k]; const vb = b.facette[k]; const e = ecartFn(va - vb);
      const cy = y + 10;
      lignes.push([titres[k], fmt(va), fmt(vb), fmt(Math.abs(va - vb)), e]);
      corps += `<g class="rang ${e}" style="--i:${i};--j:${i % 6}"><text class="fac" x="14" y="${cy + 4.5}">${esc(titres[k])}</text>`
        + `<line class="lien" x1="${x(va).toFixed(1)}" y1="${cy}" x2="${x(vb).toFixed(1)}" y2="${cy}" pathLength="1"/>`
        + marque(a.forme, x(va), cy, 5.6, a.couleur, 'class="bille"')
        + marque(b.forme, x(vb), cy, 5.6, b.couleur, 'class="bille"') + '</g>';
      y += ligne; i++;
    }
    y += 6;
  }
  const grille = [1, 2, 3, 4, 5].map((v) => `<line class="gr" x1="${x(v)}" y1="${haut - 6}" x2="${x(v)}" y2="${y - 4}"/><text class="gn" x="${x(v)}" y="${haut - 12}" text-anchor="middle">${v}</text>`).join('');
  const legende = `<g transform="translate(${gauche},12)">${marque(a.forme, 0, 0, 5.5, a.couleur)}<text class="gn" x="11" y="4.5" text-anchor="start">${esc(a.code)}</text>${marque(b.forme, 64, 0, 5.5, b.couleur)}<text class="gn" x="75" y="4.5" text-anchor="start">${esc(b.code)}</text><line class="lien notable" x1="126" y1="0" x2="156" y2="0" pathLength="1" style="animation:none;stroke-dashoffset:0"/><text class="gn" x="162" y="4.5" text-anchor="start">trait épais : écart de 1,0 ou plus</text></g>`;
  const titreFigure = `Les 30 facettes de ${a.nom} et ${b.nom}, côte à côte`;
  const table = tableau(titreFigure, ['Facette', a.code, b.code, 'Écart absolu', 'Lecture'], lignes);
  return `<figure class="halteres anim" role="region" tabindex="0" aria-label="${esc(titreFigure)}"><svg viewBox="0 0 ${L} ${y + 6}" style="min-width:${Math.round(L * 0.95)}px" role="img" aria-label="Positions de ${esc(a.nom)} et ${esc(b.nom)} sur les 30 facettes, échelle de 1 à 5, les écarts notables sont tracés en trait épais"><title>${esc(titreFigure)}</title>${grille}${legende}${corps}</svg>${table}</figure>`;
}

// ---------- Carte de chaleur d'équipe : 30 facettes x personnes, plus l'étendue ----------
const melange = (t) => { // 0 à 1 : teinte unique ; texte #0f2e2e toujours lisible (6,0 à 13,0)
  const a = [236, 245, 243], b = [111, 179, 179];
  return a.map((n, i) => Math.round(n + (b[i] - n) * t));
};
export function heatmapSvg(ps, titres) {
  const lignes = [];
  for (const d of DOMAINES) { lignes.push({ groupe: d }); for (let f = 1; f <= 6; f++) lignes.push({ k: d + f }); }
  const largeurNom = 235, cell = 66, hLigne = 23, haut = 48;
  const nbCol = ps.length; const xEt = largeurNom + nbCol * cell + 18;
  let y = haut; let i = 0; let corps = ''; const tab = [];
  for (const l of lignes) {
    if (l.groupe) { corps += `<text class="grp" x="0" y="${y + 15}">${COURT[l.groupe]}</text>`; y += hLigne + 2; continue; }
    const v = ps.map((p) => p.facette[l.k]); const min = Math.min(...v), max = Math.max(...v);
    let cellules = '';
    v.forEach((val, j) => {
      const t = (val - 1) / 4; const [r, g, bl] = melange(t);
      cellules += `<g class="case" style="--c:${j}"><rect x="${largeurNom + j * cell}" y="${y}" width="${cell - 3}" height="${hLigne - 3}" rx="4" fill="rgb(${r},${g},${bl})"/><text x="${largeurNom + j * cell + (cell - 3) / 2}" y="${y + 14.5}" text-anchor="middle" class="val">${fmt(val)}</text></g>`;
    });
    const eten = max - min; const larg = Math.max(2, (eten / 4) * 120);
    tab.push([titres[l.k], ...v.map(fmt), fmt(eten)]);
    corps += `<g class="rang" style="--i:${i};--j:${i % 6}"><text class="fac" x="14" y="${y + 14.5}">${esc(titres[l.k])}</text>${cellules}<rect class="eten ${eten >= 2 ? 'fort' : ''}" x="${xEt}" y="${y + 3}" width="${larg.toFixed(1)}" height="${hLigne - 9}" rx="3"/><text class="gn" x="${xEt + larg + 6}" y="${y + 14.5}" text-anchor="start">${fmt(eten)}</text></g>`;
    y += hLigne; i++;
  }
  const entetes = ps.map((p, j) => { const cx = largeurNom + j * cell + (cell - 3) / 2; return `${marque(p.forme, cx - 15, 20, 4.6, p.couleur)}<text class="ent" x="${cx - 6}" y="24.5" text-anchor="start" fill="${p.couleur}">${esc(p.code)}</text>`; }).join('') + `<text class="ent" x="${xEt}" y="24.5" text-anchor="start">Étendue</text>`;
  const L = xEt + 170;
  const titreFigure = 'Carte de chaleur des 30 facettes';
  const table = tableau(titreFigure, ['Facette', ...ps.map((p) => p.code), 'Étendue'], tab);
  return `<figure class="chaleur anim" role="region" tabindex="0" aria-label="${titreFigure}"><svg viewBox="0 0 ${L} ${y + 8}" style="min-width:${Math.round(L * 0.95)}px" role="img" aria-label="Carte de chaleur : moyenne de chaque facette pour chaque personne, échelle de 1 à 5, et étendue entre la plus basse et la plus haute"><title>${titreFigure}</title>${entetes}${corps}</svg>${table}</figure>`;
}

// ---------- Styles et script de mouvement ----------
export const CSS_VISUELS = `
.toc{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}.toc a{white-space:nowrap;flex:none}
section,h2,.carte{scroll-margin-top:68px}
@media (max-width:760px){.toc{position:static}}
figure{margin:12px 0}
.radar{display:flex;flex-direction:column;align-items:center;overflow-x:auto}.radar svg{width:min(100%,420px);height:auto;overflow:visible}
.halteres,.chaleur{overflow-x:auto;max-width:960px}.halteres svg,.chaleur svg{width:100%;height:auto}
.valeurs{margin:8px 0;font-size:.85rem;align-self:stretch}.valeurs summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600}
.valeurs table{border-collapse:collapse;width:100%}.valeurs caption{text-align:left;color:var(--mut);padding:4px 0}.valeurs th,.valeurs td{border:1px solid var(--ln);padding:4px 8px;text-align:left}
.anneau{fill:none;stroke:var(--grid,var(--ln))}.axe{stroke:var(--grid,var(--ln))}.lab{font:600 14px system-ui,Segoe UI,Arial;fill:var(--mut)}
.forme{transform-box:fill-box;transform-origin:center}
.gr{stroke:var(--grid,var(--ln));stroke-dasharray:3 4}.gn{font:13px system-ui,Segoe UI,Arial;fill:var(--mut)}.grp{font:700 14px system-ui,Segoe UI,Arial;fill:var(--fg)}
.fac{font:13px system-ui,Segoe UI,Arial;fill:var(--fg)}.val{font:600 13px system-ui,Segoe UI,Arial;fill:#0f2e2e}.ent{font:700 13px system-ui,Segoe UI,Arial;fill:var(--mut)}
.lien{stroke:var(--mut);stroke-width:2.4;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0}.rang.notable .lien,.lien.notable{stroke:var(--ecart,var(--no));stroke-width:3.8}
.rang.proche .lien{stroke-width:1.6}
.eten{fill:var(--mut)}.eten.fort{fill:var(--ecart,var(--no))}
.avatar .oeil{transform-box:fill-box;transform-origin:center;animation:cligne 6s infinite}
.avatar{animation:flotte 7s ease-in-out infinite}
.outils{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}.outils button{font:600 .9rem system-ui,Segoe UI,Arial;padding:8px 14px;min-height:44px;border-radius:999px;border:1px solid var(--ln);background:var(--card);color:var(--fg);cursor:pointer}
.outils button:hover{border-color:var(--mut)}.outils button:focus-visible{outline:3px solid var(--focus,var(--mid));outline-offset:2px}
.bille{transform-box:fill-box;transform-origin:center}
@keyframes radar-in{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes fondu{from{opacity:0}to{opacity:1}}
@keyframes entre{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
@keyframes trace{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes pop{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
@keyframes etire{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cligne{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@media (prefers-reduced-motion:no-preference){
.js:not(.sans-anim) .reveal{opacity:0;transform:translateY(12px);transition:opacity .5s cubic-bezier(.2,.7,.2,1),transform .5s cubic-bezier(.2,.7,.2,1)}
.js:not(.sans-anim) .reveal.vu{opacity:1;transform:none}
.js:not(.sans-anim) .forme{opacity:0;transform:scale(.2)}.js:not(.sans-anim) .anim.vu .forme{animation:radar-in .7s cubic-bezier(.2,.9,.25,1.05) var(--d,0s) both}
.js:not(.sans-anim) .forme .contour{stroke-dasharray:1;stroke-dashoffset:1}.js:not(.sans-anim) .anim.vu .forme .contour{animation:trace .8s ease var(--d,0s) forwards}
.js:not(.sans-anim) .pt{opacity:0}.js:not(.sans-anim) .anim.vu .pt{animation:fondu .35s ease var(--d,.4s) both}
.js:not(.sans-anim) .halteres .rang,.js:not(.sans-anim) .chaleur .rang{opacity:0}
.js:not(.sans-anim) .rang.vu{animation:entre .4s ease calc(var(--j,0) * 30ms) both}
.js:not(.sans-anim) .halteres .lien{stroke-dashoffset:1}.js:not(.sans-anim) .rang.vu .lien{animation:trace .5s ease calc(var(--j,0) * 30ms + .1s) forwards}
.js:not(.sans-anim) .rang.vu .bille{animation:pop .4s cubic-bezier(.3,1.6,.5,1) calc(var(--j,0) * 30ms + .2s) both}
.js:not(.sans-anim) .chaleur .case{opacity:0}.js:not(.sans-anim) .rang.vu .case{animation:fondu .35s ease calc(var(--j,0) * 30ms + var(--c,0) * 40ms) both}
.js:not(.sans-anim) .chaleur .eten{transform-box:fill-box;transform-origin:left center;transform:scaleX(0)}.js:not(.sans-anim) .rang.vu .eten{animation:etire .5s ease calc(var(--j,0) * 30ms + .2s) forwards}
.js:not(.sans-anim) .barre span{transform-origin:left center;transform:scaleX(0)}.js:not(.sans-anim) .vu .barre span{animation:etire .9s cubic-bezier(.2,.8,.2,1) .15s forwards}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
@media (forced-colors:active){.anneau,.axe,.gr,.lien{stroke:CanvasText}.lab,.gn,.grp,.fac,.ent,.val{fill:CanvasText}.eten{fill:CanvasText}}
@media print{*{animation:none!important;transition:none!important}.js .reveal,.js .forme,.js .pt,.js .rang,.js .case,.js .eten,.js .barre span{opacity:1!important;transform:none!important}.js .lien,.js .contour{stroke-dashoffset:0!important}.outils,.toc{display:none!important}@page{size:A4;margin:14mm 12mm}body{font-size:12px;line-height:1.45;background:#fff}main{max-width:none;padding:0}h2,h4{break-after:avoid}figure,.carte,.bloc,tr{break-inside:avoid}.pilote{break-inside:auto}section.binome,section.equipe{border:0;padding:0;margin:0;break-before:page}.radar svg{width:min(100%,300px);min-width:0}.halteres svg,.chaleur svg{min-width:0!important}.valeurs{display:none}.grille{grid-template-columns:repeat(2,1fr)}}
`;

export const SCRIPT_TETE = `document.documentElement.classList.add('js');`;
export const SCRIPT_MOUVEMENT = `
(function () {
  var racine = document.documentElement;
  var tous = [].slice.call(document.querySelectorAll('.reveal, .anim, .rang'));
  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function calme() { return reduit || racine.classList.contains('sans-anim'); }
  function compter(e) {
    e.querySelectorAll('[data-count]').forEach(function (n) {
      if (n.getAttribute('data-fait')) return; n.setAttribute('data-fait', '1');
      var fin = parseFloat(n.getAttribute('data-count')); if (calme()) { n.textContent = fin; return; }
      var t0 = null; function pas(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 900); n.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas); }
      requestAnimationFrame(pas);
    });
  }
  function montrer(e) { e.classList.add('vu'); compter(e); }
  // Déclenchement par la position du bord haut, jamais par un pourcentage de surface : une section de
  // plusieurs écrans (ou une figure haute) se déclenche dès que son début, ou chacune de ses lignes,
  // entre dans l'écran. Tout ce qui est au-dessus de l'écran (défilement par saut, ancre, touche Fin)
  // est montré d'emblée, donc rien ne reste masqué derrière le lecteur.
  var restants = tous.slice();
  function balayer() {
    var limite = window.innerHeight * 0.85, vus = [];
    restants.forEach(function (e) { if (e.getBoundingClientRect().top < limite) vus.push(e); });
    if (!vus.length) return;
    vus.forEach(montrer);
    restants = restants.filter(function (e) { return !e.classList.contains('vu'); });
  }
  var attente = false;
  function planifier() { if (attente) return; attente = true; requestAnimationFrame(function () { attente = false; balayer(); }); }
  function toutMontrer() { tous.forEach(function (e) { e.classList.add('vu'); e.querySelectorAll('[data-count]').forEach(function (n) { n.textContent = n.getAttribute('data-count'); n.setAttribute('data-fait', '1'); }); }); restants = []; }
  if (reduit) { tous.forEach(montrer); restants = []; }
  else {
    balayer();
    window.addEventListener('scroll', planifier, { passive: true });
    window.addEventListener('resize', planifier);
    window.addEventListener('load', balayer);
    // Délai de secours : si requestAnimationFrame est suspendu (onglet en arrière-plan, cadre masqué), le contenu déjà à l'écran est montré quand même.
    setTimeout(balayer, 3000);
  }
  // Dans un iframe srcdoc, un lien #ancre se résout contre l'adresse de la page parente et la recharge dans le cadre :
  // on intercepte donc tous les liens internes et on fait défiler le document soi-même.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var cible = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!cible) return;
    ev.preventDefault();
    cible.scrollIntoView({ behavior: calme() ? 'auto' : 'smooth', block: 'start' });
  });
  window.addEventListener('beforeprint', toutMontrer);
  var b = document.getElementById('imprimer');
  if (b) b.addEventListener('click', function () { toutMontrer(); window.print(); });
})();
`;
