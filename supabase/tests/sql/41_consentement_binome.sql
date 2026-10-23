-- Migration 0021 (étape C2a, écart X8, décision D2) : consentement du binôme.
-- app.binomes (RLS forcée, aucun droit de table pour l'API, écriture refusée à
-- l'API, consentement non réécrivable) et quatre fonctions contrôlées :
-- app.proposer_binome (consultant de l'organisation ou administrateur Tenga, deux
-- participations terminées de deux personnes différentes de la même organisation),
-- app.repondre_binome (titulaire d'une des deux participations ; refus ou retrait
-- définitif), app.mes_binomes (nom de l'autre personne tant que la proposition
-- n'est pas retirée), app.lire_binome (scores des deux participations, SEULEMENT
-- si les deux accords existent et si la proposition n'est pas retirée ; le
-- responsable, un autre participant et un consultant d'une autre organisation
-- sont refusés ; lecture journalisée ; facette O6 retirée de la ligne de l'autre),
-- et app.exporter_mes_donnees (droit d'accès) qui gagne la clé « binomes ».
-- Exécution à l'épreuve de déploiement (T10), jamais sur le poste ; épreuve en
-- transaction annulée : scripts/epreuve-consentement-binome.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(158);

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

-- Personnages (identifiants fixes) : pa et pb participants A (résultats), pc participant A
-- (résultat), pd participant A (en cours, sans résultat), ra responsable A, ca consultant A,
-- cx consultant B, qb participant B (résultat), ad administrateur Tenga, nx sans aucun rôle.
CREATE FUNCTION pg_temp.u_pa() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.u_pb() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.u_ra() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000003'::uuid $$;
CREATE FUNCTION pg_temp.u_ca() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000004'::uuid $$;
CREATE FUNCTION pg_temp.u_cx() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000005'::uuid $$;
CREATE FUNCTION pg_temp.u_pc() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000007'::uuid $$;
CREATE FUNCTION pg_temp.u_ad() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000008'::uuid $$;
CREATE FUNCTION pg_temp.u_pd() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-000000000009'::uuid $$;
CREATE FUNCTION pg_temp.u_nx() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-00000000000a'::uuid $$;
CREATE FUNCTION pg_temp.u_qb() RETURNS uuid LANGUAGE sql AS $$ SELECT 'a0000000-0000-4000-8000-00000000000b'::uuid $$;
-- Participations : d1 (pa, campagne a1), d2 (pb, a1), d3 (pc, a1), d4 (pa, a2), d5 (qb, organisation B),
-- d6 (pd, a1, en cours). d9 : identifiant forgé.
CREATE FUNCTION pg_temp.d1() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.d2() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.d3() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000003'::uuid $$;
CREATE FUNCTION pg_temp.d4() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000004'::uuid $$;
CREATE FUNCTION pg_temp.d5() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000005'::uuid $$;
CREATE FUNCTION pg_temp.d6() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-000000000006'::uuid $$;
CREATE FUNCTION pg_temp.d9() RETURNS uuid LANGUAGE sql AS $$ SELECT 'd0000000-0000-4000-8000-0000000000ff'::uuid $$;

-- Appels des quatre fonctions en tant que « p_uid » (p_expr : expression sélectionnée sur la ligne « x »).
CREATE FUNCTION pg_temp.prop(p_uid uuid, p_a uuid, p_b uuid, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.proposer_binome(%L, %L)::text', p_a, p_b))
$$;
CREATE FUNCTION pg_temp.rep(p_uid uuid, p_binome uuid, p_accord boolean, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.repondre_binome(%L, %L)::text', p_binome, p_accord))
$$;
CREATE FUNCTION pg_temp.lire(p_uid uuid, p_binome uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.lire_binome(%L) x', p_expr, p_binome))
$$;
CREATE FUNCTION pg_temp.mes(p_uid uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.mes_binomes() x', p_expr))
$$;
-- Une colonne de ma ligne pour un binôme donné.
CREATE FUNCTION pg_temp.col(p_uid uuid, p_binome uuid, p_col text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format('select x.%I::text from app.mes_binomes() x where x.binome_id = %L', p_col, p_binome))
$$;
-- Identifiant de la proposition en cours (bid) ou d'une proposition retirée (bidr) d'un couple.
CREATE FUNCTION pg_temp.bid(p_x uuid, p_y uuid) RETURNS uuid LANGUAGE sql AS $$
  SELECT b.id FROM app.binomes b
   WHERE b.participation_a = LEAST(p_x, p_y) AND b.participation_b = GREATEST(p_x, p_y) AND b.retire_le IS NULL
$$;
CREATE FUNCTION pg_temp.bidr(p_x uuid, p_y uuid) RETURNS uuid LANGUAGE sql AS $$
  SELECT b.id FROM app.binomes b
   WHERE b.participation_a = LEAST(p_x, p_y) AND b.participation_b = GREATEST(p_x, p_y) AND b.retire_le IS NOT NULL
   ORDER BY b.id LIMIT 1
$$;

CREATE FUNCTION pg_temp.refus_prop() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga'
$$;
CREATE FUNCTION pg_temp.refus_lire() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé aux deux personnes, au consultant affecté ou à un administrateur Tenga'
$$;
CREATE FUNCTION pg_temp.sans_accord() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:55000:Lecture impossible : le consentement des deux personnes est requis'
$$;
CREATE FUNCTION pg_temp.introuvable() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:P0002:Proposition introuvable'
$$;
CREATE FUNCTION pg_temp.definitif() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:55000:Proposition close : un refus ou un retrait est définitif'
$$;
CREATE FUNCTION pg_temp.inval() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:22023:Binôme invalide : deux participations terminées, de deux personnes différentes, de la même organisation'
$$;

-- Export de la personne (app.exporter_mes_donnees) sous une identité donnée.
CREATE FUNCTION pg_temp.exp(p_uid uuid, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, 'select app.exporter_mes_donnees()::text')
$$;

-- Scores de fixture : domaine O avec six facettes dont O6 = p_o6, domaine E.
CREATE FUNCTION pg_temp.sc(p_o6 integer) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1',
    'O', jsonb_build_object('score', 50 + p_o6, 'facettes',
         (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', CASE WHEN f = 6 THEN p_o6 ELSE 10 END))
            FROM generate_series(1, 6) f)),
    'E', jsonb_build_object('score', 50))
$$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test', '{"nom": "Alice"}'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test', '{"nom": "Bruno"}'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000005', 'cx@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000007', 'pc@example.test', '{"nom": "Camille"}'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000009', 'pd@example.test', '{}'),
  ('a0000000-0000-4000-8000-00000000000a', 'nx@example.test', '{}'),
  ('a0000000-0000-4000-8000-00000000000b', 'qb@example.test', '{}');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'consultant'),
  ('a0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A2', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Campagne B1', 'ouverte', now(), NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009', 'en_cours', now(), NULL);
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 3}', pg_temp.sc(11), 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '{"1": 2}', pg_temp.sc(7), 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', '{"1": 4}', pg_temp.sc(9), 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 5}', pg_temp.sc(5), 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', '{"1": 1}', pg_temp.sc(6), 'v1', 'c1');

-- ===== Garde : les données de ce fichier ont le sens attendu =====
SELECT is((SELECT count(*)::int FROM app.results), 5, 'fixture : cinq résultats (d1 à d5), d6 est en cours');
SELECT is((SELECT count(*)::int FROM app.binomes), 0, 'avant tout appel, aucune proposition de binôme');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action ~ '^binome\.'), 0, 'avant tout appel, aucune ligne de journal de binôme');

