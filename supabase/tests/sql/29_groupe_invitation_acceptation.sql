-- Migration 0006, app.accepter_invitation : la participation ET la ligne de
-- composition naissent dans la même transaction (l'échec d'une moitié annule
-- l'autre), seul chemin d'écriture de la composition en campagne ouverte. Le
-- groupe porté par l'invitation est écrit UNE seule fois, puis effacé de
-- l'invitation avec l'adresse et le prénom. Aucune affectation libre en
-- campagne ouverte. Campagne sans groupe inchangée.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(46);

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

-- Le responsable A invite (avec ou sans groupe) et reçoit le jeton en clair.
CREATE FUNCTION pg_temp.inviter(p_campagne uuid, p_email text, p_groupe uuid DEFAULT NULL) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
    format($q$select jeton from app.inviter(%L, %L, 'Prénom', NULL, NULL, %L)$q$, p_campagne, p_email, p_groupe))
$$;

-- Acceptation par le serveur : identifiant de participation ou « ERR:... ».
CREATE FUNCTION pg_temp.accepter(p_jeton text, p_uid uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.accepter_invitation(%L, %L)::text$q$, p_jeton, p_uid))
$$;

-- Bilan d'un compte dans une campagne : participations / lignes de composition / groupe.
CREATE FUNCTION pg_temp.bilan(p_uid uuid, p_campagne uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM app.participations p WHERE p.user_id = p_uid AND p.campaign_id = p_campagne)::text
         || '/' || (SELECT count(*) FROM app.group_members m JOIN app.participations p ON p.id = m.participation_id
                     WHERE p.user_id = p_uid AND p.campaign_id = p_campagne)::text
         || '/' || COALESCE((SELECT m.group_id::text FROM app.group_members m JOIN app.participations p ON p.id = m.participation_id
                              WHERE p.user_id = p_uid AND p.campaign_id = p_campagne), 'aucun')
$$;

-- Personnages : ra responsable A, ca consultant A, ad administrateur Tenga ; invités : nour, sami, lina, omar, yara, zoe, kim.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test'),
  ('a0000000-0000-4000-8000-000000000011', 'nour@example.test'),
  ('a0000000-0000-4000-8000-000000000012', 'sami@example.test'),
  ('a0000000-0000-4000-8000-000000000013', 'lina@example.test'),
  ('a0000000-0000-4000-8000-000000000014', 'omar@example.test'),
  ('a0000000-0000-4000-8000-000000000015', 'yara@example.test'),
  ('a0000000-0000-4000-8000-000000000016', 'zoe@example.test'),
  ('a0000000-0000-4000-8000-000000000017', 'kim@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
-- CA : deux groupes ; CN : aucun groupe ; CC : un groupe, clôturée plus bas.
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'CA'),
  ('c0000000-0000-4000-8000-0000000000a3', 'a1000000-0000-4000-8000-00000000000a', 'CN'),
  ('c0000000-0000-4000-8000-0000000000a5', 'a1000000-0000-4000-8000-00000000000a', 'CC');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Direction', 0),
  ('f0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Production', 1),
  ('f0000000-0000-4000-8000-0000000000a5', 'c0000000-0000-4000-8000-0000000000a5', 'a1000000-0000-4000-8000-00000000000a', 'Groupe de CC', 0);
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now()
 WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a5');

-- ===== Acceptation d'une invitation qui porte un groupe =====
SELECT matches(set_config('zz.j1', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'nour@example.test', 'f0000000-0000-4000-8000-0000000000a1'), true),
  '^[A-Za-z0-9_-]{43}$', 'nour est invitée dans le groupe Direction');
SELECT matches(set_config('zz.p1', pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-000000000011'), true),
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'accepter renvoie toujours l''identifiant de la participation');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1'),
  '1/1/f0000000-0000-4000-8000-0000000000a1', 'la participation ET la ligne de composition existent : une participation, un membre, le groupe de l''invitation');
