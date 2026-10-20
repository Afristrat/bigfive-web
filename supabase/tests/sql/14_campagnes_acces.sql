-- Lots 2 et 3 : accès par personnage (matrice access-matrix.json), identités
-- simulées par rôle réel + jeton simulé. Étanchéité entre organisations avec
-- identifiants forgés ; le responsable, le consultant et l'administrateur ne
-- lisent RIEN dans attempts ni results, même par requête forgée ; écritures
-- directes refusées ; verrous 2 et 3 éprouvés sur les nouvelles tables.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(107);

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

-- Personnages : pa participant A (tentative en cours), pb participant A (résultat),
-- ra responsable A, ca consultant affecté A, cx consultant d'une autre organisation,
-- rb responsable B, ab membre de A et B, ad administrateur Tenga.
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
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A2', 'close', now(), now()),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Campagne B1', 'ouverte', now(), NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'en_cours', now(), NULL),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000007', 'ouverte', NULL, NULL);
INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le)
VALUES ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'v1', '{"1": 4}', now() + interval '30 days');
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES
  ('d0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '{"1": 2}', '{"O": 40}', 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000007', '{"1": 5}', '{"O": 90}', 'v1', 'c1');
INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES
  ('e0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'attente-a@example.test', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('ia'), now() + interval '14 days'),
  ('e0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'attente-b@example.test', 'a0000000-0000-4000-8000-000000000006', 'fr', sha256('ib'), now() + interval '14 days');

-- ===== Lecture : app.campaigns (organisation pour responsable et consultant, participation pour un participant) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.campaigns'), 'ERR:42501:permission denied for schema app', 'campaigns, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.campaigns'), '1', 'campaigns, participant A : sa campagne seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.campaigns'), '1', 'campaigns, participant B : sa campagne seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.campaigns'), '2', 'campaigns, responsable A : les deux campagnes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.campaigns'), '2', 'campaigns, consultant affecté A : les deux campagnes de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.campaigns'), '1', 'campaigns, consultant d''une autre organisation : B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.campaigns'), '1', 'campaigns, responsable B : B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.campaigns'), '2', 'campaigns, membre de A et B : ses deux participations');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.campaigns'), '3', 'campaigns, administrateur Tenga : toutes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.campaigns where id = ''c0000000-0000-4000-8000-0000000000a1'''), '0', 'campaigns, consultant d''une autre organisation : A invisible même avec l''identifiant forgé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.campaigns where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'campaigns, responsable B : organisation A invisible (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.campaigns where id = ''c0000000-0000-4000-8000-0000000000a2'''), '0', 'campaigns, participant A : la campagne A2, où il ne participe pas, est invisible');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'select count(*) from app.campaigns'), '0', 'campaigns, identité sans appartenance : rien');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.campaigns'), '0', 'campaigns, rôle connecté sans identité : rien');

-- ===== Lecture : app.participations (propres lignes ; le responsable voit le statut de chacun dans son organisation) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.participations'), 'ERR:42501:permission denied for schema app', 'participations, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.participations'), '1', 'participations, participant A : sa ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.participations'), '1', 'participations, participant B : sa ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations'), '3', 'participations, responsable A : le statut des trois participants de A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.participations'), '0', 'participations, consultant affecté A : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.participations'), '0', 'participations, consultant d''une autre organisation : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.participations'), '1', 'participations, responsable B : la participation de B');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.participations'), '2', 'participations, membre de A et B : ses deux lignes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.participations'), '0', 'participations, administrateur Tenga : aucune lecture directe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.participations where user_id = ''a0000000-0000-4000-8000-000000000001'''), '0', 'participations, participant B ne voit pas participant A (identifiant forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.participations where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'participations, responsable B : rien de l''organisation A (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.participations where id = ''d0000000-0000-4000-8000-000000000001'''), '0', 'participations, responsable B : participation de A invisible avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.participations where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'participations, consultant affecté : rien même en filtrant son organisation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations where statut = ''terminee'''), '2', 'participations, responsable A : voit le statut « terminée » de deux personnes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.participations where campaign_id = ''c0000000-0000-4000-8000-0000000000b1'''), '0', 'participations, responsable A : rien de la campagne de B');