-- ===== Table : protection =====
SELECT ok((SELECT c.relrowsecurity AND c.relforcerowsecurity AND c.relowner = 'tenga_owner'::regrole AND c.relkind = 'r'
             FROM pg_class c WHERE c.oid = 'app.binomes'::regclass),
  'app.binomes : table ordinaire, RLS activée et forcée, propriétaire tenga_owner');
SELECT is((SELECT count(*)::int FROM pg_class c WHERE c.oid = 'app.binomes'::regclass
             AND (has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                  OR has_table_privilege('anon', c.oid, 'DELETE') OR has_table_privilege('anon', c.oid, 'TRUNCATE')
                  OR has_table_privilege('anon', c.oid, 'TRIGGER'))),
  0, 'l''anonyme n''a aucun droit sur app.binomes');
SELECT is((SELECT count(*)::int FROM pg_class c WHERE c.oid = 'app.binomes'::regclass
             AND (has_any_column_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                  OR has_table_privilege('service_role', c.oid, 'DELETE') OR has_table_privilege('service_role', c.oid, 'TRUNCATE')
                  OR has_table_privilege('service_role', c.oid, 'TRIGGER'))),
  0, 'service_role (qui contourne la RLS) n''a aucun droit sur app.binomes');
SELECT is((SELECT count(*)::int FROM pg_class c WHERE c.oid = 'app.binomes'::regclass
             AND (has_any_column_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                  OR has_table_privilege('authenticated', c.oid, 'DELETE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
                  OR has_table_privilege('authenticated', c.oid, 'TRIGGER'))),
  0, 'le rôle connecté n''a aucun droit sur app.binomes, pas même en lecture : tout passe par les fonctions');
SELECT is(
  (SELECT string_agg(policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY policyname)
     FROM pg_policies WHERE schemaname = 'app' AND tablename = 'binomes'),
  $f$binomes_insertion_owner|INSERT|tenga_owner
binomes_lecture_owner|SELECT|tenga_owner
binomes_modification_owner|UPDATE|tenga_owner$f$,
  'liste figée des règles de app.binomes : tenga_owner seul, ni suppression ni règle pour le rôle connecté');
SELECT is((SELECT count(*)::int FROM pg_trigger t
            WHERE t.tgrelid = 'app.binomes'::regclass AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
              AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) <> 0) OR (t.tgtype & 32) = 32)),
  2, 'refuser_ecriture_api est actif par ligne (INSERT, UPDATE, DELETE) et sur TRUNCATE (verrou 3)');
SELECT is((SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
            WHERE t.tgrelid = 'app.binomes'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgname !~ '_sans_(ecriture|vidage)_api$'),
  'binomes_transition', 'un seul autre déclencheur actif : le verrou de transition du consentement');
SELECT is(pg_temp.comme(pg_temp.u_pa(), 'authenticated', 'select count(*) from app.binomes'),
  'ERR:42501:permission denied for table binomes', 'un participant ne lit pas la table directement');
SELECT is(pg_temp.comme(pg_temp.u_ca(), 'authenticated', 'select count(*) from app.binomes'),
  'ERR:42501:permission denied for table binomes', 'le consultant ne lit pas la table directement');
