-- Migration 0026 : courriel d'information aux membres d'un groupe qui n'ont pas pris
-- connaissance de l'information préalable (app.reseau_a_informer, app.reseau_courriels,
-- app.reseau_marquer_informes). Le fichier tourne aussi sur la production, qui contient
-- de vraies données : il ne compte que ses propres lignes (identifiants 46…).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(24);

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

-- u(1) à u(4) : membres du groupe G1 de K1 (organisation A) ; u(7) responsable A ; u(8)
-- consultant A ; u(9) consultant B ; u(10) administrateur Tenga ; u(11) participant B (KB).
CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('46000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.p(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('46400000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.org_a() RETURNS uuid LANGUAGE sql AS $$ SELECT '46100000-0000-4000-8000-00000000000a'::uuid $$;
CREATE FUNCTION pg_temp.org_b() RETURNS uuid LANGUAGE sql AS $$ SELECT '46100000-0000-4000-8000-00000000000b'::uuid $$;
CREATE FUNCTION pg_temp.k1() RETURNS uuid LANGUAGE sql AS $$ SELECT '46200000-0000-4000-8000-0000000000a1'::uuid $$;
CREATE FUNCTION pg_temp.kb() RETURNS uuid LANGUAGE sql AS $$ SELECT '46200000-0000-4000-8000-0000000000b1'::uuid $$;
CREATE FUNCTION pg_temp.g1() RETURNS uuid LANGUAGE sql AS $$ SELECT '46300000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.gb() RETURNS uuid LANGUAGE sql AS $$ SELECT '46300000-0000-4000-8000-00000000000b'::uuid $$;

CREATE FUNCTION pg_temp.a_inf(p_uid uuid, p_role text DEFAULT 'authenticated') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select count(*)::text from app.reseau_a_informer(%L)', pg_temp.k1()))
$$;
CREATE FUNCTION pg_temp.cour(p_acteur uuid, p_parts uuid[], p_role text DEFAULT 'service_role', p_expr text DEFAULT 'count(*)::text') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(pg_temp.u(8), p_role,
    format('select %s from app.reseau_courriels(%L, %L, %L::uuid[]) x', p_expr, p_acteur, pg_temp.k1(), p_parts))
$$;
CREATE FUNCTION pg_temp.marq(p_uid uuid, p_parts uuid[], p_role text DEFAULT 'authenticated') RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.reseau_marquer_informes(%L, %L::uuid[])::text', pg_temp.k1(), p_parts))
$$;
CREATE FUNCTION pg_temp.journal(p_action text) RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM pg_temp.journal_test l WHERE l.action = p_action AND l.organization_id = pg_temp.org_a()
$$;
CREATE FUNCTION pg_temp.refus() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga'
$$;

-- Fixtures.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (pg_temp.u(1), 'courriel-a@example.test', '{"nom": "Alice"}'),
  (pg_temp.u(2), 'courriel-b@example.test', '{"nom": "Bruno"}'),
  (pg_temp.u(3), 'courriel-c@example.test', '{"nom": "Camille"}'),
  (pg_temp.u(4), 'courriel-d@example.test', '{"nom": "Driss"}'),
  (pg_temp.u(7), 'courriel-ra@example.test', '{}'),
  (pg_temp.u(8), 'courriel-ca@example.test', '{}'),
  (pg_temp.u(9), 'courriel-cx@example.test', '{}'),
  (pg_temp.u(10), 'courriel-ad@example.test', '{}'),
  (pg_temp.u(11), 'courriel-qb@example.test', '{"nom": "Hamza"}');
INSERT INTO app.organizations (id, slug, nom) VALUES
  (pg_temp.org_a(), 'courriel-essai-a', 'Organisation courriel A'),
  (pg_temp.org_b(), 'courriel-essai-b', 'Organisation courriel B');
INSERT INTO app.memberships (user_id, organization_id, role)
SELECT pg_temp.u(n), pg_temp.org_a(), 'participant' FROM unnest(ARRAY[1, 2, 3, 4]) n;
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  (pg_temp.u(7), pg_temp.org_a(), 'responsable'),
  (pg_temp.u(8), pg_temp.org_a(), 'consultant'),
  (pg_temp.u(9), pg_temp.org_b(), 'consultant'),
  (pg_temp.u(11), pg_temp.org_b(), 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES (pg_temp.u(10));
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  (pg_temp.k1(), pg_temp.org_a(), 'Courriel A1'),
  (pg_temp.kb(), pg_temp.org_b(), 'Courriel B1');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id)
SELECT pg_temp.p(n), pg_temp.k1(), pg_temp.org_a(), pg_temp.u(n) FROM unnest(ARRAY[1, 2, 3, 4]) n;
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  (pg_temp.p(11), pg_temp.kb(), pg_temp.org_b(), pg_temp.u(11));
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  (pg_temp.g1(), pg_temp.k1(), pg_temp.org_a(), 'Équipe 1', 1),
  (pg_temp.gb(), pg_temp.kb(), pg_temp.org_b(), 'Équipe B', 1);
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
SELECT pg_temp.g1(), pg_temp.k1(), pg_temp.org_a(), pg_temp.p(n) FROM unnest(ARRAY[1, 2, 3, 4]) n;
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
  (pg_temp.gb(), pg_temp.kb(), pg_temp.org_b(), pg_temp.p(11));
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id IN (pg_temp.k1(), pg_temp.kb());

-- ===== Structure =====
SELECT is(
  (SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                     || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                     || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
                     E'\n' ORDER BY p.proname)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND p.proname IN ('reseau_a_informer', 'reseau_courriels', 'reseau_marquer_informes')),
  $f$reseau_a_informer|true|v|true|tenga_owner|false|false|false|true
reseau_courriels|true|s|true|tenga_owner|false|false|true|false
reseau_marquer_informes|true|v|true|tenga_owner|false|false|false|true$f$,
  'trois fonctions : définisseur, chemin vide, tenga_owner ; adresses réservées à service_role, le reste à authenticated');
