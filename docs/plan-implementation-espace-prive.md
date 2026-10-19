# Plan d'implémentation : espace privé de Tenga Assessments (version 2, option B Supabase)

19 octobre 2026. Synthèse de deux analyses ECC (`ecc:architect`, `ecc:planner`) refaites après le choix d'Amine : **une instance Supabase dédiée à Tenga, avec un plafond mémoire sur chaque conteneur**. Elle remplace la version 1 (MongoDB et Better Auth). Statut : **à valider par Amine, aucune ligne de code avant validation**.

## 1. Faits vérifiés par commande

| Point | Résultat |
|---|---|
| Production actuelle | branche `tenga-durcissement`, image du commit `d9652c2` |
| Base MongoDB actuelle | vide : aucune donnée à migrer |
| Travail interrompu | branche locale `espace-prive`, jamais poussée ni déployée ; sera balisée, pas supprimée |
| Serveur | 62 Gio de mémoire, 32 Gio disponibles, 28 cœurs |
| Gabarit | deux instances Supabase en service, avec un plafond par conteneur et 0 redémarrage ; aucune n'a de `pids_limit` |
| Images en service | Postgres `supabase/postgres:15.8.1.085`, GoTrue `v2.186.0`, PostgREST `v14.6`, Kong `3.9.1` |
| Paquets à épingler (publiés depuis plus de 14 jours) | `@supabase/supabase-js` 2.117.2 (25/09), `@supabase/ssr` 0.12.7 (08/09), `@playwright/test` 1.63.0 (04/09), `vitest` 5.0.3 (30/09) |

**Usages mesurés sur les instances existantes :**

| Conteneur | Mémoire (pic) | Processus (pic) |
|---|---|---|
| Base | 153 Mio | 52 |
| Connexion (GoTrue) | 16 Mio | 44 |
| API (PostgREST) | 119 Mio | 158 |
| Passerelle (Kong) | 153 Mio | 15 |

## 2. Instance Supabase de Tenga

### 2.1 Composants : 4 sur 13

| Composant | Décision | Raison |
|---|---|---|
| Base Postgres | Déployée | Contient `pg_cron` pour les purges |
| Connexion (GoTrue) | Déployée | Comptes, sessions, liens de connexion, API d'administration |
| API (PostgREST) | Déployée | Applique les règles d'isolation avec l'identité de la personne connectée |
| Passerelle Kong | Déployée, **non exposée** | Garde le gabarit éprouvé et la certification de SOP-028 |
| Stockage de fichiers, MinIO, imgproxy | Non | Aucun fichier à stocker |
| Temps réel, fonctions serverless | Non | Inutiles : la logique est dans Next.js et dans des fonctions SQL |
| Studio (console web) | Non | Il donne un accès total à la base. L'administration se fait par SSH |
| Journaux (logflare, vector) | Non | Ils dupliqueraient des adresses IP et e-mail, alors que le journal doit en être exempt |
| Supavisor (pool de connexions) | Non | L'API et la connexion ont chacune leur propre pool |

Un compose maison est versionné dans le dépôt (`supabase/compose/`), dérivé d'une instance existante et comparé à elle. On ne passe pas par le service Coolify standard, car amputer ce service casse ses dépendances de démarrage (SOP-020 § 3).

**Repli :** si la version allégée ne tient pas 48 heures sans redémarrage en préproduction, on revient à la pile complète, plafonnée sur le gabarit.

### 2.2 Plafonds (SOP-020)

| Conteneur | Mémoire max | Réservée | Mémoire + échange | Processus max |
|---|---|---|---|---|
| Base | 768 Mio | 256 Mio | 1 024 Mio | 256 |
| Passerelle Kong | 256 Mio | 128 Mio | 384 Mio | 128 |
| API PostgREST | 256 Mio | 96 Mio | 384 Mio | 384 |
| Connexion GoTrue | 128 Mio | 32 Mio | 256 Mio | 128 |
| **Total production** | **1 408 Mio** | 512 Mio | | |

