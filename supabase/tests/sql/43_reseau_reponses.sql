-- Migration 0023 (étape 2 de la structure invisible) : relevé du réseau réel.
-- app.reseau_membres (information préalable, opposition, accords) et
-- app.reseau_reponses (liens déclarés), RLS forcée, aucun droit de table pour
-- l'API, écriture refusée à l'API ; interrupteur private.settings.reseau_releve_ouvert
-- FERMÉ par défaut (seules l'opposition et le retrait restent permis fermé) ; sept fonctions contrôlées (mes_releves_reseau, reseau_releve,
-- reseau_informer, reseau_consentir, reseau_repondre, reseau_retirer, reseau_lire),
-- export de la personne (clé « reseau ») et purge (conservation_reseau_mois).
-- Le fichier tourne aussi sur la production, qui contient de vraies données :
-- il ne compte que ses propres lignes (identifiants 42…, organisation de test),
-- jamais une table app.* entière.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(150);

-- Base vivante : private.audit_log porte déjà des lignes réelles (ajout seul, jamais
-- effacées). Les lectures du journal de ce fichier passent par pg_temp.journal_test :
-- seules les lignes écrites pendant ce test, hors celles d'un compte présent avant lui
-- (activité réelle concurrente). Sur une base vide, la vue rend le journal entier.
CREATE TEMP TABLE journal_avant AS SELECT id FROM private.audit_log;
CREATE TEMP TABLE comptes_avant AS SELECT id FROM auth.users;
CREATE TEMP VIEW journal_test AS
  SELECT j.* FROM private.audit_log j
   WHERE NOT EXISTS (SELECT 1 FROM pg_temp.journal_avant a WHERE a.id = j.id)
     AND (j.acteur IS NULL OR NOT EXISTS (SELECT 1 FROM pg_temp.comptes_avant c WHERE c.id = j.acteur));

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

