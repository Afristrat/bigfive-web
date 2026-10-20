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
| `08_socle_structure.sql` | lot 1 : listes figées (règles, droits sur les tables, fonctions exécutables), contraintes (identifiant d'URL, rôle unique par organisation), déclencheur de profil (dont sous `supabase_auth_admin`), cascade de suppression de compte, journal sans e-mail |
| `09_socle_acces.sql` | lot 1 : accès par personnage (matrice), rôle réel plus jeton simulé ; les quatre verrous contre l'élévation de privilège éprouvés un à un (droit, règle, déclencheur, fonction réservée) |
| `10_socle_fonctions.sql` | lot 1 : création d'organisation, attribution et retrait de rôle, lecture du journal, journal en ajout seul (UPDATE, TRUNCATE, DELETE récent refusés), profil |
| `11_connexion.sql` | lot 1 : lien `/c/{jeton}` et code à 6 chiffres : empreintes seules, usage unique, expiration, plafond de 3 demandes et de 5 essais, réponse de même forme pour une adresse inconnue |
| `12_purge.sql` | lot 1 : tâche pg_cron, purge des liens et du journal échus, trace chiffrée, règles `TO tenga_owner` qui contraignent la purge (vu rouge), point de santé |
| `13_campagnes_structure.sql` | lots 2 et 3 : cinq tables protégées (RLS forcée, anonyme et `service_role` sans droit, écriture fermée), liste des règles figée, déclencheurs (écriture par l'API, transition de statut, campagne ouverte, résultat immuable), invitation sans colonne de rôle, jeton haché, adresse effacée à l'acceptation, clés composites (l'organisation d'un résultat est celle de sa campagne), cascade |
| `14_campagnes_acces.sql` | lots 2 et 3 : accès par personnage de la matrice, étanchéité entre organisations avec identifiants forgés, le responsable (et le consultant, et l'administrateur) ne lit RIEN dans `attempts` ni `results`, même par filtre ou jointure forgés, écritures directes refusées, verrous 2 et 3 éprouvés sur les nouvelles tables |
| `15_campagnes_fonctions.sql` | lot 2 : créer, ouvrir, clore une campagne, inviter (jeton haché, réinvitation, 14 jours), droits par rôle, journal sans adresse ni trace des refus |
| `16_invitation_acceptation.sql` | lot 2 : consulter et accepter une invitation (serveur seul) : rôle de participant et rien d'autre, adresse et prénom effacés, usage unique, expiration, campagne close, compte non conforme, rôle déjà tenu dans l'organisation |
| `17_passation.sql` | lots 2 et 3 : progression avec contrôle de révision (conflit 40001), validation des réponses, soumission unique, lecture individuelle par le consultant affecté ou l'administrateur (journal écrit avant le résultat, refus sans trace) |
| `18_mes_donnees.sql` | lot 3 : mes résultats, export JSON, suppression de compte en cascade (journal pseudonymisé), rejeu d'un effacement par le serveur, information du responsable sans identité |
| `19_purge_lots_2_3.sql` | lots 2 et 3 : purge des invitations, tentatives, résultats et comptes vides, traces chiffrées, règles de suppression qui contraignent la purge (vu rouge), durées lues dans `private.settings` |
| `20_connexion_plafond_compte.sql` | migration 0004 : plafond de 5 échecs de code PAR COMPTE qui survit aux nouveaux liens, fenêtre d'une heure, verrou consultatif par compte, budget du lien sans effet collatéral, plafond de demandes compté à part, journal `connexion.echec` et `connexion.plafond` sans adresse |
| `21_connexion_empreinte_leurre.sql` | migration 0004 : code haché par HMAC-SHA256 (secret `p_pepper` de l'application, sinon clé de repli de `private.settings`), anciennes signatures retirées, travail équivalent pour une adresse inconnue (lignes de leurre), purge des leurres et compteurs |
| `22_durcissement_instance.sql` | migration 0004 : index partiel d'adresse (`is_sso_user = false`), purge à 01:00 locale et fuseau `cron.timezone`, purge de l'historique pg_cron, schéma vault et pg_stat_statements fermés, `(SELECT app.suis_admin_tenga())` dans les règles |
| `23_groupes_structure.sql` | lot 4 (migration 0005) : quatre tables protégées (RLS forcée, anonyme et `service_role` sans droit, écriture fermée), fonctions exécutables figées, liste des règles et des déclencheurs figée (le verrou de l'API se déclenche avant le gel), colonnes figées (aucun minimum ni maximum, aucune identité), une personne dans un seul groupe par campagne, composition GELÉE dès l'ouverture (même pour le superutilisateur, sauf l'effacement en cascade d'un compte), plancher d'effectif de 5 inscrit dans la table, photographie en lecture seule (ni modification, ni effacement, ni vidage), une seule pose, verrou partagé de la clôture |
| `24_groupes_acces.sql` | lot 4 : accès par personnage aux groupes, à la composition et aux agrégats (matrice), étanchéité entre organisations avec identifiants forgés, le responsable (et le consultant, et l'administrateur) ne lit RIEN dans `attempts` ni `results` même par jointure avec les groupes, écritures directes refusées, verrous 2 et 3 éprouvés un à un sur les trois nouvelles tables |
| `25_groupes_fonctions.sql` | lot 4 : créer, renommer, supprimer un groupe, affecter, retirer un membre : droits par rôle, refus sans fuite d'existence, journal de chaque geste et aucune trace des refus, brouillon seulement, gel après `ouvrir_campagne`, effacement de compte après la clôture jamais bloqué |
| `26_agregats_cloture.sql` | lot 4 : photographie posée par `app.clore_campagne` : moyenne et écart type EXACTS sur un jeu connu (valeurs calculées à part), seuil (4 : rien ; 5 : publié ; seuil relevé à 6), complément (1 à 4 : non publié ; 0 ou 5 : publié ; durcissement contre la différence avec les personnes hors groupe ou un petit groupe), un seul passage, atomicité de la clôture, campagne close sans passation, lecture des agrégats par rôle, vue individuelle du consultant affecté journalisée et refus du consultant non affecté |
| `27_groupe_invitation_structure.sql` | migration 0006 : colonne `app.invitations.group_id` (clé étrangère COMPOSITE avec la campagne, nullable, effacée à l'acceptation par contrainte), immuable (déclencheur, même pour le superutilisateur, seule exception : l'effacement à l'acceptation), signatures figées d'`app.inviter` (six paramètres, une seule signature) et d'`app.accepter_invitation` (inchangée), droits d'exécution, seules deux fonctions écrivent dans `app.group_members`, le gel ne lit aucun drapeau de session (passage lu dans les données), règle de lecture de la composition réduite à l'administrateur Tenga, passage unique du gel éprouvé (autre groupe, participation sans invitation, modification, retrait, campagne close refusés), cascade campagne et organisation |
| `28_groupe_invitation_inviter.sql` | migration 0006 : `app.inviter(…, p_groupe)` : appels à cinq arguments inchangés, groupe de la campagne accepté, groupe d'une autre campagne ou d'une autre organisation ou inexistant refusé (même message), droit contrôlé AVANT le groupe (un refus ne révèle pas l'existence du groupe), l'invitation ne crée jamais de groupe, réinvitation d'une adresse en attente à groupe identique seulement, journal sans adresse ni groupe |
| `29_groupe_invitation_acceptation.sql` | migration 0006 : `app.accepter_invitation` écrit la participation ET la composition dans une transaction (échec d'une moitié = rollback de l'autre, éprouvé par deux déclencheurs d'échec), groupe, adresse et prénom effacés de l'invitation, usage unique, écriture unique (réinvitation : composition inchangée), aucune affectation libre en campagne ouverte (fonctions et écriture directe), campagne sans groupe inchangée, refus (autre compte, autre rôle, campagne close) sans écriture, effacement de compte non bloqué |
| `30_groupe_invitation_lecture.sql` | migration 0006 : le responsable ne lit aucune composition nominative (ni filtre, ni jointure avec les participations ou les invitations), aucun résultat, aucune tentative ; l'invitation en attente montre ce qu'il a lui-même saisi, l'acceptée plus rien ; consultant, participant, responsable étranger, anonyme, serveur : rien ; administrateur Tenga : la composition seule |
| `31_groupe_invitation_agregats.sql` | migration 0006 : seuil d'anonymat de 0005 après affectations par invitation : 4 dans un groupe ne publient rien, 5 publient (moyenne 30,00 et écart type de population 14,14 calculés à part), complément retenu quand il resterait moins de 5 personnes, compte effacé avant la clôture (5 devient 4, rien ne se publie), campagne sans groupe, deux groupes de 5 |

## Mutations (contrôle « vu rouge », plan § 7)

```
sh supabase/scripts/mutate-sql.sh <tenga-sb|tenga-sb-preprod>
```

`mutations/NN_nom.sql` : une altération du schéma par fichier (règle ajoutée ou retirée, droit ouvert,
déclencheur supprimé, fonction sans journalisation ou sans contrôle de droit, contrainte retirée, garde-fou
désactivé...). `mutate-sql.sh` vérifie d'abord que le témoin sans mutation est entièrement vert, puis, pour
chaque mutation, rejoue les fichiers de `sql/` dans une transaction annulée dont la mutation est appliquée en
premier. Une mutation doit faire échouer au moins un test (sinon elle est SURVIVANTE et le script sort en
erreur) ; une mutation qui ne s'applique pas seule est INVALIDE (c'est le cas d'un `NO FORCE ROW LEVEL
SECURITY` seul : le garde-fou DDL le refuse, la mutation désactive donc d'abord le garde-fou). Au moins 12
mutations sont exigées. Le script refuse la production. `TENGA_MUTATION_TOUT=1` rejoue tous les fichiers
pour chaque mutation au lieu de s'arrêter au premier rouge.

Les mutations 47 à 74 couvrent le lot 4 : seuil d'anonymat retiré (de la fonction seule, puis de la fonction et de la
table), plancher d'effectif retiré, complément non contrôlé (en entier, puis seulement le contrôle contre la
différence), gel retiré (sur les groupes, sur les membres, fonction neutralisée), effacement en cascade bloqué par le
gel, unicité de groupe retirée, photographie réécrite à chaque appel, agrégats modifiables ou posés hors clôture, règle de
lecture ouverte (agrégats, composition), droit d'écriture ouvert, déclencheur de l'API supprimé, journalisation retirée
(affectation, pose), clôture sans photographie, gestion des groupes sans contrôle du droit ou du brouillon, lecture
individuelle ouverte à tout consultant, agrégats de plusieurs campagnes mélangés, écart type d'échantillon, moyenne
arrondie à l'unité, verrou de course de la clôture retiré. Les mutations 75 à 91 couvrent la migration 0006 : verrou d'immutabilité du groupe retiré (puis rendu permissif), clé composite remplacée par une clé simple (groupe d'une autre campagne accepté), groupe d'une autre campagne non vérifié par `app.inviter`, gel qui laisse passer toute insertion de membre en campagne ouverte (affectation libre) ou un autre groupe que celui de l'invitation ou un drapeau de session, acceptation qui garde le groupe sur l'invitation (avec et sans la contrainte), échec de la composition avalé (rollback partiel), lecture nominative rouverte au responsable, participations lisibles par le consultant, `app.inviter` sans contrôle du droit ou qui crée le groupe inconnu, réinvitation qui change le groupe, composition jamais écrite ou écrite pour une participation existante. Une mutation de fonction se fait par `pg_get_functiondef` et
`replace` dans un bloc `DO` (échec si le texte n'a pas changé : une mutation sans effet est INVALIDE, jamais verte par erreur).

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
  Le lot 1 applique ce principe table par table : chaque table n'ouvre à
  `tenga_owner` que les opérations dont ses fonctions ont besoin (`08` fige la
  liste, `12` retire des règles pour vérifier qu'elles contraignent vraiment).
- La migration 0002 ajoute une règle de lecture `TO tenga_owner` sur
  `auth.users` (table GoTrue à RLS activée sans règle) et des droits de colonne
  (`id`, `email`, `banned_until`). La migration 0003 y ajoute le droit
  `DELETE` et une règle de suppression `TO tenga_owner` (effacement d'un compte
  par `private.effacer_compte`, en cascade) : ce sont les deux seules ouvertures
  sur le schéma auth, et `23_suppression_compte_sans_regle` (mutation) les
  protège.
- Piège relevé en écrivant la migration 0003 : `app.mon_role` renvoie `NULL`
  sans appartenance, et `faux OU NULL` vaut `NULL`, que `NOT` laisserait passer.
  Tout contrôle de droit écrit `COALESCE(..., false)` ; les refus de
  `15_campagnes_fonctions.sql` et `17_passation.sql` l'éprouvent (responsable
  d'une autre organisation).

## Lot 4 : groupes et agrégats (migration 0005)

- Tables : `app.groups`, `app.group_members` (clé primaire sur campagne et participation : UNE personne dans un seul
  groupe par campagne), `app.group_aggregates`, `private.agregats_poses` (marqueur : une seule pose par campagne, y
  compris quand rien n'a été publié). Aucune vue.
- Gel : un déclencheur (`private.geler_composition`) refuse toute écriture sur groupes et membres d'une campagne qui n'est
  plus en brouillon, superutilisateur compris. Seul l'effacement en cascade passe (la campagne ou la participation
  parente a disparu) : un effacement de compte n'est jamais bloqué. Les fonctions de gestion répondent d'abord par un
  message précis (« Groupes modifiables en brouillon seulement »).
- Photographie : `app.clore_campagne` (signature inchangée) appelle `private.poser_agregats` dans sa transaction. Si la pose
  échoue, la campagne reste ouverte. Par groupe et par domaine (O, C, E, A, N) : effectif, moyenne, écart type de
  population, arrondis à 2 décimales. Format de score lu : un nombre, ou un objet portant un nombre dans `score`.
- Publication : groupe publié si son effectif atteint `private.settings.seuil_anonymat` (5 au moins). Complément publié si
  il compte 0 ou au moins le seuil ET si ce qui reste hors de TOUS les groupes publiés (personnes sans groupe, petits
  groupes) compte aussi 0 ou au moins le seuil : sans cette seconde condition, le complément du groupe A, la moyenne du
  groupe B et les effectifs permettent de retrouver le score d'une personne hors groupe (attaque par différence, test 26,
  scénarios 7 et 9). Un complément vide est publié avec l'effectif 0 et aucune statistique.
- Une campagne close n'accepte plus de passation, sans course : le contrôle `private.exiger_campagne_ouverte` prend un
  verrou partagé sur la ligne de campagne que la clôture tient. Preuve avec deux sessions réelles :
  `scripts/concurrence-cloture.sh <tenga-sb-preprod> [--sans-verrou]`.
- Vue individuelle du consultant : `app.lire_resultat_individuel` (lot 3) couvre déjà le consultant affecté
  (rôle `consultant` dans l'organisation) et l'administrateur ; aucune affectation par campagne n'existe dans le plan.
  Elle est inchangée.
- Les tests supposent que les tables applicatives de l'instance sont vides (les comptes réels sont tolérés depuis que
  les tests 18 et 19 ne comptent que les adresses `@example.test`). Des organisations ou campagnes réelles en
  préproduction fausseraient les comptes absolus de plusieurs fichiers.

## Migration 0006 : groupe porté par l'invitation

Décision du client : le groupe d'une personne est porté par l'invitation et écrit UNE SEULE FOIS, à l'acceptation. Elle lève
le blocage de 0005 (une participation naît à l'acceptation, campagne ouverte, alors que la composition est gelée à l'ouverture).

- `app.inviter(p_campagne, p_email, p_prenom, p_message, p_langue, p_groupe uuid DEFAULT NULL)` : la signature à cinq
  paramètres est remplacée (une seule signature, les appels à cinq arguments restent valables). Le groupe doit appartenir à la
  campagne ; le droit (responsable ou administrateur Tenga) est contrôlé avant. L'invitation ne crée aucun groupe.
- `app.invitations.group_id` : clé composite (groupe, campagne), nullable, immuable, effacée à l'acceptation avec l'adresse et le
  prénom (contrainte) : aucun lien de l'invitation vers l'identité et le groupe ne survit.
- `app.accepter_invitation(p_jeton, p_utilisateur)` : signature inchangée ; écrit la participation et la ligne de
  `app.group_members` dans la même transaction. Une participation déjà existante (personne réinvitée) garde sa composition.
- Gel : `private.geler_composition` laisse passer UNE seule écriture en campagne ouverte, l'insertion d'un membre dont la
  participation est reliée à une invitation encore en attente qui porte exactement ce groupe. Le passage se lit dans les données,
  jamais dans un drapeau de session. Ni modification, ni retrait, ni affectation libre.
- Lecture : la règle `group_members_lecture` est réduite à l'administrateur Tenga. Choix documenté : le responsable lit déjà
  `app.participations` (donc des personnes identifiables) ; lui laisser la composition révélerait qui est dans quel groupe. Il lit
  les effectifs par groupe dans `app.group_aggregates` (seuil de 5, complément retenu, photographie unique à la clôture). Avant
  l'acceptation il voit sur l'invitation en attente l'adresse et le groupe qu'il a lui-même saisis : la base n'ajoute aucune
  information. Le journal ne contient jamais le groupe. Les tests 24 (comptes du responsable à 0) et 13 (liste des colonnes de
  `app.invitations`) ont été ajustés, sans changer leur nombre de tests.
- Les tests 27 à 31 ne comptent aucune table de données réelle : ils créent leurs propres lignes (adresses `@example.test`) dans
  une transaction annulée ; les comptes réels de la préproduction (essais de connexion) ne sont ni lus globalement ni modifiés.

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
- Droits par défaut : retirés dans `storage`, `graphql`, `graphql_public` par la
  migration 0004 (`03_defaults.sql` le garde) ; les objets DÉJÀ présents de ces
  schémas gardent leurs droits d'origine (inutilisés par cette instance).
- Concurrence : pgTAP ne simule pas deux sessions. `scripts/concurrence-code.sh
  <tenga-sb-preprod> [--sans-verrou]` lance des essais de code parallèles réels
  (préproduction seulement) ; `--sans-verrou` prouve le rouge. Même principe pour la course clôture contre soumission
  de résultat : `scripts/concurrence-cloture.sh <tenga-sb-preprod> [--sans-verrou]`.
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
| `objets` | objets des lots 1 à 4 (tables, fonctions), avec une `note` libre ; une table sans cellule est fermée à tous |

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

Une cellule absente est lue comme `refuse` : on ne décrit que ce qui est permis (les tables `attempts` et `results` listent pourtant `refuse` pour le responsable, le consultant et l'administrateur : c'est la décision à ne jamais perdre). Verdict `participation` : lignes liées à une participation de la personne (campagnes).
