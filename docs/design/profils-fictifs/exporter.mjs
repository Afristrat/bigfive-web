// Produit tous les exports du rapport et les range dans l'application :
//   node exporter.mjs        (depuis web/)
// - rapport-comparatif.html  (autonome, animé)
// - rapport-comparatif.pdf   (A4, graphiques inclus, rendu par Chromium en média « print »)
// - rapport-comparatif.docx  (Word modifiable : tableaux, textes, avatars ; graphiques omis)
// - rapport-comparatif.md    (Markdown)
// puis web/src/data/rapport-apercu-fichiers.ts (PDF et Word en base64, Markdown en texte) que
// la route /admin/apercu-rapport/export/[format] sert aux administrateurs Tenga.
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '..', '..', '..', 'web');
const PANDOC = process.env.PANDOC || 'C:/Users/amans/AppData/Local/Pandoc/pandoc.exe';
const PWCORE = process.env.PLAYWRIGHT_CORE || 'C:/Users/amans/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core/';
const generer = path.join(here, 'generer.mjs');
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], ...opts });

// 1. HTML animé (et module de données de la page) puis variante Word
run(process.execPath, [generer], { cwd: web, env: { ...process.env, MODE: 'html' } });
run(process.execPath, [generer], { cwd: web, env: { ...process.env, MODE: 'docx' } });

// 2. Word et Markdown par pandoc
const htmlWord = path.join(here, 'rapport-comparatif.docx.html');
run(PANDOC, [htmlWord, '--from', 'html', '--resource-path=' + here, '-o', path.join(here, 'rapport-comparatif.docx')]);
run(PANDOC, [htmlWord, '--from', 'html-native_divs', '-t', 'gfm-raw_html', '--wrap=none', '-o', path.join(here, 'rapport-comparatif.md')]);
fs.rmSync(htmlWord);

// 3. PDF par Chromium (média print : animations coupées, états finaux visibles)
const require = createRequire(PWCORE);
const { chromium } = require('playwright-core');
const navigateur = await chromium.launch();
const page = await navigateur.newPage({ viewport: { width: 1000, height: 1200 } });
await page.setContent(fs.readFileSync(path.join(here, 'rapport-comparatif.html'), 'utf-8'));
await page.emulateMedia({ media: 'print' });
await page.pdf({ path: path.join(here, 'rapport-comparatif.pdf'), format: 'A4', printBackground: true, margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' } });
await navigateur.close();

// 4. Module de données de l'application
const NL = String.fromCharCode(10);
const b64 = (f) => fs.readFileSync(path.join(here, f)).toString('base64');
const texte = fs.readFileSync(path.join(here, 'rapport-comparatif.md'), 'utf-8');
const sortie = [
  '// Généré par docs/design/profils-fictifs/exporter.mjs : ne pas éditer à la main.',
  '// Profils FICTIFS (KB, SR, HT) et profil ESTIMÉ (AM), aucune donnée de personne réelle.',
  'export const rapportApercuPdfBase64: string =',
  '  ' + JSON.stringify(b64('rapport-comparatif.pdf')) + ';',
  'export const rapportApercuDocxBase64: string =',
  '  ' + JSON.stringify(b64('rapport-comparatif.docx')) + ';',
  'export const rapportApercuMarkdown: string =',
  '  ' + JSON.stringify(texte) + ';',
  ''
].join(NL);
fs.writeFileSync(path.join(web, 'src', 'data', 'rapport-apercu-fichiers.ts'), sortie, 'utf-8');
const taille = (f) => (fs.statSync(path.join(here, f)).size / 1024).toFixed(0) + ' Ko';
console.log('exports : html ' + taille('rapport-comparatif.html') + ', pdf ' + taille('rapport-comparatif.pdf') + ', docx ' + taille('rapport-comparatif.docx') + ', md ' + taille('rapport-comparatif.md'));