SELECT is(pg_temp.comme(pg_temp.u_pa(), 'service_role', 'select count(*) from app.binomes'),
  'ERR:42501:permission denied for table binomes', 'service_role ne lit pas la table directement');
SELECT is(pg_temp.comme(pg_temp.u_pa(), 'anon', 'select count(*) from app.binomes'),
  'ERR:42501:permission denied for schema app', 'l''anonyme ne lit pas la table directement');
SELECT is(pg_temp.comme(pg_temp.u_ca(), 'authenticated',
    'insert into app.binomes (organization_id, participation_a, participation_b) values (''a1000000-0000-4000-8000-00000000000a'', ''d0000000-0000-4000-8000-000000000001'', ''d0000000-0000-4000-8000-000000000002'')'),
  'ERR:42501:permission denied for table binomes', 'le consultant n''écrit pas la table directement');

-- ===== Table : contraintes (écritures directes du superutilisateur) =====
SELECT throws_ok($$INSERT INTO app.binomes (organization_id, participation_a, participation_b)
  VALUES ('a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001')$$,
  '23514', NULL, 'un couple se range dans l''ordre croissant des participations (un couple ne s''écrit qu''une fois)');
SELECT throws_ok($$INSERT INTO app.binomes (organization_id, participation_a, participation_b)
  VALUES ('a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000005')$$,
  '23503', NULL, 'une participation d''une autre organisation est refusée par la clé étrangère composite');
SELECT throws_ok($$INSERT INTO app.binomes (organization_id, participation_a, participation_b)
  VALUES ('a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-0000000000ff')$$,
  '23503', NULL, 'une participation inexistante est refusée par la clé étrangère');

-- ===== Fonctions : définitions et droits =====
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'app' AND p.proname IN ('proposer_binome', 'repondre_binome', 'mes_binomes', 'lire_binome')),
  4, 'quatre fonctions, une seule signature chacune');
SELECT is(
  (SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                     || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                     || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
                     E'\n' ORDER BY p.proname)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND p.proname IN ('proposer_binome', 'repondre_binome', 'mes_binomes', 'lire_binome')),
  $f$lire_binome|true|v|true|tenga_owner|false|false|false|true
mes_binomes|true|s|true|tenga_owner|false|false|false|true
proposer_binome|true|v|true|tenga_owner|false|false|false|true
repondre_binome|true|v|true|tenga_owner|false|false|false|true$f$,
  'SECURITY DEFINER, volatilité (STABLE pour mes_binomes seule), search_path vide, tenga_owner, authenticated seul');
SELECT is(pg_get_function_result('app.lire_binome(uuid)'::regprocedure),
  'TABLE(participation_id uuid, cote text, est_la_mienne boolean, scores jsonb, questionnaire_version text, calcul_version text, soumis_le timestamp with time zone)',
  'app.lire_binome : scores, versions et date, jamais les réponses');
SELECT is(pg_get_function_result('app.mes_binomes()'::regprocedure),
  'TABLE(binome_id uuid, organisation_nom text, ma_participation uuid, propose_le timestamp with time zone, statut text, mon_accord_le timestamp with time zone, autre_nom text)',
  'app.mes_binomes : aucune adresse, aucun identifiant de compte');
SELECT is(pg_get_function_result('app.proposer_binome(uuid, uuid)'::regprocedure) || '|' || pg_get_function_result('app.repondre_binome(uuid, boolean)'::regprocedure),
  'uuid|text', 'app.proposer_binome renvoie l''identifiant, app.repondre_binome le statut');

-- ===== Proposer : consultant de l'organisation et administrateur Tenga =====
SELECT matches(pg_temp.prop(pg_temp.u_ca(), pg_temp.d2(), pg_temp.d1()),
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'le consultant de A propose un binôme (d2, d1) et reçoit son identifiant');
SELECT is((SELECT b.participation_a::text || ',' || b.participation_b::text || ',' || b.organization_id::text || ',' || b.propose_par::text
             FROM app.binomes b WHERE b.id = pg_temp.bid(pg_temp.d1(), pg_temp.d2())),
  'd0000000-0000-4000-8000-000000000001,d0000000-0000-4000-8000-000000000002,a1000000-0000-4000-8000-00000000000a,a0000000-0000-4000-8000-000000000004',
  'la proposition est rangée dans l''ordre croissant, avec l''organisation et le consultant qui a proposé');
SELECT ok((SELECT b.accord_a_le IS NULL AND b.accord_b_le IS NULL AND b.retire_le IS NULL FROM app.binomes b WHERE b.id = pg_temp.bid(pg_temp.d1(), pg_temp.d2())),
  'à la proposition, aucun accord et aucun retrait');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d2()),
  'ERR:23505:Une proposition est déjà en cours pour ces deux personnes', 'une seule proposition en cours par couple (même sens)');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d2(), pg_temp.d1()),
  'ERR:23505:Une proposition est déjà en cours pour ces deux personnes', 'une seule proposition en cours par couple (sens inverse)');
SELECT matches(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d3()),
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'le consultant de A propose un second binôme (d1, d3)');
SELECT matches(pg_temp.prop(pg_temp.u_ad(), pg_temp.d3(), pg_temp.d2()),
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'l''administrateur Tenga propose un binôme (d3, d2) dans une organisation dont il n''est pas membre');
SELECT is((SELECT count(*)::int FROM app.binomes), 3, 'trois propositions en tout : les refus et le doublon n''ont rien écrit');