**Justification des valeurs :**
- **Base** : 5 fois le pic mesuré, pour absorber les tâches planifiées et les sauvegardes. Ses réglages sont bornés en cohérence : `shared_buffers` 128 Mo, 40 connexions au plus.
- **Passerelle** : l'outil de Kong se limitera à 2 processus de travail. Le gabarit en crée un par cœur, soit 28, ce qui explique ses 150 Mio.
- **API** : 384 processus au plus. Elle crée environ un fil d'exécution par cœur, et 256 ne laisserait que 1,6 fois le pic mesuré.
- Chaque valeur respecte la règle « au moins 1,3 fois le pic mesuré », avec un échange distinct de la mémoire.

**Persistance :** les plafonds sont écrits dans le compose versionné, puis contrôlés par `docker inspect` après chaque déploiement. `docker update` ne sert qu'aux essais.

**Préproduction :** environ 1,15 Gio de plus. On peut l'arrêter hors période de test.

**Budget :** environ 2,5 Gio au total, contre 7 Gio de plafonds pour une instance Supabase complète. Le conteneur MongoDB disparaît.

### 2.3 Réseau et clés

- **Aucun port publié.** Ni la base, ni la passerelle, ni l'API ne sont joignables depuis l'extérieur. Le navigateur ne parle jamais à Supabase : tout passe par le serveur Next.js, qui rejoint le réseau Docker de l'instance.
- **Aucune variable `NEXT_PUBLIC_SUPABASE_*`.** La clé secrète n'est importable que dans un seul module serveur, ce que vérifient une règle ESLint et un test sur le bundle livré au navigateur.
- **Clés conformes à SOP-028 dès la naissance.** Les sessions sont signées en ES256, avec des clés opaques `sb_` déposées au coffre, aucune clé legacy HS256, et une certification rejouable (jeton forgé refusé).
- **Preuves attendues** :
  - `docker port` vide ;
  - accès refusé depuis Internet ;
  - **contrôle « vu rouge »** : un domaine ajouté par erreur à la passerelle doit faire échouer le test d'exposition.

## 3. Schéma et isolation

### 3.1 Principes

- Les tables vivent dans un schéma `app`, seul schéma exposé à l'API. Les fonctions d'aide vivent dans `private`, non exposé.
- **La première migration retire tous les droits par défaut.** Supabase accorde sinon des droits larges sur chaque nouvelle table : une table oubliée serait ouverte à tous.
- Le rôle anonyme n'a aucun droit. Le rôle connecté n'a que des droits de lecture explicites. Toute écriture sensible passe par une fonction contrôlée.
- **Les rôles sont lus en base à chaque requête**, jamais dans le jeton de session : une révocation prend effet immédiatement.

### 3.2 Tables

| Table | Contenu | Contraintes clés |
|---|---|---|
| `profiles` | lié au compte, nom, langue, dernière connexion | |
| `tenga_admins` (schéma `private`) | administrateurs Tenga | aucune écriture possible par l'API |
| `organizations` | nom, identifiant d'URL, statut | identifiant unique, format contrôlé |
| `memberships` | utilisateur, organisation, rôle | **un seul rôle par organisation** : responsable, consultant ou participant |
| `campaigns` | organisation, titre, langue, statut (brouillon, ouverte, close), clôture | |
| `invitations` | campagne, e-mail, prénom, invitant, message, langue, jeton **haché**, expiration à 14 jours | **aucune colonne de rôle** ; l'e-mail est effacé une fois l'invitation acceptée |
| `participations` | droit de passer le test pour une campagne | une par personne et par campagne |
| `attempts` | progression en cours, numéro de révision | expiration à 30 jours |
| `results` | réponses, scores précalculés, versions du questionnaire et du calcul | un par participation ; l'organisation est celle de la campagne |
| `groups`, `group_members` | groupes d'une campagne | **une personne dans un seul groupe par campagne** ; composition gelée dès l'ouverture |
| `group_aggregates` | photographie posée à la clôture : effectif, moyenne, écart type | effectif d'au moins 5 |
| `audit_log` | acteur, action, ressource, organisation, date | **aucune adresse e-mail** ; ajout seul, rien n'est modifiable |
| `settings` | durées de conservation, seuil d'anonymat | |

