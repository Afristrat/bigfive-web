# Instance Supabase de Tenga Assessments

Compose, migrations, scripts et tests de l'instance dédiée (plan d'implémentation, `docs/plan-implementation-espace-prive.md` § 2 à 5). Tout s'exécute sur le serveur, en SSH, jamais depuis le poste.

## Amorçage de l'administrateur Tenga (une seule fois par pile)

La table `private.tenga_admins` n'est écrite par aucune requête de l'API. Le premier administrateur y entre par ce script, après l'application de la migration 0002 :

```
sh supabase/scripts/seed-admin.sh <tenga-sb|tenga-sb-preprod> <adresse-e-mail>
```

Comportement :

- le script se lance par `sh` (le bit d'exécution ne se conserve pas depuis le poste Windows) ;
- il refuse de s'exécuter si la table contient déjà une ligne (amorçage unique) ou si l'adresse a une forme douteuse ;
- si l'adresse n'a pas de compte, il le crée (compte confirmé et identité « email » dans `auth`, profil créé par le déclencheur de la migration 0002) ;
- l'insertion et l'écriture au journal (`admin.amorcer`, sans adresse) se font dans une seule transaction, par `psql` dans le conteneur `<pile>-db` ;
- l'adresse est passée à `psql` par une variable, n'est jamais affichée ni journalisée, et les erreurs de `psql` ne sont pas affichées (elles pourraient la citer) ;
- ensuite, la personne se connecte par `/connexion` ; la page `/admin` lui est ouverte parce que `app.suis_admin_tenga()` lit la table à chaque requête.

Les administrateurs suivants ne s'ajoutent pas depuis `/admin` : l'attribution de rôles ne crée que les rôles d'organisation (responsable, consultant, participant). Ajouter un second administrateur Tenga demande une décision d'Amine et un nouveau mandat (la table se vide ou se complète par SQL en superutilisateur, jamais par l'API).

À vérifier au premier passage en préproduction : le script écrit directement dans `auth.users` et `auth.identities` (colonnes de GoTrue `v2.189.0`). Une colonne différente ferait échouer la transaction sans rien laisser derrière elle.

## Réceptacle d'e-mails de la préproduction

La préproduction définit `APP_ENV=preproduction`, `MAIL_SINK=true` et `MAIL_SINK_TOKEN` (32 caractères au moins). Les messages sont alors gardés en mémoire, lisibles par `GET /api/mail-sink` avec l'en-tête `x-mail-sink-token`, et ne partent pas chez Resend. L'application refuse de démarrer si `MAIL_SINK=true` sans `APP_ENV=preproduction` (vérifié par `instrumentation.ts`, et à chaque envoi).

Voir aussi `tests/README.md` pour les tests SQL.