-- Identités : u(1) Alice, u(2) Bruno, u(3) Camille, u(4) Driss, u(12) Ghita : groupe G1 de
-- la campagne K1 (organisation A) ; u(5) Élise : groupe G2 de K1 ; u(6) Farid : K1 sans
-- groupe ; u(7) responsable A ; u(8) consultant A ; u(9) consultant B ; u(10)
-- administrateur Tenga ; u(11) participant B (groupe GB de KB). Participation p(n) de u(n) ;
-- p(255) : identifiant forgé.
CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('42000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.p(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('42400000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.org_a() RETURNS uuid LANGUAGE sql AS $$ SELECT '42100000-0000-4000-8000-00000000000a'::uuid $$;
CREATE FUNCTION pg_temp.org_b() RETURNS uuid LANGUAGE sql AS $$ SELECT '42100000-0000-4000-8000-00000000000b'::uuid $$;
CREATE FUNCTION pg_temp.k1() RETURNS uuid LANGUAGE sql AS $$ SELECT '42200000-0000-4000-8000-0000000000a1'::uuid $$;
CREATE FUNCTION pg_temp.kb() RETURNS uuid LANGUAGE sql AS $$ SELECT '42200000-0000-4000-8000-0000000000b1'::uuid $$;
CREATE FUNCTION pg_temp.g1() RETURNS uuid LANGUAGE sql AS $$ SELECT '42300000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.g2() RETURNS uuid LANGUAGE sql AS $$ SELECT '42300000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.gb() RETURNS uuid LANGUAGE sql AS $$ SELECT '42300000-0000-4000-8000-00000000000b'::uuid $$;
-- K2 (ouverte, groupe G3 : Inès u(13), Jamal u(14)) sert à la purge ; K3 (brouillon,
-- groupe G4 : Karim u(15)) à l'effacement en cascade par app.retirer_membre.
CREATE FUNCTION pg_temp.k2() RETURNS uuid LANGUAGE sql AS $$ SELECT '42200000-0000-4000-8000-0000000000a2'::uuid $$;
CREATE FUNCTION pg_temp.k3() RETURNS uuid LANGUAGE sql AS $$ SELECT '42200000-0000-4000-8000-0000000000a3'::uuid $$;
CREATE FUNCTION pg_temp.g3() RETURNS uuid LANGUAGE sql AS $$ SELECT '42300000-0000-4000-8000-000000000003'::uuid $$;
CREATE FUNCTION pg_temp.g4() RETURNS uuid LANGUAGE sql AS $$ SELECT '42300000-0000-4000-8000-000000000004'::uuid $$;
-- Lettre d'une participation de ce fichier (lecture des résultats).
CREATE FUNCTION pg_temp.code(x uuid) RETURNS text LANGUAGE sql AS $$
  SELECT CASE x WHEN pg_temp.p(1) THEN 'A' WHEN pg_temp.p(2) THEN 'B' WHEN pg_temp.p(3) THEN 'C'
                WHEN pg_temp.p(4) THEN 'D' WHEN pg_temp.p(5) THEN 'E' WHEN pg_temp.p(12) THEN 'G'
                WHEN pg_temp.p(13) THEN 'I' WHEN pg_temp.p(14) THEN 'J'
                ELSE coalesce(x::text, 'NULL') END
$$;

-- Appels des fonctions sous une identité donnée.
CREATE FUNCTION pg_temp.rel(p_uid uuid, p_part uuid, p_role text DEFAULT 'authenticated') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.reseau_releve(%L)::text', p_part))
$$;
CREATE FUNCTION pg_temp.inf(p_uid uuid, p_part uuid, p_opp boolean) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_informer(%L, %L)', p_part, p_opp))
$$;
CREATE FUNCTION pg_temp.cons(p_uid uuid, p_part uuid, p_r boolean, p_c boolean, p_rapport boolean DEFAULT false) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_consentir(%L, %L, %L, %L)', p_part, p_r, p_c, p_rapport))
$$;
CREATE FUNCTION pg_temp.rep(p_uid uuid, p_part uuid, p_json text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_repondre(%L, %L::jsonb)::text', p_part, p_json))
$$;
CREATE FUNCTION pg_temp.ret(p_uid uuid, p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_retirer(%L)::text', p_part))
$$;
CREATE FUNCTION pg_temp.lire(p_uid uuid, p_k uuid, p_role text DEFAULT 'authenticated') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.reseau_lire(%L)::text', p_k))
$$;
CREATE FUNCTION pg_temp.mes(p_uid uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.mes_releves_reseau() x', p_expr))
$$;
CREATE FUNCTION pg_temp.exp(p_uid uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', 'select app.exporter_mes_donnees()::text')
$$;
-- Texte rendu converti en jsonb ; un refus devient une chaîne JSON (aucun arrêt du fichier).
CREATE FUNCTION pg_temp.j(t text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN t IS NULL THEN to_jsonb('NULL'::text) WHEN t LIKE 'ERR:%' THEN to_jsonb(t) ELSE t::jsonb END
$$;
-- Une réponse et une liste de réponses (texte JSON).
CREATE FUNCTION pg_temp.e(p_cite uuid, p_lien text, p_valeur integer) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('cite', p_cite, 'lien', p_lien, 'valeur', p_valeur)
$$;
CREATE FUNCTION pg_temp.liste(VARIADIC p jsonb[]) RETURNS text LANGUAGE sql AS $$
  SELECT to_jsonb(p)::text
$$;
-- Réponses enregistrées d'une participation, lues dans la table (lettre:lien:valeur).
CREATE FUNCTION pg_temp.en_base(p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(pg_temp.code(r.cite) || ':' || r.lien || ':' || r.valeur, ',' ORDER BY pg_temp.code(r.cite), r.lien), '')
    FROM app.reseau_reponses r WHERE r.repondant = p_part
$$;
-- Membres et réponses rendus par app.reseau_releve.
CREATE FUNCTION pg_temp.noms(p_j jsonb) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(coalesce(x.e ->> 'nom', '?'), ',' ORDER BY x.i), '')
    FROM jsonb_array_elements(p_j -> 'membres') WITH ORDINALITY x(e, i)
$$;
CREATE FUNCTION pg_temp.reps(p_j jsonb) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(pg_temp.code((x.e ->> 'cite')::uuid) || ':' || (x.e ->> 'lien') || ':' || (x.e ->> 'valeur'), ',' ORDER BY x.i), '')
    FROM jsonb_array_elements(p_j -> 'reponses') WITH ORDINALITY x(e, i)
$$;
-- Lignes de journal du relevé pour l'organisation A (jamais tout le journal).
CREATE FUNCTION pg_temp.journal(p_action text) RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM pg_temp.journal_test l WHERE l.action = p_action AND l.organization_id = pg_temp.org_a()
$$;

CREATE FUNCTION pg_temp.ferme() RETURNS text LANGUAGE sql AS $$ SELECT 'ERR:55000:Relevé du réseau fermé' $$;
CREATE FUNCTION pg_temp.introuvable() RETURNS text LANGUAGE sql AS $$ SELECT 'ERR:P0002:Participation introuvable' $$;
CREATE FUNCTION pg_temp.non_ouverte() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:55000:Campagne non ouverte : consentement et réponses fermés'
$$;
CREATE FUNCTION pg_temp.sans_info() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:55000:Information préalable requise, sans opposition'
$$;
CREATE FUNCTION pg_temp.sans_accord() RETURNS text LANGUAGE sql AS $$ SELECT 'ERR:55000:Accord de réponse requis' $$;
CREATE FUNCTION pg_temp.inval() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:22023:Réponses invalides : une liste de membres du groupe, de liens et de valeurs est attendue'
$$;
CREATE FUNCTION pg_temp.choix() RETURNS text LANGUAGE sql AS $$ SELECT 'ERR:22023:Choix invalide : vrai ou faux attendu' $$;
CREATE FUNCTION pg_temp.refus_lire() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga'
$$;

-- Fixtures : campagne en brouillon, groupes et composition, puis ouverture (gel de 0005).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (pg_temp.u(1), 'reseau-a@example.test', '{"nom": "Alice"}'),
  (pg_temp.u(2), 'reseau-b@example.test', '{"nom": "Bruno"}'),
  (pg_temp.u(3), 'reseau-c@example.test', '{"nom": "Camille"}'),
  (pg_temp.u(4), 'reseau-d@example.test', '{"nom": "Driss"}'),
  (pg_temp.u(5), 'reseau-e@example.test', '{"nom": "Élise"}'),
  (pg_temp.u(6), 'reseau-f@example.test', '{"nom": "Farid"}'),
  (pg_temp.u(7), 'reseau-ra@example.test', '{}'),
  (pg_temp.u(8), 'reseau-ca@example.test', '{}'),
  (pg_temp.u(9), 'reseau-cx@example.test', '{}'),
  (pg_temp.u(10), 'reseau-ad@example.test', '{}'),
  (pg_temp.u(11), 'reseau-qb@example.test', '{"nom": "Hamza"}'),
  (pg_temp.u(12), 'reseau-g@example.test', '{"nom": "Ghita"}'),
  (pg_temp.u(13), 'reseau-i@example.test', '{"nom": "Inès"}'),
  (pg_temp.u(14), 'reseau-j@example.test', '{"nom": "Jamal"}'),
  (pg_temp.u(15), 'reseau-k@example.test', '{"nom": "Karim"}');
INSERT INTO app.organizations (id, slug, nom) VALUES
  (pg_temp.org_a(), 'reseau-essai-a', 'Organisation réseau A'),
  (pg_temp.org_b(), 'reseau-essai-b', 'Organisation réseau B');
INSERT INTO app.memberships (user_id, organization_id, role)
SELECT pg_temp.u(n), pg_temp.org_a(), 'participant' FROM unnest(ARRAY[1, 2, 3, 4, 5, 6, 12, 13, 14, 15]) n;
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  (pg_temp.u(7), pg_temp.org_a(), 'responsable'),
  (pg_temp.u(8), pg_temp.org_a(), 'consultant'),
  (pg_temp.u(9), pg_temp.org_b(), 'consultant'),
  (pg_temp.u(11), pg_temp.org_b(), 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES (pg_temp.u(10));
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  (pg_temp.k1(), pg_temp.org_a(), 'Relevé A1'),
  (pg_temp.kb(), pg_temp.org_b(), 'Relevé B1'),
  (pg_temp.k2(), pg_temp.org_a(), 'Relevé A2'),
  (pg_temp.k3(), pg_temp.org_a(), 'Relevé A3');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id)
SELECT pg_temp.p(n), pg_temp.k1(), pg_temp.org_a(), pg_temp.u(n) FROM unnest(ARRAY[1, 2, 3, 4, 5, 6, 12]) n;
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  (pg_temp.p(11), pg_temp.kb(), pg_temp.org_b(), pg_temp.u(11)),
  (pg_temp.p(13), pg_temp.k2(), pg_temp.org_a(), pg_temp.u(13)),
  (pg_temp.p(14), pg_temp.k2(), pg_temp.org_a(), pg_temp.u(14)),
  (pg_temp.p(15), pg_temp.k3(), pg_temp.org_a(), pg_temp.u(15));
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  (pg_temp.g1(), pg_temp.k1(), pg_temp.org_a(), 'Équipe 1', 1),
  (pg_temp.g2(), pg_temp.k1(), pg_temp.org_a(), 'Équipe 2', 2),
  (pg_temp.gb(), pg_temp.kb(), pg_temp.org_b(), 'Équipe B', 1),
  (pg_temp.g3(), pg_temp.k2(), pg_temp.org_a(), 'Équipe 3', 1),
  (pg_temp.g4(), pg_temp.k3(), pg_temp.org_a(), 'Équipe 4', 1);
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
SELECT pg_temp.g1(), pg_temp.k1(), pg_temp.org_a(), pg_temp.p(n) FROM unnest(ARRAY[1, 2, 3, 4, 12]) n;
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
  (pg_temp.g2(), pg_temp.k1(), pg_temp.org_a(), pg_temp.p(5)),
  (pg_temp.gb(), pg_temp.kb(), pg_temp.org_b(), pg_temp.p(11)),
  (pg_temp.g3(), pg_temp.k2(), pg_temp.org_a(), pg_temp.p(13)),
  (pg_temp.g3(), pg_temp.k2(), pg_temp.org_a(), pg_temp.p(14)),
  (pg_temp.g4(), pg_temp.k3(), pg_temp.org_a(), pg_temp.p(15));
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id IN (pg_temp.k1(), pg_temp.kb(), pg_temp.k2());

-- ===== Garde : les données de ce fichier ont le sens attendu =====
SELECT is((SELECT count(*)::int FROM app.group_members gm WHERE gm.group_id = pg_temp.g1()), 5,
  'fixture : cinq personnes dans le groupe G1 (Alice, Bruno, Camille, Driss, Ghita)');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l.action ~ '^reseau\.' AND l.organization_id IN (pg_temp.org_a(), pg_temp.org_b())), 0,
  'avant tout appel, aucune ligne de journal du relevé pour les organisations du fichier');

-- ===== Structure : tables protégées =====
SELECT is((SELECT string_agg(c.relname || ':' || (c.relkind = 'r' AND c.relrowsecurity AND c.relforcerowsecurity AND c.relowner = 'tenga_owner'::regrole)::text, ',' ORDER BY c.relname)
             FROM pg_class c WHERE c.oid IN ('app.reseau_membres'::regclass, 'app.reseau_reponses'::regclass)),
  'reseau_membres:true,reseau_reponses:true', 'les deux tables : ordinaires, RLS activée et forcée, propriétaire tenga_owner');
SELECT is((SELECT count(*)::int FROM pg_class c CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) r(rol)
            WHERE c.oid IN ('app.reseau_membres'::regclass, 'app.reseau_reponses'::regclass)
              AND (has_any_column_privilege(r.rol, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                   OR has_table_privilege(r.rol, c.oid, 'DELETE') OR has_table_privilege(r.rol, c.oid, 'TRUNCATE')
                   OR has_table_privilege(r.rol, c.oid, 'TRIGGER'))),
  0, 'ni anon, ni authenticated, ni service_role n''ont un droit quelconque sur les deux tables');
SELECT is(
  (SELECT string_agg(tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY tablename, policyname)
     FROM pg_policies WHERE schemaname = 'app' AND tablename IN ('reseau_membres', 'reseau_reponses')),
  $f$reseau_membres|reseau_membres_insertion_owner|INSERT|tenga_owner
reseau_membres|reseau_membres_lecture_owner|SELECT|tenga_owner
reseau_membres|reseau_membres_modification_owner|UPDATE|tenga_owner
reseau_membres|reseau_membres_suppression_owner|DELETE|tenga_owner
reseau_reponses|reseau_reponses_insertion_owner|INSERT|tenga_owner
reseau_reponses|reseau_reponses_lecture_owner|SELECT|tenga_owner
reseau_reponses|reseau_reponses_suppression_owner|DELETE|tenga_owner$f$,
  'liste figée des règles : tenga_owner seul, aucune règle pour le rôle connecté');
SELECT is((SELECT count(*)::int FROM pg_trigger t
            WHERE t.tgrelid IN ('app.reseau_membres'::regclass, 'app.reseau_reponses'::regclass)
              AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
              AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) = 28) OR (t.tgtype & 32) = 32)),
  4, 'refuser_ecriture_api actif par ligne (INSERT, UPDATE, DELETE) et sur TRUNCATE, sur les deux tables');