### 3.3 Qui voit quoi, garanti par la base

- **Participant** : ses propres lignes.
- **Responsable d'organisation** :
  - voit le statut de participation de chacun et les agrégats photographiés ;
  - n'a **aucune règle de lecture** sur les résultats ni sur les tentatives ;
  - même une requête forgée sur l'API ne lui renvoie rien.
- **Consultant affecté et administrateur Tenga** :
  - n'ont pas non plus de lecture directe ;
  - lisent un résultat individuel par une fonction unique, qui vérifie le droit, **écrit la ligne de journal, puis renvoie le résultat** ;
  - une lecture sans trace devient structurellement impossible.
- **Verrous contre l'élévation de privilège** : ils sont quatre, et indépendants :
  1. aucun droit d'écriture sur les appartenances pour l'API ;
  2. aucune règle d'écriture ;
  3. un déclencheur qui refuse toute écriture venant de l'API ;
  4. deux fonctions seulement créent des rôles : l'acceptation d'invitation, qui ne produit que le rôle de participant, et l'attribution de rôle, réservée aux administrateurs Tenga.
- **Agrégats** :
  - posés **une seule fois, à la clôture**, dans une transaction ;
  - aucune valeur minimale ni maximale ;
  - sous 5 résultats, rien n'est publié ;
  - le complément d'un groupe n'est publié que s'il compte 0 ou au moins 5 personnes ;
  - une campagne close n'accepte plus de passation. Cela empêche de déduire un profil en comparant deux états successifs.

## 4. Connexion

- **Inscription fermée** : `GOTRUE_DISABLE_SIGNUP`, et passerelle injoignable de l'extérieur. Un compte ne naît que par l'API d'administration.
- **Les e-mails sont envoyés par l'application** via l'API Resend, déjà en place. Les gabarits existent en FR, AR (de droite à gauche) et EN. GoTrue n'envoie rien, son lien natif étant consommé à la simple ouverture.
- **Lien de connexion** : l'e-mail mène à une page `/c/{jeton}` munie d'un bouton. Le jeton n'est consommé qu'au clic, ce qui protège des antivirus de messagerie. L'e-mail contient aussi un code à 6 chiffres, utile si la personne ouvre le lien sur un autre appareil. La réponse est identique, en contenu et en durée, que l'adresse soit connue ou non.
- **Invitation** : page `/i/{jeton}` avec un bouton. Le jeton fait 32 octets, et seule son empreinte est stockée. Au clic, en une transaction :
  1. création du compte s'il n'existe pas ;
  2. création du rôle de participant ;
  3. ouverture de la participation ;
  4. effacement de l'adresse dans l'invitation ;
  5. ouverture de la session.
- **Administrateur Tenga** : une table protégée, amorcée une seule fois par script en SSH. La variable `TENGA_ADMIN_EMAILS` disparaît.

## 5. Conservation et sauvegardes

- **Purge quotidienne** par `pg_cron`, à 01:00 :
  - résultats de plus de 3 ans ;
  - invitations expirées ;
  - passations interrompues depuis plus de 30 jours ;
  - sessions inactives depuis plus de 30 jours ;
  - journal de plus d'un an ;
  - comptes sans résultat inactifs depuis un an, sauf administrateurs, responsables et consultants.

  Elle laisse une trace chiffrée dans le journal, et le point de santé de l'application signale une purge en retard.
