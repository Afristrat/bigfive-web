-- Garde-fou DDL : vues, vues matérialisées, tables étrangères, fonctions
-- SECURITY DEFINER, extensions. Les messages sont vérifiés, pas seulement le
-- code SQLSTATE.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(18);

-- Vues
SELECT throws_ok(
  'CREATE VIEW app.zz_v AS SELECT 1 AS a',
  '42501', 'Vue interdite sans security_invoker : la vue app.zz_v doit être définie WITH (security_invoker = true)',
  'une vue de app sans security_invoker est refusée');
SELECT lives_ok(
  'CREATE VIEW app.zz_v_ok WITH (security_invoker = true) AS SELECT 1 AS a',
  'une vue de app avec security_invoker = true est acceptée');
SELECT throws_ok(
  'ALTER VIEW app.zz_v_ok SET (security_invoker = false)',
  '42501', 'Vue interdite sans security_invoker : la vue app.zz_v_ok doit être définie WITH (security_invoker = true)',
  'retirer security_invoker d''une vue de app est refusé');
SELECT throws_ok(
  'CREATE VIEW private.zz_v AS SELECT 1 AS a',
  '42501', 'Vue interdite sans security_invoker : la vue private.zz_v doit être définie WITH (security_invoker = true)',
  'une vue de private sans security_invoker est refusée');

-- Vue matérialisée, table étrangère
SELECT throws_ok(
  'CREATE MATERIALIZED VIEW app.zz_mv AS SELECT 1 AS a',
  '42501', 'Vue matérialisée interdite dans app : app.zz_mv',
  'une vue matérialisée dans app est refusée');
CREATE FOREIGN DATA WRAPPER zz_fdw;
CREATE SERVER zz_srv FOREIGN DATA WRAPPER zz_fdw;
SELECT throws_ok(
  'CREATE FOREIGN TABLE app.zz_ft (a integer) SERVER zz_srv',
  '42501', 'Table étrangère interdite dans app : app.zz_ft',
  'une table étrangère dans app est refusée');

-- Fonctions SECURITY DEFINER
SELECT throws_ok(
  $q$CREATE FUNCTION app.zz_f() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'$q$,
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : app.zz_f()',
  'une fonction SECURITY DEFINER de app sans search_path épinglé est refusée');
SELECT throws_ok(
  $q$CREATE FUNCTION private.zz_f() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'$q$,
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : private.zz_f()',
  'idem dans private');
SELECT lives_ok(
  $q$CREATE FUNCTION app.zz_f_ok() RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path = '' AS 'SELECT 1'$q$,
  'une fonction SECURITY DEFINER avec search_path épinglé est acceptée');
SELECT lives_ok(
  $q$CREATE FUNCTION app.zz_g() RETURNS integer LANGUAGE sql AS 'SELECT 1'$q$,
  'une fonction SECURITY INVOKER sans search_path est acceptée');
SELECT throws_ok(
  'ALTER FUNCTION app.zz_g() SECURITY DEFINER',
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : app.zz_g()',
  'passer une fonction en SECURITY DEFINER sans search_path épinglé est refusé');
SELECT throws_ok(
  'ALTER FUNCTION app.zz_f_ok() RESET search_path',
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : app.zz_f_ok()',
  'retirer le search_path épinglé d''une fonction SECURITY DEFINER est refusé');
SELECT throws_ok(
  $q$CREATE PROCEDURE app.zz_p() LANGUAGE sql SECURITY DEFINER AS 'SELECT 1'$q$,
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : app.zz_p()',
  'une procédure SECURITY DEFINER sans search_path épinglé est refusée');

-- Fonction déplacée depuis public vers app
CREATE FUNCTION public.zz_h() RETURNS integer LANGUAGE sql SECURITY DEFINER AS 'SELECT 1';
SELECT throws_ok(
  'ALTER FUNCTION public.zz_h() SET SCHEMA app',
  '42501', 'Fonction SECURITY DEFINER interdite sans search_path épinglé : app.zz_h()',
  'déplacer vers app une fonction SECURITY DEFINER sans search_path est refusé');

-- Extensions
SELECT throws_ok(
  'CREATE EXTENSION citext WITH SCHEMA app',
  '42501', 'Extension interdite dans les schémas app et private : citext',
  'installer une extension dans app est refusé');
SELECT throws_ok(
  'CREATE EXTENSION hstore WITH SCHEMA private',
  '42501', 'Extension interdite dans les schémas app et private : hstore',
  'installer une extension dans private est refusé');
SELECT lives_ok(
  'CREATE EXTENSION btree_gin WITH SCHEMA extensions',
  'une extension dans le schéma extensions reste permise');

-- Le garde ne gêne pas public
SELECT lives_ok(
  'CREATE VIEW public.zz_v AS SELECT 1 AS a',
  'une vue de public n''est pas concernée par le garde');

SELECT * FROM finish();