-- ===== Proposer : refus =====
SELECT is(pg_temp.prop(pg_temp.u_ra(), pg_temp.d1(), pg_temp.d2()), pg_temp.refus_prop(), 'le responsable de l''organisation ne propose pas');
SELECT is(pg_temp.prop(pg_temp.u_pa(), pg_temp.d1(), pg_temp.d2()), pg_temp.refus_prop(), 'un participant ne propose pas');
SELECT is(pg_temp.prop(pg_temp.u_nx(), pg_temp.d1(), pg_temp.d2()), pg_temp.refus_prop(), 'une personne sans aucun rôle ne propose pas');
SELECT is(pg_temp.prop(pg_temp.u_cx(), pg_temp.d1(), pg_temp.d2()), pg_temp.refus_prop(), 'un consultant d''une autre organisation ne propose pas');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d9(), pg_temp.d1()), pg_temp.refus_prop(), 'participation inexistante : même refus que pour une participation interdite (consultant)');
SELECT is(pg_temp.prop(pg_temp.u_ad(), pg_temp.d9(), pg_temp.d1()), pg_temp.refus_prop(), 'participation inexistante : même refus (administrateur Tenga)');
SELECT is(pg_temp.prop(pg_temp.u_ca(), NULL, pg_temp.d1()), pg_temp.refus_prop(), 'première participation nulle : refusée');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d5()), pg_temp.inval(), 'deux organisations (consultant) : refusé');
SELECT is(pg_temp.prop(pg_temp.u_ad(), pg_temp.d1(), pg_temp.d5()), pg_temp.inval(), 'deux organisations (administrateur Tenga) : refusé');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d1()), pg_temp.inval(), 'la même participation deux fois : refusé');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d4()), pg_temp.inval(), 'deux participations de la même personne : refusé');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d6()), pg_temp.inval(), 'une participation non terminée : refusée');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), NULL), pg_temp.inval(), 'seconde participation nulle : refusée');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d9()), pg_temp.inval(), 'seconde participation inexistante : refusée, même message');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d2(), 'anon'), 'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas la fonction');
SELECT is(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d2(), 'service_role'), 'ERR:42501:permission denied for function proposer_binome', 'service_role n''exécute pas la fonction');
SELECT is(pg_temp.prop(NULL, pg_temp.d1(), pg_temp.d2()), 'ERR:42501:Connexion requise', 'sans identité : refusé');
SELECT is((SELECT count(*)::int FROM app.binomes), 3, 'aucun refus n''a écrit de proposition');

-- ===== Proposer : journal =====
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.proposer'), 3, 'trois propositions, trois lignes de journal, aucune pour un refus');
SELECT is((SELECT string_agg(DISTINCT ressource_type || '|' || organization_id::text, ',') FROM private.audit_log WHERE action = 'binome.proposer'),
  'binome|a1000000-0000-4000-8000-00000000000a', 'la ligne de journal porte le type binome et l''organisation du binôme');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.proposer' AND acteur = pg_temp.u_ad()
             AND ressource_id = pg_temp.bid(pg_temp.d2(), pg_temp.d3())),
  1, 'la proposition de l''administrateur Tenga est inscrite sous son identité');

-- ===== Mes propositions =====
SELECT is(pg_temp.mes(pg_temp.u_pa()), '2', 'pa voit ses deux propositions (d1-d2 et d1-d3)');
SELECT is(pg_temp.mes(pg_temp.u_pb()), '2', 'pb voit ses deux propositions (d1-d2 et d2-d3)');
SELECT is(pg_temp.mes(pg_temp.u_pc()), '2', 'pc voit ses deux propositions (d1-d3 et d2-d3)');
SELECT is((SELECT string_agg(pg_temp.mes(u), ',') FROM unnest(ARRAY[pg_temp.u_pd(), pg_temp.u_ra(), pg_temp.u_ca(), pg_temp.u_cx(), pg_temp.u_nx(), pg_temp.u_qb(), pg_temp.u_ad()]) u),
  '0,0,0,0,0,0,0', 'ni la personne sans binôme, ni le responsable, ni le consultant, ni l''autre organisation, ni l''administrateur ne voient de proposition');
SELECT is(pg_temp.mes(pg_temp.u_pa(), 'string_agg(x.autre_nom, '','' order by x.autre_nom)'), 'Bruno,Camille',
  'pa voit le nom de profil de l''autre personne de chaque proposition (défaut non validé : consentement éclairé)');
SELECT is(pg_temp.mes(pg_temp.u_pb(), 'string_agg(x.autre_nom, '','' order by x.autre_nom)'), 'Alice,Camille', 'pb voit les noms d''Alice et de Camille');
SELECT is(pg_temp.mes(pg_temp.u_pa(), 'string_agg(distinct x.statut, '','')'), 'en_attente', 'toutes les propositions sont en attente');
SELECT is(pg_temp.mes(pg_temp.u_pa(), '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)'),
  'autre_nom,binome_id,ma_participation,mon_accord_le,organisation_nom,propose_le,statut', 'exactement sept colonnes');
SELECT is(pg_temp.mes(pg_temp.u_pa(), 'count(*) filter (where to_jsonb(x)::text ~ ''(a0000000-0000-4000-8000|@|example)'')'),
  '0', 'aucune adresse ni identifiant de compte dans la liste');
