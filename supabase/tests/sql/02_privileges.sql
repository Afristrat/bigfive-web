-- Aucun droit implicite : anon n'a rien sur app, private ni tests ;
-- authenticated et service_role n'ont rien sur private ni tests.
-- (Enveloppé dans BEGIN ... ROLLBACK par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(13);

-- anon : schémas
SELECT is(
  (SELECT count(*)::int FROM pg_namespace n
    WHERE n.nspname IN ('app', 'private', 'tests')
      AND (has_schema_privilege('anon', n.oid, 'USAGE') OR has_schema_privilege('anon', n.oid, 'CREATE'))),
  0, 'anon n''a aucun droit sur les schémas app, private et tests');

-- anon : objets
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')),
  0, 'anon n''a aucun privilège (colonnes comprises) sur les tables et vues de app et private');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (has_table_privilege('anon', c.oid, 'DELETE') OR has_table_privilege('anon', c.oid, 'TRUNCATE')
           OR has_table_privilege('anon', c.oid, 'TRIGGER'))),
  0, 'anon n''a ni DELETE, ni TRUNCATE, ni TRIGGER sur app et private');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind = 'S'
      AND (has_sequence_privilege('anon', c.oid, 'USAGE') OR has_sequence_privilege('anon', c.oid, 'SELECT')
           OR has_sequence_privilege('anon', c.oid, 'UPDATE'))),
  0, 'anon n''a aucun privilège sur les séquences de app et private');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'anon ne peut exécuter aucune fonction de app et private');

-- authenticated : private et tests
SELECT is(
  (SELECT count(*)::int FROM pg_namespace n
    WHERE n.nspname IN ('private', 'tests')
      AND (has_schema_privilege('authenticated', n.oid, 'USAGE') OR has_schema_privilege('authenticated', n.oid, 'CREATE'))),
  0, 'authenticated n''a aucun droit sur les schémas private et tests');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'private' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (has_any_column_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('authenticated', c.oid, 'DELETE')
           OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
           OR has_table_privilege('authenticated', c.oid, 'TRIGGER'))),
  0, 'authenticated n''a aucun privilège sur les tables de private');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  0, 'authenticated ne peut exécuter aucune fonction de private');

-- service_role : private et tests
SELECT is(
  (SELECT count(*)::int FROM pg_namespace n
    WHERE n.nspname IN ('private', 'tests')
      AND (has_schema_privilege('service_role', n.oid, 'USAGE') OR has_schema_privilege('service_role', n.oid, 'CREATE'))),
  0, 'service_role n''a aucun droit sur les schémas private et tests');

-- app : l'entrée est ouverte aux deux rôles de l'API, sans création possible
SELECT ok(has_schema_privilege('authenticated', 'app', 'USAGE') AND has_schema_privilege('service_role', 'app', 'USAGE'),
  'authenticated et service_role peuvent entrer dans app');
SELECT ok(NOT has_schema_privilege('authenticated', 'app', 'CREATE') AND NOT has_schema_privilege('service_role', 'app', 'CREATE'),
  'authenticated et service_role ne peuvent rien créer dans app');

-- Comportement : un objet créé à l'instant n'est ouvert à personne.
CREATE TABLE app.zz_test_droits (id integer);
CREATE FUNCTION app.zz_test_droits() RETURNS integer LANGUAGE sql AS 'SELECT 1';
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_any_column_privilege(r.nom, 'app.zz_test_droits'::regclass, 'SELECT,INSERT,UPDATE,REFERENCES')),
  0, 'une table neuve de app n''est ouverte à aucun rôle de l''API');
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE has_function_privilege(r.nom, 'app.zz_test_droits()'::regprocedure, 'EXECUTE')),
  0, 'une fonction neuve de app n''est exécutable par aucun rôle de l''API');

SELECT * FROM finish();
