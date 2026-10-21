// Visuels animés du rapport : radar, écarts par facette (haltères), carte de chaleur d'équipe.
// SVG pur, animations CSS déclenchées à l'entrée dans l'écran (.vu, posée par un script de
// quelques lignes), désactivées si l'utilisateur demande moins de mouvement et à l'impression.
// En variante Word (MODE=docx), tous les visuels sont omis : pandoc ne sait pas les convertir.

const DOMAINES = ['N', 'E', 'O', 'A', 'C'];
const COURT = { N: 'Névrosisme', E: 'Extraversion', O: 'Ouverture', A: 'Agréabilité', C: 'Conscience' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (x) => x.toFixed(2).replace('.', ',');

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
    const pastilles = DOMAINES.map((d, i) => { const [x, y] = pt(i, p.domMoy[d]); return `<circle class="pt" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${p.couleur}" style="--d:${0.5 + k * 0.15 + i * 0.05}s"/>`; }).join('');
    return `<g class="forme" style="--d:${k * 0.15}s;transform-origin:${c}px ${c}px"><polygon points="${points}" fill="${p.couleur}" fill-opacity=".16" stroke="${p.couleur}" stroke-width="2.2" stroke-linejoin="round"/>${pastilles}</g>`;
  }).join('');
  const description = ps.map((p) => `${p.nom} : ${DOMAINES.map((d) => `${COURT[d]} ${p.domaine[d]}`).join(', ')}`).join(' ; ');
  return `<figure class="radar anim"><svg viewBox="-70 -4 ${taille + 140} ${taille + 8}" role="img" aria-label="${esc(titre)}. ${esc(description)}"><title>${esc(titre)}</title>${anneaux}${axes}${etiquettes}${polys}</svg></figure>`;
}

// ---------- Écarts par facette : deux points reliés sur une échelle de 1 à 5 ----------
export function dumbbellSvg(a, b, titres, ecartFn) {
  const L = 760, ligne = 19, gauche = 205, droite = 735, haut = 34;
  const x = (v) => gauche + ((v - 1) / 4) * (droite - gauche);
  let y = haut; let i = 0; let corps = '';
  for (const d of DOMAINES) {
    corps += `<text class="grp" x="0" y="${y + 12}">${COURT[d]}</text>`;
    y += ligne + 2;
    for (let f = 1; f <= 6; f++) {
      const k = d + f; const va = a.facette[k]; const vb = b.facette[k]; const e = ecartFn(va - vb);
      const cy = y + 9;
      corps += `<g class="rang ${e}" style="--i:${i}"><text class="fac" x="14" y="${cy + 4}">${esc(titres[k])}</text>`
        + `<line class="lien" x1="${x(va).toFixed(1)}" y1="${cy}" x2="${x(vb).toFixed(1)}" y2="${cy}" pathLength="1"/>`
        + `<circle class="bille" cx="${x(va).toFixed(1)}" cy="${cy}" r="5.4" fill="${a.couleur}"><title>${esc(a.code)} ${fmt(va)}</title></circle>`
        + `<circle class="bille" cx="${x(vb).toFixed(1)}" cy="${cy}" r="5.4" fill="${b.couleur}"><title>${esc(b.code)} ${fmt(vb)}</title></circle></g>`;
      y += ligne; i++;
    }
    y += 6;
  }
  const grille = [1, 2, 3, 4, 5].map((v) => `<line class="gr" x1="${x(v)}" y1="${haut - 6}" x2="${x(v)}" y2="${y - 4}"/><text class="gn" x="${x(v)}" y="${haut - 12}" text-anchor="middle">${v}</text>`).join('');
  const legende = `<g transform="translate(${gauche},10)"><circle cx="0" cy="0" r="5" fill="${a.couleur}"/><text class="gn" x="9" y="4" text-anchor="start">${esc(a.code)}</text><circle cx="60" cy="0" r="5" fill="${b.couleur}"/><text class="gn" x="69" y="4" text-anchor="start">${esc(b.code)}</text><line class="lien notable" x1="120" y1="0" x2="150" y2="0" pathLength="1" style="animation:none;stroke-dashoffset:0"/><text class="gn" x="156" y="4" text-anchor="start">écart notable (1,0 ou plus)</text></g>`;
  return `<figure class="halteres anim"><svg viewBox="0 0 ${L} ${y + 6}" role="img" aria-label="Positions de ${esc(a.nom)} et ${esc(b.nom)} sur les 30 facettes, échelle de 1 à 5, les écarts notables sont en rouge"><title>Les 30 facettes, côte à côte</title>${grille}${legende}${corps}</svg></figure>`;
}

