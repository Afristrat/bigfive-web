-- Sécurité par ligne : toutes les tables de app et private l'ont activée et
-- forcée, et le garde-fou en base la maintient (création, ALTER, SET SCHEMA,
-- partitions), sans drapeau de session contournable.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(17);

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity),
  0, 'toutes les tables de app et private ont la RLS activée');

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p') AND NOT c.relforcerowsecurity),
  0, 'toutes les tables de app et private ont la RLS forcée');

SELECT ok(
  (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'private' AND c.relname IN ('settings', 'schema_migrations')) = 2,
  'les tables de base de private existent (settings, schema_migrations)');

SELECT ok(
  EXISTS (SELECT 1 FROM pg_event_trigger t JOIN pg_proc p ON p.oid = t.evtfoid
           WHERE t.evtname = 'garde_ddl_tenga' AND t.evtenabled = 'O' AND p.proname = 'verifier_ddl'),
  'le déclencheur d''événement garde_ddl_tenga est présent, actif, et appelle verifier_ddl');

-- Comportement : une table créée sans précaution est protégée d'office.
CREATE TABLE app.zz_test_garde (id integer);
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'app.zz_test_garde'::regclass),
  'une table créée dans app a la RLS activée et forcée automatiquement');

CREATE TABLE private.zz_test_garde (id integer);
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'private.zz_test_garde'::regclass),
  'une table créée dans private a la RLS activée et forcée automatiquement');

SELECT throws_ok(
  'ALTER TABLE app.zz_test_garde DISABLE ROW LEVEL SECURITY',
  '42501', 'RLS obligatoire : la table app.zz_test_garde doit garder la sécurité par ligne activée et forcée',
  'désactiver la RLS d''une table de app est refusé');

SELECT throws_ok(
  'ALTER TABLE app.zz_test_garde NO FORCE ROW LEVEL SECURITY',
  '42501', 'RLS obligatoire : la table app.zz_test_garde doit garder la sécurité par ligne activée et forcée',
  'retirer le FORCE d''une table de app est refusé');

-- Une table hors app/private n'est pas concernée par le garde.
CREATE TABLE public.zz_test_garde (id integer);
SELECT ok(
  NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.zz_test_garde'::regclass),
  'le garde ne touche pas aux tables hors app et private');

-- Autres formes de création.
CREATE TABLE app.zz_ctas AS SELECT 1 AS a;
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'app.zz_ctas'::regclass),
  'CREATE TABLE AS dans app : RLS activée et forcée automatiquement');

SELECT 1 AS a INTO app.zz_into;
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'app.zz_into'::regclass),
  'SELECT INTO dans app : RLS activée et forcée automatiquement');

CREATE TABLE app.zz_part (id integer) PARTITION BY RANGE (id);
CREATE TABLE app.zz_part_1 PARTITION OF app.zz_part FOR VALUES FROM (0) TO (10);
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'app.zz_part'::regclass),
  'table partitionnée dans app : RLS activée et forcée automatiquement');
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'app.zz_part_1'::regclass),
  'partition dans app : RLS activée et forcée automatiquement');

-- Déplacement ou rattachement d'une table sans RLS vers app : refusé.
CREATE TABLE public.zz_ss (id integer);
SELECT throws_ok(
  'ALTER TABLE public.zz_ss SET SCHEMA app',
  '42501', 'RLS obligatoire : la table app.zz_ss doit garder la sécurité par ligne activée et forcée',
  'déplacer une table sans RLS de public vers app est refusé');

CREATE TABLE public.zz_att (id integer);
SELECT throws_ok(
  'ALTER TABLE app.zz_part ATTACH PARTITION public.zz_att FOR VALUES FROM (10) TO (20)',
  '42501', 'RLS obligatoire : la table public.zz_att doit garder la sécurité par ligne activée et forcée',
  'rattacher à une table de app une partition sans RLS est refusé');

-- Le drapeau de session de l'ancienne version n'existe plus : le poser ne change rien.
SET LOCAL private.garde_rls_actif = 'on';
SELECT throws_ok(
  'ALTER TABLE app.zz_test_garde DISABLE ROW LEVEL SECURITY',
  '42501', 'RLS obligatoire : la table app.zz_test_garde doit garder la sécurité par ligne activée et forcée',
  'poser private.garde_rls_actif = on ne contourne pas le garde');

-- Pas de boucle : une création complexe (identité, index, clé étrangère) aboutit.
SELECT lives_ok(
  'CREATE TABLE app.zz_boucle (id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, parent integer REFERENCES app.zz_boucle (id)); CREATE INDEX ON app.zz_boucle (parent)',
  'création d''une table avec identité, index et clé étrangère : le garde ne boucle pas');

SELECT * FROM finish();
