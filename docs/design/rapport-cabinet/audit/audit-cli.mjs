// Usage : node audit-cli.mjs <rapport.json> <faits.json> <cas.json> <profils.json> <references-autorisees.json>
// Code de sortie 1 s'il y a au moins un défaut, 2 en cas d'usage incorrect.
import { readFileSync } from 'node:fs';
import { auditer, CATEGORIES, COMPLEMENTS } from './audit.mjs';

const [, , rapport, faits, cas, profils, references] = process.argv;
if (!references) {
  console.error('Usage : node audit-cli.mjs <rapport.json> <faits.json> <cas.json> <profils.json> <references-autorisees.json>');
  process.exit(2);
}
const lire = (p) => JSON.parse(readFileSync(p, 'utf8'));
const { defauts, comptes } = auditer({ rapport: lire(rapport), faits: lire(faits), cas: lire(cas), profils: lire(profils), references: lire(references) });

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
