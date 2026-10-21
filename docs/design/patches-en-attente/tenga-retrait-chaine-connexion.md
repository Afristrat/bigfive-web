# Retrait de la chaîne de connexion de `Afristrat/Tenga` (patch prêt, NON APPLIQUÉ)

Date : 21/10/2026. Dépôt cible : `Afristrat/Tenga` (privé, autre dépôt : règle n°6, mandat d'écriture d'Amine requis).

## Constat prouvé
- `scripts/migrate.mjs:14` contient une URL Postgres avec mot de passe en clair (commit `1c9b2e9`).
- Le projet Supabase cité (réf. `mrcqrjhcxdiqxryabwgq`) ne résout plus : NXDOMAIN sur dns.google le 21/10/2026, alors que `supabase.com` et le pooler résolvent. Le mot de passe n'a jamais été testé.
- Les 9 commits du dépôt portent le nom « Amine Bentara » et l'adresse `amine@tenga.app`, domaine aujourd'hui en vente chez un revendeur (`fortune.domains`), donc sans lien avec les associés. Identité git locale mal configurée, pas un tiers.
- Aucune rotation possible ni nécessaire. Reste l'hygiène.

## 1. Retirer la ligne du code (une commande, depuis un clone de `Afristrat/Tenga`)
```
sed -i "s#^const DB_URL = .*#const DB_URL = process.env.DATABASE_URL ?? (() => { throw new Error('DATABASE_URL manquante') })()#" scripts/migrate.mjs
```
Contrôle : `grep -c "supabase.com:6543" scripts/migrate.mjs` doit rendre 0.

## 2. Purger l'historique (optionnel, destructif, force-push : seulement sur accord explicite)
```
git filter-repo --replace-text <(printf 'regex:postgres\\.[a-z0-9]{20}:[^@]+@==>postgres.REF:MASQUE@\n')
git push --force --all
```
Le projet cible étant inexistant, la purge n'a plus d'enjeu de sécurité : à n'exécuter que si le dépôt doit un jour devenir public.

## 3. Corriger l'identité git pour les prochains commits
```
git config user.name "Amine Mansouri" ; git config user.email "<adresse réelle>"
```