// ---------- Carte de chaleur d'équipe : 30 facettes x personnes, plus l'étendue ----------
const melange = (t) => { // 0 à 1 : clair vers sombre, teinte unique
  const a = [236, 245, 243], b = [11, 94, 94];
  return a.map((n, i) => Math.round(n + (b[i] - n) * t));
};
export function heatmapSvg(ps, titres) {
  const lignes = [];
  for (const d of DOMAINES) { lignes.push({ groupe: d }); for (let f = 1; f <= 6; f++) lignes.push({ k: d + f }); }
  const largeurNom = 190, cell = 62, hLigne = 21, haut = 44;
  const nbCol = ps.length; const xEt = largeurNom + nbCol * cell + 18;
  let y = haut; let i = 0; let corps = '';
  for (const l of lignes) {
    if (l.groupe) { corps += `<text class="grp" x="0" y="${y + 14}">${COURT[l.groupe]}</text>`; y += hLigne + 2; continue; }
    const v = ps.map((p) => p.facette[l.k]); const min = Math.min(...v), max = Math.max(...v);
    let cellules = '';
    v.forEach((val, j) => {
      const t = (val - 1) / 4; const [r, g, bl] = melange(t); const clair = t < 0.55;
      cellules += `<g class="case" style="--i:${i * 4 + j}"><rect x="${largeurNom + j * cell}" y="${y}" width="${cell - 3}" height="${hLigne - 3}" rx="4" fill="rgb(${r},${g},${bl})"/><text x="${largeurNom + j * cell + (cell - 3) / 2}" y="${y + 13}" text-anchor="middle" class="val" fill="${clair ? '#173b3b' : '#ffffff'}">${fmt(val)}</text></g>`;
    });
    const eten = max - min; const larg = Math.max(2, (eten / 4) * 120);
    corps += `<g class="rang" style="--i:${i}"><text class="fac" x="14" y="${y + 13}">${esc(titres[l.k])}</text>${cellules}<rect class="eten ${eten >= 2 ? 'fort' : ''}" x="${xEt}" y="${y + 3}" width="${larg.toFixed(1)}" height="${hLigne - 9}" rx="3"><title>Étendue ${fmt(eten)}</title></rect><text class="gn" x="${xEt + larg + 6}" y="${y + 13}" text-anchor="start">${fmt(eten)}</text></g>`;
    y += hLigne; i++;
  }
  const entetes = ps.map((p, j) => `<text class="ent" x="${largeurNom + j * cell + (cell - 3) / 2}" y="22" text-anchor="middle" fill="${p.couleur}">${esc(p.code)}</text>`).join('') + `<text class="ent" x="${xEt}" y="22" text-anchor="start">Étendue</text>`;
  const L = xEt + 170;
  return `<figure class="chaleur anim"><svg viewBox="0 0 ${L} ${y + 8}" role="img" aria-label="Carte de chaleur : moyenne de chaque facette pour chaque personne, échelle de 1 à 5, et étendue entre la plus basse et la plus haute"><title>Carte de chaleur des 30 facettes</title>${entetes}${corps}</svg></figure>`;
}