SELECT is(pg_temp.mes(pg_temp.u_pa(), 'count(*)', 'anon'), 'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas mes_binomes');
SELECT is(pg_temp.mes(pg_temp.u_pa(), 'count(*)', 'service_role'), 'ERR:42501:permission denied for function mes_binomes', 'service_role n''exécute pas mes_binomes');
SELECT is(pg_temp.mes(NULL), 'ERR:42501:Connexion requise', 'mes_binomes sans identité : refusé');

-- ===== Répondre : refus et entrées invalides =====
SELECT is(pg_temp.rep(pg_temp.u_ra(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), pg_temp.introuvable(), 'le responsable ne répond pas à la place des personnes');
SELECT is(pg_temp.rep(pg_temp.u_ca(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), pg_temp.introuvable(), 'le consultant ne répond pas à la place des personnes');
SELECT is(pg_temp.rep(pg_temp.u_ad(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), pg_temp.introuvable(), 'l''administrateur Tenga ne répond pas à la place des personnes');
SELECT is(pg_temp.rep(pg_temp.u_pc(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), pg_temp.introuvable(), 'une troisième personne ne répond pas à une proposition qui ne la concerne pas');
SELECT is(pg_temp.rep(pg_temp.u_pa(), 'b0000000-0000-4000-8000-0000000000ff', true), pg_temp.introuvable(), 'proposition inexistante : même message');
SELECT is(pg_temp.rep(pg_temp.u_pa(), NULL, true), pg_temp.introuvable(), 'identifiant nul : même message');
SELECT is(pg_temp.rep(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), NULL), 'ERR:22023:Réponse invalide : accord ou refus attendu', 'réponse nulle : refusée');
SELECT is(pg_temp.rep(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true, 'anon'), 'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas repondre_binome');
SELECT is(pg_temp.rep(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true, 'service_role'), 'ERR:42501:permission denied for function repondre_binome', 'service_role n''exécute pas repondre_binome');
SELECT is(pg_temp.rep(NULL, pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), 'ERR:42501:Connexion requise', 'repondre_binome sans identité : refusé');
SELECT is((SELECT count(*)::int FROM app.binomes WHERE accord_a_le IS NOT NULL OR accord_b_le IS NOT NULL OR retire_le IS NOT NULL), 0,
  'aucun refus n''a écrit d''accord ni de retrait');

-- ===== Un seul accord : aucune lecture =====
SELECT is(pg_temp.rep(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), 'en_attente', 'pa accepte : la proposition reste en attente de pb');
SELECT is(pg_temp.rep(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), 'en_attente', 'pa accepte une seconde fois : sans effet');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.accepter' AND acteur = pg_temp.u_pa()
             AND ressource_id = pg_temp.bid(pg_temp.d1(), pg_temp.d2())),
  1, 'un accord rejoué n''inscrit qu''une ligne de journal');
SELECT is(pg_temp.col(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'statut'), 'en_attente', 'pa lit le statut « en_attente »');
SELECT ok(pg_temp.col(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'mon_accord_le') IS NOT NULL, 'pa voit la date de son propre accord');
SELECT is(pg_temp.col(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'mon_accord_le'), NULL::text,
  'pb ne voit pas l''accord de pa comme le sien : il ne lit que son propre accord');
SELECT is(pg_temp.col(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'statut'), 'en_attente', 'pb lit le statut « en_attente » sans savoir qui a répondu');
SELECT is((SELECT string_agg(DISTINCT pg_temp.lire(u, pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '|')
             FROM unnest(ARRAY[pg_temp.u_pa(), pg_temp.u_pb(), pg_temp.u_ca(), pg_temp.u_ad()]) u),
  pg_temp.sans_accord(), 'un seul accord : aucune lecture, ni pour la personne qui a accepté, ni pour l''autre, ni pour le consultant, ni pour l''administrateur');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.lire'), 0, 'un refus de lecture n''inscrit rien au journal');

-- ===== Deux accords : lecture par A, B, le consultant et l'administrateur =====
SELECT is(pg_temp.rep(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), true), 'actif', 'pb accepte à son tour : le binôme est actif');
SELECT is(pg_temp.col(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'statut'), 'actif', 'pa lit le statut « actif »');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'pa lit les deux lignes');
SELECT is(pg_temp.lire(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'pb lit les deux lignes');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'le consultant de A lit les deux lignes');
SELECT is(pg_temp.lire(pg_temp.u_ad(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'l''administrateur Tenga lit les deux lignes');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)'),
  'calcul_version,cote,est_la_mienne,participation_id,questionnaire_version,scores,soumis_le', 'sept colonnes : scores et versions, jamais les réponses');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(x.participation_id::text, '','' order by x.cote)'),
  'd0000000-0000-4000-8000-000000000001,d0000000-0000-4000-8000-000000000002', 'les deux participations du binôme, dans l''ordre a puis b');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(x.est_la_mienne::text, '','' order by x.cote)'),
  'true,false', 'pa : la première ligne est la sienne');
