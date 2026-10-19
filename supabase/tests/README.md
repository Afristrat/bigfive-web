# Tests SQL de l'instance Supabase de Tenga

Les tests s'exécutent sur le serveur, jamais sur le poste :

```
sh supabase/scripts/test-sql.sh <tenga-sb|tenga-sb-preprod> [dossier]
```

## Fonctionnement

- `sql/NN_nom.sql` : tests pgTAP. `test-sql.sh` enveloppe chaque fichier dans
  une transaction annulée (`BEGIN`, table temporaire sentinelle, fichier,
  contrôle de la sentinelle, `ROLLBACK`). Un fichier ne pilote donc pas la
  transaction : `BEGIN`, `COMMIT`, `ROLLBACK`, `ABORT`, `END`,
  `START TRANSACTION` et `\set AUTOCOMMIT` sont refusés, à n'importe quelle
  position d'une ligne, commentaires exclus. Si un fichier validait quand même
  la transaction, la sentinelle disparaît et le contrôle échoue.
- Un fichier commence par `SET LOCAL search_path TO tests, pg_catalog, public;`,
  déclare `plan(n)` et se termine par `SELECT * FROM finish();`.
- Un fichier échoue sur `not ok`, plan absent ou non tenu, `# SKIP` ou
  `# TODO`, sentinelle perdue, ou erreur psql. Sortie 0 si tout est vert, 1 sinon.
- Les fonctions pgTAP vivent dans le schéma `tests`, sans droit pour les rôles
  de l'API. Pour tester un comportement réel (`SET LOCAL ROLE anon`), on ne
  peut donc pas appeler pgTAP sous ce rôle : on exécute l'action dans un bloc
  `DO` qui consigne le résultat avec `set_config('zz.x', SQLSTATE, true)`, on
  fait `RESET ROLE`, puis on vérifie avec `is(current_setting('zz.x'), ...)`
  (voir `06_proprietaire.sql`).

## Catalogue

| Fichier | Vérifie |
|---|---|
| `01_rls.sql` | RLS activée et forcée sur toute table de app et private ; garde-fou : création, CTAS, SELECT INTO, partitionnée et partitions, ALTER, SET SCHEMA, ATTACH PARTITION, drapeau de session sans effet, pas de boucle |
| `02_privileges.sql` | anon sans droit sur app, private, tests ; authenticated et service_role sans droit sur private et tests |
| `03_defaults.sql` | aucun droit par défaut pour PUBLIC, anon, authenticated, service_role (postgres, supabase_admin, tenga_owner) |
| `04_settings.sql` | valeurs de `private.settings`, bornes, suppression et vidage refusés, accès par rôle réel, absence de `app.settings.jwt_secret` |
| `05_garde_ddl.sql` | vues sans `security_invoker`, vues matérialisées, tables étrangères, fonctions SECURITY DEFINER sans `search_path`, extensions : messages d'erreur exacts |
| `06_proprietaire.sql` | attributs de `tenga_owner`, propriété des objets, comportement réel de anon, authenticated, tenga_owner |
| `07_perimetre_api.sql` | aucune création d'objet par l'API ; schéma cron, `cron.schedule`, `unschedule`, `alter_job` fermés |

## Constats sur les rôles de l'instance (lus en base)

Requête : `select rolname, rolsuper, rolbypassrls from pg_roles`.

| Rôle | Superutilisateur | BYPASSRLS |
|---|---|---|
| `supabase_admin` | oui | oui |
| `postgres` | non | **oui** |
| `service_role` | non | **oui** |
| `anon`, `authenticated`, `authenticator`, `supabase_auth_admin`, `dashboard_user` | non | non |
| `tenga_owner` (créé par la migration 0001) | non | non |

Conséquences :
- `service_role` (clé secrète du serveur Next.js) et `postgres` **ignorent
  toutes les règles RLS** sur les tables où ils ont un droit. Le plan s'appuie
  sur le fait qu'aucune table ne leur est ouverte par défaut (`02_privileges.sql`,
  `03_defaults.sql`) et que l'accès passe par des fonctions contrôlées. Toute
  ouverture accordée à `service_role` est une décision de sécurité à relire.
  Un retrait du BYPASSRLS de `service_role` (`ALTER ROLE service_role NOBYPASSRLS`)
  renforcerait l'isolation mais modifie un rôle du gabarit : décision à prendre
  par la session principale, non faite ici. Le test `06` consigne le constat
  actuel et signalera tout changement.
- `tenga_owner` est soumis à la RLS forcée comme les autres : une fonction
  SECURITY DEFINER qui lui appartient ne lira une table que si une règle
  `TO tenga_owner` le permet (exemple : les règles de `private.settings`).
  À prévoir au lot 1 pour les fonctions de lecture journalisée.

## Limites connues

- Un superutilisateur (`supabase_admin`) peut désactiver ou supprimer le
  déclencheur d'événement `garde_ddl_tenga` (`ALTER EVENT TRIGGER ... DISABLE`),
  ou changer de rôle dans une migration. Aucun garde en base ne l'empêche : le
  test `01_rls.sql` détecte un déclencheur absent ou inactif au passage suivant,
  et `migrate.sh` impose `SET LOCAL ROLE tenga_owner` hors migration
  `-- migrate:superuser`. C'est une discipline relue en revue, pas une
  frontière contre un superutilisateur malveillant.
- Convention d'écriture des migrations : dans un corps plpgsql, écrire `END`
  sans point-virgule final (un `END;` isolé est pris pour la fin d'une
  transaction et refusé).
- Droits par défaut non retirés dans les schémas du gabarit `storage`,
  `graphql`, `graphql_public`, `realtime` : inutilisés par cette instance.
- Les tâches pg_cron s'exécuteront avec les droits de leur propriétaire : au
  lot 1, les planifier sous un rôle sans BYPASSRLS qui appelle des fonctions
  de `private`.

## `access-matrix.json`

Matrice d'accès unique du plan § 7, écrite indépendamment des règles.

| Clé | Rôle |
|---|---|
| `personnages` | identités simulées (`id`, `description`) |
| `operations` | opérations testées par objet |
| `verdicts` | valeurs permises dans une cellule |
| `objets` | à remplir au lot 1 |

Forme prévue d'un objet :

```json
{
  "objet": "app.results",
  "type": "table",
  "cellules": {
    "select": { "anonyme": "refuse", "participant_a": "propres_lignes", "responsable_a": "refuse" }
  }
}
```

Une cellule absente est lue comme `refuse` : on ne décrit que ce qui est permis.