-- ===== Lecture : app.invitations (le responsable de l'organisation seul) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.invitations'), 'ERR:42501:permission denied for schema app', 'invitations, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.invitations'), '0', 'invitations, participant : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.invitations'), '1', 'invitations, responsable A : l''invitation de son organisation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.invitations'), '0', 'invitations, consultant affecté : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.invitations'), '0', 'invitations, consultant d''une autre organisation : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.invitations'), '1', 'invitations, responsable B : celle de B');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.invitations'), '0', 'invitations, membre de A et B (participant) : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.invitations'), '0', 'invitations, administrateur Tenga : aucune lecture directe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.invitations where campaign_id = ''c0000000-0000-4000-8000-0000000000a1'''), '0', 'invitations, responsable B : rien de la campagne de A (filtre forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.invitations where id = ''e0000000-0000-4000-8000-00000000000b'''), '0', 'invitations, responsable A : invitation de B invisible avec son identifiant');

-- ===== Lecture : app.attempts (le titulaire seul ; AUCUNE règle pour le responsable, le consultant, l'administrateur) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.attempts'), 'ERR:42501:permission denied for schema app', 'attempts, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.attempts'), '1', 'attempts, participant A : sa tentative');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, participant B : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, responsable A : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, consultant affecté A : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, consultant d''une autre organisation : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, responsable B : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, membre de A et B : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.attempts'), '0', 'attempts, administrateur Tenga : aucune');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts where user_id = ''a0000000-0000-4000-8000-000000000001'''), '0', 'attempts, responsable A : requête forgée sur la personne, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts where participation_id = ''d0000000-0000-4000-8000-000000000001'''), '0', 'attempts, responsable A : requête forgée sur la participation, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts a join app.participations p on p.id = a.participation_id'), '0', 'attempts, responsable A : même par jointure avec les participations, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.attempts where participation_id = ''d0000000-0000-4000-8000-000000000001'''), '0', 'attempts, administrateur Tenga : requête forgée, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.attempts where participation_id = ''d0000000-0000-4000-8000-000000000001'''), '0', 'attempts, participant B : tentative de participant A invisible');