- **Suppression de compte** : effacement en cascade par les clés étrangères. Le journal ne garde que des identifiants devenus pseudonymes.
- **Sauvegarde physique** chaque nuit à 02:00, vérifiée, chiffrée avec `age`, copiée hors du serveur. **Restauration d'essai** chaque nuit à 02:30, qui rejoue les tests d'isolation sur la copie (SOP-026). Les scripts existants des autres projets sont repris, pas réécrits.
- **Rétention des sauvegardes** : 7 quotidiennes et 4 hebdomadaires, soit environ 35 jours, sans mensuelle. Une suppression de compte disparaît donc des sauvegardes sous 35 jours. Un registre des effacements est rejoué après toute restauration.

## 6. Lots

Ordre : **0, 1, 5, 2, 3, 4, 6**, chacun déployé et vérifié avant le suivant.

| Lot | Contenu | Effort |
|---|---|---|
| **0. Instance et fondations** | Compose de 4 conteneurs plafonnés, préproduction séparée, migrations SQL versionnées (dossier `supabase/migrations`, appliquées par `migrate.sh` en SSH, sans outil local, chaque migration étant refusée si elle a été modifiée après application), sauvegarde et restauration d'essai, certification des clés, outils de test (vitest, Playwright, tests SQL), retrait des écritures publiques héritées (compteur de vues, traduction participative, formulaire de retour) | L |
| **1. Socle** | Profils, organisations, rôles, journal, purge ; connexion par lien `/c/{jeton}` ; administration Tenga ; fermeture des liens publics ; retrait de MongoDB et de Better Auth | L |
| **5. Chemins traduits** | `/fr/questionnaire`, `/fr/mes-resultats`, `/fr/connexion`, `/fr/o/{organisation}` ; anglais sans préfixe ; redirections des anciennes adresses | M |
| **2. Campagnes et passation** | Campagnes, invitations personnalisées `/i/{jeton}`, participations, progression sur le serveur (point d'API stable, révisions), notice d'information ; suppression de l'ancienne comparaison, qui ne fonctionne plus sous les règles d'isolation | L |
| **3. Mes résultats** | Historique, export de ses données, suppression de compte, information du responsable sans identité ; suppression du partage et de l'envoi du lien par e-mail | M |
| **4. Groupes et agrégats** | Groupes gelés, photographie à la clôture, vue individuelle du consultant journalisée | M |
| **6. Restitution PDF** | Gotenberg en conteneur séparé et plafonné, rendu arabe éprouvé d'abord ; données lues uniquement par les fonctions contrôlées | L |

**Repris du travail interrompu** : les règles d'accès pures et leurs tests, l'envoi d'e-mails par Resend et ses gabarits FR, AR et EN, les textes FR, AR et EN, la protection contre les redirections externes. **Jetés** : Better Auth, la couche MongoDB, les règles de conservation en TypeScript (elles passent en SQL).

## 7. Tests

- **Une matrice d'accès unique** (`supabase/tests/access-matrix.json`), écrite indépendamment des règles, alimente à la fois les tests TypeScript et les tests SQL. Ses personnages :
  - anonyme ;
  - deux participants ;
  - un responsable ;
  - un consultant affecté et un consultant d'une autre organisation ;
  - un responsable d'une autre organisation ;
  - un membre de deux organisations ;
  - un administrateur Tenga.
- **Tests SQL dans la base**, chaque personnage étant simulé par son identité, dans une transaction annulée :
  - toutes les tables sont protégées ;
  - l'anonyme n'a aucun droit ;
  - la liste des règles est figée ;
  - l'étanchéité entre deux organisations tient, même avec des identifiants forgés.
- **Tests par mutation (contrôle « vu rouge »)** : chaque règle, chaque verrou et le seuil d'anonymat sont désactivés tour à tour. Au moins un test doit alors échouer, sinon le lot est refusé.
- **Tests HTTP** contre la préproduction, avec de vrais jetons, des filtres forgés et des jetons signés par une autre instance.
- **8 parcours Playwright** en préproduction :
  1. invitation, test et résultat, en FR et en AR ;
  2. étanchéité entre organisations ;
  3. responsable sans accès individuel ;
  4. consultant affecté, et consultant non affecté ;
  5. suppression de compte ;
  6. redirections ;
  7. inscription fermée ;
  8. reprise après coupure.

  En préproduction, les e-mails sont captés par un réceptacle de test, ce qui est interdit en production et vérifié au démarrage. Un envoi réel par Resend est fait à chaque lot.
- **Un lanceur unique, `verify-lot.sh`**, enchaîne migration, tests SQL, mutation, tests HTTP, déploiement en préproduction et Playwright. Il rejoue ensuite les contrôles en lecture seule sur la production.

## 8. Risques et parades

| Risque | Parade |
|---|---|
| Table oubliée sans protection | Droits par défaut retirés, test statique, tests par mutation |
| Fuite de la clé secrète | Un seul module serveur, règle ESLint, test du bundle, rotation prévue (SOP-001) |
| Exposition accidentelle de la passerelle | Aucun domaine ni port, test d'exposition automatisé |
| Lecture individuelle sans trace | Fonction unique qui journalise avant de renvoyer |
| Réidentification par les agrégats | Groupes exclusifs et gelés, photographie unique à la clôture, complément contrôlé |
| Version allégée instable | Préproduction de 48 heures, repli sur la pile complète plafonnée |
| Dérive par rapport à la version officielle de Supabase | Images épinglées, montée de version trimestrielle après préproduction et restauration d'essai |
| Sauvegarde non restaurable | Restauration d'essai quotidienne avec tests d'isolation rejoués |
| Données conservées dans les sauvegardes | Rétention de 35 jours, registre des effacements |
| Conformité 09-08 et RGPD | Déclaration CNDP avant ouverture, transferts documentés, journal sans e-mail, relecture par un juriste |

## 9. Points à vérifier en tout début de lot 0

Les agents n'avaient pas accès à la documentation Supabase. Ces points seront vérifiés sur les instances existantes avant toute écriture :
- noms exacts des variables de GoTrue et de PostgREST ;
- prise en charge des clés `sb_` ;
- disponibilité de `pg_cron` et de pgTAP ;
- droits du rôle `postgres` sur le schéma `auth` ;
- conservation des plafonds par Coolify ;
- réseau partagé entre l'application et l'instance ;
- `createNavigation` dans next-intl 3.26 et `after()` dans Next 15.5.

## 10. Arbitrages à valider

1. **Instance allégée à 4 conteneurs, plafonds du § 2.2.** Recommandé.
2. **Préproduction : instance séparée** (environ 1,15 Gio de plus, arrêtable). Recommandé : un schéma séparé ne peut pas isoler les comptes.
3. **Durées de conservation stockées dans une table de réglages**, et non dans des variables d'environnement, que la tâche de purge en base ne peut pas lire. Changement de forme de la décision 4, pas de fond.
4. **Objectifs de reprise** : perte de données d'au plus 24 heures, et remise en service en 1 heure.
5. **Rétention des sauvegardes de 35 jours**, sans sauvegarde mensuelle, pour qu'une suppression de compte soit effective partout.
6. **Un seul rôle par organisation** : un responsable ne peut pas passer le test au sein de sa propre organisation. S'il doit le passer, il le fait comme participant d'une campagne dédiée gérée par Tenga.
7. **Suppression de l'aperçu du questionnaire pour les consultants.** Le consultant peut passer le test dans une campagne de démonstration.
8. **Retrait des fonctions publiques héritées** (compteur de vues, traduction participative, formulaire de retour, partage et envoi du lien de résultat, ancienne comparaison) et **anglais sans préfixe**, comme en version 1.
