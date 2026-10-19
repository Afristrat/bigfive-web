-- Périmètre des rôles de l'API hors app : schémas public, extensions, cron,
-- tests, tenga_garde. Aucun rôle de l'API ne crée d'objet, n'entre dans cron ni
-- ne planifie de tâche.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(9);

SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
     CROSS JOIN unnest(ARRAY['public', 'extensions', 'cron', 'tests', 'tenga_garde', 'private', 'app']) AS s(nom)
    WHERE has_schema_privilege(r.nom, s.nom, 'CREATE')),
  0, 'aucun rôle de l''API ne peut créer d''objet dans public, extensions, cron, tests, tenga_garde, private ni app');

SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
     CROSS JOIN unnest(ARRAY['cron', 'tests', 'tenga_garde']) AS s(nom)
    WHERE has_schema_privilege(r.nom, s.nom, 'USAGE')),
  0, 'aucun rôle de l''API n''a l''usage des schémas cron, tests et tenga_garde');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE n.nspname = 'cron' AND has_function_privilege(r.nom, p.oid, 'EXECUTE')),
  0, 'aucun rôle de l''API ne peut exécuter une fonction du schéma cron');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role', 'public']) AS r(nom)
    WHERE n.nspname = 'cron' AND p.proname IN ('schedule', 'unschedule', 'alter_job', 'schedule_in_database')
      AND has_function_privilege(r.nom, p.oid, 'EXECUTE')),
  0, 'cron.schedule, unschedule, alter_job et schedule_in_database ne sont exécutables ni par PUBLIC ni par l''API');

SELECT ok(
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'cron' AND p.proname IN ('schedule', 'unschedule', 'alter_job')) >= 3,
  'les fonctions cron attendues existent (le test précédent ne passe donc pas à vide)');

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(nom)
    WHERE n.nspname = 'cron' AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
      AND (has_any_column_privilege(r.nom, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege(r.nom, c.oid, 'DELETE'))),
  0, 'aucun rôle de l''API n''a de privilège sur cron.job ni cron.job_run_details');

-- Comportement réel
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM cron.schedule('zz_interdit', '* * * * *', 'SELECT 1');
  PERFORM set_config('zz.cron', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.cron', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.cron'), '42501', 'authenticated appelant cron.schedule : 42501');

SET LOCAL ROLE service_role;
DO $$ BEGIN
  PERFORM cron.schedule('zz_interdit', '* * * * *', 'SELECT 1');
  PERFORM set_config('zz.cron2', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.cron2', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.cron2'), '42501', 'service_role appelant cron.schedule : 42501');

SET LOCAL ROLE anon;
DO $$ BEGIN
  CREATE TABLE public.zz_anon (id integer);
  PERFORM set_config('zz.pub', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.pub', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.pub'), '42501', 'anon créant une table dans public : 42501');

SELECT * FROM finish();
