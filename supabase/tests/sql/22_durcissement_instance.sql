-- Durcissement de l'instance, migration 0004 : recherche d'adresse sur l'index
-- partiel de auth.users (M4), planification de la purge et de l'historique
-- pg_cron (M5, F4), schéma vault fermé à service_role (F1), pg_stat_statements
-- fermé à l'API (F2), (SELECT app.suis_admin_tenga()) dans les règles de
-- lecture (F5). Les droits par défaut (F3) sont dans 03_defaults.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(33);

CREATE FUNCTION pg_temp.comme(p_uid uuid, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  IF p_sql ~* '^\s*select' THEN
    EXECUTE p_sql INTO v;
  ELSE
    EXECUTE p_sql;
    v := 'ok';
  END IF;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

-- Plan d'exécution d'une requête, en texte.
CREATE FUNCTION pg_temp.plan_de(p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v_ligne text;
  v_plan  text := '';
BEGIN
  FOR v_ligne IN EXECUTE 'EXPLAIN ' || p_sql LOOP
    v_plan := v_plan || v_ligne || E'\n';
  END LOOP;
  RETURN v_plan;
END
$$;

-- ===== M4 : la recherche par adresse emploie users_email_partial_key =====
SELECT matches(pg_get_functiondef('app.demander_lien_connexion(text, text)'::regprocedure), 'u\.is_sso_user = false',
  'demander : la recherche par adresse porte is_sso_user = false (prédicat de l''index partiel)');
SELECT matches(pg_get_functiondef('app.consommer_code_connexion(text, text, text)'::regprocedure), 'u\.is_sso_user = false',
  'consommer code : la recherche par adresse porte is_sso_user = false');
SET LOCAL enable_seqscan = off;
SELECT matches(
  pg_temp.plan_de($q$SELECT u.id FROM auth.users u WHERE u.email = 'a@example.test' AND u.is_sso_user = false AND (u.banned_until IS NULL OR u.banned_until <= now())$q$),
  'users_email_partial_key', 'avec is_sso_user = false, le plan emploie users_email_partial_key');
SELECT doesnt_match(
  pg_temp.plan_de($q$SELECT u.id FROM auth.users u WHERE u.email = 'a@example.test' AND (u.banned_until IS NULL OR u.banned_until <= now())$q$),
  'users_email_partial_key', 'sans le prédicat, l''index partiel est inutilisable (témoin du test précédent)');
RESET enable_seqscan;
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attname) FROM pg_attribute a
    WHERE a.attrelid = 'auth.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND has_column_privilege('tenga_owner', a.attrelid, a.attnum, 'SELECT')),
  'banned_until,email,id,is_sso_user', 'tenga_owner lit quatre colonnes de auth.users, pas une de plus');

INSERT INTO auth.users (id, email, is_sso_user) VALUES ('d0000000-0000-4000-8000-000000000001', 'sso@example.test', true);
INSERT INTO auth.users (id, email) VALUES ('d0000000-0000-4000-8000-000000000002', 'normal@example.test');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select concat_ws(' ', envoyer::text, coalesce(jeton, '-')) from app.demander_lien_connexion('sso@example.test')$q$),
  'false -', 'un compte SSO ne reçoit pas de lien (réponse neutre)');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_code_connexion('sso@example.test', '123456')::text$q$), NULL, 'un compte SSO n''a pas de code');
SELECT matches(pg_temp.comme(NULL, 'service_role', $q$select concat_ws(' ', envoyer::text, coalesce(jeton, '-')) from app.demander_lien_connexion('normal@example.test')$q$),
  '^true ', 'un compte ordinaire reçoit son lien');

-- ===== M5 : planification de la purge =====
SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'tenga-purge-quotidienne'), 1, 'une seule tâche de purge quotidienne après la replanification');
SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'tenga-purge-quotidienne' AND schedule = '0 1 * * *' AND active), 1, 'la purge est à 0 1 * * * et active');
SELECT is(current_setting('cron.timezone'), 'Africa/Casablanca', 'cron.timezone : l''horaire se lit en heure de Casablanca');
SELECT matches(obj_description('private.purger_quotidien()'::regprocedure, 'pg_proc'), '01:00 HEURE LOCALE',
  'le commentaire de la fonction dit 01:00 heure locale (celui de 0002, « 00:00 UTC », était faux)');

-- ===== F4 : historique pg_cron purgé après 30 jours =====
SELECT is((SELECT schedule || '|' || active::text FROM cron.job WHERE jobname = 'tenga-purge-historique-cron'), '15 1 * * *|true',
  'la tâche tenga-purge-historique-cron est planifiée à 01:15 et active');
SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'tenga-purge-historique-cron'), 1, 'une seule tâche de purge de l''historique');
INSERT INTO cron.job_run_details (jobid, database, username, command, status, start_time, end_time) VALUES
  (-1, 'postgres', 'test', 'zz-vieux', 'succeeded', now() - interval '31 days', now() - interval '31 days'),
  (-1, 'postgres', 'test', 'zz-limite', 'succeeded', now() - interval '29 days', now() - interval '29 days'),
  (-1, 'postgres', 'test', 'zz-en-cours', 'running', now() - interval '40 days', NULL);