SELECT is(pg_get_function_result('app.reseau_a_informer(uuid)'::regprocedure), 'TABLE(participation_id uuid, langue text)',
  'la liste à informer ne rend ni adresse ni nom');

-- ===== Relevé fermé =====
SELECT is(pg_temp.a_inf(pg_temp.u(8)), 'ERR:55000:Relevé fermé', 'relevé fermé : la liste à informer est refusée');
SELECT is(pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(1)]::uuid[]), 'ERR:55000:Relevé fermé', 'relevé fermé : les adresses sont refusées');

UPDATE private.settings SET reseau_releve_ouvert = true;

-- ===== Liste à informer =====
SELECT is(pg_temp.a_inf(pg_temp.u(8)), '4', 'le consultant de l''organisation voit les quatre membres du groupe à informer');
SELECT is(pg_temp.a_inf(pg_temp.u(10)), '4', 'l''administrateur Tenga aussi');
SELECT is(pg_temp.a_inf(pg_temp.u(1)), pg_temp.refus(), 'un participant est refusé');
SELECT is(pg_temp.a_inf(pg_temp.u(9)), pg_temp.refus(), 'le consultant d''une autre organisation est refusé');
SELECT is(pg_temp.a_inf(pg_temp.u(7)), pg_temp.refus(), 'le responsable est refusé');
SELECT is(pg_temp.a_inf(pg_temp.u(8), 'anon'), 'ERR:42501:permission denied for schema app', 'l''anonyme est refusé');
SELECT is(pg_temp.comme(pg_temp.u(8), 'authenticated',
    format('select string_agg(distinct x.langue, '','') from app.reseau_a_informer(%L) x', pg_temp.k1())),
  'fr', 'sans profil, la langue est le français');

-- ===== Adresses =====
SELECT is(pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(1)]::uuid[], 'authenticated'),
  'ERR:42501:permission denied for function reseau_courriels', 'le rôle connecté ne peut pas demander d''adresse');
SELECT is(pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(1), pg_temp.p(2)]::uuid[]), '2', 'le serveur obtient les deux adresses demandées');
SELECT is(pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(1), pg_temp.p(2)]::uuid[], 'service_role',
    'string_agg(x.courriel, '','' ORDER BY x.courriel)'),
  'courriel-a@example.test,courriel-b@example.test', 'ce sont les bonnes adresses');
SELECT is(pg_temp.cour(pg_temp.u(9), ARRAY[pg_temp.p(1)]::uuid[]), pg_temp.refus(), 'acteur consultant d''une autre organisation refusé');
SELECT is(pg_temp.cour(pg_temp.u(1), ARRAY[pg_temp.p(1)]::uuid[]), pg_temp.refus(), 'acteur participant refusé');
SELECT is(pg_temp.cour(NULL, ARRAY[pg_temp.p(1)]::uuid[]), 'ERR:42501:Acteur requis', 'acteur absent refusé');
SELECT is(pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(11)]::uuid[]), '0', 'une participation d''une autre campagne ne rend aucune adresse');

-- ===== Information déjà prise, envois inscrits =====
SELECT pg_temp.comme(pg_temp.u(3), 'authenticated', format('select app.reseau_informer(%L, false)', pg_temp.p(3)));
SELECT is(pg_temp.a_inf(pg_temp.u(8)), '3', 'une personne qui a pris connaissance de l''information n''est plus à informer');
SELECT is(pg_temp.marq(pg_temp.u(8), ARRAY[pg_temp.p(1), pg_temp.p(2), pg_temp.p(11)]::uuid[]), '2',
  'deux envois inscrits ; la participation étrangère est ignorée');
SELECT is(pg_temp.marq(pg_temp.u(8), ARRAY[pg_temp.p(1), pg_temp.p(2)]::uuid[]), '0', 'aucun doublon à la seconde inscription');
SELECT is(pg_temp.journal('reseau.courriel_information'), 2, 'deux traces dans le journal, une par personne');
SELECT is(pg_temp.a_inf(pg_temp.u(8)) || '/' || pg_temp.cour(pg_temp.u(8), ARRAY[pg_temp.p(1), pg_temp.p(2), pg_temp.p(3), pg_temp.p(4)]::uuid[]),
  '1/1', 'reste Driss seul, dans la liste comme dans les adresses');
SELECT is(pg_temp.marq(pg_temp.u(1), ARRAY[pg_temp.p(4)]::uuid[]), pg_temp.refus(), 'un participant n''inscrit aucun envoi');

SELECT * FROM finish();
