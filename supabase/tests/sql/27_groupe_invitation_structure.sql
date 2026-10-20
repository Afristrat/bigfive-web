-- Migration 0006, structure : le groupe est PORTÉ PAR L'INVITATION. Colonne
-- app.invitations.group_id (clé composite avec la campagne, nullable, immuable
-- hormis l'effacement à l'acceptation), signatures figées de app.inviter et
-- app.accepter_invitation, droits d'exécution, passage unique du gel de la
-- composition (lu dans les données, jamais un drapeau de session), règle de
-- lecture de la composition réduite à l'administrateur Tenga.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh. Aucun
-- comptage global de tables de données réelles : seuls des identifiants et des
-- adresses @example.test créés ici sont comptés.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(42);

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

-- ===== Colonne et contraintes =====
SELECT is(
  (SELECT a.atttypid::regtype::text || '|' || a.attnotnull::text FROM pg_attribute a
    WHERE a.attrelid = 'app.invitations'::regclass AND a.attname = 'group_id' AND NOT a.attisdropped),
  'uuid|false', 'app.invitations.group_id existe, de type uuid, nullable (une campagne peut n''avoir aucun groupe)');
SELECT is(
  (SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.conrelid = 'app.invitations'::regclass AND c.conname = 'invitations_groupe_fkey'),
  'FOREIGN KEY (group_id, campaign_id) REFERENCES app.groups(id, campaign_id)',
  'le groupe d''une invitation est relié par une clé COMPOSITE avec la campagne : un groupe d''une autre campagne est impossible');
SELECT is(
  (SELECT count(*)::int FROM pg_constraint c WHERE c.conrelid = 'app.invitations'::regclass AND c.conname = 'invitations_groupe_efface_check'
      AND pg_get_constraintdef(c.oid) LIKE '%acceptee_le IS NULL%group_id IS NULL%'),
  1, 'contrainte : une invitation acceptée ne porte plus de groupe (effacé comme l''adresse et le prénom)');
SELECT is(
  (SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
    WHERE t.tgrelid = 'app.invitations'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O'),
  'invitations_sans_ecriture_api,invitations_sans_vidage_api,invitations_verrou_groupe',
  'déclencheurs de app.invitations, figés et actifs (le verrou de l''API se déclenche avant celui du groupe)');
SELECT is(
  (SELECT (t.tgtype & 1)::int || '|' || (t.tgtype & 2)::int || '|' || (t.tgtype & 16)::int FROM pg_trigger t
    WHERE t.tgrelid = 'app.invitations'::regclass AND t.tgname = 'invitations_verrou_groupe'),
  '1|2|16', 'le verrou du groupe se déclenche AVANT chaque UPDATE, par ligne');

-- ===== Signatures et droits =====
SELECT is(
  (SELECT count(*)::int FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.proname = 'inviter'),
  1, 'app.inviter n''a qu''une seule signature (la cinquième est remplacée, pas doublée)');
SELECT is(
  (SELECT pg_get_function_identity_arguments(p.oid) || '|' || p.pronargdefaults::text FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.proname = 'inviter'),
  'p_campagne uuid, p_email text, p_prenom text, p_message text, p_langue text, p_groupe uuid|4',
  'signature figée d''app.inviter : p_groupe en dernier, quatre paramètres facultatifs (les appels à cinq arguments restent valables)');
SELECT is(
  (SELECT pg_get_function_identity_arguments(p.oid) || '->' || p.prorettype::regtype::text FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.proname = 'accepter_invitation'),
  'p_jeton text, p_utilisateur uuid->uuid', 'signature figée d''app.accepter_invitation, inchangée : elle renvoie toujours la participation');
SELECT is(
  (SELECT string_agg(r.rol || '=' || has_function_privilege(r.rol, 'app.inviter(uuid,text,text,text,text,uuid)'::regprocedure, 'EXECUTE')::text, ',' ORDER BY r.rol)
     FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'public']) AS r(rol)),
  'anon=false,authenticated=true,public=false,service_role=false', 'app.inviter : le rôle connecté seul l''exécute');
