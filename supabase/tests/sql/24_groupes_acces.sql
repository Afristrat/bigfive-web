-- Lot 4 : accès par personnage (matrice access-matrix.json) aux groupes, à la
-- composition et aux agrégats. Identités simulées par rôle réel + jeton simulé.
-- Étanchéité entre organisations avec identifiants forgés ; le responsable, le
-- consultant et l'administrateur ne lisent RIEN dans attempts ni results, même
-- à travers les groupes ; écritures directes refusées ; verrous 2 et 3 éprouvés
-- un à un sur les trois nouvelles tables.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(90);

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

-- Personnages : pa et pb participants A, ra responsable A, ca consultant affecté A,
-- cx consultant d'une autre organisation, rb responsable B, ab participant de A et B, ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'cx@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000007', 'ab@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable'),
  ('a0000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-00000000000b', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');

-- CA1 (A) et CB1 (B) : composées en brouillon, ouvertes, résultats, closes ; CAD (A) reste en brouillon.
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Campagne B1', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'Brouillon A', 'brouillon', NULL, NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'en_cours', now(), NULL),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000007', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'ouverte', NULL, NULL),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', 'ouverte', NULL, NULL);
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Groupe A1', 0),
  ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Groupe A2', 1),
  ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Groupe B1', 0),
  ('f0000000-0000-4000-8000-0000000000ad', 'c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'Groupe brouillon', 0);
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001'),
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000003'),
  ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000004'),
  ('f0000000-0000-4000-8000-0000000000ad', 'c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000005');
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000b1');
INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le)
VALUES ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'v1', '{"1": 4}', now() + interval '30 days');
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES
  ('d0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '{"1": 2}', '{"O": 40}', 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', '{"1": 5}', '{"O": 90}', 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000007', '{"1": 3}', '{"O": 60}', 'v1', 'c1');
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000b1');
INSERT INTO private.agregats_poses (campaign_id) VALUES
  ('c0000000-0000-4000-8000-0000000000a1'), ('c0000000-0000-4000-8000-0000000000b1');
INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000a1', 'groupe', 'O', 5, 50.00, 5.00),
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000a1', 'complement', 'O', 0, NULL, NULL),
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000a2', 'groupe', 'C', 6, 30.00, 2.00),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-0000000000b1', 'groupe', 'O', 7, 60.00, 9.00);

-- ===== Lecture : app.groups (responsable et consultant de l'organisation, administrateur Tenga) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.groups'), 'ERR:42501:permission denied for schema app', 'groups, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.groups'), '0', 'groups, participant A : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.groups'), '0', 'groups, participant B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.groups'), '3', 'groups, responsable A : les trois groupes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.groups'), '3', 'groups, consultant affecté A : les trois groupes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.groups'), '1', 'groups, consultant d''une autre organisation : celui de B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.groups'), '1', 'groups, responsable B : celui de B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.groups'), '0', 'groups, participant de A et B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.groups'), '4', 'groups, administrateur Tenga : tous');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.groups where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'groups, responsable B : organisation A invisible (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.groups where id = ''f0000000-0000-4000-8000-0000000000a1'''), '0', 'groups, consultant d''une autre organisation : groupe de A invisible avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'select count(*) from app.groups'), '0', 'groups, identité sans appartenance : rien');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.groups'), '0', 'groups, rôle connecté sans identité : rien');

-- ===== Lecture : app.group_members (responsable de l'organisation et administrateur Tenga seulement) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.group_members'), 'ERR:42501:permission denied for schema app', 'group_members, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.group_members'), '0', 'group_members, participant A : aucun (pas même sa propre ligne)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members'), '4', 'group_members, responsable A : la composition de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.group_members'), '0', 'group_members, consultant affecté A : aucune (la composition ne mène pas aux personnes)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.group_members'), '0', 'group_members, consultant d''une autre organisation : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.group_members'), '1', 'group_members, responsable B : celle de B');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.group_members'), '0', 'group_members, participant de A et B : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.group_members'), '5', 'group_members, administrateur Tenga : toute la composition');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.group_members where campaign_id = ''c0000000-0000-4000-8000-0000000000a1'''), '0', 'group_members, responsable B : composition de A invisible (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members where participation_id = ''d0000000-0000-4000-8000-000000000004'''), '0', 'group_members, responsable A : membre de B invisible avec l''identifiant de sa participation');

