// Usage : node audit-cli.mjs <rapport.json> <faits.json> <cas.json> <profils.json> <references-autorisees.json> [--html <rapport.html>]
// Avec --html, l'audit vérifie aussi que le statut de contrôle des références est visible dans le bandeau et la liste des références.
// Code de sortie 1 s'il y a au moins un défaut, 2 en cas d'usage incorrect.
import { readFileSync } from 'node:fs';
import { auditer, CATEGORIES, COMPLEMENTS } from './audit.mjs';

const args = process.argv.slice(2);
const iHtml = args.indexOf('--html');
const fichierHtml = iHtml >= 0 ? args.splice(iHtml, 2)[1] : undefined;
const [rapport, faits, cas, profils, references] = args;
if (!references) {
  console.error('Usage : node audit-cli.mjs <rapport.json> <faits.json> <cas.json> <profils.json> <references-autorisees.json> [--html <rapport.html>]');
  process.exit(2);
}
const lire = (p) => JSON.parse(readFileSync(p, 'utf8'));
const { defauts, comptes } = auditer({ rapport: lire(rapport), faits: lire(faits), cas: lire(cas), profils: lire(profils), references: lire(references), html: fichierHtml ? readFileSync(fichierHtml, 'utf8') : undefined });

console.log('Audit déterministe du rapport');
console.log('Catégorie'.padEnd(34) + 'Défauts');
for (const c of CATEGORIES) console.log(c.padEnd(34) + comptes[c]);
console.log('-- contrôles complémentaires --');
for (const c of COMPLEMENTS) console.log(c.padEnd(34) + comptes[c]);
if (defauts.length) {
  console.log('\nDétail');
  for (const d of defauts) console.log(`[${d.categorie}] ${d.id} : ${d.message}\n    « ${d.extrait} »`);
}
console.log(`\nTotal : ${defauts.length} défaut(s)`);
process.exit(defauts.length ? 1 : 0);
