-- Repris du gabarit officiel supabase/docker (volumes/db/roles.sql) : donne
-- le mot de passe de l'instance aux rôles de service préexistants de l'image.
-- Exécuté une seule fois, à l'initialisation du répertoire de données.
-- supabase_functions_admin n'est pas repris : il naît de webhooks.sql, que
-- cette instance n'embarque pas (aucune fonction serverless).
\set ON_ERROR_STOP on
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER pgbouncer WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