SELECT is(pg_temp.lire(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(x.est_la_mienne::text, '','' order by x.cote)'),
  'false,true', 'pb : la seconde ligne est la sienne');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(x.est_la_mienne::text, '','' order by x.cote)'),
  'false,false', 'le consultant : aucune ligne n''est la sienne');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(coalesce(x.scores #>> ''{O,facettes,6,score}'', ''absent''), '','' order by x.cote)'),
  '11,absent', 'pa voit son propre O6 (11) et pas celui de pb (défaut non validé)');
SELECT is(pg_temp.lire(pg_temp.u_pb(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(coalesce(x.scores #>> ''{O,facettes,6,score}'', ''absent''), '','' order by x.cote)'),
  'absent,7', 'pb voit son propre O6 (7) et pas celui de pa');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(coalesce(x.scores #>> ''{O,facettes,6,score}'', ''absent''), '','' order by x.cote)'),
  'absent,absent', 'le consultant ne voit l''O6 d''aucune des deux personnes (défaut non validé)');
SELECT is(pg_temp.lire(pg_temp.u_ad(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'string_agg(coalesce(x.scores #>> ''{O,facettes,6,score}'', ''absent''), '','' order by x.cote)'),
  'absent,absent', 'l''administrateur Tenga ne voit l''O6 d''aucune des deux personnes');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()),
    'count(*) filter (where x.scores #>> ''{O,facettes,5,score}'' = ''10'' and x.scores #>> ''{E,score}'' = ''50'' and x.scores #>> ''{O,score}'' is not null)'),
  '2', 'seule la facette O6 est retirée : les autres facettes et les autres domaines restent');

-- ===== Lecture : refus =====
SELECT is(pg_temp.lire(pg_temp.u_ra(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), pg_temp.refus_lire(), 'le responsable de l''organisation ne lit pas le binôme, même avec deux accords');
SELECT is((SELECT string_agg(DISTINCT pg_temp.lire(u, pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '|')
             FROM unnest(ARRAY[pg_temp.u_pc(), pg_temp.u_pd(), pg_temp.u_nx(), pg_temp.u_cx(), pg_temp.u_qb()]) u),
  pg_temp.refus_lire(), 'un autre participant, une personne sans rôle, un consultant d''une autre organisation et un participant d''une autre organisation ne lisent pas');
SELECT is(pg_temp.lire(pg_temp.u_ca(), 'b0000000-0000-4000-8000-0000000000ff'), pg_temp.refus_lire(), 'binôme inexistant : même refus qu''un binôme interdit');
SELECT is(pg_temp.lire(pg_temp.u_ca(), NULL), pg_temp.refus_lire(), 'identifiant nul : refusé');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.d1()), pg_temp.refus_lire(), 'un identifiant de participation passé pour un binôme : refusé');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'count(*)', 'anon'), 'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas lire_binome');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2()), 'count(*)', 'service_role'), 'ERR:42501:permission denied for function lire_binome', 'service_role n''exécute pas lire_binome');
SELECT is(pg_temp.lire(NULL, pg_temp.bid(pg_temp.d1(), pg_temp.d2())), 'ERR:42501:Connexion requise', 'lire_binome sans identité : refusé');

-- ===== Lecture : journal =====
SELECT is((SELECT string_agg(DISTINCT acteur::text, ',' ORDER BY acteur::text) FROM private.audit_log WHERE action = 'binome.lire'),
  'a0000000-0000-4000-8000-000000000001,a0000000-0000-4000-8000-000000000002,a0000000-0000-4000-8000-000000000004,a0000000-0000-4000-8000-000000000008',
  'seules les lectures autorisées (pa, pb, consultant, administrateur) sont journalisées, jamais un refus');
SELECT is((SELECT string_agg(DISTINCT ressource_type || '|' || organization_id::text || '|' || ressource_id::text || '|' || quantite::text, ',')
             FROM private.audit_log WHERE action = 'binome.lire'),
  'binome|a1000000-0000-4000-8000-00000000000a|' || pg_temp.bid(pg_temp.d1(), pg_temp.d2())::text || '|2',
  'la ligne de journal porte le type binome, l''organisation, le binôme et la quantité 2');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l.action ~ '^binome\.' AND to_jsonb(l)::text ~ '@'), 0, 'aucune ligne de journal de binôme ne contient d''adresse');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.accepter'), 2, 'deux accords, deux lignes de journal');

-- ===== Refus d'une personne =====
SELECT is(pg_temp.rep(pg_temp.u_pc(), pg_temp.bid(pg_temp.d1(), pg_temp.d3()), false), 'retire', 'pc refuse la proposition d1-d3');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.refuser' AND acteur = pg_temp.u_pc()), 1, 'le refus est inscrit au journal (binome.refuser)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.retirer'), 0, 'un refus n''est pas un retrait : aucune ligne binome.retirer');
SELECT is(pg_temp.col(pg_temp.u_pa(), pg_temp.bidr(pg_temp.d1(), pg_temp.d3()), 'statut'), 'retire', 'pa voit la proposition refusée comme retirée');
SELECT is(pg_temp.col(pg_temp.u_pa(), pg_temp.bidr(pg_temp.d1(), pg_temp.d3()), 'autre_nom'), NULL::text, 'le nom de l''autre personne n''est plus montré une fois la proposition retirée');
SELECT is((SELECT string_agg(DISTINCT pg_temp.rep(u, pg_temp.bidr(pg_temp.d1(), pg_temp.d3()), true), '|')
             FROM unnest(ARRAY[pg_temp.u_pa(), pg_temp.u_pc()]) u),
  pg_temp.definitif(), 'une proposition refusée est définitive : nul ne peut plus l''accepter');
SELECT is((SELECT string_agg(DISTINCT pg_temp.rep(u, pg_temp.bidr(pg_temp.d1(), pg_temp.d3()), false), '|')
             FROM unnest(ARRAY[pg_temp.u_pa(), pg_temp.u_pc()]) u),
  pg_temp.definitif(), 'une proposition retirée ne se retire pas une seconde fois');