-- ===== Lecture : app.group_aggregates (responsable et consultant de l'organisation, administrateur Tenga) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.group_aggregates'), 'ERR:42501:permission denied for schema app', 'group_aggregates, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'group_aggregates, participant A : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'group_aggregates, participant B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates'), '3', 'group_aggregates, responsable A : les trois lignes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.group_aggregates'), '3', 'group_aggregates, consultant affecté A : les trois lignes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.group_aggregates'), '1', 'group_aggregates, consultant d''une autre organisation : B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.group_aggregates'), '1', 'group_aggregates, responsable B : B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'group_aggregates, participant de A et B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.group_aggregates'), '4', 'group_aggregates, administrateur Tenga : tous');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.group_aggregates where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'group_aggregates, responsable B : organisation A invisible (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.group_aggregates where group_id = ''f0000000-0000-4000-8000-0000000000a1'''), '0', 'group_aggregates, consultant d''une autre organisation : groupe de A invisible avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.group_aggregates where campaign_id = ''c0000000-0000-4000-8000-0000000000a1'''), '0', 'group_aggregates, consultant d''une autre organisation : campagne de A invisible avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates where organization_id = ''a1000000-0000-4000-8000-00000000000b'''), '0', 'group_aggregates, responsable A : organisation B invisible (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'group_aggregates, identité sans appartenance : rien');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'group_aggregates, rôle connecté sans identité : rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates a where a::text ~ ''d0000000|a0000000'''), '0', 'group_aggregates : aucune ligne ne porte d''identifiant de personne ni de participation');

-- ===== Le responsable (et le consultant, et l'administrateur) ne lisent RIEN dans results ni attempts, même à travers les groupes =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'results, responsable A : aucun, groupes et agrégats en place');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, responsable A : aucune, groupes et agrégats en place');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select coalesce(sum((scores ->> ''O'')::int), 0) from app.results'), '0', 'results, responsable A : aucune somme de scores');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results r join app.group_members gm on gm.participation_id = r.participation_id'), '0', 'results, responsable A : même par jointure avec la composition, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members gm where exists (select 1 from app.results r where r.participation_id = gm.participation_id)'), '0', 'results, responsable A : aucun résultat derrière un membre de groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts a join app.group_members gm on gm.participation_id = a.participation_id'), '0', 'attempts, responsable A : même par jointure avec la composition, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'results, responsable A : requête forgée sur son organisation, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results'), '0', 'results, consultant affecté A : aucune lecture directe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results r join app.groups g on g.organization_id = r.organization_id'), '0', 'results, consultant affecté A : même par jointure avec les groupes, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.results'), '0', 'results, administrateur Tenga : aucune lecture directe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, administrateur Tenga : aucune lecture directe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.results'), '0', 'results, responsable B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.results'), '1', 'results, participant : son propre résultat reste lisible (contrôle de sens)');

-- ===== Écritures directes : refusées à tous (aucun droit d'écriture) =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.groups (campaign_id, organization_id, nom) values (''c0000000-0000-4000-8000-0000000000ad'', ''a1000000-0000-4000-8000-00000000000a'', ''Pirate'')'), 'ERR:42501:permission denied for table groups', 'groups, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'update app.groups set nom = ''Pirate'''), 'ERR:42501:permission denied for table groups', 'groups, UPDATE direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'delete from app.groups'), 'ERR:42501:permission denied for table groups', 'groups, DELETE direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.group_members (group_id, campaign_id, organization_id, participation_id) values (''f0000000-0000-4000-8000-0000000000ad'', ''c0000000-0000-4000-8000-0000000000ad'', ''a1000000-0000-4000-8000-00000000000a'', ''d0000000-0000-4000-8000-000000000006'')'), 'ERR:42501:permission denied for table group_members', 'group_members, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'delete from app.group_members'), 'ERR:42501:permission denied for table group_members', 'group_members, DELETE direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) values (''c0000000-0000-4000-8000-0000000000a1'', ''a1000000-0000-4000-8000-00000000000a'', ''f0000000-0000-4000-8000-0000000000a1'', ''groupe'', ''C'', 9, 1, 1)'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'update app.group_aggregates set effectif = 99'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, UPDATE direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'delete from app.group_aggregates'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, DELETE direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'truncate app.group_aggregates'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, TRUNCATE refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'update app.group_aggregates set effectif = 99'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, administrateur Tenga : UPDATE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'delete from app.group_aggregates'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, consultant : DELETE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'insert into app.group_members (group_id, campaign_id, organization_id, participation_id) values (''f0000000-0000-4000-8000-0000000000ad'', ''c0000000-0000-4000-8000-0000000000ad'', ''a1000000-0000-4000-8000-00000000000a'', ''d0000000-0000-4000-8000-000000000006'')'), 'ERR:42501:permission denied for table group_members', 'group_members, participant : INSERT direct refusé');
SELECT is(pg_temp.comme(NULL, 'anon', 'insert into app.groups (campaign_id, organization_id, nom) values (gen_random_uuid(), gen_random_uuid(), ''x'')'), 'ERR:42501:permission denied for schema app', 'groups, anonyme : INSERT refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.groups'), 'ERR:42501:permission denied for table groups', 'groups, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.group_members'), 'ERR:42501:permission denied for table group_members', 'group_members, service_role : pas même de lecture');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.group_aggregates'), 'ERR:42501:permission denied for table group_aggregates', 'group_aggregates, service_role : pas même de lecture');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from private.agregats_poses'), 'ERR:42501:permission denied for schema private', 'le marqueur de pose (private) est illisible pour le rôle connecté');

