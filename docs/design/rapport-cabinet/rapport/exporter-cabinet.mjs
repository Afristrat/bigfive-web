// Exporte le rapport « cabinet » (sortie/rapport.json) en HTML, PDF, Word et Markdown :
//   node docs/design/rapport-cabinet/rapport/exporter-cabinet.mjs        (depuis la racine du dépôt)
// Options : --rapport <fichier>   rapport.json à rendre        (défaut : sortie/rapport.json)
//           --sortie <dossier>    dossier des quatre fichiers  (défaut : sortie/)
//           --pas-de-web          n'écrit pas web/src/data/rapport-apercu-*.ts
// Variables : PANDOC et PLAYWRIGHT_CORE (mêmes chemins par défaut que profils-fictifs/exporter.mjs).
// - rapport-cabinet.html  autonome, animé
// - rapport-cabinet.pdf   A4, rendu par Chromium en média « print »
// - rapport-cabinet.docx  Word modifiable (variante sans SVG), par pandoc
// - rapport-cabinet.md    Markdown (variante sans SVG), par pandoc
// puis web/src/data/rapport-apercu-html.ts et rapport-apercu-fichiers.ts, servis par /admin/apercu-rapport.
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rendreHtml } from './rendu.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const cabinet = path.resolve(here, '..');
const depot = path.resolve(here, '..', '..', '..', '..');
const web = path.join(depot, 'web');
const PANDOC = process.env.PANDOC || 'C:/Users/amans/AppData/Local/Pandoc/pandoc.exe';
const PWCORE = process.env.PLAYWRIGHT_CORE || 'C:/Users/amans/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core/';

const args = process.argv.slice(2);
const option = (nom) => { const i = args.indexOf(nom); return i >= 0 ? args[i + 1] : undefined; };
const fichierRapport = path.resolve(option('--rapport') ?? path.join(cabinet, 'sortie', 'rapport.json'));
const dossier = path.resolve(option('--sortie') ?? path.join(cabinet, 'sortie'));
const ecrireWeb = !args.includes('--pas-de-web');

const lire = (p) => {
  if (!fs.existsSync(p)) { console.error('fichier introuvable : ' + p); process.exit(1); }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
};
const entree = {
  rapport: lire(fichierRapport),
  faits: lire(path.join(cabinet, 'sortie', 'faits.json')),
  cas: lire(path.join(cabinet, 'cas', 'cas-demo.json')),
  profils: lire(path.join(cabinet, '..', 'profils-fictifs', 'profils.json')),
  bib: lire(path.join(cabinet, '..', 'bibliotheque-textes', 'facettes.json'))
};
fs.mkdirSync(dossier, { recursive: true });
const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });
const nom = 'rapport-cabinet';
const f = (ext) => path.join(dossier, nom + ext);

// 1. HTML animé
const html = rendreHtml(entree);
fs.writeFileSync(f('.html'), html, 'utf-8');

// 2. Word et Markdown par pandoc (variante sans SVG)
const htmlWord = f('.docx.html');
fs.writeFileSync(htmlWord, rendreHtml({ ...entree, variante: 'docx' }), 'utf-8');
try {
  run(PANDOC, [htmlWord, '--from', 'html', '--resource-path=' + dossier, '-o', f('.docx')]);
  run(PANDOC, [htmlWord, '--from', 'html-native_divs', '-t', 'gfm-raw_html', '--wrap=none', '-o', f('.md')]);
} finally {
  fs.rmSync(htmlWord, { force: true });
}

// 3. PDF par Chromium (média print : animations coupées, états finaux visibles)
const require = createRequire(PWCORE);
const { chromium } = require('playwright-core');
const navigateur = await chromium.launch();
try {
  const page = await navigateur.newPage({ viewport: { width: 1000, height: 1200 } });
  await page.setContent(html);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: f('.pdf'), format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
} finally {
  await navigateur.close();
}

// 4. Modules de données de l'application
if (ecrireWeb) {
  const cible = path.join(web, 'src', 'data');
  fs.mkdirSync(cible, { recursive: true });
  const NL = String.fromCharCode(10);
  const b64 = (p) => fs.readFileSync(p).toString('base64');
  const marque = 'docs/design/rapport-cabinet/rapport/exporter-cabinet.mjs';
  const note = '// Cas FICTIF de démonstration : profils FICTIFS (KB, SR, HT) et profil ESTIMÉ (AM), aucune donnée de personne réelle.';
  const entete = ['// Généré par ' + marque + ' : ne pas éditer à la main.', note];
  fs.writeFileSync(path.join(cible, 'rapport-apercu-html.ts'),
    [...entete, 'export const rapportApercuHtml: string =', '  ' + JSON.stringify(html) + ';', ''].join(NL), 'utf-8');
  fs.writeFileSync(path.join(cible, 'rapport-apercu-fichiers.ts'),
    [...entete,
      'export const rapportApercuPdfBase64: string =', '  ' + JSON.stringify(b64(f('.pdf'))) + ';',
      'export const rapportApercuDocxBase64: string =', '  ' + JSON.stringify(b64(f('.docx'))) + ';',
      'export const rapportApercuMarkdown: string =', '  ' + JSON.stringify(fs.readFileSync(f('.md'), 'utf-8')) + ';', ''].join(NL), 'utf-8');
}

const taille = (ext) => (fs.statSync(f(ext)).size / 1024).toFixed(0) + ' Ko';
console.log('exports : html ' + taille('.html') + ', pdf ' + taille('.pdf') + ', docx ' + taille('.docx') + ', md ' + taille('.md') + (ecrireWeb ? ', modules web écrits' : ', modules web non touchés'));
