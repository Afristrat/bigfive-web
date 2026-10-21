-- Décision d'Amine du 21/10/2026 (migration 0008) : un super administrateur en
-- ajoute un autre (Nezha, comme lui) et peut le retirer ; nul ne se retire
-- lui-même ; personne d'autre n'y touche ; chaque geste est journalisé.
-- Migration 0009 (revue de sécurité du commit aedacc5) : règles d'écriture de
-- tenga_owner liées à l'appelant réel (I4), verrou partagé sur la ligne de
-- l'appelant (M2), compte banni refusé (M3), et les refus qui manquaient :
-- écriture directe, service_role, identité nulle, argument NULL.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(45);

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
-- nx : sans aucun rôle. bn : compte banni (jusqu'à demain). bp : ban échu.
-- cb : second super administrateur (verrou du retrait). dx : écritures directes.
INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'ad@example.test'),
  ('c0000000-0000-4000-8000-000000000002', 'tg@example.test'),
  ('c0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('c0000000-0000-4000-8000-000000000004', 'nx@example.test'),
  ('c0000000-0000-4000-8000-000000000007', 'cb@example.test'),
  ('c0000000-0000-4000-8000-000000000008', 'dx@example.test');
INSERT INTO auth.users (id, email, banned_until) VALUES
  ('c0000000-0000-4000-8000-000000000005', 'bn@example.test', now() + interval '1 day'),
  ('c0000000-0000-4000-8000-000000000006', 'bp@example.test', now() - interval '1 day');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('c1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('c0000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-00000000000a', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('c0000000-0000-4000-8000-000000000001');

-- ===== Ajout =====
SELECT is((SELECT xmax::text FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000001'),
  '0', 'avant tout appel, la ligne de l''appelant n''est verrouillée par personne');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000002')::text$q$),
  'true', 'super administrateur : ajoute un second super administrateur');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000002'),
  1, 'la personne ajoutée figure dans private.tenga_admins');
SELECT isnt((SELECT xmax::text FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000001'),
  '0', 'ajouter pose un verrou partagé sur la ligne de l''appelant (M2)');
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

-- ===== Compte banni (M3) =====
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000005')::text$q$),
  'ERR:22023:Compte suspendu', 'un compte banni jusqu''à demain est refusé');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000005'),
  0, 'le compte banni ne figure pas dans private.tenga_admins');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000006')::text$q$),
  'true', 'un ban échu n''empêche pas l''ajout');

-- ===== Verrou partagé du retrait (M2) =====
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000007')::text$q$),
  'true', 'un second administrateur (cb) est ajouté pour l''essai du verrou');
SELECT is((SELECT xmax::text FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000007'),
  '0', 'la ligne de cb n''est verrouillée par personne avant son propre geste');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000007', 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'false', 'cb retire une personne qui n''est pas super administrateur : rien à retirer');
SELECT isnt((SELECT xmax::text FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000007'),
  '0', 'retirer pose un verrou partagé sur la ligne de l''appelant (M2)');

-- ===== Identité nulle et argument NULL =====
SELECT is(pg_temp.comme(NULL, 'authenticated',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:Connexion requise', 'ajouter sans identité : refusé');
SELECT is(pg_temp.comme(NULL, 'authenticated',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:Connexion requise', 'retirer sans identité : refusé');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.ajouter_admin_tenga(NULL)::text$q$),
  'ERR:22023:Compte inconnu', 'ajouter avec un argument NULL : refusé (22023)');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.retirer_admin_tenga(NULL)::text$q$),
  'false', 'retirer avec un argument NULL : rien à retirer');
SELECT is((SELECT count(*)::int FROM private.tenga_admins), 3,
  'après les essais NULL, les trois super administrateurs (ad, bp, cb) sont en place');

-- ===== service_role =====
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'service_role',
  $q$select app.ajouter_admin_tenga('c0000000-0000-4000-8000-000000000004')::text$q$),
  'ERR:42501:permission denied for function ajouter_admin_tenga', 'service_role n''exécute pas ajouter_admin_tenga');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'service_role',
  $q$select app.retirer_admin_tenga('c0000000-0000-4000-8000-000000000006')::text$q$),
  'ERR:42501:permission denied for function retirer_admin_tenga', 'service_role n''exécute pas retirer_admin_tenga');

-- ===== Écriture directe dans la table (verrous 1 à 3) =====
SELECT is(left(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$insert into private.tenga_admins (user_id) values ('c0000000-0000-4000-8000-000000000004')$q$), 10),
  'ERR:42501:', 'authenticated, même super administrateur : écriture directe refusée (INSERT)');
SELECT is(left(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$delete from private.tenga_admins where user_id = 'c0000000-0000-4000-8000-000000000006'$q$), 10),
  'ERR:42501:', 'authenticated, même super administrateur : écriture directe refusée (DELETE)');
SELECT is(left(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'service_role',
  $q$insert into private.tenga_admins (user_id) values ('c0000000-0000-4000-8000-000000000004')$q$), 10),
  'ERR:42501:', 'service_role : écriture directe refusée');

-- ===== Règles de tenga_owner liées à l'appelant réel (I4) =====
-- Sous tenga_owner (une autre fonction SECURITY DEFINER défaillante), l'écriture
-- ne passe que si l'identité de l'appelant est celle d'un super administrateur.
SELECT is(left(pg_temp.comme('c0000000-0000-4000-8000-000000000004', 'tenga_owner',
  $q$insert into private.tenga_admins (user_id) values ('c0000000-0000-4000-8000-000000000008')$q$), 10),
  'ERR:42501:', 'tenga_owner pour un non-administrateur : INSERT refusé par la règle');
SELECT is(left(pg_temp.comme(NULL, 'tenga_owner',
  $q$insert into private.tenga_admins (user_id) values ('c0000000-0000-4000-8000-000000000008')$q$), 10),
  'ERR:42501:', 'tenga_owner sans identité : INSERT refusé par la règle');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'tenga_owner',
  $q$insert into private.tenga_admins (user_id) values ('c0000000-0000-4000-8000-000000000008')$q$),
  'ok', 'tenga_owner pour un super administrateur : INSERT permis (la règle suit l''appelant)');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000008'),
  1, 'dx figure dans private.tenga_admins');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000004', 'tenga_owner',
  $q$delete from private.tenga_admins where user_id = 'c0000000-0000-4000-8000-000000000008'$q$),
  'ok', 'tenga_owner pour un non-administrateur : DELETE sans erreur, mais filtré par la règle');
SELECT is(pg_temp.comme(NULL, 'tenga_owner',
  $q$delete from private.tenga_admins where user_id = 'c0000000-0000-4000-8000-000000000008'$q$),
  'ok', 'tenga_owner sans identité : DELETE sans erreur, mais filtré par la règle');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000008'),
  1, 'dx est toujours là : aucune suppression sans identité de super administrateur');
SELECT is(left(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'tenga_owner',
  $q$update private.tenga_admins set ajoute_le = now()$q$), 10),
  'ERR:42501:', 'tenga_owner : aucune modification de private.tenga_admins, même pour un super administrateur');
SELECT is(pg_temp.comme('c0000000-0000-4000-8000-000000000001', 'tenga_owner',
  $q$delete from private.tenga_admins where user_id = 'c0000000-0000-4000-8000-000000000008'$q$),
  'ok', 'tenga_owner pour un super administrateur : DELETE permis (la règle suit l''appelant)');
SELECT is((SELECT count(*)::int FROM private.tenga_admins WHERE user_id = 'c0000000-0000-4000-8000-000000000008'),
  0, 'dx a été supprimé par le super administrateur');

SELECT * FROM finish();
