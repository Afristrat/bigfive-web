-- migrate:superuser
-- 0001_fondations : socle de sécurité de l'instance Tenga (lot 0).
--
-- Contenu : rôle propriétaire tenga_owner, schémas app (exposé), private (non
-- exposé), tenga_garde et tests, retrait des droits par défaut du gabarit
-- Supabase, extensions pg_cron et pgTAP, réglages de conservation, garde-fou
-- « aucune table sans RLS, aucune vue ni fonction dangereuse dans app ».
-- Aucune table métier ici : elles arrivent avec le lot 1.
--
-- Exception documentée (première ligne ci-dessus) : cette migration tourne en
-- supabase_admin, seul superutilisateur de l'image, car CREATE ROLE,
-- CREATE EXTENSION et CREATE EVENT TRIGGER l'exigent. Les migrations
-- suivantes tournent sous SET LOCAL ROLE tenga_owner (imposé par migrate.sh).
-- La création des réglages (section 8) bascule elle-même sous tenga_owner.
--
-- Écrite pour être rejouable : schémas, rôle, extensions, droits et réglages
-- tolèrent un état déjà en place (les schémas app et private peuvent
-- préexister, créés à l'initialisation par compose/db/schemas.sql).

-- 1. Rôle propriétaire -----------------------------------------------------
-- Propriétaire de tout ce qui vit dans app et private. Ni superutilisateur ni
-- BYPASSRLS ni connexion, et sans héritage : la RLS forcée s'applique à lui
-- comme à n'importe quel rôle (il ne lit une table que si une règle le permet).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tenga_owner') THEN
    CREATE ROLE tenga_owner NOLOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;

-- 2. Schémas ---------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS app;          -- seul schéma exposé par PostgREST
CREATE SCHEMA IF NOT EXISTS private;      -- fonctions d'aide, réglages, administrateurs
CREATE SCHEMA IF NOT EXISTS tenga_garde;  -- fonction du déclencheur d'événement (propriétaire : superutilisateur)
CREATE SCHEMA IF NOT EXISTS tests;        -- pgTAP : jamais exposé, jamais utilisable par l'API

ALTER SCHEMA app OWNER TO tenga_owner;
ALTER SCHEMA private OWNER TO tenga_owner;

-- La table de suivi de migrate.sh naît avant cette migration, en supabase_admin.
ALTER TABLE IF EXISTS private.schema_migrations OWNER TO tenga_owner;

-- Les migrations ultérieures (sous tenga_owner) peuvent utiliser pgcrypto, etc.
GRANT USAGE ON SCHEMA extensions TO tenga_owner;

-- 3. Extensions ------------------------------------------------------------