SELECT is((SELECT count(*)::int FROM pg_trigger t
            WHERE t.tgrelid IN ('app.reseau_membres'::regclass, 'app.reseau_reponses'::regclass) AND NOT t.tgisinternal
              AND t.tgfoid <> 'private.refuser_ecriture_api'::regproc),
  0, 'aucun autre déclencheur');
SELECT is(pg_temp.comme(pg_temp.u(1), 'authenticated', 'select count(*) from app.reseau_reponses'),
  'ERR:42501:permission denied for table reseau_reponses', 'un participant ne lit pas les réponses directement');
SELECT is(pg_temp.comme(pg_temp.u(8), 'authenticated', 'select count(*) from app.reseau_membres'),
  'ERR:42501:permission denied for table reseau_membres', 'le consultant ne lit pas les membres directement');
SELECT is(pg_temp.comme(pg_temp.u(1), 'service_role', 'select count(*) from app.reseau_reponses'),
  'ERR:42501:permission denied for table reseau_reponses', 'service_role (qui contourne la RLS) ne lit pas les réponses');
SELECT is(pg_temp.comme(pg_temp.u(1), 'anon', 'select count(*) from app.reseau_reponses'),
  'ERR:42501:permission denied for schema app', 'l''anonyme ne lit pas les réponses');
SELECT is(pg_temp.comme(pg_temp.u(1), 'authenticated',
    format('insert into app.reseau_membres (participation_id, campaign_id, organization_id, group_id) values (%L, %L, %L, %L)',
           pg_temp.p(1), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1())),
  'ERR:42501:permission denied for table reseau_membres', 'un participant n''écrit pas directement sa ligne');

-- ===== Structure : réglages =====
SELECT is((SELECT string_agg(a.attname || ':' || format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text || ':' || pg_get_expr(d.adbin, d.adrelid), ',' ORDER BY a.attname)
             FROM pg_attribute a JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
            WHERE a.attrelid = 'private.settings'::regclass AND a.attname IN ('reseau_releve_ouvert', 'conservation_reseau_mois')),
  'conservation_reseau_mois:integer:true:36,reseau_releve_ouvert:boolean:true:false',
  'réglages : interrupteur FERMÉ par défaut (non nul), conservation de 36 mois (3 ans) par défaut');
SELECT throws_ok('UPDATE private.settings SET conservation_reseau_mois = 0', '23514', NULL, 'conservation du réseau : 0 mois refusé');
SELECT throws_ok('UPDATE private.settings SET conservation_reseau_mois = 121', '23514', NULL, 'conservation du réseau : 121 mois refusés');
SELECT is(pg_temp.comme(pg_temp.u(10), 'authenticated', 'update private.settings set reseau_releve_ouvert = true'),
  'ERR:42501:permission denied for schema private', 'même l''administrateur Tenga n''ouvre pas le relevé par l''API');

-- ===== Structure : fonctions =====
SELECT is(
  (SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                     || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                     || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
                     E'\n' ORDER BY p.proname)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND (p.proname ~ '^reseau_' OR p.proname = 'mes_releves_reseau')
      AND p.proname NOT IN ('reseau_exporter', 'reseau_a_informer', 'reseau_courriels', 'reseau_marquer_informes')),
  $f$mes_releves_reseau|true|s|true|tenga_owner|false|false|false|true
reseau_consentir|true|v|true|tenga_owner|false|false|false|true
reseau_informer|true|v|true|tenga_owner|false|false|false|true
reseau_lire|true|v|true|tenga_owner|false|false|false|true
reseau_releve|true|s|true|tenga_owner|false|false|false|true
reseau_repondre|true|v|true|tenga_owner|false|false|false|true
reseau_retirer|true|v|true|tenga_owner|false|false|false|true$f$,
  'sept fonctions, une signature chacune : SECURITY DEFINER, search_path vide, tenga_owner, authenticated seul');
