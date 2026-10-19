# Registre des effacements : rejeu après une restauration

Plan § 5 : « Une suppression de compte disparaît des sauvegardes sous 35 jours. Un registre des
effacements est rejoué après toute restauration. » Ce document fixe l'interface attendue. Il
n'invente aucune table : le registre et la fonction de suppression sont livrés par le lot 1.

## Pourquoi le registre ne peut pas vivre dans la base

Restaurer une sauvegarde ramène la base à l'état de la nuit du dump. Les comptes supprimés
depuis réapparaissent. Un registre stocké dans cette même base serait ramené avec elle, donc
amputé des effacements les plus récents : exactement ceux qu'il faut rejouer. Il doit survivre
à la restauration.

## Interface attendue

1. **Support** : un journal en ajout seul, hors de la base restaurée et hors du dossier de
   sauvegarde rotatif, sur le disque de l'hôte (par exemple
   `/home/serveuria/<pile>-effacements/registre.ndjson`, 0600, chemin lu par `sauvegarde.sh`
   via `TENGA_REGISTRE`). Ce que `sauvegarde.sh` fait réellement : si ce fichier existe, il est
   copié à chaque sauvegarde vers `serveuria-backups/<pile>-effacements/` sur la destination hors
   serveur, SANS suppression, hors du dossier miroir, et son empreinte est relue à distance
   (statut `registre_effacements: copie`). S'il n'existe pas encore, le statut dit `absent`.
   Ce que ces scripts ne font pas : créer le fichier, l'alimenter, ni le sauvegarder avant
   qu'il existe ; c'est le travail du lot 1. Une ligne par effacement, au format JSON :
   `{"utilisateur_id":"<uuid>","efface_le":"<horodatage UTC ISO 8601>"}`.
   Seul l'identifiant interne y figure (jamais d'adresse, de nom ni de résultat) : une fois le
   compte supprimé, il ne désigne plus personne.
2. **Écriture** : la fonction de suppression de compte du lot 1 (effacement en cascade par les
   clés étrangères, plan § 5) ajoute la ligne, dans la même opération que l'effacement. Pas de
   ligne si l'effacement a échoué ; pas d'effacement si la ligne n'a pu être écrite.
3. **Rejeu** : une procédure idempotente prend le registre en entrée et, pour chaque
   `utilisateur_id`, appelle **la même fonction de suppression** que l'application. Absence du
   compte = succès silencieux (cas normal d'un effacement antérieur au dump, et des doublons).
   Elle rend le nombre de comptes réellement supprimés et sort en erreur au premier échec.
4. **Contrôle** : après le rejeu, aucun `utilisateur_id` du registre ne doit subsister dans
   `auth.users`, ni dans aucune table qui le référence (résultats, participations, rôles).
   La requête de contrôle se déduit des clés étrangères vers `auth.users` (catalogue
   `pg_constraint`), sans nom de table en dur.
5. **Rétention du registre** : les lignes de plus de 35 jours sont inutiles (plus aucune
   sauvegarde ne contient ces comptes). Durée proposée : 45 jours, marge comprise ; à confirmer
   par Amine, car c'est une durée de conservation de donnée (même pseudonymisée).

## Ordre des opérations après une restauration réelle

1. Passerelle injoignable (conteneur `<pile>-kong` arrêté) : aucune écriture publique pendant
   l'opération.
2. Restaurer le dump déchiffré, exactement comme `restauration-essai.sh` : rôles d'abord
   (`.globals.sql`), puis `pg_restore --clean --if-exists` sous `supabase_admin`, puis les
   privilèges (`.privileges.sql`, `psql -1 -v ON_ERROR_STOP=1`). Sans cette dernière étape, la
   base restaurée est plus permissive que la production (mesuré).
3. Rejouer le registre (point 3), puis contrôler (point 4).
4. Seulement alors, rouvrir la passerelle.

Tant que le rejeu n'est pas fait et contrôlé, la base restaurée contient des comptes que des
personnes ont demandé à effacer : elle ne sert à personne.

## Exercice mensuel depuis la copie hors serveur (SOP-026, étape 13b)

L'hôte ne détient pas la clé privée. Depuis le poste d'Amine, une fois par mois :

1. rapatrier le dernier `db-<pile>-*.dump.gpg`, ses `.globals.sql.gpg` et `.privileges.sql.gpg`, son `.dump.comptes` et
   son `.dump.meta` depuis la copie hors serveur ;
2. déchiffrer les trois `.gpg` avec la clé du coffre DPAPI (jamais sur l'hôte) ;
3. déposer les cinq fichiers (le dump, les rôles et les privilèges en clair, les comptes et les
   métadonnées) dans un dossier 0700 de l'hôte, par exemple `<dossier de sauvegarde>/drill/entrant/` ;
4. `sh restauration-essai.sh <pile> --dump <dossier>/db-<pile>-<horodatage>.dump --source distant` ;
5. ajouter `--effacer-apres` à la commande (efface le clair sur réussite) et supprimer le dossier
   dans tous les cas, échec compris. Le statut est `last-status-distant.json`.

## Ce qui n'est pas rejoué chaque nuit

`restauration-essai.sh` ne rejoue pas le registre : la fonction de suppression et le registre
n'existent pas encore. Quand ils existeront, le rejeu et son contrôle se branchent comme un
script de tests supplémentaire (`--tests-sql`), sur le témoin, avec un registre d'essai.
