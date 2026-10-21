-- Décision d'Amine du 21/10/2026 (migration 0008) : un super administrateur en
-- ajoute un autre (Nezha, comme lui) et peut le retirer ; nul ne se retire
-- lui-même ; personne d'autre n'y touche ; chaque geste est journalisé.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(16);

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

-- ad : super administrateur. tg : la personne à ajouter. ra : responsable de A.
-- nx : sans aucun rôle.
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'ad@example.test'),
  ('c0000000-0000-4000-8000-000000000002', 'tg@example.test'),
  ('c0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('c0000000-0000-4000-8000-000000000004', 'nx@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('c1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-00000000000a', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('c0000000-0000-4000-8000-000000000001');

-- ===== Ajout =====
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'true', 'super administrateur : ajoute un second super administrateur');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000002'),
  1, 'la personne ajoutée figure dans private.tenga_admins');
SELECT is((SELECT count(*)::int FROM private.audit_log
            WHERE action = 'admin.ajouter' AND acteur = 'c0000000-0000-4000-8000-000000000001'
              AND ressource_id = 'c0000000-0000-4000-8000-000000000002'),
  1, 'l''ajout est inscrit au journal');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'false', 'un second ajout de la même personne ne fait rien et ne journalise pas');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'admin.ajouter' AND acteur = 'c0000000-0000-4000-8000-000000000001'),
  1, 'toujours une seule ligne de journal pour l''ajout');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:Réservé aux administrateurs Tenga', 'un responsable n''ajoute pas de super administrateur');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000004', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:Réservé aux administrateurs Tenga', 'personne ne se donne le statut à soi-même');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-0000000000ff')::text$q$),
  'ERR:22023:Compte inconnu', 'un compte inexistant est refusé');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'anon',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas la fonction');

-- ===== Retrait =====
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000001')::text$q$),
  'ERR:42501:Nul ne retire son propre statut d''administrateur', 'nul ne retire son propre statut');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'ERR:42501:Réservé aux administrateurs Tenga', 'un responsable ne retire pas un super administrateur');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'true', 'super administrateur : en retire un autre');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000002'),
  0, 'la personne retirée ne figure plus dans private.tenga_admins');
SELECT is((SELECT count(*)::int FROM private.audit_log
            WHERE action = 'admin.retirer' AND acteur = 'c0000000-0000-4000-8000-000000000001'
              AND ressource_id = 'c0000000-0000-4000-8000-000000000002'),
  1, 'le retrait est inscrit au journal');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'false', 'retirer une personne qui n''est pas super administrateur ne fait rien');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000001'),
  1, 'le super administrateur d''origine reste en place');

SELECT * FROM finish();
