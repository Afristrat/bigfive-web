-- Lot 2 : consultation et acceptation d'une invitation (service_role seul).
-- Une transaction : rôle de participant (et rien d'autre), participation
-- ouverte, adresse et prénom effacés, journal sans adresse ; usage unique,
-- expiration, campagne close, compte non conforme, rôle déjà tenu dans
-- l'organisation. Invitation sans colonne de rôle : aucune voie d'élévation.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(55);

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

-- Le responsable A invite une adresse et renvoie le jeton en clair.
CREATE FUNCTION pg_temp.inviter(p_campagne uuid, p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
    format($q$select jeton from app.inviter(%L, %L, 'Prénom')$q$, p_campagne, p_email))
$$;

-- Acceptation par le serveur : renvoie l'identifiant de participation ou « ERR:... ».
CREATE FUNCTION pg_temp.accepter(p_jeton text, p_uid uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.accepter_invitation(%L, %L)::text$q$, p_jeton, p_uid))
$$;

-- Personnages : ra responsable A, ca consultant A, nour (nouveau participant), deja (déjà participant A),
-- rb responsable B (invité en A), banni.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000011', 'nour@example.test'),
  ('a0000000-0000-4000-8000-000000000012', 'deja@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000013', 'autre@example.test');
INSERT INTO auth.users (id, email, banned_until) VALUES
  ('a0000000-0000-4000-8000-000000000014', 'banni@example.test', now() + interval '1 day');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO app.campaigns (id, organization_id, titre, langue, statut, ouverte_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1', 'ar', 'ouverte', now()),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A2', 'fr', 'ouverte', now());

-- ===== Droits d'exécution =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.accepter_invitation(repeat('A', 43), gen_random_uuid())::text$q$), 'ERR:42501:permission denied for schema app', 'accepter, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.accepter_invitation(repeat('A', 43), gen_random_uuid())::text$q$), 'ERR:42501:permission denied for function accepter_invitation', 'accepter, rôle connecté (même responsable) : réservé au serveur');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select count(*) from app.consulter_invitation(repeat('A', 43))$q$), 'ERR:42501:permission denied for function consulter_invitation', 'consulter, rôle connecté : réservé au serveur');
SELECT is(pg_temp.comme(NULL, 'anon', $q$select count(*) from app.consulter_invitation(repeat('A', 43))$q$), 'ERR:42501:permission denied for schema app', 'consulter, anonyme : refusé');

-- ===== Consultation =====
SELECT matches(set_config('zz.j1', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'nour@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'invitation de nour créée');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select concat_ws('|', email, prenom, langue, campagne_titre, organisation_nom) from app.consulter_invitation(%L)$q$, current_setting('zz.j1'))),
  'nour@example.test|Prénom|ar|Campagne A1|Organisation A', 'consulter : le serveur lit adresse, prénom, langue, campagne et organisation');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.consulter_invitation('zzz')$q$), '0', 'consulter : jeton mal formé, aucune ligne');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.consulter_invitation(repeat('A', 43))$q$), '0', 'consulter : jeton inconnu, aucune ligne');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.consulter_invitation(NULL)$q$), '0', 'consulter : jeton absent, aucune ligne');

