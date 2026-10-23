-- Décision I2 (migration 0012) : un responsable d'organisation n'attribue plus que
-- le rôle participant. Consultant et responsable sont nommés par l'administrateur
-- Tenga seul : un consultant lit tous les résultats individuels nominatifs de
-- l'organisation, le courriel promet aux participants que seul « le consultant
-- Tenga affecté » les voit.
-- Ce fichier éprouve : le refus (42501) de consultant et de responsable pour le
-- responsable, par app.attribuer_role ; participant toujours accepté (attribuer,
-- rejouer, rétrograder un consultant, inviter à une campagne, retirer) ;
-- l'administrateur Tenga garde les trois rôles ; un consultant et un participant
-- restent refusés pour tout. app.inviter ne prend pas de rôle (il crée seulement
-- une invitation de participant et relève de private.peut_gerer) : son
-- comportement est donc éprouvé inchangé, pas refusé.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(38);

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

-- Attribution d'un rôle par un appelant : renvoie '' ou « ERR:... ».
CREATE FUNCTION pg_temp.attribuer(p_uid uuid, p_cible uuid, p_org uuid, p_role text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format($q$select app.attribuer_role(%L, %L, %L)::text$q$, p_cible, p_org, p_role))
$$;

CREATE FUNCTION pg_temp.role_de(p_uid uuid, p_org uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT COALESCE((SELECT m.role FROM app.memberships m WHERE m.user_id = p_uid AND m.organization_id = p_org), 'aucun')
$$;

-- Personnages. ra : responsable de A. rb : responsable de B. ca : consultant de A.
-- c2 : second consultant de A. pa : participant de A. ad : administrateur Tenga.
-- n1, n2 : sans aucun rôle (cibles des attributions).
INSERT INTO auth.users (id, email) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('d0000000-0000-4000-8000-000000000002', 'ra@example.test'),
  ('d0000000-0000-4000-8000-000000000003', 'ca@example.test'),
  ('d0000000-0000-4000-8000-000000000004', 'ad@example.test'),
  ('d0000000-0000-4000-8000-000000000005', 'n1@example.test'),
  ('d0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('d0000000-0000-4000-8000-000000000007', 'c2@example.test'),
  ('d0000000-0000-4000-8000-000000000008', 'n2@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('d1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('d1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  ('d0000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('d0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('d0000000-0000-4000-8000-000000000006', 'd1000000-0000-4000-8000-00000000000b', 'responsable'),
  ('d0000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-00000000000a', 'consultant');
INSERT INTO private.tenga_admins (user_id) VALUES ('d0000000-0000-4000-8000-000000000004');
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  ('d2000000-0000-4000-8000-0000000000a1', 'd1000000-0000-4000-8000-00000000000a', 'Campagne A');
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now()
 WHERE id = 'd2000000-0000-4000-8000-0000000000a1';

-- ===== Le responsable ne nomme ni consultant ni responsable =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne nomme pas consultant une personne sans rôle');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne nomme pas responsable une personne sans rôle');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a'), 'aucun',
  'les deux refus n''ont laissé aucune appartenance');

-- ===== Le responsable attribue participant =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  '', 'responsable : donne participant à une personne sans rôle');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a'), 'participant',
  'le rôle posé est participant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  '', 'responsable : rejouer participant reste permis');

-- ===== Il ne promeut pas un participant existant =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne promeut pas ce participant consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne promeut pas non plus l''autre participant consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne promeut pas ce participant responsable');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a'), 'participant',
  'le participant est resté participant');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-00000000000a'), 'participant',
  'l''autre participant est resté participant');

-- ===== Un consultant déjà nommé : participant permis (retrait de pouvoir), consultant refusé =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne renomme pas consultant un consultant');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-00000000000a'), 'consultant',
  'le consultant est resté consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  '', 'responsable : rétrograde un consultant en participant (il retire un pouvoir, il n''en donne pas)');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000007', 'd1000000-0000-4000-8000-00000000000a'), 'participant',
  'le consultant rétrogradé est participant');

-- ===== Le responsable d'une autre organisation : rien dans A =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable de B : ne nomme pas consultant dans A');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable de B : ne nomme pas participant dans A');

-- ===== Inviter à une campagne et retirer un participant : inchangés =====
SELECT matches(pg_temp.comme('d0000000-0000-4000-8000-000000000002', 'authenticated',
  $q$select jeton from app.inviter('d2000000-0000-4000-8000-0000000000a1', 'invite@example.test', 'Prénom')$q$),
  '^[A-Za-z0-9_-]{43}$', 'responsable : invite toujours à passer le test (invitation de participant)');
SELECT is((SELECT count(*)::int FROM app.memberships WHERE organization_id = 'd1000000-0000-4000-8000-00000000000a' AND role = 'consultant'), 1,
  'l''invitation ne crée aucun consultant : seul le consultant d''origine subsiste');
SELECT is(pg_temp.comme('d0000000-0000-4000-8000-000000000002', 'authenticated',
  $q$select app.retirer_role('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a')::text$q$),
  'true', 'responsable : retire toujours un participant de son organisation');

-- ===== L'administrateur Tenga garde les trois rôles =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  '', 'administrateur Tenga : nomme consultant');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a'), 'consultant',
  'le rôle posé est consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  '', 'administrateur Tenga : nomme responsable');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a'), 'responsable',
  'le rôle posé est responsable');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000005', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  '', 'administrateur Tenga : nomme participant (et rétrograde un responsable)');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000b', 'consultant'),
  '', 'administrateur Tenga : nomme consultant dans n''importe quelle organisation');

-- ===== Un consultant et un participant restent refusés pour tout =====
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'consultant : ne nomme pas participant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'consultant : ne nomme pas consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'consultant : ne nomme pas responsable');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'participant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'participant : ne nomme pas participant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'consultant'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'participant : ne nomme pas consultant');
SELECT is(pg_temp.attribuer('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a', 'responsable'),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'participant : ne nomme pas responsable');
SELECT is(pg_temp.role_de('d0000000-0000-4000-8000-000000000008', 'd1000000-0000-4000-8000-00000000000a'), 'aucun',
  'les six refus n''ont laissé aucune appartenance dans A');

-- ===== Journal : seuls les gestes réussis laissent une trace =====
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'role.attribuer.consultant' AND acteur = 'd0000000-0000-4000-8000-000000000002'), 0,
  'aucune nomination de consultant n''est journalisée au nom du responsable');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'role.attribuer.consultant' AND acteur = 'd0000000-0000-4000-8000-000000000004'), 2,
  'les deux nominations de consultant de l''administrateur sont journalisées avec leur acteur');

-- ===== Structure : la règle tient dans private.peut_attribuer, seul point de décision =====
SELECT has_function('private', 'peut_attribuer', ARRAY['uuid', 'text'], 'private.peut_attribuer existe');
SELECT ok(pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure) LIKE '%p_role = ''participant''%',
  'la règle du responsable nomme le seul rôle participant');
SELECT ok(pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure) NOT LIKE '%''consultant''%',
  'private.peut_attribuer ne cite plus consultant');

SELECT * FROM finish();
