-- Socle du lot 1 : accès par personnage (matrice access-matrix.json), identités
-- simulées par rôle réel + jeton simulé (request.jwt.claims), et les quatre
-- verrous contre l'élévation de privilège (plan § 3.3), éprouvés un à un.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(59);

-- Aide : exécute une requête sous le rôle réel et l'identité donnés ; renvoie le
-- résultat (requête SELECT, première colonne en texte) ou « ok » (autre ordre),
-- ou « ERR:<SQLSTATE>:<message> ». Les rôles de l'API n'ont pas accès à pgTAP,
-- d'où cette indirection (voir le README des tests).
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

-- Personnages (matrice) : pa participant A, pb participant A (autre personne),
-- ra responsable A, ca consultant affecté A, cx consultant d'une autre
-- organisation, rb responsable B, ab membre de A et de B, ad administrateur Tenga.
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

-- ===== Lecture : app.memberships (propres lignes ; l'administrateur voit tout) ====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.memberships'), 'ERR:42501:permission denied for schema app', 'memberships, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.memberships'), '1', 'memberships, participant A : sa ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.memberships where user_id = ''a0000000-0000-4000-8000-000000000001'''), '0', 'memberships, participant B ne voit pas participant A (id forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.memberships'), '1', 'memberships, responsable A : sa seule ligne (pas le détail de son organisation)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.memberships'), '1', 'memberships, consultant affecté A : sa seule ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select count(*) from app.memberships where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'memberships, consultant d''une autre organisation : rien de l''organisation A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.memberships where organization_id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'memberships, responsable B : rien de l''organisation A');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.memberships'), '2', 'memberships, membre de A et B : ses deux lignes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.memberships'), '8', 'memberships, administrateur Tenga : toutes les lignes');

-- ===== Lecture : app.organizations (organisations dont on est membre ; l'administrateur voit tout) ====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.organizations'), 'ERR:42501:permission denied for schema app', 'organizations, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select slug from app.organizations'), 'org-a', 'organizations, participant A : A seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', 'select slug from app.organizations'), 'org-b', 'organizations, consultant d''une autre organisation : B seulement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', 'select count(*) from app.organizations where id = ''a1000000-0000-4000-8000-00000000000a'''), '0', 'organizations, responsable B : A invisible même avec son identifiant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select count(*) from app.organizations'), '2', 'organizations, membre de A et B : les deux');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.organizations'), '2', 'organizations, administrateur Tenga : toutes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-0000000000ee', 'authenticated', 'select count(*) from app.organizations'), '0', 'organizations, identité sans appartenance : rien');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.organizations'), '0', 'organizations, rôle connecté sans identité : rien');

-- ===== Lecture : app.profiles (propre ligne seulement, administrateur compris) ====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.profiles'), 'ERR:42501:permission denied for schema app', 'profiles, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.profiles'), '1', 'profiles, participant A : son profil');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.profiles where user_id = ''a0000000-0000-4000-8000-000000000001'''), '0', 'profiles, participant B ne voit pas le profil de participant A (id forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.profiles where user_id = ''a0000000-0000-4000-8000-000000000001'''), '0', 'profiles, responsable A ne lit pas le profil d''un participant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.profiles where user_id <> ''a0000000-0000-4000-8000-000000000004'''), '0', 'profiles, consultant affecté : aucun autre profil');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.profiles'), '1', 'profiles, administrateur Tenga : son seul profil');

-- ===== Tables du socle : aucun droit pour l'API sur private (rappel, en comportement) ====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from private.tenga_admins'), 'ERR:42501:permission denied for schema private', 'tenga_admins, même l''administrateur ne la lit pas par l''API');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from private.tenga_admins'), 'ERR:42501:permission denied for schema private', 'tenga_admins, service_role : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from private.audit_log'), 'ERR:42501:permission denied for schema private', 'audit_log, service_role : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from private.liens_connexion'), 'ERR:42501:permission denied for schema private', 'liens_connexion, service_role : refusé');

-- ===== Écriture directe : refusée à tous (aucun droit) ====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.profiles set nom = 'Pirate'$q$), 'ERR:42501:permission denied for table profiles', 'profiles, participant : UPDATE direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$insert into app.organizations (slug, nom) values ('org-pirate', 'Pirate')$q$), 'ERR:42501:permission denied for table organizations', 'organizations, responsable : INSERT direct refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$insert into app.organizations (slug, nom) values ('org-pirate', 'Pirate')$q$), 'ERR:42501:permission denied for table organizations', 'organizations, administrateur Tenga : INSERT direct refusé (il passe par la fonction)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$insert into app.memberships (user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000b', 'responsable')$q$), 'ERR:42501:permission denied for table memberships', 'memberships, participant : s''attribuer un rôle ailleurs refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.memberships set role = 'responsable'$q$), 'ERR:42501:permission denied for table memberships', 'memberships, participant : élévation de rôle par UPDATE refusée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$delete from app.memberships$q$), 'ERR:42501:permission denied for table memberships', 'memberships, responsable : DELETE refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$delete from app.memberships$q$), 'ERR:42501:permission denied for table memberships', 'memberships, administrateur Tenga : DELETE direct refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$insert into app.memberships (user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000b', 'responsable')$q$), 'ERR:42501:permission denied for table memberships', 'memberships, service_role : INSERT direct refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.memberships$q$), 'ERR:42501:permission denied for table memberships', 'memberships, service_role : pas même de lecture (accès par fonctions seulement)');
SELECT is(pg_temp.comme(NULL, 'anon', $q$insert into app.profiles (user_id) values ('a0000000-0000-4000-8000-0000000000dd')$q$), 'ERR:42501:permission denied for schema app', 'profiles, anonyme : INSERT refusé');