SELECT is(
  pg_get_function_result('app.mes_releves_reseau()'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_releve(uuid)'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_informer(uuid, boolean)'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_consentir(uuid, boolean, boolean, boolean)'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_repondre(uuid, jsonb)'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_retirer(uuid)'::regprocedure) || '|'
  || pg_get_function_result('app.reseau_lire(uuid)'::regprocedure),
  'TABLE(participation_id uuid, organisation_nom text, campagne_titre text, campagne_statut text)|jsonb|text|text|integer|integer|jsonb',
  'signatures et types rendus conformes au contrat');

-- ===== Contraintes de app.reseau_membres (écritures directes du superutilisateur) =====
SELECT throws_ok(format($$INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id) VALUES (%L, %L, %L, %L)$$,
    pg_temp.p(6), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()),
  '23503', NULL, 'une participation hors de tout groupe est refusée (clé vers la composition)');
SELECT throws_ok(format($$INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id) VALUES (%L, %L, %L, %L)$$,
    pg_temp.p(1), pg_temp.k1(), pg_temp.org_a(), pg_temp.g2()),
  '23503', NULL, 'un autre groupe que celui de la composition est refusé');
SELECT throws_ok(format($$INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id) VALUES (%L, %L, %L, %L)$$,
    pg_temp.p(1), pg_temp.k1(), pg_temp.org_b(), pg_temp.g1()),
  '23503', NULL, 'une autre organisation que celle de la participation est refusée');
SELECT throws_ok(format($$INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id, oppose_le, accord_repondre_le) VALUES (%L, %L, %L, %L, now(), now())$$,
    pg_temp.p(1), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()),
  '23514', NULL, 'une opposition ne coexiste avec aucun accord');

-- ===== Interrupteur FERMÉ (posé explicitement : le fichier reste juste après une ouverture réelle) =====
UPDATE private.settings SET reseau_releve_ouvert = false;
SELECT is(pg_temp.mes(pg_temp.u(1)), '0', 'fermé : mes_releves_reseau ne rend aucune participation sans ligne de membre');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))), '{"ouvert": false, "moi": null}'::jsonb, 'fermé, sans ligne de membre : {"ouvert": false, "moi": null} et rien d''autre');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(255))), '{"ouvert": false, "moi": null}'::jsonb, 'fermé : même réponse pour un identifiant forgé (aucune fuite)');
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), false), pg_temp.ferme(), 'fermé : lire l''information sans s''opposer est refusé (55000)');
SELECT is(pg_temp.inf(pg_temp.u(5), pg_temp.p(5), true), 'oppose', 'fermé : s''opposer reste permis (défaut protecteur, non validé) : Élise s''oppose');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, true), pg_temp.ferme(), 'fermé : reseau_consentir refusé (55000)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), '[]'), pg_temp.ferme(), 'fermé : reseau_repondre refusé (55000)');
SELECT is(pg_temp.ret(pg_temp.u(1), pg_temp.p(1)), '0', 'fermé : reseau_retirer reste permis (rien à retirer : 0)');
SELECT is((SELECT string_agg(pg_temp.code(m.participation_id) || ':' || (m.oppose_le IS NOT NULL)::text, ',') FROM app.reseau_membres m WHERE m.campaign_id IN (pg_temp.k1(), pg_temp.kb())),
  'E:true', 'fermé : seule la ligne d''opposition d''Élise est écrite');
SELECT is(pg_temp.mes(pg_temp.u(5), 'string_agg(x.participation_id::text, '','')'), pg_temp.p(5)::text,
  'fermé : la liste ne rend que la participation qui a une ligne de membre (chemin du retrait et de l''opposition)');
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(5), pg_temp.p(5)))) k) || '/'
          || (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(5), pg_temp.p(5))) -> 'moi') k) || '/'
          || (pg_temp.j(pg_temp.rel(pg_temp.u(5), pg_temp.p(5))) #>> '{moi,nb_reponses}') || '/'
          || ((pg_temp.j(pg_temp.rel(pg_temp.u(5), pg_temp.p(5))) #>> '{moi,oppose_le}') IS NOT NULL)::text,
  'moi,ouvert/accord_carte_le,accord_rapport_le,accord_repondre_le,informe_le,nb_reponses,oppose_le/0/true',
  'fermé, avec ligne : seul « moi » (dates et nombre de réponses), ni équipe ni réponses');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(5))), '{"ouvert": false, "moi": null}'::jsonb,
  'fermé : la ligne d''une autre personne n''est jamais rendue');
SELECT is(
  (SELECT string_agg(DISTINCT x, '|') FROM unnest(ARRAY[
     pg_temp.comme(NULL, 'authenticated', 'select count(*)::text from app.mes_releves_reseau()'),
     pg_temp.rel(NULL, pg_temp.p(1)), pg_temp.inf(NULL, pg_temp.p(1), false), pg_temp.cons(NULL, pg_temp.p(1), true, true),
     pg_temp.rep(NULL, pg_temp.p(1), '[]'), pg_temp.ret(NULL, pg_temp.p(1)), pg_temp.lire(NULL, pg_temp.k1())]) x),
  'ERR:42501:Connexion requise', 'sans identité : les sept fonctions refusent (42501)');
SELECT is(pg_temp.mes(pg_temp.u(1), 'count(*)', 'anon'), 'ERR:42501:permission denied for schema app', 'l''anonyme n''exécute pas mes_releves_reseau');
SELECT is(pg_temp.rel(pg_temp.u(1), pg_temp.p(1), 'service_role'), 'ERR:42501:permission denied for function reseau_releve', 'service_role n''exécute pas reseau_releve');

-- ===== Interrupteur OUVERT dans la transaction =====
UPDATE private.settings SET reseau_releve_ouvert = true;
SELECT is(pg_temp.mes(pg_temp.u(1), 'string_agg(x.participation_id::text || ''|'' || x.organisation_nom || ''|'' || x.campagne_titre || ''|'' || x.campagne_statut, '','')'),
  pg_temp.p(1)::text || '|Organisation réseau A|Relevé A1|ouverte', 'ouvert : Alice voit son relevé (organisation, campagne, statut)');
SELECT is(pg_temp.mes(pg_temp.u(6)) || ',' || pg_temp.mes(pg_temp.u(7)) || ',' || pg_temp.mes(pg_temp.u(8)) || ',' || pg_temp.mes(pg_temp.u(10)),
  '0,0,0,0', 'ouvert : ni la personne hors groupe, ni le responsable, ni le consultant, ni l''administrateur n''ont de relevé');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))),
  '{"ouvert": true, "campagne_ouverte": true, "moi": null, "membres": [], "reponses": []}'::jsonb,
  'ouvert, avant l''information : moi nul, aucun membre, aucune réponse');
SELECT is(pg_temp.rel(pg_temp.u(2), pg_temp.p(1)), pg_temp.introuvable(), 'la participation d''autrui : introuvable (P0002)');
SELECT is(pg_temp.rel(pg_temp.u(1), pg_temp.p(255)), pg_temp.introuvable(), 'une participation inexistante : même message');
SELECT is(pg_temp.rel(pg_temp.u(6), pg_temp.p(6)), pg_temp.introuvable(), 'une participation hors de tout groupe : même message');
SELECT is(pg_temp.rel(pg_temp.u(8), pg_temp.p(1)), pg_temp.introuvable(), 'le consultant ne lit pas le relevé d''une personne : même message');
SELECT is(
  (SELECT string_agg(DISTINCT x, '|') FROM unnest(ARRAY[
     pg_temp.inf(pg_temp.u(2), pg_temp.p(1), false), pg_temp.inf(pg_temp.u(7), pg_temp.p(1), true),
     pg_temp.cons(pg_temp.u(2), pg_temp.p(1), true, true), pg_temp.rep(pg_temp.u(2), pg_temp.p(1), '[]'),
     pg_temp.ret(pg_temp.u(2), pg_temp.p(1)), pg_temp.ret(pg_temp.u(10), pg_temp.p(1))]) x),
  pg_temp.introuvable(), 'informer, consentir, répondre, retirer pour la participation d''autrui : P0002, même message');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, true), pg_temp.sans_info(), 'consentir avant d''avoir lu l''information : refusé (55000)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), '[]'), pg_temp.sans_accord(), 'répondre sans accord : refusé (55000)');
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), NULL), pg_temp.choix(), 'informer sans choix : refusé (22023)');
SELECT is((SELECT count(*)::int FROM app.reseau_membres m WHERE m.campaign_id = pg_temp.k1() AND m.participation_id <> pg_temp.p(5)), 0, 'aucun refus n''a écrit de ligne');