-- ===== Verrous 2 et 3 sur les nouvelles tables, éprouvés un à un =====
-- Verrou 2 : droits d'écriture accordés et déclencheurs suspendus, la RLS (sans règle d'écriture) arrête encore.
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON app.groups, app.group_members, app.group_aggregates TO authenticated, service_role;
ALTER TABLE app.groups DISABLE TRIGGER USER;
ALTER TABLE app.group_members DISABLE TRIGGER USER;
ALTER TABLE app.group_aggregates DISABLE TRIGGER USER;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.groups (campaign_id, organization_id, nom) values ('c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'Pirate')$q$),
  'ERR:42501:new row violates row-level security policy for table "groups"', 'verrou 2 seul : avec le droit INSERT, le responsable ne crée pas de groupe (aucune règle d''écriture)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$update app.groups set nom = 'Pirate'$q$), 'ok', 'verrou 2 seul : un UPDATE de groupe sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.groups WHERE nom = 'Pirate'), 0, 'verrou 2 : aucun groupe renommé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$delete from app.groups$q$), 'ok', 'verrou 2 seul : un DELETE de groupe sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.groups), 4, 'verrou 2 : les quatre groupes sont intacts');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.group_members (group_id, campaign_id, organization_id, participation_id) values ('f0000000-0000-4000-8000-0000000000ad', 'c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000006')$q$),
  'ERR:42501:new row violates row-level security policy for table "group_members"', 'verrou 2 seul : avec le droit INSERT, le responsable n''affecte personne (aucune règle d''écriture)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$delete from app.group_members$q$), 'ok', 'verrou 2 seul : un DELETE de membre sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.group_members), 5, 'verrou 2 : les cinq membres sont intacts');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) values ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000a1', 'groupe', 'C', 9, 1, 1)$q$),
  'ERR:42501:new row violates row-level security policy for table "group_aggregates"', 'verrou 2 seul : avec le droit INSERT, le responsable ne publie aucun agrégat (aucune règle d''écriture)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$update app.group_aggregates set effectif = 99$q$), 'ok', 'verrou 2 seul : un UPDATE d''agrégat sans règle ne touche aucune ligne (RLS)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$delete from app.group_aggregates$q$), 'ok', 'verrou 2 seul : un DELETE d''agrégat sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.group_aggregates), 4, 'verrou 2 : les quatre lignes d''agrégats sont intactes');
ALTER TABLE app.groups ENABLE TRIGGER USER;
ALTER TABLE app.group_members ENABLE TRIGGER USER;
ALTER TABLE app.group_aggregates ENABLE TRIGGER USER;

-- Verrou 3 : on ouvre aussi une règle permissive. Seul le déclencheur retient encore, y compris service_role (BYPASSRLS).
CREATE POLICY zz_ouvert ON app.groups FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY zz_ouvert ON app.group_members FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY zz_ouvert ON app.group_aggregates FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.groups (campaign_id, organization_id, nom) values ('c0000000-0000-4000-8000-0000000000ad', 'a1000000-0000-4000-8000-00000000000a', 'Pirate')$q$),
  'ERR:42501:Écriture refusée sur groups : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : droit et règle ouverts, le déclencheur refuse l''INSERT d''un groupe');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$delete from app.groups$q$),
  'ERR:42501:Écriture refusée sur groups : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse le DELETE de service_role (BYPASSRLS)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$update app.group_members set group_id = group_id$q$),
  'ERR:42501:Écriture refusée sur group_members : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''UPDATE d''un membre');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) values ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000a1', 'groupe', 'C', 9, 1, 1)$q$),
  'ERR:42501:Écriture refusée sur group_aggregates : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''INSERT d''un agrégat');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$update app.group_aggregates set effectif = 99$q$),
  'ERR:42501:Écriture refusée sur group_aggregates : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''UPDATE d''un agrégat par service_role');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$truncate app.group_aggregates$q$),
  'ERR:42501:Écriture refusée sur group_aggregates : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse le TRUNCATE de service_role');
SELECT is((SELECT count(*)::int FROM app.groups) + (SELECT count(*)::int FROM app.group_members) + (SELECT count(*)::int FROM app.group_aggregates), 13, 'verrou 3 : groupes, composition et agrégats intacts malgré droit et règle ouverts');

-- Remise en état : le responsable lit toujours les agrégats et toujours aucun résultat.
DROP POLICY zz_ouvert ON app.groups;
DROP POLICY zz_ouvert ON app.group_members;
DROP POLICY zz_ouvert ON app.group_aggregates;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON app.groups, app.group_members, app.group_aggregates FROM authenticated, service_role;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'après remise en état, le responsable ne lit toujours aucun résultat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates'), '3', 'après remise en état, le responsable lit toujours les agrégats de son organisation');

SELECT * FROM finish();
