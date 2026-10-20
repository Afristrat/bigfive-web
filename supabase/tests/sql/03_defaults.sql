-- Droits par défaut : aucun octroi implicite à PUBLIC, anon, authenticated,
-- service_role pour les rôles qui créent des objets (postgres, supabase_admin,
-- tenga_owner) dans app, private, public, ni au niveau global.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(8);

SELECT is(
  (SELECT count(*)::int
     FROM pg_default_acl d
     CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclrole IN (SELECT oid FROM pg_roles WHERE rolname IN ('postgres', 'supabase_admin', 'tenga_owner'))
      AND (d.defaclnamespace = 0
           OR d.defaclnamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN ('app', 'private', 'public')))
      AND (a.grantee = 0
           OR a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')))),
  0, 'aucun droit par défaut pour PUBLIC, anon, authenticated, service_role (app, private, public, global)');

SELECT is(
  (SELECT count(*)::int
     FROM pg_default_acl d
     CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclnamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN ('app', 'private'))
      AND a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role'))),
  0, 'aucun droit par défaut dans app et private, quel que soit le rôle créateur');

-- Schémas du gabarit non utilisés par Tenga (storage, graphql, graphql_public,
-- realtime) : aucun droit par défaut pour PUBLIC ni les rôles de l'API, quel
-- que soit le rôle créateur (migration 0004, F3).
SELECT is(
  (SELECT count(*)::int
     FROM pg_default_acl d
     CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE d.defaclnamespace IN (SELECT oid FROM pg_namespace WHERE nspname IN ('storage', 'graphql', 'graphql_public', 'realtime'))
      AND (a.grantee = 0
           OR a.grantee IN (SELECT oid FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role')))),
  0, 'aucun droit par défaut pour PUBLIC, anon, authenticated, service_role dans storage, graphql, graphql_public, realtime');

-- Comportement dans public, schéma où le gabarit accordait tout.
CREATE TABLE public.zz_test_defauts (id integer);
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_any_column_privilege(r.nom, 'public.zz_test_defauts'::regclass, 'SELECT,INSERT,UPDATE,REFERENCES')),
  0, 'une table neuve de public n''est ouverte à aucun rôle de l''API');

CREATE TABLE private.zz_test_defauts (id integer);
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_any_column_privilege(r.nom, 'private.zz_test_defauts'::regclass, 'SELECT,INSERT,UPDATE,REFERENCES')),
  0, 'une table neuve de private n''est ouverte à aucun rôle de l''API');

CREATE SEQUENCE public.zz_test_defauts_seq;
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_sequence_privilege(r.nom, 'public.zz_test_defauts_seq'::regclass, 'USAGE')
       OR has_sequence_privilege(r.nom, 'public.zz_test_defauts_seq'::regclass, 'SELECT')
       OR has_sequence_privilege(r.nom, 'public.zz_test_defauts_seq'::regclass, 'UPDATE')),
  0, 'une séquence neuve de public n''est ouverte à aucun rôle de l''API');

-- Même chose pour les objets créés par le propriétaire tenga_owner.
SET LOCAL ROLE tenga_owner;
CREATE TABLE app.zz_test_defauts_owner (id integer);
CREATE FUNCTION app.zz_test_defauts_owner() RETURNS integer LANGUAGE sql AS 'SELECT 1';
RESET ROLE;
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_any_column_privilege(r.nom, 'app.zz_test_defauts_owner'::regclass, 'SELECT,INSERT,UPDATE,REFERENCES')),
  0, 'une table neuve créée par tenga_owner n''est ouverte à aucun rôle de l''API');
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'public']) AS r(nom)
    WHERE has_function_privilege(r.nom, 'app.zz_test_defauts_owner()'::regprocedure, 'EXECUTE')),
  0, 'une fonction neuve créée par tenga_owner n''est exécutable ni par PUBLIC ni par un rôle de l''API');

SELECT * FROM finish();
