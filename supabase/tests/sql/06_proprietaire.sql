-- Rôle propriétaire tenga_owner et comportement réel des rôles de l'API
-- (SET LOCAL ROLE), pas seulement leurs privilèges déclarés.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(16);

-- Attributs du rôle propriétaire
SELECT ok(
  (SELECT NOT rolsuper AND NOT rolbypassrls AND NOT rolcanlogin AND NOT rolinherit AND NOT rolcreatedb AND NOT rolcreaterole
     FROM pg_roles WHERE rolname = 'tenga_owner'),
  'tenga_owner : ni superutilisateur, ni BYPASSRLS, ni connexion, ni héritage, ni création de base ou de rôle');

SELECT is(
  (SELECT count(*)::int FROM pg_namespace WHERE nspname IN ('app', 'private') AND nspowner = 'tenga_owner'::regrole),
  2, 'tenga_owner est propriétaire des schémas app et private');

SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private') AND c.relkind IN ('r', 'p', 'v', 'm', 'f', 'S')
      AND c.relowner <> 'tenga_owner'::regrole),
  0, 'toutes les relations de app et private appartiennent à tenga_owner');

SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND p.proowner <> 'tenga_owner'::regrole),
  0, 'toutes les fonctions de app et private appartiennent à tenga_owner');

-- Constat sur les rôles du gabarit (documenté dans le README des tests)
SELECT ok(
  (SELECT bool_and(NOT rolbypassrls) FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'authenticator')),
  'anon, authenticated et authenticator ne contournent pas la RLS');
SELECT ok(
  (SELECT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname = 'service_role'),
  'constat : service_role contourne la RLS (gabarit Supabase) sans être superutilisateur');
SELECT ok(
  (SELECT rolbypassrls AND NOT rolsuper FROM pg_roles WHERE rolname = 'postgres'),
  'constat : postgres contourne la RLS (gabarit Supabase) sans être superutilisateur');

-- Le propriétaire crée une table : le garde s'applique à lui (sans droit sur tenga_garde)
SET LOCAL ROLE tenga_owner;
CREATE TABLE app.zz_proprio (id integer);
RESET ROLE;
SELECT ok(
  (SELECT relrowsecurity AND relforcerowsecurity AND relowner = 'tenga_owner'::regrole
     FROM pg_class WHERE oid = 'app.zz_proprio'::regclass),
  'une table créée par tenga_owner a la RLS activée, forcée, et lui appartient');

-- RLS forcée : le propriétaire n'insère rien sans règle.
SET LOCAL ROLE tenga_owner;
DO $$ BEGIN
  INSERT INTO app.zz_proprio VALUES (1);
  PERFORM set_config('zz.proprio', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.proprio', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.proprio'), '42501', 'tenga_owner ne peut pas insérer dans sa propre table sans règle (RLS forcée)');

-- anon : refusé dès l'entrée du schéma
SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM app.zz_proprio;
  PERFORM set_config('zz.anon', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.anon', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.anon'), '42501', 'anon lisant une table de app : 42501 (permission refusée)');

-- authenticated : droit de lecture accordé, mais RLS forcée sans règle => zéro ligne
INSERT INTO app.zz_proprio VALUES (1);
GRANT SELECT ON app.zz_proprio TO authenticated;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM set_config('zz.auth', (SELECT count(*)::text FROM app.zz_proprio), true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.auth'), '0', 'authenticated avec SELECT accordé ne voit aucune ligne tant qu''aucune règle ne l''admet');

-- authenticated : aucune écriture sans droit
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  INSERT INTO app.zz_proprio VALUES (2);
  PERFORM set_config('zz.auth_w', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.auth_w', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.auth_w'), '42501', 'authenticated sans droit INSERT : 42501');

-- authenticated n'a aucun accès à private
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM 1 FROM private.schema_migrations;
  PERFORM set_config('zz.auth_p', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.auth_p', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.auth_p'), '42501', 'authenticated lisant private.schema_migrations : 42501');

-- Règle explicite : une règle écrite pour authenticated est la seule porte
CREATE POLICY zz_lecture ON app.zz_proprio FOR SELECT TO authenticated USING (id = 1);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM set_config('zz.auth_r', (SELECT count(*)::text FROM app.zz_proprio), true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.auth_r'), '1', 'avec une règle explicite, authenticated voit exactement les lignes admises');

-- Le garde ne se laisse pas contourner par le propriétaire
SET LOCAL ROLE tenga_owner;
DO $$ BEGIN
  ALTER TABLE app.zz_proprio DISABLE ROW LEVEL SECURITY;
  PERFORM set_config('zz.proprio_d', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.proprio_d', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.proprio_d'), '42501', 'tenga_owner ne peut pas désactiver la RLS de ses tables (garde)');

-- Le propriétaire ne peut ni créer d'extension ni déclarer de rôle
SET LOCAL ROLE tenga_owner;
DO $$ BEGIN
  CREATE ROLE zz_role_interdit;
  PERFORM set_config('zz.role', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.role', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.role'), '42501', 'tenga_owner ne peut pas créer de rôle');

SELECT * FROM finish();