-- ===== Fonctions : exécution =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select app.suis_admin_tenga()'), 'ERR:42501:permission denied for schema app', 'suis_admin_tenga, anonyme : refusé (pas d''accès au schéma)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select app.suis_admin_tenga()'), 'true', 'suis_admin_tenga, administrateur : vrai');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select app.suis_admin_tenga()'), 'false', 'suis_admin_tenga, responsable : faux');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000007', 'authenticated', 'select app.suis_membre(''a1000000-0000-4000-8000-00000000000b'')'), 'true', 'suis_membre, membre de A et B pour B : vrai');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select app.suis_membre(''a1000000-0000-4000-8000-00000000000b'')'), 'false', 'suis_membre, participant A pour B : faux');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select app.suis_membre(''a1000000-0000-4000-8000-00000000000a'')'), 'false', 'suis_membre, administrateur sans appartenance : faux (l''administration est un droit distinct)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000001'', ''a1000000-0000-4000-8000-00000000000b'', ''responsable'')::text'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'attribuer_role, participant : refusé (verrou 4)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000003'', ''a1000000-0000-4000-8000-00000000000b'', ''responsable'')::text'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'attribuer_role, responsable : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000004'', ''a1000000-0000-4000-8000-00000000000a'', ''responsable'')::text'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'attribuer_role, consultant affecté : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000001'', ''a1000000-0000-4000-8000-00000000000b'', ''responsable'')::text'),
  'ERR:42501:permission denied for function attribuer_role', 'attribuer_role, service_role : refusé (aucun droit d''exécution)');
SELECT is(pg_temp.comme(NULL, 'anon', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000001'', ''a1000000-0000-4000-8000-00000000000b'', ''responsable'')::text'),
  'ERR:42501:permission denied for schema app', 'attribuer_role, anonyme : refusé (pas d''accès au schéma)');
SELECT is((SELECT count(*)::int FROM app.memberships), 8, 'aucune de ces tentatives n''a modifié les appartenances');

-- ===== Les quatre verrous, éprouvés un à un (plan § 3.3) =====
-- Verrou 1 : sans droit d'écriture. Les tentatives ci-dessus échouent en « permission denied ».
-- Verrou 2 : on accorde le droit d'écriture, la RLS (sans règle) refuse encore.
GRANT INSERT, UPDATE, DELETE ON app.memberships TO authenticated, service_role;
-- Le déclencheur (verrou 3) passe avant le contrôle de règle à l'insertion : on le suspend pour isoler le verrou 2.
ALTER TABLE app.memberships DISABLE TRIGGER memberships_sans_ecriture_api;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$insert into app.memberships (user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000b', 'responsable')$q$),
  'ERR:42501:new row violates row-level security policy for table "memberships"', 'verrou 2 seul : avec le droit INSERT, authenticated est arrêté par l''absence de règle d''écriture');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.memberships set role = 'responsable' where user_id = 'a0000000-0000-4000-8000-000000000001'$q$),
  'ok', 'verrou 2 seul : un UPDATE sans règle ne touche aucune ligne (RLS)');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 'participant', 'verrou 2 seul : le rôle de participant A est resté participant');

ALTER TABLE app.memberships ENABLE TRIGGER memberships_sans_ecriture_api;

-- Verrou 3 : on ouvre aussi une règle permissive. Seul le déclencheur retient encore, y compris
-- service_role qui contourne la RLS.
CREATE POLICY zz_ouvert ON app.memberships FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true);
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$insert into app.memberships (user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000b', 'responsable')$q$),
  'ERR:42501:Écriture refusée sur memberships : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : droit et règle ouverts, le déclencheur refuse l''INSERT de authenticated');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$update app.memberships set role = 'responsable'$q$),
  'ERR:42501:Écriture refusée sur memberships : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''UPDATE (élévation de rôle)');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$delete from app.memberships$q$),
  'ERR:42501:Écriture refusée sur memberships : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse le DELETE de service_role (BYPASSRLS)');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$insert into app.memberships (user_id, organization_id, role) values ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000b', 'responsable')$q$),
  'ERR:42501:Écriture refusée sur memberships : seules les fonctions contrôlées modifient cette table', 'verrou 3 seul : le déclencheur refuse l''INSERT de service_role');
SELECT is((SELECT count(*)::int FROM app.memberships), 8, 'verrou 3 : appartenances intactes malgré droit et règle ouverts');

-- Verrou 4 : seule la fonction d'attribution, réservée aux administrateurs, crée un rôle.
DROP POLICY zz_ouvert ON app.memberships;
REVOKE INSERT, UPDATE, DELETE ON app.memberships FROM authenticated, service_role;
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select app.attribuer_role(''a0000000-0000-4000-8000-000000000002'', ''a1000000-0000-4000-8000-00000000000b'', ''consultant'')::text'),
  '', 'verrou 4 : l''administrateur Tenga attribue un rôle par la fonction');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000002' AND organization_id = 'a1000000-0000-4000-8000-00000000000b'), 'consultant', 'verrou 4 : le rôle est bien posé');

SELECT * FROM finish();
