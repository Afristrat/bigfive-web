-- Migration 0006, lecture : AUCUNE règle de lecture ne relie une personne
-- identifiable à un groupe pour le responsable ni pour le consultant ; le
-- responsable ne lit aucun résultat individuel ; il lit les groupes (noms) et,
-- après la clôture seulement, les effectifs agrégés. Seul l'administrateur
-- Tenga lit la composition. Avant l'acceptation, la ligne d'invitation en
-- attente porte l'adresse ET le groupe que le responsable a lui-même saisis ;
-- après l'acceptation, ni l'un ni l'autre ne subsiste sur l'invitation.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(33);

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

CREATE FUNCTION pg_temp.inviter(p_campagne uuid, p_email text, p_groupe uuid DEFAULT NULL) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
    format($q$select jeton from app.inviter(%L, %L, 'Prénom', NULL, NULL, %L)$q$, p_campagne, p_email, p_groupe))
$$;
CREATE FUNCTION pg_temp.accepter(p_jeton text, p_uid uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.accepter_invitation(%L, %L)::text$q$, p_jeton, p_uid))
$$;

-- Personnages : ra responsable A, ca consultant A, rb responsable B, ad administrateur Tenga ;
-- nour et sami (groupe Direction), omar (Production), lina (sans groupe), tous acceptés ; attente (groupe Production), en attente.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test'),
  ('a0000000-0000-4000-8000-000000000011', 'nour@example.test'),
  ('a0000000-0000-4000-8000-000000000012', 'sami@example.test'),
  ('a0000000-0000-4000-8000-000000000013', 'lina@example.test'),
  ('a0000000-0000-4000-8000-000000000014', 'omar@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
INSERT INTO app.campaigns (id, organization_id, titre) VALUES ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'CA');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Direction', 0),
  ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Production', 1);
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a1';
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'nour@example.test', 'f0000000-0000-4000-8000-0000000000a1'), 'a0000000-0000-4000-8000-000000000011');
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'sami@example.test', 'f0000000-0000-4000-8000-0000000000a1'), 'a0000000-0000-4000-8000-000000000012');
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'omar@example.test', 'f0000000-0000-4000-8000-0000000000a2'), 'a0000000-0000-4000-8000-000000000014');
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'lina@example.test'), 'a0000000-0000-4000-8000-000000000013');
SELECT pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'attente@example.test', 'f0000000-0000-4000-8000-0000000000a2');
-- Un résultat existe (déposé par le superutilisateur) pour éprouver aussi la lecture individuelle.
UPDATE app.participations SET statut = 'terminee', commencee_le = now(), terminee_le = now() WHERE user_id = 'a0000000-0000-4000-8000-000000000011';
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
SELECT p.id, p.organization_id, p.user_id, '{}'::jsonb, '{"O": 50, "C": 40, "E": 30, "A": 20, "N": 10}'::jsonb, 'v1', 'c1'
FROM app.participations p WHERE p.user_id = 'a0000000-0000-4000-8000-000000000011';
SELECT is((SELECT count(*)::int FROM app.group_members WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a1'), 3, 'cadre : trois personnes composées par invitation (nour, sami, omar)');

-- ===== Le responsable ne lit aucune composition =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members'), '0', 'responsable A : app.group_members vide');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members where group_id = ''f0000000-0000-4000-8000-0000000000a1'''), '0', 'responsable A : filtre sur un groupe, toujours rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations p join app.group_members m on m.participation_id = p.id'), '0',
  'responsable A : aucune jointure participation / groupe (une personne identifiable ne mène à aucun groupe)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations'), '4', 'responsable A : il lit toujours les participations de son organisation (liste des personnes, sans groupe)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations p join app.invitations i on i.id = p.invitation_id where i.group_id is not null'), '0',
  'responsable A : participation puis invitation d''origine ne mène à aucun groupe (effacé à l''acceptation)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.invitations where acceptee_le is not null and group_id is not null'), '0',
  'responsable A : aucune invitation acceptée ne porte un groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.invitations where acceptee_par is not null and (email is not null or prenom is not null or group_id is not null)'), '0',
  'responsable A : aucune invitation acceptée ne garde adresse, prénom ni groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.invitations where acceptee_le is null and group_id = ''f0000000-0000-4000-8000-0000000000a2'' and email = ''attente@example.test'''), '1',
  'responsable A : l''invitation EN ATTENTE montre l''adresse et le groupe qu''il a lui-même saisis (la base n''ajoute aucune information)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'responsable A : aucun résultat individuel');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results r join app.participations p on p.id = r.participation_id'), '0', 'responsable A : aucun résultat, même par jointure avec les participations');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts'), '0', 'responsable A : aucune tentative');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.groups'), '2', 'responsable A : il lit les groupes (noms et ordre), pas leurs membres');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'responsable A : aucun effectif agrégé avant la clôture');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from private.audit_log'), 'ERR:42501:permission denied for schema private', 'responsable A : le journal brut est fermé');

-- ===== Fonctions lisibles par le responsable : aucune colonne de groupe nominative =====
SELECT is(
  (SELECT pg_get_function_result('app.informer_responsable(uuid)'::regprocedure) ~* 'group|membre'),
  false, 'app.informer_responsable ne renvoie aucun groupe ni composition (comptes de la campagne entière)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select participants::text || '/' || invitations_en_attente::text from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$), '4/1',
  'app.informer_responsable : quatre participants, une invitation en attente (compte global, pas par groupe)');
SELECT is(
  (SELECT pg_get_function_result('app.lire_resultat_individuel(uuid)'::regprocedure) ~* 'group'),
  false, 'app.lire_resultat_individuel ne renvoie aucun groupe');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p WHERE p.pronamespace = 'app'::regnamespace AND p.proname = 'exporter_mes_donnees' AND p.prosrc ~* 'group'),
  0, 'app.exporter_mes_donnees (export du participant) ne contient aucun groupe');

-- ===== Le consultant, le participant, un responsable étranger =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.group_members'), '0', 'consultant : aucune composition');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.invitations'), '0', 'consultant : aucune invitation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.participations'), '0', 'consultant : aucune participation (pas de personne identifiable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.groups'), '2', 'consultant : il lit les groupes, sans membres');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results'), '0', 'consultant : aucun résultat par lecture directe (seule la fonction journalisée existe)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.group_members'), '0', 'participante : pas même sa propre ligne de composition');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.invitations'), '0', 'participante : aucune invitation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.groups'), '0', 'participante : aucun groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.group_members'), '0', 'responsable de B : aucune composition');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.groups'), '0', 'responsable de B : aucun groupe de A');
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.group_members'), 'ERR:42501:permission denied for schema app', 'anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.group_members'), 'ERR:42501:permission denied for table group_members', 'serveur : aucun droit sur la composition');

-- ===== L'administrateur Tenga =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.group_members'), '3', 'administrateur Tenga : toute la composition');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.results'), '0', 'administrateur Tenga : aucun résultat par lecture directe non plus');

SELECT * FROM finish();