SELECT matches(pg_temp.prop(pg_temp.u_ca(), pg_temp.d1(), pg_temp.d3()),
  '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'après un refus, le consultant peut faire une nouvelle proposition pour le couple');
SELECT is((SELECT count(*)::int FROM app.binomes WHERE participation_a = pg_temp.d1() AND participation_b = pg_temp.d3()), 2,
  'l''ancienne proposition refusée reste, la nouvelle est ajoutée');
SELECT ok((SELECT b.accord_a_le IS NULL AND b.accord_b_le IS NULL AND b.retire_le IS NULL FROM app.binomes b WHERE b.id = pg_temp.bid(pg_temp.d1(), pg_temp.d3())),
  'la nouvelle proposition repart de zéro : aucun accord hérité');
SELECT throws_ok($$INSERT INTO app.binomes (organization_id, participation_a, participation_b)
  VALUES ('a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003')$$,
  '23505', NULL, 'la base elle-même refuse une seconde proposition en cours pour le même couple');

-- ===== Retrait après deux accords =====
SELECT is(pg_temp.rep(pg_temp.u_pb(), pg_temp.bid(pg_temp.d2(), pg_temp.d3()), true), 'en_attente', 'pb accepte la proposition d2-d3 de l''administrateur');
SELECT is(pg_temp.rep(pg_temp.u_pc(), pg_temp.bid(pg_temp.d2(), pg_temp.d3()), true), 'actif', 'pc accepte à son tour : binôme d2-d3 actif');
SELECT is(pg_temp.lire(pg_temp.u_ca(), pg_temp.bid(pg_temp.d2(), pg_temp.d3())), '2', 'le consultant lit le binôme d2-d3 tant qu''il est actif');
SELECT is(pg_temp.rep(pg_temp.u_pb(), pg_temp.bid(pg_temp.d2(), pg_temp.d3()), false), 'retire', 'pb retire son accord : la proposition est retirée');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.retirer' AND acteur = pg_temp.u_pb()), 1, 'le retrait est inscrit au journal (binome.retirer)');
SELECT is((SELECT string_agg(DISTINCT pg_temp.lire(u, pg_temp.bidr(pg_temp.d2(), pg_temp.d3())), '|')
             FROM unnest(ARRAY[pg_temp.u_pb(), pg_temp.u_pc(), pg_temp.u_ca(), pg_temp.u_ad()]) u),
  pg_temp.sans_accord(), 'après le retrait de pb : plus de lecture, ni pour pb, ni pour pc, ni pour le consultant, ni pour l''administrateur');
SELECT is(pg_temp.rep(pg_temp.u_pc(), pg_temp.bidr(pg_temp.d2(), pg_temp.d3()), true), pg_temp.definitif(), 'le retrait est définitif : pc ne peut plus accepter cette proposition');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'le retrait de d2-d3 ne touche pas le binôme d1-d2, toujours actif');

-- ===== Le consentement ne se réécrit pas =====
SELECT throws_ok($$UPDATE app.binomes SET accord_a_le = NULL
  WHERE participation_a = 'd0000000-0000-4000-8000-000000000001' AND participation_b = 'd0000000-0000-4000-8000-000000000002'$$,
  '55000', 'Un accord ne se modifie pas : il se retire', 'un accord donné ne s''efface pas par une écriture directe');
SELECT throws_ok($$UPDATE app.binomes SET retire_le = NULL
  WHERE participation_a = 'd0000000-0000-4000-8000-000000000002' AND participation_b = 'd0000000-0000-4000-8000-000000000003' AND retire_le IS NOT NULL$$,
  '55000', 'Proposition close : un refus ou un retrait est définitif', 'un retrait ne se défait pas par une écriture directe');
SELECT throws_ok($$UPDATE app.binomes SET participation_b = 'd0000000-0000-4000-8000-000000000003'
  WHERE participation_a = 'd0000000-0000-4000-8000-000000000001' AND participation_b = 'd0000000-0000-4000-8000-000000000002'$$,
  '55000', 'Une proposition de binôme ne change ni de personnes ni d''origine', 'les personnes d''une proposition ne changent pas');
SELECT throws_ok($$UPDATE app.binomes SET propose_par = 'a0000000-0000-4000-8000-000000000001'
  WHERE participation_a = 'd0000000-0000-4000-8000-000000000001' AND participation_b = 'd0000000-0000-4000-8000-000000000002'$$,
  '55000', 'Une proposition de binôme ne change ni de personnes ni d''origine', 'l''origine d''une proposition ne change pas (seul un effacement de compte la met à NULL)');
SELECT is(pg_temp.comme(pg_temp.u_pa(), 'authenticated', 'update app.binomes set retire_le = now()'),
  'ERR:42501:permission denied for table binomes', 'un participant ne modifie pas la table directement');
SELECT is(pg_temp.comme(pg_temp.u_pa(), 'authenticated', 'delete from app.binomes'),
  'ERR:42501:permission denied for table binomes', 'un participant n''efface pas la table directement');

