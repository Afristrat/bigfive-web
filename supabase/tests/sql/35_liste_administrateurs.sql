-- Migration 0010 : app.lister_administrateurs_tenga(). Un super administrateur
-- liste les super administrateurs (identifiant, adresse, date d'ajout, indicateur
-- « est_moi ») pour l'écran de retrait et pour notifier les autres d'un ajout.
-- Réservé aux super administrateurs ; l'adresse est une donnée personnelle :
-- chaque consultation est journalisée, sans adresse ; aucune autre colonne ne sort.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(22);

-- Base vivante : administrateurs Tenga réels présents avant les fixtures.
CREATE TEMP TABLE admins_avant AS SELECT user_id FROM private.tenga_admins;

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

-- ad, cb, cc : super administrateurs ajoutés dans l'ordre cc, ad, cb (dates
-- explicites : now() est identique dans toute la transaction). ra : responsable.
-- nx : sans aucun rôle.
INSERT INTO auth.users (id, email) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'ad@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'cb@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'cc@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'ra@example.test'),
  ('d0000000-0000-4000-8000-000000000005', 'nx@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('d1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('d0000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-00000000000a', 'responsable');
INSERT INTO private.tenga_admins (user_id, ajoute_le) VALUES
  ('d0000000-0000-4000-8000-000000000003', '2026-01-01 10:00:00+00'),
  ('d0000000-0000-4000-8000-000000000001', '2026-02-01 10:00:00+00'),
  ('d0000000-0000-4000-8000-000000000002', '2026-03-01 10:00:00+00');

-- Base vivante : les administrateurs Tenga réels sont mis hors jeu DANS cette transaction
-- annulée (rien n'est écrit durablement), une fois les administrateurs des fixtures posés,
-- pour que les comptes et le garde du dernier administrateur portent sur les seules fixtures.
DELETE FROM private.tenga_admins WHERE user_id IN (SELECT user_id FROM pg_temp.admins_avant);

-- ===== Journal : une consultation, une ligne, sans adresse =====
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'admin.lister'),
  0, 'avant tout appel, aucune consultation au journal');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  'select count(*) from app.lister_administrateurs_tenga()'),
  '3', 'super administrateur : voit les trois lignes');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'admin.lister' AND acteur = 'd0000000-0000-4000-8000-000000000001'),
  1, 'la consultation est inscrite au journal, une ligne');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'admin.lister'),
  3, 'la ligne de journal porte le nombre de lignes rendues');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l
            WHERE l.action = 'admin.lister' AND to_jsonb(l)::text ~ '@'),
  0, 'la ligne de journal ne contient aucune adresse');

-- ===== Contenu, colonnes, ordre =====
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select (select string_agg(k, ',' order by k) from jsonb_object_keys(to_jsonb(t)) k) from app.lister_administrateurs_tenga() t limit 1$q$),
  'adresse,ajoute_le,est_moi,user_id', 'aucune colonne en plus des quatre colonnes prévues');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select string_agg(x.user_id::text, ',') from app.lister_administrateurs_tenga() x$q$),
  'd0000000-0000-4000-8000-000000000003,d0000000-0000-4000-8000-000000000001,d0000000-0000-4000-8000-000000000002',
  'triée par date d''ajout (cc, ad, cb), et non par identifiant');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select string_agg(x.adresse, ',') from app.lister_administrateurs_tenga() x$q$),
  'cc@example.test,ad@example.test,cb@example.test', 'chaque ligne porte l''adresse de son compte');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  'select count(*) from app.lister_administrateurs_tenga() x where x.est_moi'),
  '1', 'est_moi est vrai pour une seule ligne');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select string_agg(x.user_id::text, ',') from app.lister_administrateurs_tenga() x where x.est_moi$q$),
  'd0000000-0000-4000-8000-000000000001', 'est_moi est vrai pour la ligne de l''appelant (ad)');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000002', 'authenticated',
  $q$select string_agg(x.user_id::text, ',') from app.lister_administrateurs_tenga() x where x.est_moi$q$),
  'd0000000-0000-4000-8000-000000000002', 'pour un autre appelant (cb), est_moi suit l''appelant');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'admin.lister' AND acteur = 'd0000000-0000-4000-8000-000000000002'),
  1, 'le journal retient l''appelant réel comme acteur');

-- ===== Refus =====
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000004', 'authenticated',
  'select count(*) from app.lister_administrateurs_tenga()'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'un responsable ne liste pas les super administrateurs');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000005', 'authenticated',
  'select count(*) from app.lister_administrateurs_tenga()'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'un compte sans rôle ne liste pas les super administrateurs');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'anon',
  'select count(*) from app.lister_administrateurs_tenga()'),
  'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas la fonction');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000001', 'service_role',
  'select count(*) from app.lister_administrateurs_tenga()'),
  'ERR:42501:permission denied for function lister_administrateurs_tenga', 'service_role n''exécute pas la fonction, même sous l''identité d''un super administrateur');
SELECT is(pg_temp.comme(NULL, 'authenticated',
  'select count(*) from app.lister_administrateurs_tenga()'),
  'ERR:42501:Connexion requise', 'sans identité : refusé');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'admin.lister'
              AND (acteur IN ('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005') OR acteur IS NULL)),
  0, 'un refus n''inscrit aucune consultation au journal');

-- ===== Droits d'exécution =====
SELECT is(has_function_privilege('anon', 'app.lister_administrateurs_tenga()', 'EXECUTE'),
  false, 'anon n''a pas le droit d''exécution');
SELECT is(has_function_privilege('public', 'app.lister_administrateurs_tenga()', 'EXECUTE'),
  false, 'PUBLIC n''a pas le droit d''exécution');
SELECT is(has_function_privilege('service_role', 'app.lister_administrateurs_tenga()', 'EXECUTE'),
  false, 'service_role n''a pas le droit d''exécution');
SELECT is(has_function_privilege('authenticated', 'app.lister_administrateurs_tenga()', 'EXECUTE'),
  true, 'authenticated a le droit d''exécution (le contrôle d''administrateur est dans la fonction)');

SELECT * FROM finish();