-- pg_cron : purges quotidiennes (cron.database_name = postgres sur l'instance).
CREATE EXTENSION IF NOT EXISTS pg_cron;
-- pgTAP dans un schéma dédié : ses fonctions n'apparaissent ni dans app ni
-- dans public, et aucun rôle de l'API n'a le droit d'usage sur ce schéma.
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA tests;

-- 4. Droits sur les schémas ------------------------------------------------

REVOKE ALL ON SCHEMA app, private, tenga_garde, tests, cron FROM PUBLIC, anon, authenticated, service_role;
-- Le rôle connecté et le rôle de service doivent pouvoir « entrer » dans app ;
-- les droits sur chaque objet seront accordés explicitement, table par table.
-- L'anonyme n'a aucun droit sur app : PostgREST lui répondra 42501.
GRANT USAGE ON SCHEMA app TO authenticated, service_role;
-- Plus personne ne crée d'objet dans public ni dans extensions via l'API.
REVOKE CREATE ON SCHEMA public, extensions FROM PUBLIC, anon, authenticated, service_role;

-- 5. Droits sur les objets existants ---------------------------------------

REVOKE ALL ON ALL TABLES    IN SCHEMA app, private, public, cron FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA app, private, public, cron FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app, private, public, cron FROM PUBLIC, anon, authenticated, service_role;

-- 6. Droits par défaut -----------------------------------------------------
-- Le gabarit accorde à anon, authenticated et service_role tous les droits sur
-- chaque nouvelle table, séquence et fonction de public (rôles postgres et
-- supabase_admin, constaté par \ddp). On retire ces octrois pour les trois
-- rôles qui créent des objets, dans app, private et public, puis globalement
-- (défensif : aucun octroi implicite ne peut subsister, quel que soit le schéma).
DO $$
DECLARE
  v_role   text;
  v_schema text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['postgres', 'supabase_admin', 'tenga_owner'] LOOP
    FOREACH v_schema IN ARRAY ARRAY['app', 'private', 'public'] LOOP
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON TABLES FROM anon, authenticated, service_role', v_role, v_schema);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role', v_role, v_schema);
      EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I IN SCHEMA %I REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role', v_role, v_schema);
    END LOOP;
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON TABLES FROM anon, authenticated, service_role', v_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON SEQUENCES FROM anon, authenticated, service_role', v_role);
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE ALL ON FUNCTIONS FROM anon, authenticated, service_role', v_role);
    -- Postgres accorde EXECUTE à PUBLIC sur toute nouvelle fonction : on le
    -- retire globalement (une fonction n'est appelable que sur octroi explicite).
    EXECUTE format('ALTER DEFAULT PRIVILEGES FOR ROLE %I REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC', v_role);
  END LOOP;
END
$$;

-- 7. Garde-fou DDL ----------------------------------------------------------
-- Un déclencheur d'événement (ddl_command_end) sur les schémas app et private :
--  - table, table partitionnée, partitions : RLS activée ET forcée. À la
--    création, la base l'active toute seule ; ensuite (ALTER TABLE, SET SCHEMA,
--    ATTACH PARTITION) toute non-conformité est refusée ;
--  - vue : refusée sans security_invoker = true (sinon elle contourne la RLS) ;
--  - vue matérialisée et table étrangère : refusées dans app ;
--  - fonction ou procédure SECURITY DEFINER : refusée sans search_path épinglé ;
--  - extension : refusée si elle s'installe dans app ou private.
-- Aucun drapeau de session : l'état réel du catalogue décide. La correction
-- automatique est un seul ALTER TABLE (ENABLE + FORCE), donc le ALTER TABLE
-- imbriqué que cela redéclenche trouve une table déjà conforme et ne boucle pas.
-- Limite connue : un superutilisateur peut désactiver ou supprimer ce
-- déclencheur (ALTER/DROP EVENT TRIGGER) ; les tests SQL le détectent.
CREATE OR REPLACE FUNCTION tenga_garde.verifier_ddl()
RETURNS event_trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_cmd      record;
  v_rel      record;
  v_creation boolean;
  v_relkind  "char";