-- ===== Refus d'acceptation =====
SELECT is(pg_temp.accepter('zzz', 'a0000000-0000-4000-8000-000000000011'), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'accepter : jeton mal formé refusé');
SELECT is(pg_temp.accepter(repeat('A', 43), 'a0000000-0000-4000-8000-000000000011'), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'accepter : jeton inconnu refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.accepter_invitation(%L, NULL)::text$q$, current_setting('zz.j1'))), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'accepter : compte absent refusé');
SELECT is(pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-000000000013'), 'ERR:22023:Le compte ne correspond pas à l''adresse invitée', 'accepter : le compte d''une autre adresse est refusé');
SELECT is(pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-0000000000ff'), 'ERR:22023:Le compte ne correspond pas à l''adresse invitée', 'accepter : un compte inexistant est refusé');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE acceptee_le IS NOT NULL) + (SELECT count(*)::int FROM app.participations), 0, 'ces refus n''ont rien accepté ni ouvert');
SELECT is((SELECT count(*)::int FROM app.memberships WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a'), 3, 'ces refus n''ont créé aucun rôle');

-- ===== Acceptation =====
SELECT matches(set_config('zz.p1', pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-000000000011'), true),
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'accepter, serveur : renvoie l''identifiant de participation');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000011' AND organization_id = 'a1000000-0000-4000-8000-00000000000a'),
  'participant', 'le rôle créé est « participant »');
SELECT is((SELECT count(*)::int FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000011'), 1, 'une seule appartenance créée');
SELECT is((SELECT statut || '|' || (commencee_le IS NULL)::text || '|' || (terminee_le IS NULL)::text || '|' || campaign_id::text || '|' || organization_id::text || '|' || (invitation_id IS NOT NULL)::text
            FROM app.participations WHERE id = current_setting('zz.p1')::uuid),
  'ouverte|true|true|c0000000-0000-4000-8000-0000000000a1|a1000000-0000-4000-8000-00000000000a|true', 'la participation est ouverte, de la bonne campagne et de la bonne organisation');
SELECT is((SELECT (email IS NULL)::text || '|' || (prenom IS NULL)::text || '|' || (acceptee_le IS NOT NULL)::text || '|' || acceptee_par::text FROM app.invitations),
  'true|true|true|a0000000-0000-4000-8000-000000000011', 'l''adresse et le prénom de l''invitation sont effacés, l''acceptation est datée');
SELECT is((SELECT count(*)::int FROM app.invitations i WHERE i::text ~* 'nour|example\.test|Prénom'), 0, 'plus aucune trace de l''adresse ni du prénom dans la ligne d''invitation');
SELECT ok((SELECT derniere_connexion_le IS NOT NULL FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000011'), 'la première connexion est posée sur le profil');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'invitation.accepter' AND acteur = 'a0000000-0000-4000-8000-000000000011'
            AND ressource_id = current_setting('zz.p1')::uuid AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'l''acceptation est journalisée une fois');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal');
SELECT is(pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-000000000011'), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'accepter : usage unique, le même jeton ne sert qu''une fois');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select count(*) from app.consulter_invitation(%L)$q$, current_setting('zz.j1'))), '0', 'consulter : une invitation acceptée ne se consulte plus');
SELECT is((SELECT count(*)::int FROM app.participations), 1, 'une seule participation après la double tentative');

-- ===== La personne voit sa participation, rien d'autre =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.participations'), '1', 'le nouveau participant lit sa participation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.campaigns'), '1', 'le nouveau participant lit sa campagne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', 'select count(*) from app.invitations'), '0', 'le nouveau participant ne lit aucune invitation');

-- ===== Rôle déjà tenu dans l'organisation : arbitrage 6 =====
SELECT matches(set_config('zz.jr', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'ra@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'le responsable est invité à passer le test dans sa propre organisation');
SELECT is(pg_temp.accepter(current_setting('zz.jr'), 'a0000000-0000-4000-8000-000000000003'), 'ERR:55000:Ce compte a déjà un autre rôle dans l''organisation', 'accepter : un responsable ne devient pas participant de sa propre organisation');
SELECT matches(set_config('zz.jc', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'ca@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'le consultant est invité à passer le test');
SELECT is(pg_temp.accepter(current_setting('zz.jc'), 'a0000000-0000-4000-8000-000000000004'), 'ERR:55000:Ce compte a déjà un autre rôle dans l''organisation', 'accepter : un consultant ne devient pas participant de l''organisation qu''il suit');
SELECT is((SELECT string_agg(user_id::text || ':' || role, ',' ORDER BY user_id) FROM app.memberships WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a'),
  'a0000000-0000-4000-8000-000000000003:responsable,a0000000-0000-4000-8000-000000000004:consultant,a0000000-0000-4000-8000-000000000011:participant,a0000000-0000-4000-8000-000000000012:participant',
  'les rôles de A sont inchangés par ces refus : aucun rôle ne s''élève par invitation');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE acceptee_le IS NULL AND email IN ('ra@example.test', 'ca@example.test')), 2, 'les deux invitations refusées restent en attente');

-- ===== Déjà participant : pas de doublon de rôle =====
SELECT matches(set_config('zz.jd', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a2', 'deja@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'un participant de A est invité à une autre campagne de A');
SELECT matches(set_config('zz.pd', pg_temp.accepter(current_setting('zz.jd'), 'a0000000-0000-4000-8000-000000000012'), true), '^[0-9a-f-]{36}$', 'accepter : un participant existant ouvre sa participation');
SELECT is((SELECT count(*)::int FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000012'), 1, 'son appartenance n''est pas dupliquée');

-- ===== Réinvité à la même campagne : même participation =====
SELECT matches(set_config('zz.jd2', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a2', 'deja@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'la même personne est réinvitée à la même campagne (l''ancienne invitation est acceptée)');
SELECT is(pg_temp.accepter(current_setting('zz.jd2'), 'a0000000-0000-4000-8000-000000000012'), current_setting('zz.pd'), 'accepter : une personne n''a qu''une participation par campagne (même identifiant)');
SELECT is((SELECT count(*)::int FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000012'), 1, 'une seule participation pour cette personne et cette campagne');

-- ===== Membre d'une autre organisation : participant ici, responsable là-bas =====
SELECT matches(set_config('zz.jb', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'rb@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'le responsable de B est invité dans A');
SELECT matches(pg_temp.accepter(current_setting('zz.jb'), 'a0000000-0000-4000-8000-000000000006'), '^[0-9a-f-]{36}$', 'accepter : le responsable de B devient participant de A');
SELECT is((SELECT string_agg(organization_id::text || ':' || role, ',' ORDER BY organization_id) FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000006'),
  'a1000000-0000-4000-8000-00000000000a:participant,a1000000-0000-4000-8000-00000000000b:responsable', 'il reste responsable de B et devient participant de A (membre de deux organisations)');

-- ===== Compte banni =====
SELECT matches(set_config('zz.jx', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'banni@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'invitation d''un compte banni créée');
SELECT is(pg_temp.accepter(current_setting('zz.jx'), 'a0000000-0000-4000-8000-000000000014'), 'ERR:22023:Le compte ne correspond pas à l''adresse invitée', 'accepter : un compte banni est refusé');

-- ===== Expiration =====
SELECT matches(set_config('zz.je', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'autre@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'invitation de « autre » créée');
UPDATE app.invitations SET cree_le = now() - interval '15 days', expire_le = now() - interval '1 day'
 WHERE jeton_hash = sha256(convert_to(current_setting('zz.je'), 'UTF8'));
SELECT is(pg_temp.accepter(current_setting('zz.je'), 'a0000000-0000-4000-8000-000000000013'), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'accepter : une invitation expirée est refusée');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select count(*) from app.consulter_invitation(%L)$q$, current_setting('zz.je'))), '0', 'consulter : une invitation expirée ne se consulte plus');

-- ===== Campagne close =====
SELECT matches(set_config('zz.jf', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a2', 'autre@example.test'), true), '^[A-Za-z0-9_-]{43}$', 'nouvelle invitation de « autre » sur la campagne A2');
-- Clôture directe (superutilisateur) : l'invitation survit, seul le contrôle de l'acceptation retient. La clôture par
-- la fonction efface ces invitations (testée dans 15) ; ici on éprouve la seconde barrière.
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a2';
SELECT is(pg_temp.accepter(current_setting('zz.jf'), 'a0000000-0000-4000-8000-000000000013'), 'ERR:55000:Campagne non ouverte : passation refusée', 'accepter : une campagne close n''accepte plus de passation');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select count(*) from app.consulter_invitation(%L)$q$, current_setting('zz.jf'))), '0', 'consulter : l''invitation d''une campagne close ne se consulte plus');
SELECT is((SELECT count(*)::int FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000013'), 0, 'aucune participation ouverte sur la campagne close');

SELECT * FROM finish();