-- ===== Droit d'accès : l'export de la personne contient ses binômes, jamais l'autre personne =====
-- État à ce point : d1-d2 actif (pa et pb ont accepté), d1-d3 refusée par pc (retirée), d1-d3 nouvelle en attente,
-- d2-d3 acceptée par pb et pc puis retirée par pb.
SELECT is(
  (SELECT p.prosecdef::text || '|' || p.provolatile::text || '|' || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
          || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|' || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
          || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
     FROM pg_proc p WHERE p.oid = 'app.exporter_mes_donnees()'::regprocedure AND pg_get_function_result(p.oid) = 'jsonb'),
  'true|v|true|tenga_owner|false|false|false|true', 'exporter_mes_donnees : signature, SECURITY DEFINER, search_path vide, tenga_owner, authenticated seul (inchangés)');
SELECT is((SELECT string_agg(k, ',' ORDER BY k COLLATE "C") FROM jsonb_object_keys(pg_temp.exp(pg_temp.u_pa())::jsonb) k),
  'appartenances,binomes,compte,exporte_le,journal,participations,profil,reseau,resultats,tentatives', 'l''export garde ses clés de 0003 et gagne « binomes » (puis « reseau » en 0022)');
SELECT is(jsonb_array_length(pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes'), 3, 'pa retrouve ses trois propositions (d1-d2, d1-d3 refusée, d1-d3 en attente)');
SELECT is((SELECT string_agg(e ->> 'statut', ',' ORDER BY e ->> 'statut') FROM jsonb_array_elements(pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes') e),
  'actif,en_attente,retire', 'les statuts exportés sont actif, en_attente et retire');
SELECT is((SELECT string_agg(k, ',' ORDER BY k COLLATE "C") FROM jsonb_object_keys(pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes' -> 0) k),
  'binome,ma_participation,mon_accord_le,organisation,propose_le,retire_le,statut', 'une proposition exportée porte sept clés : identifiant, sa participation, son accord, organisation, dates, statut');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes') e
            WHERE e ->> 'statut' = 'actif' AND e ->> 'mon_accord_le' IS NOT NULL AND e ->> 'retire_le' IS NULL),
  1, 'le binôme actif de pa porte la date de son accord et aucune date de retrait');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes') e
            WHERE e ->> 'statut' = 'retire' AND e ->> 'retire_le' IS NOT NULL AND e ->> 'mon_accord_le' IS NULL),
  1, 'la proposition refusée porte sa date de retrait et aucun accord de pa');
SELECT is((SELECT count(*)::int FROM jsonb_array_elements(pg_temp.exp(pg_temp.u_pc())::jsonb -> 'binomes') e WHERE e ->> 'mon_accord_le' IS NOT NULL),
  1, 'pc n''exporte que son propre accord (d2-d3) : ni son refus ni les accords des autres');
SELECT is(
  position('d0000000-0000-4000-8000-000000000002' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('d0000000-0000-4000-8000-000000000003' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('Bruno' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('Camille' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('a0000000-0000-4000-8000-000000000002' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('a0000000-0000-4000-8000-000000000004' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('a0000000-0000-4000-8000-000000000007' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('score' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text)
  + position('@' IN (pg_temp.exp(pg_temp.u_pa())::jsonb -> 'binomes')::text),
  0, 'les binômes exportés ne contiennent ni score, ni nom, ni identifiant, ni adresse de l''autre personne ni du consultant');
SELECT is(pg_temp.exp(pg_temp.u_pd())::jsonb -> 'binomes', '[]'::jsonb, 'une personne sans proposition exporte une liste vide');
SELECT is(pg_temp.exp(pg_temp.u_ra())::jsonb -> 'binomes', '[]'::jsonb, 'le responsable n''exporte aucun binôme');
SELECT is(pg_temp.exp(pg_temp.u_ca())::jsonb -> 'binomes', '[]'::jsonb, 'le consultant qui a proposé n''exporte aucun binôme (il n''est pas la personne concernée)');
SELECT is(pg_temp.exp(pg_temp.u_pa(), 'anon'), 'ERR:42501:permission denied for schema app', 'exporter_mes_donnees, anonyme : refusé');
SELECT is(pg_temp.exp(pg_temp.u_pa(), 'service_role'), 'ERR:42501:permission denied for function exporter_mes_donnees', 'exporter_mes_donnees, service_role : aucun droit d''exécution');

-- ===== Effacement : le compte du consultant, puis les personnes =====
SELECT is((SELECT count(*)::int FROM app.binomes), 4, 'avant effacement : quatre lignes (d1-d2, d1-d3 refusée, d1-d3 en cours, d2-d3 retirée)');
DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000004';
SELECT is((SELECT count(*)::int FROM app.binomes), 4, 'effacer le compte du consultant qui a proposé n''efface aucune proposition');
SELECT is((SELECT count(*)::int FROM app.binomes WHERE propose_par IS NULL), 3, 'les trois propositions du consultant effacé n''ont plus d''origine (NULL), celle de l''administrateur la garde');
SELECT is(pg_temp.lire(pg_temp.u_pa(), pg_temp.bid(pg_temp.d1(), pg_temp.d2())), '2', 'le binôme actif reste lisible par ses deux personnes après l''effacement du consultant');
DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000007';
SELECT is((SELECT count(*)::int FROM app.binomes), 1, 'effacer le compte de pc efface en cascade toutes les propositions où figure sa participation (il ne reste que d1-d2)');
DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000001';
SELECT is((SELECT count(*)::int FROM app.binomes), 0, 'effacer le compte de pa efface en cascade la dernière proposition');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'binome.proposer'), 4,
  'le journal garde ses lignes de binôme après les effacements (quatre propositions : trois, puis la nouvelle après le refus)');

SELECT * FROM finish();