SELECT is((SELECT m.participation_id::text || '|' || m.campaign_id::text || '|' || m.organization_id::text FROM app.group_members m WHERE m.group_id = 'f0000000-0000-4000-8000-0000000000a1'),
  current_setting('zz.p1') || '|c0000000-0000-4000-8000-0000000000a1|a1000000-0000-4000-8000-00000000000a', 'la ligne de composition relie la participation créée, de la bonne campagne et de la bonne organisation');
SELECT is((SELECT (i.group_id IS NULL)::text || '|' || (i.email IS NULL)::text || '|' || (i.prenom IS NULL)::text || '|' || (i.acceptee_le IS NOT NULL)::text || '|' || i.acceptee_par::text
             FROM app.invitations i WHERE i.id = (SELECT p.invitation_id FROM app.participations p WHERE p.id = current_setting('zz.p1')::uuid)),
  'true|true|true|true|a0000000-0000-4000-8000-000000000011', 'l''invitation acceptée n''a plus ni groupe, ni adresse, ni prénom');
SELECT is((SELECT count(*)::int FROM app.invitations i WHERE i::text ~* 'nour|example\.test|Prénom' OR i::text LIKE '%f0000000-0000-4000-8000-0000000000a1%'), 0,
  'plus aucune trace de l''adresse, du prénom ni du groupe dans la ligne d''invitation : le groupe ne tient que par la composition');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'invitation.accepter' AND ressource_id = current_setting('zz.p1')::uuid), 1, 'l''acceptation est journalisée une fois');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l.organization_id = 'a1000000-0000-4000-8000-00000000000a' AND l::text LIKE '%f0000000-0000-4000-8000-0000000000a%'), 0, 'le journal ne contient aucun groupe');
SELECT is(pg_temp.accepter(current_setting('zz.j1'), 'a0000000-0000-4000-8000-000000000011'), 'ERR:P0002:Invitation invalide, expirée ou déjà utilisée', 'usage unique : le même jeton ne sert qu''une fois');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1'),
  '1/1/f0000000-0000-4000-8000-0000000000a1', 'la composition n''a pas bougé après la seconde tentative');

-- ===== Plusieurs personnes, une personne sans groupe, campagne sans groupe =====
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'sami@example.test', 'f0000000-0000-4000-8000-0000000000a1'), 'a0000000-0000-4000-8000-000000000012');
SELECT pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'omar@example.test', 'f0000000-0000-4000-8000-0000000000a2'), 'a0000000-0000-4000-8000-000000000014');
SELECT matches(set_config('zz.pl', pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'lina@example.test'), 'a0000000-0000-4000-8000-000000000013'), true),
  '^[0-9a-f-]{36}$', 'une personne invitée SANS groupe dans une campagne qui en a : sa participation est ouverte');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-0000000000a1'), '1/0/aucun', 'sans groupe : aucune ligne de composition');
SELECT is((SELECT string_agg(m.group_id::text || '=' || n::text, ',' ORDER BY m.group_id) FROM (
              SELECT group_id, count(*) AS n FROM app.group_members WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a1' GROUP BY group_id) m),
  'f0000000-0000-4000-8000-0000000000a1=2,f0000000-0000-4000-8000-0000000000a2=1', 'Direction compte deux membres, Production un');
SELECT matches(pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a3', 'yara@example.test'), 'a0000000-0000-4000-8000-000000000015'),
  '^[0-9a-f-]{36}$', 'campagne SANS groupe : acceptation inchangée');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000015', 'c0000000-0000-4000-8000-0000000000a3'), '1/0/aucun', 'campagne sans groupe : participation, aucune composition');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a3'), 0, 'campagne sans groupe : aucune ligne de composition');

-- ===== Réinvitation d'une personne déjà acceptée : la composition ne bouge jamais =====
SELECT is(pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'nour@example.test', 'f0000000-0000-4000-8000-0000000000a2'), 'a0000000-0000-4000-8000-000000000011'),
  current_setting('zz.p1'), 'nour, réinvitée dans un AUTRE groupe, retrouve sa participation (une par personne et par campagne)');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1'),
  '1/1/f0000000-0000-4000-8000-0000000000a1', 'son groupe reste celui de la première acceptation : une seule écriture, jamais deux groupes');