-- ===== Informer =====
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), false), 'informe', 'Alice a lu l''information sans s''opposer : « informe »');
SELECT ok((SELECT m.informe_le IS NOT NULL AND m.oppose_le IS NULL AND m.accord_repondre_le IS NULL AND m.accord_carte_le IS NULL
                  AND m.maj_le IS NOT NULL AND m.group_id = pg_temp.g1() AND m.campaign_id = pg_temp.k1() AND m.organization_id = pg_temp.org_a()
             FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(1)),
  'sa ligne : informée, sans opposition ni accord, groupe, campagne et organisation de la composition');
SELECT is(pg_temp.inf(pg_temp.u(2), pg_temp.p(2), false) || ',' || pg_temp.inf(pg_temp.u(3), pg_temp.p(3), false) || ','
          || pg_temp.inf(pg_temp.u(4), pg_temp.p(4), false) || ',' || pg_temp.inf(pg_temp.u(5), pg_temp.p(5), false),
  'informe,informe,informe,informe', 'Bruno, Camille, Driss (G1) et Élise (G2) sont informés ; Ghita ne l''est pas');
SELECT is(pg_temp.noms(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))), 'Bruno,Camille,Driss',
  'membres d''Alice : les autres membres informés de SON groupe, triés par nom (ni Élise, ni Ghita, ni elle-même)');
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))) k) || '/'
          || (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))) -> 'moi') k) || '/'
          || (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))) -> 'membres' -> 0) k),
  'campagne_ouverte,membres,moi,ouvert,reponses/accord_carte_le,accord_rapport_le,accord_repondre_le,informe_le,oppose_le/nom,participation_id',
  'forme du relevé conforme au contrat');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(12), pg_temp.p(12))) -> 'membres', '[]'::jsonb,
  'Ghita, non informée, ne voit aucun membre');

-- ===== Consentir =====
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, false), 'enregistre', 'Alice accepte de répondre, pas la carte');
SELECT ok((SELECT m.accord_repondre_le IS NOT NULL AND m.accord_carte_le IS NULL FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(1)),
  'les deux accords sont distincts : répondre posé, carte non');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), NULL, true), pg_temp.choix(), 'consentir avec un choix nul : refusé (22023)');

-- ===== Répondre : refus, rien n'est écrit =====
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'conseil', 2), pg_temp.e(pg_temp.p(5), 'conseil', 2))),
  pg_temp.inval(), 'une personne citée d''un autre groupe (Élise) : refusé (22023)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(12), 'conseil', 2))),
  pg_temp.inval(), 'une personne citée non informée (Ghita) : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(11), 'conseil', 2))),
  pg_temp.inval(), 'une personne d''une autre organisation : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 2))),
  pg_temp.inval(), 'se citer soi-même : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'conseil', 2), pg_temp.e(pg_temp.p(2), 'conseil', 3))),
  pg_temp.inval(), 'un doublon (personne, lien) : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'confiance', 4))),
  pg_temp.inval(), 'confiance au-delà de 3 : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'conseil', 5))),
  pg_temp.inval(), 'fréquence au-delà de 4 : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'blocage', 1))),
  pg_temp.inval(), 'un lien inconnu (« qui vous bloque », question retirée) : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), format('[{"cite": "%s", "lien": "conseil", "valeur": "2"}]', pg_temp.p(2))),
  pg_temp.inval(), 'une valeur en chaîne : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), format('[{"cite": "%s", "lien": "conseil", "valeur": 2.5}]', pg_temp.p(2))),
  pg_temp.inval(), 'une valeur non entière : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), format('[{"cite": "%s", "lien": "conseil", "valeur": 2, "note": "x"}]', pg_temp.p(2))),
  pg_temp.inval(), 'une clé en trop : refusé');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), '[{"cite": "pas-un-uuid", "lien": "conseil", "valeur": 2}]'),
  pg_temp.inval(), 'un identifiant illisible : refusé (pas d''erreur de conversion)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), '{"cite": "x"}') || '|' || pg_temp.rep(pg_temp.u(1), pg_temp.p(1), NULL) || '|' || pg_temp.rep(pg_temp.u(1), pg_temp.p(1), '[1]'),
  pg_temp.inval() || '|' || pg_temp.inval() || '|' || pg_temp.inval(), 'un objet, une valeur nulle, un élément non objet : refusés');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1),
    (SELECT to_jsonb(array_agg(pg_temp.e(c, l, 1)))::text
       FROM unnest(ARRAY[pg_temp.p(2), pg_temp.p(3), pg_temp.p(4)]) c CROSS JOIN unnest(ARRAY['conseil', 'information', 'confiance', 'dependance']) l
       CROSS JOIN generate_series(1, 2) k)),
  pg_temp.inval(), 'au-delà de 4 × (effectif − 1) = 16 éléments (ici 24) : refusé');
SELECT is(pg_temp.en_base(pg_temp.p(1)), '', 'aucun refus n''a écrit de réponse');

-- ===== Répondre, remplacer =====
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'conseil', 3), pg_temp.e(pg_temp.p(2), 'confiance', 2),
                                                                 pg_temp.e(pg_temp.p(3), 'information', 4), pg_temp.e(pg_temp.p(4), 'dependance', 0))),
  '4', 'Alice enregistre quatre réponses');
SELECT is(pg_temp.reps(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))), 'B:confiance:2,B:conseil:3,C:information:4,D:dependance:0',
  'Alice relit ses quatre réponses (triées par personne puis par lien)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(2), 'conseil', 1), pg_temp.e(pg_temp.p(3), 'confiance', 3),
                                                                 pg_temp.e(pg_temp.p(4), 'dependance', 2))),
  '3', 'Alice remplace ses réponses par trois autres');
SELECT is(pg_temp.en_base(pg_temp.p(1)), 'B:conseil:1,C:confiance:3,D:dependance:2', 'le remplacement est complet : aucune ancienne réponse ne subsiste');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(2), pg_temp.p(2))) -> 'reponses', '[]'::jsonb, 'Bruno ne voit pas les réponses d''Alice');
SELECT is(pg_temp.cons(pg_temp.u(2), pg_temp.p(2), true, true) || '|'
          || pg_temp.rep(pg_temp.u(2), pg_temp.p(2), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 2), pg_temp.e(pg_temp.p(4), 'information', 3))),
  'enregistre|2', 'Bruno accepte (réponse et carte) et cite Alice et Driss');