SELECT is(
  (SELECT string_agg(r.rol || '=' || has_function_privilege(r.rol, 'app.accepter_invitation(text,uuid)'::regprocedure, 'EXECUTE')::text, ',' ORDER BY r.rol)
     FROM unnest(ARRAY['anon', 'authenticated', 'service_role', 'public']) AS r(rol)),
  'anon=false,authenticated=false,public=false,service_role=true', 'app.accepter_invitation : le serveur seul l''exécute');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.proname IN ('inviter', 'accepter_invitation')
      AND p.prosecdef AND 'search_path=""' = ANY (COALESCE(p.proconfig, '{}')) AND p.proowner = 'tenga_owner'::regrole),
  2, 'inviter et accepter_invitation : SECURITY DEFINER, search_path vide, propriété de tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p WHERE p.pronamespace = 'private'::regnamespace AND p.proname = 'verrouiller_groupe_invitation'
      AND 'search_path=""' = ANY (COALESCE(p.proconfig, '{}'))
      AND NOT has_function_privilege('anon', p.oid, 'EXECUTE') AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE') AND NOT has_function_privilege('public', p.oid, 'EXECUTE')),
  1, 'la fonction du verrou du groupe épingle un search_path vide et n''est exécutable par aucun rôle de l''API');

-- ===== Un seul chemin d'écriture de la composition, et il se lit dans les données =====
SELECT is(
  (SELECT string_agg(p.proname, ',' ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND p.prosrc ~* 'insert\s+into\s+app\.group_members'),
  'accepter_invitation,affecter_membre',
  'seules app.affecter_membre (brouillon) et app.accepter_invitation (composition portée par l''invitation) écrivent dans app.group_members');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p WHERE p.oid = 'private.geler_composition()'::regprocedure AND p.prosrc ~* 'current_setting|set_config'),
  0, 'le gel ne lit aucun drapeau de session : le passage unique se lit dans les données (invitation en attente qui porte le groupe)');
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'app' AND tablename = 'group_members' AND 'authenticated' = ANY (roles)),
  1, 'app.group_members n''a qu''une règle de lecture pour le rôle connecté');
SELECT is(
  (SELECT regexp_replace(qual, '\s+', ' ', 'g') FROM pg_policies WHERE schemaname = 'app' AND tablename = 'group_members' AND policyname = 'group_members_lecture'),
  '( SELECT app.suis_admin_tenga() AS suis_admin_tenga)',
  'la composition ne se lit QUE par l''administrateur Tenga : aucun rôle d''organisation (le responsable ne voit pas qui est dans quel groupe)');

-- Cadre : fixtures (superutilisateur)
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000011', 'nour@example.test'),
  ('a0000000-0000-4000-8000-000000000012', 'sami@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable');
-- Campagnes A1 et A2 (organisation A), B1 (organisation B) : groupes créés en brouillon, puis ouverture.
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1'),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A2'),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Campagne B1');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Direction A1', 0),
  ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Production A1', 1),
  ('f0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Direction A2', 0),
  ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Direction B1', 0);
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now()
 WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000b1');

-- ===== Clé composite : groupe de la campagne seulement =====
SELECT lives_ok($$INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES ('e0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'nour@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-1'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000a1')$$,
  'une invitation porte un groupe de sa campagne');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'autre@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-2'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000a3')$$,
  '23503', NULL, 'un groupe d''une AUTRE campagne de la même organisation est refusé (clé composite)');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'autre@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-3'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000b1')$$,
  '23503', NULL, 'un groupe d''une autre organisation est refusé (clé composite)');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'autre@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-4'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000ff')$$,
  '23503', NULL, 'un groupe inexistant est refusé');
SELECT lives_ok($$INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('e0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'sami@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-5'), now() + interval '14 days')$$,
  'une invitation sans groupe reste valable (campagne sans groupe, ou personne hors groupe)');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id, acceptee_le, acceptee_par) VALUES ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', NULL, 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-6'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000a1', now(), 'a0000000-0000-4000-8000-000000000011')$$,
  '23514', NULL, 'une invitation acceptée ne peut pas porter de groupe (contrainte)');

-- ===== Immutabilité de group_id =====
SELECT throws_ok($$UPDATE app.invitations SET group_id = 'f0000000-0000-4000-8000-0000000000a2' WHERE id = 'e0000000-0000-4000-8000-0000000000a1'$$,
  '55000', 'Le groupe d''une invitation ne change pas', 'group_id ne se change pas vers un autre groupe, même pour le superutilisateur');
SELECT throws_ok($$UPDATE app.invitations SET group_id = NULL WHERE id = 'e0000000-0000-4000-8000-0000000000a1'$$,
  '55000', 'Le groupe d''une invitation ne change pas', 'group_id ne s''efface pas sur une invitation en attente');
SELECT throws_ok($$UPDATE app.invitations SET group_id = 'f0000000-0000-4000-8000-0000000000a1' WHERE id = 'e0000000-0000-4000-8000-0000000000a2'$$,
  '55000', 'Le groupe d''une invitation ne change pas', 'un groupe ne se pose pas après coup sur une invitation sans groupe');