SELECT is((SELECT count(*)::int FROM app.invitations i WHERE i.group_id IS NOT NULL AND i.acceptee_le IS NOT NULL), 0, 'la seconde invitation acceptée a elle aussi perdu son groupe');
SELECT is(pg_temp.accepter(pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'lina@example.test', 'f0000000-0000-4000-8000-0000000000a1'), 'a0000000-0000-4000-8000-000000000013'),
  current_setting('zz.pl'), 'lina, réinvitée avec un groupe, retrouve sa participation');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-0000000000a1'), '1/0/aucun',
  'elle reste sans groupe : une réinvitation n''affecte personne après coup (affectation libre déguisée refusée)');

-- ===== Aucune affectation libre en campagne ouverte =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre('f0000000-0000-4000-8000-0000000000a1', %L)::text$q$, current_setting('zz.pl'))),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'affecter_membre, responsable, campagne ouverte : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', format($q$select app.affecter_membre('f0000000-0000-4000-8000-0000000000a1', %L)::text$q$, current_setting('zz.pl'))),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'affecter_membre, administrateur Tenga, campagne ouverte : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.retirer_membre(%L)::text$q$, current_setting('zz.p1'))),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'retirer_membre, campagne ouverte : refusé');
SELECT throws_ok(format($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', %L)$$, current_setting('zz.pl')),
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'écriture directe de la composition (superutilisateur) : refusée, la participation de lina n''a pas d''invitation en attente');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000013', 'c0000000-0000-4000-8000-0000000000a1') || '|' || pg_temp.bilan('a0000000-0000-4000-8000-000000000011', 'c0000000-0000-4000-8000-0000000000a1'),
  '1/0/aucun|1/1/f0000000-0000-4000-8000-0000000000a1', 'aucune composition n''a changé');

-- ===== Atomicité : participation et composition vivent ou meurent ensemble =====
-- Une moitié échoue (écriture de la composition) : la participation, le rôle et l'invitation sont annulés avec elle.
CREATE FUNCTION pg_temp.echec_declencheur() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'échec simulé' USING ERRCODE = 'P0001';
END
$$;
SELECT matches(set_config('zz.ja', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'zoe@example.test', 'f0000000-0000-4000-8000-0000000000a2'), true),
  '^[A-Za-z0-9_-]{43}$', 'zoe est invitée dans le groupe Production');
CREATE TRIGGER zz_echec_composition BEFORE INSERT ON app.group_members FOR EACH ROW EXECUTE FUNCTION pg_temp.echec_declencheur();
SELECT is(pg_temp.accepter(current_setting('zz.ja'), 'a0000000-0000-4000-8000-000000000016'), 'ERR:P0001:échec simulé', 'la composition échoue : l''acceptation échoue');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-0000000000a1')
          || '|' || (SELECT count(*)::text FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000016')
          || '|' || (SELECT (acceptee_le IS NULL)::text || (email IS NOT NULL)::text || (group_id IS NOT NULL)::text FROM app.invitations WHERE jeton_hash = sha256(convert_to(current_setting('zz.ja'), 'UTF8'))),
  '0/0/aucun|0|truetruetrue', 'rollback : aucune participation, aucun rôle, invitation intacte (en attente, adresse et groupe conservés)');
DROP TRIGGER zz_echec_composition ON app.group_members;
-- L'autre moitié échoue (mise à jour finale de l'invitation) : la participation ET la composition sont annulées.
CREATE TRIGGER zz_echec_invitation BEFORE UPDATE ON app.invitations FOR EACH ROW WHEN (NEW.acceptee_le IS NOT NULL) EXECUTE FUNCTION pg_temp.echec_declencheur();
SELECT is(pg_temp.accepter(current_setting('zz.ja'), 'a0000000-0000-4000-8000-000000000016'), 'ERR:P0001:échec simulé', 'la dernière écriture échoue : l''acceptation échoue');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-0000000000a1')
          || '|' || (SELECT count(*)::text FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000016'),
  '0/0/aucun|0', 'rollback : ni participation, ni composition déjà écrite, ni rôle');