SELECT is(pg_temp.reps(pg_temp.j(pg_temp.rel(pg_temp.u(2), pg_temp.p(2)))), 'A:conseil:2,D:information:3', 'Bruno ne relit que ses propres réponses');

-- ===== Contraintes de app.reseau_reponses (écritures directes du superutilisateur) =====
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'conseil', 1)$$,
    pg_temp.p(2), pg_temp.p(2), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23514', NULL, 'se citer soi-même : refusé par la table');
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'confiance', 4)$$,
    pg_temp.p(2), pg_temp.p(3), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23514', NULL, 'confiance de 0 à 3 seulement');
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'dependance', 5)$$,
    pg_temp.p(2), pg_temp.p(3), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23514', NULL, 'fréquence de 0 à 4 seulement');
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'blocage', 1)$$,
    pg_temp.p(2), pg_temp.p(3), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23514', NULL, 'quatre liens seulement');
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'conseil', 1)$$,
    pg_temp.p(2), pg_temp.p(5), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23503', NULL, 'une personne citée d''un autre groupe : refusée par la clé composite');
SELECT throws_ok(format($$INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur) VALUES (%L, %L, %L, %L, %L, 'conseil', 1)$$,
    pg_temp.p(2), pg_temp.p(12), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1()), '23503', NULL, 'une personne non informée : refusée par la clé');

-- ===== Retirer =====
SELECT is(pg_temp.cons(pg_temp.u(3), pg_temp.p(3), true, true) || '|'
          || pg_temp.rep(pg_temp.u(3), pg_temp.p(3), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 4), pg_temp.e(pg_temp.p(2), 'conseil', 4))),
  'enregistre|2', 'Camille accepte et répond');
SELECT is(pg_temp.cons(pg_temp.u(3), pg_temp.p(3), false, true), 'enregistre', 'Camille retire son accord de réponse et garde l''accord de carte');
SELECT ok(pg_temp.en_base(pg_temp.p(3)) = ''
          AND (SELECT m.accord_repondre_le IS NULL AND m.accord_carte_le IS NOT NULL FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(3)),
  'retirer l''accord de réponse supprime les réponses ; l''accord de carte est conservé');
SELECT is(pg_temp.cons(pg_temp.u(3), pg_temp.p(3), true, true) || '|'
          || pg_temp.rep(pg_temp.u(3), pg_temp.p(3), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 4), pg_temp.e(pg_temp.p(2), 'conseil', 4))),
  'enregistre|2', 'Camille redonne son accord et répond de nouveau');
SELECT is(pg_temp.ret(pg_temp.u(3), pg_temp.p(3)), '2', 'Camille retire ses réponses : deux supprimées');
SELECT ok((SELECT m.accord_repondre_le IS NULL AND m.accord_carte_le IS NULL AND m.oppose_le IS NULL FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(3))
          AND pg_temp.en_base(pg_temp.p(3)) = '',
  'après le retrait : aucune réponse, accords effacés, toujours informée et citable');
SELECT is(pg_temp.ret(pg_temp.u(3), pg_temp.p(3)), '0', 'un second retrait ne supprime rien');
SELECT is(pg_temp.rep(pg_temp.u(3), pg_temp.p(3), '[]'), pg_temp.sans_accord(), 'après le retrait, répondre exige un nouvel accord');

-- ===== S'opposer : liens entrants ET sortants supprimés =====
SELECT is(pg_temp.cons(pg_temp.u(4), pg_temp.p(4), true, true) || '|' || pg_temp.rep(pg_temp.u(4), pg_temp.p(4), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 2))),
  'enregistre|1', 'Driss accepte et cite Alice');
SELECT is(pg_temp.inf(pg_temp.u(4), pg_temp.p(4), true), 'oppose', 'Driss s''oppose à être cité');
SELECT is((SELECT count(*)::int FROM app.reseau_reponses r WHERE r.cite = pg_temp.p(4)), 0,
  'opposition : les liens ENTRANTS vers Driss (d''Alice et de Bruno) sont supprimés');
SELECT is(pg_temp.en_base(pg_temp.p(4)), '', 'opposition : les liens SORTANTS de Driss sont supprimés');
SELECT is(pg_temp.en_base(pg_temp.p(1)) || '/' || pg_temp.en_base(pg_temp.p(2)), 'B:conseil:1,C:confiance:3/A:conseil:2',
  'les autres réponses d''Alice et de Bruno restent');
SELECT ok((SELECT m.oppose_le IS NOT NULL AND m.accord_repondre_le IS NULL AND m.accord_carte_le IS NULL FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(4)),
  'opposition datée, accords effacés');
SELECT is((SELECT m ->> 'oppose' FROM jsonb_array_elements(pg_temp.j(pg_temp.lire(pg_temp.u(10), pg_temp.k1())) -> 'groupes' -> 0 -> 'membres') m WHERE m ->> 'nom' = 'Driss'),
  'true', 'la lecture de l''administrateur Tenga dit Driss opposé (non représenté), sans aucun lien (le consultant n''en voit que le nombre depuis la 0024, test 44)');
SELECT is(pg_temp.noms(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))), 'Bruno,Camille', 'Driss n''est plus proposé à Alice');
SELECT is(pg_temp.j(pg_temp.rel(pg_temp.u(4), pg_temp.p(4))) -> 'membres', '[]'::jsonb, 'une personne opposée ne voit aucun membre');
SELECT is(pg_temp.cons(pg_temp.u(4), pg_temp.p(4), true, false), pg_temp.sans_info(), 'une personne opposée ne consent pas (55000)');
SELECT is(pg_temp.rep(pg_temp.u(1), pg_temp.p(1), pg_temp.liste(pg_temp.e(pg_temp.p(4), 'conseil', 1))), pg_temp.inval(),
  'citer une personne opposée : refusé (22023)');
SELECT is(pg_temp.en_base(pg_temp.p(1)), 'B:conseil:1,C:confiance:3', 'le refus n''a rien écrit ni effacé');
SELECT is(pg_temp.inf(pg_temp.u(4), pg_temp.p(4), false), 'informe', 'Driss lève son opposition');
SELECT ok((SELECT m.oppose_le IS NULL FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(4))
          AND pg_temp.noms(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))) = 'Bruno,Camille,Driss',
  'opposition levée : Driss est de nouveau proposé, sans aucun lien restauré');

-- ===== Lecture consultant, administrateur ; refus =====
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1()))) k),
  'campagne_id,campagne_statut,groupes', 'le consultant de A lit le relevé de la campagne');
SELECT is((SELECT string_agg((g ->> 'nom') || ':' || (g ->> 'effectif') || ':' || jsonb_array_length(g -> 'membres') || ':' || jsonb_array_length(g -> 'reponses'), ',' ORDER BY i)
             FROM jsonb_array_elements(pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1())) -> 'groupes') WITH ORDINALITY x(g, i)),
  'Équipe 1:5:4:3,Équipe 2:1:1:0', 'par groupe : effectif de la composition, membres informés, réponses');