BEGIN
  FOR v_cmd IN
    SELECT command_tag, classid, objid, schema_name, object_identity
    FROM pg_catalog.pg_event_trigger_ddl_commands()
  LOOP
    v_creation := v_cmd.command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO');

    IF v_cmd.classid = 'pg_catalog.pg_extension'::pg_catalog.regclass THEN
      IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_extension e
        JOIN pg_catalog.pg_namespace n ON n.oid = e.extnamespace
        WHERE e.oid = v_cmd.objid AND n.nspname IN ('app', 'private')
      ) THEN
        RAISE EXCEPTION 'Extension interdite dans les schémas app et private : %', v_cmd.object_identity
          USING ERRCODE = 'insufficient_privilege';
      END IF;

    ELSIF v_cmd.classid = 'pg_catalog.pg_class'::pg_catalog.regclass AND v_cmd.schema_name IN ('app', 'private') THEN
      SELECT c.relkind INTO v_relkind FROM pg_catalog.pg_class c WHERE c.oid = v_cmd.objid;

      IF v_relkind IN ('r', 'p') THEN
        -- La table elle-même et, si elle est partitionnée, toutes ses partitions
        -- (y compris une partition rattachée depuis un autre schéma).
        FOR v_rel IN
          SELECT c.oid, c.relrowsecurity, c.relforcerowsecurity,
                 pg_catalog.format('%I.%I', n.nspname, c.relname) AS nom,
                 n.nspname IN ('app', 'private') AS dans_schema_garde
          FROM pg_catalog.pg_class c
          JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
          WHERE c.oid = v_cmd.objid
             OR c.oid IN (SELECT t.relid FROM pg_catalog.pg_partition_tree(v_cmd.objid) t)
        LOOP
          IF v_rel.relrowsecurity AND v_rel.relforcerowsecurity THEN
            CONTINUE;
          END IF;
          IF v_creation AND v_rel.dans_schema_garde THEN
            EXECUTE pg_catalog.format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY', v_rel.nom);
          ELSE
            RAISE EXCEPTION 'RLS obligatoire : la table % doit garder la sécurité par ligne activée et forcée', v_rel.nom
              USING ERRCODE = 'insufficient_privilege',
                    HINT = 'ALTER TABLE ... ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY.';
          END IF;
        END LOOP;

      ELSIF v_relkind = 'v' THEN
        IF NOT EXISTS (
          SELECT 1 FROM pg_catalog.pg_class c, LATERAL pg_catalog.pg_options_to_table(c.reloptions) o
          WHERE c.oid = v_cmd.objid
            AND o.option_name = 'security_invoker'
            AND pg_catalog.lower(o.option_value) IN ('true', 'on', 'yes', '1', 't')
        ) THEN
          RAISE EXCEPTION 'Vue interdite sans security_invoker : la vue % doit être définie WITH (security_invoker = true)', v_cmd.object_identity
            USING ERRCODE = 'insufficient_privilege';
        END IF;

      ELSIF v_relkind = 'm' AND v_cmd.schema_name = 'app' THEN
        RAISE EXCEPTION 'Vue matérialisée interdite dans app : %', v_cmd.object_identity
          USING ERRCODE = 'insufficient_privilege';

      ELSIF v_relkind = 'f' AND v_cmd.schema_name = 'app' THEN
        RAISE EXCEPTION 'Table étrangère interdite dans app : %', v_cmd.object_identity
          USING ERRCODE = 'insufficient_privilege';
      END IF;

    ELSIF v_cmd.classid = 'pg_catalog.pg_proc'::pg_catalog.regclass AND v_cmd.schema_name IN ('app', 'private') THEN
      IF EXISTS (
        SELECT 1 FROM pg_catalog.pg_proc p
        WHERE p.oid = v_cmd.objid
          AND p.prosecdef
          AND NOT EXISTS (
            SELECT 1 FROM pg_catalog.unnest(COALESCE(p.proconfig, '{}'::text[])) AS c
            WHERE c LIKE 'search_path=%'
          )
      ) THEN
        RAISE EXCEPTION 'Fonction SECURITY DEFINER interdite sans search_path épinglé : %', v_cmd.object_identity
          USING ERRCODE = 'insufficient_privilege',
                HINT = 'CREATE FUNCTION ... SECURITY DEFINER SET search_path = '''' ...';
      END IF;
    END IF;
  END LOOP;
END
$$;

REVOKE ALL ON FUNCTION tenga_garde.verifier_ddl() FROM PUBLIC;

DROP EVENT TRIGGER IF EXISTS garde_ddl_tenga;
DROP EVENT TRIGGER IF EXISTS garde_rls_tables;
CREATE EVENT TRIGGER garde_ddl_tenga
  ON ddl_command_end
  WHEN TAG IN (
    'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE',
    'CREATE VIEW', 'ALTER VIEW',
    'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW',
    'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE',
    'CREATE FUNCTION', 'ALTER FUNCTION', 'CREATE PROCEDURE', 'ALTER PROCEDURE',
    'CREATE EXTENSION'
  )
  EXECUTE FUNCTION tenga_garde.verifier_ddl();

-- Mise en conformité des tables déjà présentes (schema_migrations, créée par
-- migrate.sh avant le premier passage du garde).
DO $$
DECLARE
  v_table regclass;
BEGIN
  FOR v_table IN
    SELECT c.oid::regclass
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('app', 'private')
      AND c.relkind IN ('r', 'p')
      AND NOT (c.relrowsecurity AND c.relforcerowsecurity)
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY', v_table);
  END LOOP;
END
$$;

-- 8. Réglages de conservation (sous tenga_owner) ---------------------------
-- Dans private et non dans app : seules les fonctions de purge et
-- d'administration les lisent, aucun rôle de l'API n'a de raison d'y accéder
-- directement (une valeur utile à l'interface passera par une fonction
-- contrôlée). Une ligne unique, des colonnes typées et bornées : une valeur
-- absurde est refusée par la base, ce qu'une table clé/valeur ne ferait pas.
SET LOCAL ROLE tenga_owner;

CREATE TABLE IF NOT EXISTS private.settings (
  singleton                       boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  conservation_resultats_mois     integer NOT NULL DEFAULT 36 CHECK (conservation_resultats_mois     BETWEEN 1 AND 120),
  conservation_invitations_jours  integer NOT NULL DEFAULT 14 CHECK (conservation_invitations_jours  BETWEEN 1 AND 90),
  conservation_tentatives_jours   integer NOT NULL DEFAULT 30 CHECK (conservation_tentatives_jours   BETWEEN 1 AND 365),
  conservation_sessions_jours     integer NOT NULL DEFAULT 30 CHECK (conservation_sessions_jours     BETWEEN 1 AND 365),
  conservation_journal_mois       integer NOT NULL DEFAULT 12 CHECK (conservation_journal_mois       BETWEEN 1 AND 60),
  conservation_comptes_vides_mois integer NOT NULL DEFAULT 12 CHECK (conservation_comptes_vides_mois BETWEEN 1 AND 60),
  -- Le CHECK refuse toute valeur inférieure à 5. Relever le seuil est permis ;
  -- l'abaisser sous 5 exige une migration qui modifie cette contrainte.
  seuil_anonymat                  integer NOT NULL DEFAULT 5  CHECK (seuil_anonymat BETWEEN 5 AND 100)
);

COMMENT ON TABLE private.settings IS
  'Réglages de conservation et seuil d''anonymat (ligne unique). Lue par les purges pg_cron et les fonctions d''agrégation.';

-- RLS forcée : le propriétaire lui-même n'a accès que par ces règles.
DROP POLICY IF EXISTS settings_lecture ON private.settings;
CREATE POLICY settings_lecture ON private.settings
  FOR SELECT TO tenga_owner USING (true);
DROP POLICY IF EXISTS settings_modification ON private.settings;
CREATE POLICY settings_modification ON private.settings
  FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

-- La ligne unique ne se supprime ni ne se vide, même par un superutilisateur.
CREATE OR REPLACE FUNCTION private.refuser_suppression_reglages()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Suppression interdite dans private.settings : la ligne unique se modifie, elle ne se supprime pas'
    USING ERRCODE = 'restrict_violation';
END
$$;

DROP TRIGGER IF EXISTS settings_sans_suppression ON private.settings;
CREATE TRIGGER settings_sans_suppression
  BEFORE DELETE ON private.settings
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_suppression_reglages();
DROP TRIGGER IF EXISTS settings_sans_vidage ON private.settings;
CREATE TRIGGER settings_sans_vidage
  BEFORE TRUNCATE ON private.settings
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_suppression_reglages();

RESET ROLE;

-- La ligne initiale s'insère en supabase_admin (la RLS forcée n'offre à
-- tenga_owner aucune règle d'insertion : la ligne unique n'est jamais créée par l'API).
INSERT INTO private.settings (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING;