SELECT throws_ok($$UPDATE app.invitations SET group_id = NULL, acceptee_le = NULL WHERE id = 'e0000000-0000-4000-8000-0000000000a1'$$,
  '55000', 'Le groupe d''une invitation ne change pas', 'l''effacement du groupe sans acceptation est refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$update app.invitations set group_id = null$q$),
  'ERR:42501:permission denied for table invitations', 'le rôle connecté (même responsable) n''a aucun droit d''UPDATE sur les invitations');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$update app.invitations set group_id = null$q$),
  'ERR:42501:permission denied for table invitations', 'le serveur n''a aucun droit d''UPDATE sur les invitations');
SELECT lives_ok($$UPDATE app.invitations SET email = NULL, prenom = NULL, group_id = NULL, acceptee_le = now(), acceptee_par = 'a0000000-0000-4000-8000-000000000011' WHERE id = 'e0000000-0000-4000-8000-0000000000a1'$$,
  'seule exception : l''acceptation efface le groupe avec l''adresse et le prénom');
SELECT throws_ok($$UPDATE app.invitations SET group_id = 'f0000000-0000-4000-8000-0000000000a1' WHERE id = 'e0000000-0000-4000-8000-0000000000a1'$$,
  '55000', 'Le groupe d''une invitation ne change pas', 'après l''acceptation, aucun groupe ne revient sur l''invitation (aucun lien vers l''identité)');
SELECT is((SELECT (group_id IS NULL)::text || '|' || (email IS NULL)::text FROM app.invitations WHERE id = 'e0000000-0000-4000-8000-0000000000a1'),
  'true|true', 'l''invitation acceptée ne porte ni groupe ni adresse');

-- ===== Gel : le superutilisateur lui-même n'écrit pas une composition libre en campagne ouverte =====
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000011'),
  ('d0000000-0000-4000-8000-000000000012', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000012');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000011')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'affectation libre refusée : participation sans invitation (campagne ouverte)');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000012')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'affectation libre refusée : participation reliée à une invitation sans groupe');
UPDATE app.participations SET invitation_id = 'e0000000-0000-4000-8000-0000000000a2' WHERE id = 'd0000000-0000-4000-8000-000000000012';
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000012')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'l''invitation de la personne ne porte aucun groupe : pas de composition');
-- Une invitation EN ATTENTE qui porte le groupe G1, reliée à la participation (état transitoire d'une acceptation) :
UPDATE app.participations SET invitation_id = NULL WHERE id = 'd0000000-0000-4000-8000-000000000012';
INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES
  ('e0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'sami2@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-7'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000a1');
UPDATE app.participations SET invitation_id = 'e0000000-0000-4000-8000-0000000000a3' WHERE id = 'd0000000-0000-4000-8000-000000000012';
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000012')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'un AUTRE groupe que celui de l''invitation est refusé : jamais une affectation libre');
SELECT lives_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000012')$$,
  'seul passage : le groupe porté par l''invitation en attente, pour sa participation');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000012')$$,
  '23505', NULL, 'une seule écriture : la même personne n''entre pas deux fois (clé primaire)');
SELECT throws_ok($$UPDATE app.group_members SET group_id = 'f0000000-0000-4000-8000-0000000000a2' WHERE participation_id = 'd0000000-0000-4000-8000-000000000012'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'le passage ne couvre pas la modification d''un membre');
SELECT throws_ok($$DELETE FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000012'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'le passage ne couvre pas le retrait d''un membre');
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a2';
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, invitation_id) VALUES
  ('d0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000011', NULL);
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-0000000000a3')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne close : aucune composition');

-- ===== Suppression en cascade : campagne et organisation emportent invitations et groupes =====
INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le, group_id) VALUES
  ('e0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'b@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('g-8'), now() + interval '14 days', 'f0000000-0000-4000-8000-0000000000b1');
DELETE FROM app.campaigns WHERE id = 'c0000000-0000-4000-8000-0000000000b1';
SELECT is(
  (SELECT (SELECT count(*) FROM app.invitations WHERE id = 'e0000000-0000-4000-8000-0000000000b1')
        + (SELECT count(*) FROM app.groups WHERE id = 'f0000000-0000-4000-8000-0000000000b1'))::int,
  0, 'supprimer une campagne emporte ses groupes ET ses invitations qui les référencent (aucun blocage par la clé étrangère)');
DELETE FROM app.organizations WHERE id = 'a1000000-0000-4000-8000-00000000000a';
SELECT is(
  (SELECT (SELECT count(*) FROM app.invitations WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.groups WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.group_members WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a'))::int,
  0, 'supprimer une organisation emporte invitations portant un groupe, groupes et composition gelée');

SELECT * FROM finish();