// ---------- Styles et script de mouvement ----------
export const CSS_VISUELS = `
.toc{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:thin}.toc a{white-space:nowrap;flex:none}
section,h2,.carte{scroll-margin-top:68px}
@media (max-width:760px){.toc{position:static}}
.js .reveal{opacity:0;transform:translateY(16px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.js .reveal.vu{opacity:1;transform:none}
figure{margin:12px 0}
.radar{display:flex;justify-content:center}.radar svg{width:min(100%,420px);height:auto;overflow:visible}
.anneau{fill:none;stroke:var(--ln)}.axe{stroke:var(--ln)}.lab{font:600 11px system-ui,Segoe UI,Arial;fill:var(--mut)}
.forme{transform-box:view-box}
.js .forme{opacity:0;transform:scale(.2)}.js .anim.vu .forme{animation:radar-in .95s cubic-bezier(.2,.9,.25,1.05) var(--d,0s) both}
.js .pt{opacity:0}.js .anim.vu .pt{animation:fondu .4s ease var(--d,.6s) both}
.halteres svg,.chaleur svg{width:100%;height:auto}
.gr{stroke:var(--ln);stroke-dasharray:3 4}.gn{font:11px system-ui,Segoe UI,Arial;fill:var(--mut)}.grp{font:700 12px system-ui,Segoe UI,Arial;fill:var(--fg)}
.fac{font:11.5px system-ui,Segoe UI,Arial;fill:var(--fg)}.val{font:600 10.5px system-ui,Segoe UI,Arial}.ent{font:700 12px system-ui,Segoe UI,Arial;fill:var(--mut)}
.lien{stroke:var(--mut);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:0}.rang.notable .lien,.lien.notable{stroke:var(--no);stroke-width:3.2}
.rang.proche .lien{stroke-opacity:.45}
.js .halteres .rang,.js .chaleur .rang{opacity:0}
.js .anim.vu .rang{animation:entre .55s ease calc(var(--i) * 22ms) both}
.js .halteres .lien{stroke-dashoffset:1}.js .anim.vu .lien{animation:trace .8s ease calc(var(--i) * 22ms + .15s) forwards}
.js .anim.vu .bille{animation:pop .5s cubic-bezier(.3,1.6,.5,1) calc(var(--i, 0) * 22ms + .25s) both}
.js .chaleur .case{opacity:0}.js .anim.vu .case{animation:fondu .45s ease calc(var(--i) * 12ms) both}
.eten{fill:var(--mut);opacity:.55}.eten.fort{fill:var(--no);opacity:.9}
.js .chaleur .eten{transform-box:fill-box;transform-origin:left center;transform:scaleX(0)}.js .anim.vu .eten{animation:etire .7s ease calc(var(--i) * 22ms + .4s) forwards}
.avatar .oeil{transform-box:fill-box;transform-origin:center;animation:cligne 6s infinite}
.avatar{animation:flotte 7s ease-in-out infinite}
.js .barre span{transform-origin:left center;transform:scaleX(0)}.js .vu .barre span{animation:etire .9s cubic-bezier(.2,.8,.2,1) .15s forwards}
.outils{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:14px 0}.outils button{font:600 .9rem system-ui,Segoe UI,Arial;padding:8px 14px;border-radius:999px;border:1px solid var(--ln);background:var(--card);color:var(--fg);cursor:pointer}
.outils button:hover{border-color:var(--mut)}.outils button:focus-visible{outline:3px solid var(--mid);outline-offset:2px}
@keyframes radar-in{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes fondu{from{opacity:0}to{opacity:1}}
@keyframes entre{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
@keyframes trace{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes pop{from{opacity:0;transform:scale(0)}to{opacity:1;transform:scale(1)}}
@keyframes etire{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes cligne{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes flotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.bille{transform-box:fill-box;transform-origin:center}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.js .reveal,.js .forme,.js .pt,.js .rang,.js .case,.js .eten,.js .barre span{opacity:1!important;transform:none!important}.js .lien{stroke-dashoffset:0!important}}
@media print{*{animation:none!important;transition:none!important}.js .reveal,.js .forme,.js .pt,.js .rang,.js .case,.js .eten,.js .barre span{opacity:1!important;transform:none!important}.js .lien{stroke-dashoffset:0!important}.outils,.toc{display:none!important}@page{size:A4;margin:14mm 12mm}body{font-size:12px;line-height:1.45;background:#fff}main{max-width:none;padding:0}h2,h4{break-after:avoid}figure,.carte,.bloc,tr{break-inside:avoid}.pilote{break-inside:auto}section.binome,section.equipe{border:0;padding:0;margin:0;break-before:page}.radar svg{width:min(100%,300px)}.grille{grid-template-columns:repeat(2,1fr)}}
`;

export const SCRIPT_TETE = `document.documentElement.classList.add('js');`;
export const SCRIPT_MOUVEMENT = `
(function () {
  var tous = document.querySelectorAll('.reveal, .anim');
  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function montrer(e) { e.classList.add('vu'); compter(e); }
  function compter(e) {
    e.querySelectorAll('[data-count]').forEach(function (n) {
      if (n.getAttribute('data-fait')) return; n.setAttribute('data-fait', '1');
      var fin = parseFloat(n.getAttribute('data-count')); if (reduit) { n.textContent = fin; return; }
      var t0 = null; function pas(t) { if (!t0) t0 = t; var k = Math.min(1, (t - t0) / 900); n.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(pas); }
      requestAnimationFrame(pas);
    });
  }
  if (reduit || !('IntersectionObserver' in window)) { tous.forEach(montrer); }
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { montrer(en.target); io.unobserve(en.target); } }); }, { threshold: 0.12 });
    // Un bloc plus haut que deux écrans n'atteindra jamais 12 % de visibilité (une section de niveau fait des dizaines de milliers de pixels) : il resterait transparent. On l'affiche d'emblée ; ses éléments animés internes gardent leur propre observation.
    tous.forEach(function (e) { if (e.offsetHeight > window.innerHeight * 2) { e.classList.add('vu'); } else { io.observe(e); } });
  }
  function toutMontrer() { tous.forEach(function (e) { e.classList.add('vu'); e.querySelectorAll('[data-count]').forEach(function (n) { n.textContent = n.getAttribute('data-count'); }); }); }
  // Dans un iframe srcdoc, un lien #ancre se résout contre l'adresse de la page parente et la recharge dans le cadre :
  // on intercepte donc tous les liens internes et on fait défiler le document soi-même.
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var cible = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
    if (!cible) return;
    ev.preventDefault();
    cible.scrollIntoView({ behavior: reduit ? 'auto' : 'smooth', block: 'start' });
  });
  window.addEventListener('beforeprint', toutMontrer);
  var b = document.getElementById('imprimer');
  if (b) b.addEventListener('click', function () { toutMontrer(); window.print(); });
})();
`;