DROP TRIGGER zz_echec_invitation ON app.invitations;
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-0000000000a1'), '0/0/aucun', 'cadre : plus aucun déclencheur d''échec, rien n''est resté');
SELECT matches(pg_temp.accepter(current_setting('zz.ja'), 'a0000000-0000-4000-8000-000000000016'), '^[0-9a-f-]{36}$', 'sans panne, la même invitation s''accepte ensuite');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000016', 'c0000000-0000-4000-8000-0000000000a1'), '1/1/f0000000-0000-4000-8000-0000000000a2', 'zoe : participation et composition ensemble, dans Production');

-- ===== Refus d'acceptation : ni participation, ni composition =====
SELECT matches(set_config('zz.jk', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'kim@example.test', 'f0000000-0000-4000-8000-0000000000a1'), true), '^[A-Za-z0-9_-]{43}$', 'kim est invitée avec un groupe');
SELECT is(pg_temp.accepter(current_setting('zz.jk'), 'a0000000-0000-4000-8000-000000000011'), 'ERR:22023:Le compte ne correspond pas à l''adresse invitée', 'le compte d''une autre adresse est refusé');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000017', 'c0000000-0000-4000-8000-0000000000a1'), '0/0/aucun', 'refus : rien d''écrit pour kim');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE group_id = 'f0000000-0000-4000-8000-0000000000a1'), 2, 'refus : la composition de Direction n''a pas bougé (nour et sami)');
SELECT matches(set_config('zz.jc', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a1', 'ca@example.test', 'f0000000-0000-4000-8000-0000000000a1'), true), '^[A-Za-z0-9_-]{43}$', 'le consultant est invité dans un groupe');
SELECT is(pg_temp.accepter(current_setting('zz.jc'), 'a0000000-0000-4000-8000-000000000004'), 'ERR:55000:Ce compte a déjà un autre rôle dans l''organisation', 'un consultant ne devient pas membre d''un groupe par invitation');
SELECT is((SELECT count(*)::int FROM app.group_members m JOIN app.participations p ON p.id = m.participation_id WHERE p.user_id = 'a0000000-0000-4000-8000-000000000004'), 0, 'aucune composition pour le consultant');
-- Campagne close entre l'invitation et l'acceptation.
SELECT matches(set_config('zz.jx', pg_temp.inviter('c0000000-0000-4000-8000-0000000000a5', 'kim@example.test', 'f0000000-0000-4000-8000-0000000000a5'), true), '^[A-Za-z0-9_-]{43}$', 'invitation avec groupe dans CC');
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a5';
SELECT is(pg_temp.accepter(current_setting('zz.jx'), 'a0000000-0000-4000-8000-000000000017'), 'ERR:55000:Campagne non ouverte : passation refusée', 'campagne close : acceptation refusée');
SELECT is(pg_temp.bilan('a0000000-0000-4000-8000-000000000017', 'c0000000-0000-4000-8000-0000000000a5'), '0/0/aucun', 'campagne close : ni participation ni composition');

-- ===== Effacement d'un compte : la composition part avec lui, le groupe reste =====
SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000011', 'authenticated', $q$select app.supprimer_mon_compte()::text$q$);
SELECT is((SELECT count(*)::int FROM app.group_members WHERE participation_id = current_setting('zz.p1')::uuid), 0, 'compte supprimé en campagne ouverte : sa ligne de composition a disparu (le gel ne bloque jamais l''effacement)');
SELECT is((SELECT count(*)::int FROM app.groups WHERE id = 'f0000000-0000-4000-8000-0000000000a1'), 1, 'le groupe reste');

SELECT * FROM finish();