DO $$
BEGIN
  EXECUTE (SELECT command FROM cron.job WHERE jobname = 'tenga-purge-historique-cron');
END
$$;
SELECT is((SELECT string_agg(command, ',' ORDER BY command) FROM cron.job_run_details WHERE jobid = -1), 'zz-en-cours,zz-limite',
  'la tâche efface l''historique de plus de 30 jours, garde le récent et ce qui est en cours');
SELECT is((SELECT username FROM cron.job WHERE jobname = 'tenga-purge-historique-cron'), (SELECT username FROM cron.job WHERE jobname = 'tenga-purge-quotidienne'),
  'les deux tâches tournent sous le même propriétaire');

-- ===== F1 : schéma vault fermé à service_role =====
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE has_schema_privilege(r.rol, 'vault', 'USAGE,CREATE')),
  0, 'ni PUBLIC, ni anon, ni authenticated, ni service_role n''ont de droit sur le schéma vault');
SELECT cmp_ok((SELECT count(*)::int FROM pg_class WHERE relnamespace = 'vault'::regnamespace AND relkind IN ('r', 'v')), '>=', 2,
  'les tables et vues de vault existent (le test suivant ne passe pas à vide)');
SELECT is(
  (SELECT count(*)::int FROM pg_class c CROSS JOIN unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE c.relnamespace = 'vault'::regnamespace AND c.relkind IN ('r', 'v', 'm', 'p', 'S')
      AND has_table_privilege(r.rol, c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')),
  0, 'aucun droit de service_role, anon, authenticated ni PUBLIC sur les tables de vault (secrets, decrypted_secrets)');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p CROSS JOIN unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE p.pronamespace = 'vault'::regnamespace AND has_function_privilege(r.rol, p.oid, 'EXECUTE')),
  0, 'aucune fonction de vault n''est exécutable par service_role, anon, authenticated ni PUBLIC');
SELECT ok(has_schema_privilege('postgres', 'vault', 'USAGE')
          AND has_function_privilege('postgres', 'vault.create_secret(text, text, text, uuid)', 'EXECUTE')
          AND has_table_privilege('postgres', 'vault.secrets', 'SELECT'),
  'postgres garde l''usage de vault (les fonctions de l''image ne sont pas cassées)');
SELECT is((SELECT p.proowner::regrole::text FROM pg_proc p WHERE p.oid = 'vault.create_secret(text, text, text, uuid)'::regprocedure), 'supabase_admin',
  'vault.create_secret appartient toujours à supabase_admin');

-- ===== F2 : pg_stat_statements fermé à l'API =====
SELECT is(
  (SELECT count(*)::int FROM unnest(ARRAY['extensions.pg_stat_statements'::regclass, 'extensions.pg_stat_statements_info'::regclass]) AS t(oid)
     CROSS JOIN unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE has_table_privilege(r.rol, t.oid, 'SELECT')),
  0, 'pg_stat_statements et pg_stat_statements_info ne sont lisibles ni par PUBLIC, ni par anon, authenticated, service_role');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p CROSS JOIN unnest(ARRAY['public', 'anon', 'authenticated', 'service_role']) AS r(rol)
    WHERE p.pronamespace = 'extensions'::regnamespace AND p.proname IN ('pg_stat_statements', 'pg_stat_statements_info', 'pg_stat_statements_reset')
      AND has_function_privilege(r.rol, p.oid, 'EXECUTE')),
  0, 'les fonctions pg_stat_statements ne sont exécutables par aucun rôle de l''API (sinon la vue fermée serait contournée)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from extensions.pg_stat_statements'), 'ERR:42501:permission denied for view pg_stat_statements',
  'service_role lit pg_stat_statements : refusé en réel');
SELECT ok(has_table_privilege('postgres', 'extensions.pg_stat_statements', 'SELECT')
          AND has_function_privilege('postgres', 'extensions.pg_stat_statements(boolean)', 'EXECUTE'),
  'postgres garde la lecture de pg_stat_statements (supervision)');

-- ===== F5 : (SELECT app.suis_admin_tenga()) dans les règles =====
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname IN ('app', 'private') AND coalesce(qual, '') ~ '(?<!SELECT )app\.suis_admin_tenga'),
  0, 'aucune règle n''appelle app.suis_admin_tenga() hors d''un (SELECT ...) : évaluée une fois par requête, non par ligne');
SELECT is(
  (SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies
    WHERE schemaname = 'app' AND qual ~ 'SELECT app\.suis_admin_tenga'),
  'campaigns_lecture,group_aggregates_lecture,group_members_lecture,groups_lecture,memberships_lecture,organizations_lecture', 'organizations_lecture, memberships_lecture, campaigns_lecture et les trois règles de lecture des groupes enveloppent la fonction');

INSERT INTO app.organizations (id, slug, nom) VALUES
  ('d1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('d1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('d0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-00000000000a', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('d0000000-0000-4000-8000-000000000001');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.organizations')::int, 2, 'l''administrateur Tenga voit toutes les organisations (sens inchangé)');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.organizations')::int, 1, 'un membre ne voit que son organisation');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.memberships')::int, 1, 'l''administrateur Tenga voit toutes les appartenances');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.memberships')::int, 1, 'un membre voit ses appartenances');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.organizations')::int, 0, 'sans identité, aucune organisation');

SELECT * FROM finish();
