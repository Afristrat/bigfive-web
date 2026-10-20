-- Règle d'Amine du 20/10/2026 (migration 0007) : qui invite attribue ; nul ne
-- modifie son propre rôle ; un responsable ne touche pas au rôle d'un autre
-- responsable ; il reste toujours un administrateur Tenga.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(40);

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

-- Personnages. ad : administrateur Tenga (le super administrateur). ra : responsable
-- de A. rb : responsable de B. ca : consultant de A. pa, pb : participants de A.
-- ra2 : second responsable de A. nx : sans aucun rôle.
INSERT INTO auth.users (id, email) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('b0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('b0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('b0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('b0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('b0000000-0000-4000-8000-000000000007', 'ra2@example.test'),
  ('b0000000-0000-4000-8000-000000000008', 'ad@example.test'),
  ('b0000000-0000-4000-8000-000000000009', 'nx@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('b1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('b1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a', 'participant'),
  ('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-00000000000a', 'participant'),
  ('b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('b0000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('b0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-00000000000b', 'responsable'),
  ('b0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-00000000000a', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('b0000000-0000-4000-8000-000000000008');

-- ===== private.peut_attribuer : la matrice, ligne par ligne =====
SELECT is((SELECT private.peut_attribuer('b1000000-0000-4000-8000-00000000000a', 'responsable')), false, 'peut_attribuer sans identité (rôle de test) : faux');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated', $q$select private.peut_attribuer('b1000000-0000-4000-8000-00000000000b', 'responsable')::text$q$),
  'ERR:42501:permission denied for schema private', 'la fonction privée n''est pas appelable par l''API');

-- ===== Le responsable attribue consultant et participant dans SON organisation =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  '', 'responsable : donne participant à une personne sans rôle, dans son organisation');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'consultant')::text$q$),
  '', 'responsable : promeut ce participant consultant');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'b0000000-0000-4000-8000-000000000009' AND organization_id = 'b1000000-0000-4000-8000-00000000000a'),
  'consultant', 'le rôle posé est bien consultant');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  '', 'responsable : rétrograde consultant en participant');

-- ===== Ce que le responsable ne peut PAS faire =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a', 'responsable')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne nomme pas de responsable (D-R1)');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne rétrograde pas un autre responsable');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'b0000000-0000-4000-8000-000000000007'),
  'responsable', 'le second responsable est resté responsable');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000b', 'participant')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable de A : rien dans l''organisation B');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  'ERR:42501:Nul ne modifie son propre rôle', 'responsable : ne se rétrograde pas lui-même');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'administrateur')::text$q$),
  'ERR:22023:Rôle inconnu : responsable, consultant ou participant', 'rôle inconnu refusé avant tout contrôle de droit');
SELECT is(pg_temp.comme(NULL, 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  'ERR:42501:Connexion requise', 'sans identité : connexion requise');

-- ===== Consultant et participant : aucun pouvoir =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000004', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'consultant : n''attribue rien (D-R4)');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'participant : n''attribue rien à autrui');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a', 'responsable')::text$q$),
  'ERR:42501:Nul ne modifie son propre rôle', 'participant : ne se promeut pas lui-même');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000009', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000a', 'responsable')::text$q$),
  'ERR:42501:Nul ne modifie son propre rôle', 'personne sans rôle : ne s''en donne pas');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-00000000000a', 'consultant')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'participant : ne promeut pas un autre participant');

-- ===== Le super administrateur =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a', 'responsable')::text$q$),
  '', 'super administrateur : nomme un responsable (D-R1 ne le concerne pas)');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000007', 'b1000000-0000-4000-8000-00000000000a', 'participant')::text$q$),
  '', 'super administrateur : rétrograde un responsable');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000009', 'b1000000-0000-4000-8000-00000000000b', 'consultant')::text$q$),
  '', 'super administrateur : agit dans n''importe quelle organisation');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.attribuer_role('b0000000-0000-4000-8000-000000000008', 'b1000000-0000-4000-8000-00000000000a', 'responsable')::text$q$),
  'ERR:42501:Nul ne modifie son propre rôle', 'super administrateur : ne se donne pas de rôle à lui-même (D-R2)');

-- ===== Retrait =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'false', 'responsable : rien à retirer renvoie faux (la personne n''a pas de rôle dans A)');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'true', 'responsable : retire un participant de son organisation');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable : ne retire pas un autre responsable (la personne 001 est devenue responsable plus haut)');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'ERR:42501:Nul ne modifie son propre rôle', 'responsable : ne se retire pas lui-même');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-00000000000b')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'responsable de A : ne retire personne dans B, sans rien révéler de B');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000004', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'consultant : ne retire personne');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.retirer_role('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a')::text$q$),
  'true', 'super administrateur : retire un responsable');

-- ===== Journal =====
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'role.attribuer.responsable' AND acteur = 'b0000000-0000-4000-8000-000000000008'), 1,
  'la nomination d''un responsable est journalisée avec l''acteur, une fois');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'role.retirer'), 2,
  'les deux retraits réussis sont journalisés, pas les refus');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action LIKE 'role.%' AND acteur = 'b0000000-0000-4000-8000-000000000004'), 0,
  'les refus du consultant ne laissent aucune trace de rôle');

-- ===== Au moins un administrateur Tenga =====
INSERT INTO private.tenga_admins (user_id) VALUES ('b0000000-0000-4000-8000-000000000009');
SELECT lives_ok($$DELETE FROM private.tenga_admins WHERE user_id = 'b0000000-0000-4000-8000-000000000009'$$,
  'supprimer l''un de deux administrateurs : permis');
SELECT throws_ok($$DELETE FROM private.tenga_admins WHERE user_id = 'b0000000-0000-4000-8000-000000000008'$$,
  '23000', 'Il doit toujours rester un administrateur Tenga', 'supprimer le dernier administrateur : refusé');
INSERT INTO private.tenga_admins (user_id) VALUES ('b0000000-0000-4000-8000-000000000009');
SELECT throws_ok($$DELETE FROM private.tenga_admins$$,
  '23000', 'Il doit toujours rester un administrateur Tenga', 'supprimer les deux d''un seul coup : refusé (contrôle d''instruction, pas par ligne)');
SELECT is((SELECT count(*)::int FROM private.tenga_admins), 2, 'les deux administrateurs sont toujours là');
DELETE FROM private.tenga_admins WHERE false;
SELECT lives_ok($$DELETE FROM private.tenga_admins WHERE user_id = 'b0000000-0000-4000-8000-0000000000ff'$$,
  'une suppression à vide ne déclenche pas le garde');

-- ===== Structure =====
SELECT has_function('private', 'peut_attribuer', ARRAY['uuid', 'text'], 'private.peut_attribuer existe');
SELECT has_trigger('private', 'tenga_admins', 'tenga_admins_dernier', 'le garde du dernier administrateur est posé');
SELECT is((SELECT prosecdef FROM pg_proc WHERE proname = 'attribuer_role' AND pronamespace = 'app'::regnamespace), true, 'attribuer_role reste SECURITY DEFINER');

SELECT * FROM finish();