SELECT is((SELECT string_agg((m ->> 'nom') || ':' || (m ->> 'informe') || ':' || (m ->> 'oppose') || ':' || (m ->> 'accord_repondre') || ':' || (m ->> 'accord_carte') || ':' || (m ->> 'a_repondu'), ',' ORDER BY i)
             FROM jsonb_array_elements(pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1())) -> 'groupes' -> 0 -> 'membres') WITH ORDINALITY x(m, i)),
  'Alice:true:false:true:false:true,Bruno:true:false:true:true:true,Camille:true:false:false:false:false,Driss:true:false:false:false:false',
  'membres de l''Équipe 1 : état de chacun (informé, opposé, accords, a répondu), triés par nom');
SELECT is((SELECT string_agg(pg_temp.code((r ->> 'de')::uuid) || '>' || pg_temp.code((r ->> 'vers')::uuid) || ':' || (r ->> 'lien') || ':' || (r ->> 'valeur'), ',' ORDER BY i)
             FROM jsonb_array_elements(pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1())) -> 'groupes' -> 0 -> 'reponses') WITH ORDINALITY x(r, i)),
  'A>B:conseil:1,A>C:confiance:3,B>A:conseil:2',
  'réponses brutes de l''Équipe 1 (de, vers, lien, valeur)');
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1())) -> 'groupes' -> 0 -> 'membres' -> 0) k),
  'a_repondu,accord_carte,accord_rapport,accord_repondre,informe,nom,oppose,participation_id', 'forme d''un membre conforme au contrat');
SELECT is(pg_temp.j(pg_temp.lire(pg_temp.u(10), pg_temp.k1())), pg_temp.j(pg_temp.lire(pg_temp.u(8), pg_temp.k1())),
  'l''administrateur Tenga lit le même relevé');
SELECT is(pg_temp.lire(pg_temp.u(7), pg_temp.k1()), pg_temp.refus_lire(), 'le responsable de l''organisation ne lit RIEN (42501)');
SELECT is(
  (SELECT string_agg(DISTINCT x, '|') FROM unnest(ARRAY[
     pg_temp.lire(pg_temp.u(9), pg_temp.k1()), pg_temp.lire(pg_temp.u(1), pg_temp.k1()), pg_temp.lire(pg_temp.u(8), pg_temp.kb()),
     pg_temp.lire(pg_temp.u(8), '42200000-0000-4000-8000-0000000000ff'), pg_temp.lire(pg_temp.u(8), NULL), pg_temp.lire(pg_temp.u(8), pg_temp.p(1))]) x),
  pg_temp.refus_lire(), 'consultant d''une autre organisation, participant, campagne d''une autre organisation, inexistante, nulle, forgée : même refus');
SELECT is(pg_temp.lire(pg_temp.u(8), pg_temp.k1(), 'service_role'), 'ERR:42501:permission denied for function reseau_lire', 'service_role n''exécute pas reseau_lire');
SELECT is((SELECT string_agg(DISTINCT l.acteur::text || '|' || l.ressource_type || '|' || l.ressource_id::text || '|' || l.quantite::text, ','
                             ORDER BY l.acteur::text || '|' || l.ressource_type || '|' || l.ressource_id::text || '|' || l.quantite::text)
             FROM pg_temp.journal_test l WHERE l.action = 'reseau.lire' AND l.organization_id IN (pg_temp.org_a(), pg_temp.org_b())),
  pg_temp.u(8)::text || '|campagne|' || pg_temp.k1()::text || '|3,' || pg_temp.u(10)::text || '|campagne|' || pg_temp.k1()::text || '|3',
  'lecture journalisée (acteur réel, campagne, quantité = réponses) ; aucun refus n''est journalisé');

-- ===== Journal du parcours, sans nom ni adresse =====
SELECT is(pg_temp.journal('reseau.informer') || ',' || pg_temp.journal('reseau.opposer') || ',' || pg_temp.journal('reseau.consentir') || ','
          || pg_temp.journal('reseau.repondre') || ',' || pg_temp.journal('reseau.retirer'),
  '6,2,6,6,3', 'journal : six informations, deux oppositions, six consentements, six réponses, trois retraits ; aucun refus');
SELECT is((SELECT string_agg(l.quantite::text, ',' ORDER BY l.id) FROM pg_temp.journal_test l WHERE l.action = 'reseau.repondre' AND l.organization_id = pg_temp.org_a()),
  '4,3,2,2,2,1', 'la quantité de chaque réponse est le nombre de lignes enregistrées');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l.action ~ '^reseau\.' AND l.organization_id = pg_temp.org_a()
             AND (to_jsonb(l)::text ~ '(@|Alice|Bruno|Camille|Driss|Élise|Ghita)' OR l.acteur IS NULL)), 0,
  'aucune ligne du journal du relevé ne contient de nom ni d''adresse ; chacune a son acteur');

-- ===== Droit d'accès : export de mes données =====
SELECT is((SELECT string_agg(k, ',' ORDER BY k COLLATE "C") FROM jsonb_object_keys(pg_temp.j(pg_temp.exp(pg_temp.u(1)))) k),
  'appartenances,binomes,compte,exporte_le,journal,participations,profil,relecture,reseau,resultats,tentatives', 'l''export garde ses clés (dont « relecture », 0022) et gagne « reseau »');
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.exp(pg_temp.u(1))) -> 'reseau') k) || '/'
          || jsonb_array_length(pg_temp.j(pg_temp.exp(pg_temp.u(1))) -> 'reseau' -> 'membres')::text || '/'
          || (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.exp(pg_temp.u(1))) -> 'reseau' -> 'membres' -> 0) k),
  'membres,reponses/1/accord_carte_le,accord_rapport_le,accord_repondre_le,campagne,informe_le,maj_le,oppose_le,organisation,participation',
  'export : une ligne de membre par participation, avec ses dates');
SELECT is((SELECT string_agg((r ->> 'personne_citee') || ':' || (r ->> 'lien') || ':' || (r ->> 'valeur'), ',' ORDER BY r ->> 'personne_citee')
             FROM jsonb_array_elements(pg_temp.j(pg_temp.exp(pg_temp.u(1))) -> 'reseau' -> 'reponses') r),
  'Bruno:conseil:1,Camille:confiance:3', 'export : mes réponses avec le nom de la personne citée, jamais celles des autres');
SELECT is(pg_temp.j(pg_temp.exp(pg_temp.u(7))) -> 'reseau', '{"membres": [], "reponses": []}'::jsonb, 'le responsable exporte un relevé vide');

-- ===== Campagne close : consentir et répondre refusés ; retrait et opposition permis =====
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = pg_temp.k1();
SELECT is(pg_temp.cons(pg_temp.u(2), pg_temp.p(2), true, true), pg_temp.non_ouverte(), 'campagne close : consentir refusé (55000)');
SELECT is(pg_temp.rep(pg_temp.u(2), pg_temp.p(2), pg_temp.liste(pg_temp.e(pg_temp.p(1), 'conseil', 1))), pg_temp.non_ouverte(), 'campagne close : répondre refusé (55000)');
SELECT is(pg_temp.en_base(pg_temp.p(2)), 'A:conseil:2', 'les refus n''ont rien changé');
SELECT is((pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))) ->> 'campagne_ouverte') || '|' || pg_temp.mes(pg_temp.u(1), 'string_agg(x.campagne_statut, '','')'),
  'false|close', 'le relevé dit la campagne close');
