// Commande : node docs/design/rapport-cabinet/moteur/calculer.mjs
// Lit le cas, les profils, les règles et la bibliothèque (facettes.json si présent, sinon facettes-pilote.json),
// puis écrit sortie/faits.json (faits du moteur, puis reseau_reel). Aucune date, aucun aléa : relancée sur les mêmes entrées, elle réécrit le même fichier.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { calculer, empreinte } from './moteur.mjs';
import { ajouterReseau } from './reseau.mjs';

const ici = path.dirname(fileURLToPath(import.meta.url));
const racine = path.join(ici, '..', '..');
const lireJson = (...p) => JSON.parse(fs.readFileSync(path.join(...p), 'utf-8'));

const cas = lireJson(ici, '..', 'cas', 'cas-demo.json');
const profils = lireJson(racine, 'profils-fictifs', 'profils.json');
const regles = lireJson(ici, 'regles.json');

const dossierBib = path.join(racine, 'bibliotheque-textes');
const fichierBib = fs.existsSync(path.join(dossierBib, 'facettes.json')) ? 'facettes.json' : 'facettes-pilote.json';
const bib = lireJson(dossierBib, fichierBib);
const meta = { bibliotheque: { version: bib.version, empreinte: empreinte(bib), source: fichierBib } };

// Le réseau réel (cas.reseau_reel) est lu par moteur/reseau.mjs et ajouté en fin de faits, seuils compris.
const faits = ajouterReseau(calculer(cas, profils, regles, meta), cas);
const sortie = path.join(ici, '..', 'sortie', 'faits.json');
fs.mkdirSync(path.dirname(sortie), { recursive: true });
fs.writeFileSync(sortie, `${JSON.stringify(faits, null, 2)}\n`);
console.log(`faits.json écrit : ${sortie}`);
console.log(`bibliothèque : ${meta.bibliotheque.source} (${meta.bibliotheque.version}), règles : ${regles.regles.length}, empreinte des entrées : ${faits.empreinte_entrees}`);