-- ===== Lecture : app.results (le titulaire seul ; AUCUNE règle pour le responsable, le consultant, l'administrateur) =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.results'), 'ERR:42501:permission denied for schema app', 'results, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.results'), '0', 'results, participant A : aucun résultat (en cours)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.results'), '1', 'results, participant B : son résultat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'results, responsable A : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results'), '0', 'results, consultant affecté A : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.results'), '0', 'results, consultant d''une autre organisation : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.results'), '0', 'results, responsable B : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.results'), '1', 'results, membre de A et B : son résultat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.results'), '0', 'results, administrateur Tenga : aucun');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'results, responsable A : requête forgée sur son organisation, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results where user_id = ''a0000000-0000-4000-8000-000000000002'''), '0', 'results, responsable A : requête forgée sur la personne, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results where participation_id = ''d0000000-0000-4000-8000-000000000002'''), '0', 'results, responsable A : requête forgée sur la participation, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results r join app.participations p on p.id = r.participation_id where p.statut = ''terminee'''), '0', 'results, responsable A : même par jointure avec les participations terminées, rien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select coalesce(sum((scores ->> ''O'')::int), 0) from app.results'), '0', 'results, responsable A : aucune somme de scores');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'results, consultant affecté A : aucune lecture directe (il passe par la fonction journalisée)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.results where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'results, administrateur Tenga : aucune lecture directe (il passe par la fonction journalisée)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.results where participation_id = ''d0000000-0000-4000-8000-000000000002'''), '0', 'results, responsable B : résultat de A invisible avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.results where participation_id = ''d0000000-0000-4000-8000-000000000002'''), '0', 'results, participant A : résultat de participant B invisible');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.results where organization_id = ''a1000000-0000-4000-8000-00000000000b'''), '0', 'results, membre de A et B : rien dans B (il n''y a pas passé le test)');

-- ===== Écritures directes : refusées à tous (aucun droit d'écriture) =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.campaigns (organization_id, titre) values (''a1000000-0000-4000-8000-00000000000a'', ''Pirate'')'), 'ERR:42501:permission denied for table campaigns', 'campaigns, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) values (''c0000000-0000-4000-8000-0000000000a1'', ''a1000000-0000-4000-8000-00000000000a'', ''p@example.test'', ''a0000000-0000-4000-8000-000000000003'', ''fr'', sha256(''p''), now() + interval ''1 day'')'), 'ERR:42501:permission denied for table invitations', 'invitations, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'insert into app.participations (campaign_id, organization_id, user_id) values (''c0000000-0000-4000-8000-0000000000a1'', ''a1000000-0000-4000-8000-00000000000a'', ''a0000000-0000-4000-8000-000000000003'')'), 'ERR:42501:permission denied for table participations', 'participations, INSERT direct refusé (responsable)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'insert into app.attempts (participation_id, user_id, questionnaire_version, expire_le) values (''d0000000-0000-4000-8000-000000000002'', ''a0000000-0000-4000-8000-000000000002'', ''v1'', now() + interval ''1 day'')'), 'ERR:42501:permission denied for table attempts', 'attempts, INSERT direct refusé (participant)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'insert into app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) values (''d0000000-0000-4000-8000-000000000001'', ''a1000000-0000-4000-8000-00000000000a'', ''a0000000-0000-4000-8000-000000000001'', ''{}'', ''{}'', ''v1'', ''c1'')'), 'ERR:42501:permission denied for table results', 'results, INSERT direct refusé (participant)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'update app.campaigns set statut = ''close'''), 'ERR:42501:permission denied for table campaigns', 'campaigns, responsable : UPDATE direct refusé (il passe par la fonction)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'delete from app.campaigns'), 'ERR:42501:permission denied for table campaigns', 'campaigns, responsable : DELETE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'insert into app.campaigns (organization_id, titre) values (''a1000000-0000-4000-8000-00000000000a'', ''Pirate'')'), 'ERR:42501:permission denied for table campaigns', 'campaigns, administrateur Tenga : INSERT direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'update app.participations set statut = ''terminee'''), 'ERR:42501:permission denied for table participations', 'participations, participant : UPDATE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'update app.results set scores = ''{"O": 100}'''), 'ERR:42501:permission denied for table results', 'results, participant : UPDATE de son résultat refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'delete from app.results'), 'ERR:42501:permission denied for table results', 'results, participant : DELETE direct refusé (la suppression passe par la fonction de compte)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'update app.attempts set revision = 99'), 'ERR:42501:permission denied for table attempts', 'attempts, participant : UPDATE direct refusé (la révision se gère par la fonction)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'update app.invitations set expire_le = now() + interval ''1 year'''), 'ERR:42501:permission denied for table invitations', 'invitations, responsable : UPDATE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'truncate app.results'), 'ERR:42501:permission denied for table results', 'results, responsable : TRUNCATE refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.campaigns'), 'ERR:42501:permission denied for table campaigns', 'campaigns, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.invitations'), 'ERR:42501:permission denied for table invitations', 'invitations, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.participations'), 'ERR:42501:permission denied for table participations', 'participations, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.attempts'), 'ERR:42501:permission denied for table attempts', 'attempts, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.results'), 'ERR:42501:permission denied for table results', 'results, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'anon', 'insert into app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), ''{}'', ''{}'', ''v1'', ''c1'')'), 'ERR:42501:permission denied for schema app', 'results, anonyme : INSERT refusé');

-- ===== Verrous 2 et 3 sur les nouvelles tables, éprouvés un à un =====
-- Verrou 2 : on accorde les droits d'écriture et on suspend les déclencheurs d'écriture, la RLS (sans règle d'écriture) arrête encore.
GRANT INSERT, UPDATE, DELETE, TRUNCATE ON app.results, app.attempts, app.campaigns TO authenticated, service_role;
ALTER TABLE app.results DISABLE TRIGGER results_sans_ecriture_api;
ALTER TABLE app.attempts DISABLE TRIGGER attempts_sans_ecriture_api;
ALTER TABLE app.campaigns DISABLE TRIGGER campaigns_sans_ecriture_api;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$insert into app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) values ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{}', '{}', 'v1', 'c1')$q$),
  'ERR:42501:new row violates row-level security policy for table "results"', 'verrou 2 seul : avec le droit INSERT, un participant n''ajoute pas de résultat (aucune règle d''écriture)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.attempts set revision = 99$q$), 'ok',
  'verrou 2 seul : un UPDATE de tentative sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT revision FROM app.attempts WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'), 1, 'verrou 2 : la révision de la tentative n''a pas bougé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$update app.campaigns set statut = 'close'$q$), 'ok',
  'verrou 2 seul : un UPDATE de campagne sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.campaigns WHERE statut = 'close'), 1, 'verrou 2 : aucune campagne n''a été close par le responsable');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', $q$delete from app.results$q$), 'ok', 'verrou 2 seul : un DELETE de résultat sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT count(*)::int FROM app.results), 2, 'verrou 2 : les deux résultats sont intacts');
ALTER TABLE app.results ENABLE TRIGGER results_sans_ecriture_api;
ALTER TABLE app.attempts ENABLE TRIGGER attempts_sans_ecriture_api;
ALTER TABLE app.campaigns ENABLE TRIGGER campaigns_sans_ecriture_api;

-- Verrou 3 : on ouvre aussi une règle permissive. Seul le déclencheur retient encore, y compris service_role (BYPASSRLS).
CREATE POLICY zz_ouvert ON app.results FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY zz_ouvert ON app.attempts FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
CREATE POLICY zz_ouvert ON app.campaigns FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$insert into app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) values ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{}', '{}', 'v1', 'c1')$q$),
  'ERR:42501:Écriture refusée sur results : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : droit et règle ouverts, le déclencheur refuse l''INSERT d''un résultat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', $q$update app.results set scores = '{"O": 100}'$q$),
  'ERR:23001:Un résultat soumis ne se modifie pas', 'verrou 3 : même verrou 3 levé, un résultat soumis ne se modifie pas (immuabilité)');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$delete from app.results$q$),
  'ERR:42501:Écriture refusée sur results : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse le DELETE de service_role (BYPASSRLS)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.attempts set revision = 99$q$),
  'ERR:42501:Écriture refusée sur attempts : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''UPDATE d''une tentative');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$update app.campaigns set statut = 'close'$q$),
  'ERR:42501:Écriture refusée sur campaigns : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse la clôture directe d''une campagne');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$truncate app.attempts$q$),
  'ERR:42501:Écriture refusée sur attempts : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse le TRUNCATE de service_role');
SELECT is((SELECT count(*)::int FROM app.results) + (SELECT count(*)::int FROM app.campaigns), 5, 'verrou 3 : résultats et campagnes intacts malgré droit et règle ouverts');

-- Remise en état : le responsable ne lit toujours rien dans results.
DROP POLICY zz_ouvert ON app.results;
DROP POLICY zz_ouvert ON app.attempts;
DROP POLICY zz_ouvert ON app.campaigns;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON app.results, app.attempts, app.campaigns FROM authenticated, service_role;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'après remise en état, le responsable ne lit toujours aucun résultat');

SELECT * FROM finish();