SELECT is(pg_temp.ret(pg_temp.u(2), pg_temp.p(2)), '1', 'campagne close : Bruno retire sa réponse');
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), true), 'oppose', 'campagne close : Alice s''oppose');
SELECT is(pg_temp.en_base(pg_temp.p(1)) || '/' || (SELECT count(*)::text FROM app.reseau_reponses r WHERE r.cite = pg_temp.p(1)), '/0',
  'l''opposition après la clôture supprime aussi ses liens');
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), false), 'informe', 'campagne close : l''opposition se lève');

-- ===== Interrupteur refermé : retrait toujours permis =====
UPDATE private.settings SET reseau_releve_ouvert = false;
SELECT is((SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1)))) k) || '|'
          || (pg_temp.j(pg_temp.rel(pg_temp.u(1), pg_temp.p(1))) #>> '{moi,nb_reponses}') || '|' || pg_temp.mes(pg_temp.u(1)),
  'moi,ouvert|0|1', 'refermé : Alice ne voit que sa propre ligne (aucune réponse) et retrouve son relevé dans la liste');
SELECT is(pg_temp.ret(pg_temp.u(2), pg_temp.p(2)), '0', 'refermé : le retrait reste permis');

-- ===== Purge : durée lue dans private.settings, traces sans acteur =====
INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur, repondu_le) VALUES
  (pg_temp.p(2), pg_temp.p(3), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1(), 'conseil', 2, now() - interval '3 months'),
  (pg_temp.p(3), pg_temp.p(2), pg_temp.k1(), pg_temp.org_a(), pg_temp.g1(), 'conseil', 2, now() - interval '1 month');
UPDATE app.reseau_membres SET maj_le = now() - interval '3 months' WHERE participation_id = pg_temp.p(5);
-- Membre aux réponses récentes (campagne K2 ouverte) : accord donné il y a 3 mois,
-- réponse aujourd'hui ; reseau_repondre rafraîchit maj_le, la purge ne l'emporte pas.
UPDATE private.settings SET reseau_releve_ouvert = true;
SELECT is(pg_temp.inf(pg_temp.u(13), pg_temp.p(13), false) || '|' || pg_temp.inf(pg_temp.u(14), pg_temp.p(14), false) || '|'
          || pg_temp.cons(pg_temp.u(13), pg_temp.p(13), true, false),
  'informe|informe|enregistre', 'K2 : Inès et Jamal sont informés, Inès accepte de répondre');
UPDATE app.reseau_membres SET maj_le = now() - interval '3 months' WHERE participation_id = pg_temp.p(13);
SELECT is(pg_temp.rep(pg_temp.u(13), pg_temp.p(13), pg_temp.liste(pg_temp.e(pg_temp.p(14), 'conseil', 3))), '1', 'Inès répond');
SELECT ok((SELECT m.maj_le = now() FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(13)),
  'répondre rafraîchit maj_le de la ligne du répondant');
UPDATE private.settings SET reseau_releve_ouvert = false;
SELECT is((pg_temp.j(pg_temp.rel(pg_temp.u(13), pg_temp.p(13))) #>> '{moi,nb_reponses}') || '|'
          || (position(pg_temp.p(14)::text IN pg_temp.rel(pg_temp.u(13), pg_temp.p(13))) + position('Jamal' IN pg_temp.rel(pg_temp.u(13), pg_temp.p(13))))::text,
  '1|0', 'fermé : Inès voit le nombre de ses réponses, jamais la personne citée');
SELECT is(pg_temp.mes(pg_temp.u(13)) || ',' || pg_temp.mes(pg_temp.u(6)), '1,0', 'fermé : liste filtrée (Inès a une ligne, Farid non)');
SELECT set_config('zz.repere', (SELECT coalesce(max(l.id), 0)::text FROM pg_temp.journal_test l), true);
UPDATE private.settings SET conservation_reseau_mois = 36;
SELECT private.purger_quotidien();
SELECT is(pg_temp.en_base(pg_temp.p(2)) || '/' || pg_temp.en_base(pg_temp.p(3)) || '/' || (SELECT count(*)::text FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(5)),
  'C:conseil:2/B:conseil:2/1', 'conservation de 36 mois : une réponse de 3 mois et un membre de 3 mois restent');
UPDATE private.settings SET conservation_reseau_mois = 2;
SELECT private.purger_quotidien();
SELECT is(pg_temp.en_base(pg_temp.p(2)) || '/' || pg_temp.en_base(pg_temp.p(3)), '/B:conseil:2',
  'conservation de 2 mois : la réponse de 3 mois est purgée, celle d''un mois reste');
SELECT is((SELECT string_agg(pg_temp.code(m.participation_id), ',' ORDER BY pg_temp.code(m.participation_id)) FROM app.reseau_membres m WHERE m.campaign_id = pg_temp.k1()),
  'A,B,C,D', 'conservation de 2 mois : le membre de 3 mois (Élise) est purgé, les autres restent');
SELECT is((SELECT count(*)::text FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(13)) || '/' || pg_temp.en_base(pg_temp.p(13)),
  '1/J:conseil:3', 'le membre aux réponses récentes (Inès) n''est pas purgé, sa réponse reste');
SELECT ok((SELECT l.quantite >= 1 FROM pg_temp.journal_test l WHERE l.action = 'purge.reseau_reponses' AND l.id > current_setting('zz.repere')::bigint ORDER BY l.id DESC LIMIT 1)
          AND (SELECT l.quantite >= 1 FROM pg_temp.journal_test l WHERE l.action = 'purge.reseau_membres' AND l.id > current_setting('zz.repere')::bigint ORDER BY l.id DESC LIMIT 1),
  'traces chiffrées purge.reseau_reponses et purge.reseau_membres');
SELECT is((SELECT count(*)::int || '/' || count(*) FILTER (WHERE l.acteur IS NOT NULL OR l.ressource_id IS NOT NULL OR l.organization_id IS NOT NULL)
             FROM pg_temp.journal_test l WHERE l.action IN ('purge.reseau_reponses', 'purge.reseau_membres') AND l.id > current_setting('zz.repere')::bigint),
  '4/0', 'deux passes, quatre traces, aucune avec acteur, ressource ni organisation');

-- ===== Effacement en cascade =====
DELETE FROM auth.users WHERE id = pg_temp.u(3);
SELECT is((SELECT count(*)::int FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(3))
          + (SELECT count(*)::int FROM app.reseau_reponses r WHERE pg_temp.p(3) IN (r.repondant, r.cite)), 0,
  'effacer le compte de Camille efface sa ligne et toutes les réponses où elle figure');
INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id) VALUES (pg_temp.p(15), pg_temp.k3(), pg_temp.org_a(), pg_temp.g4());
SELECT is(pg_temp.comme(pg_temp.u(7), 'authenticated', format('select app.retirer_membre(%L)::text', pg_temp.p(15))), 'true',
  'campagne en brouillon : le responsable retire Karim de son groupe');
SELECT is((SELECT count(*)::int FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(15)), 0,
  'app.retirer_membre efface en cascade la ligne de membre du relevé');
SELECT is(pg_temp.journal('reseau.informer'), 9, 'le journal du relevé subsiste après l''effacement (neuf informations, dont la levée après la clôture et K2)');

SELECT * FROM finish();
