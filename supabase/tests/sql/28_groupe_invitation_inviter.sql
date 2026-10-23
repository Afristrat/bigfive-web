-- Migration 0006, app.inviter(…, p_groupe) : le responsable (ou l'administrateur
-- Tenga) choisit le groupe en invitant. Le groupe doit appartenir à la campagne ;
-- le droit est contrôlé AVANT toute lecture du groupe (un refus ne dit pas si le
-- groupe existe) ; l'invitation ne crée aucun groupe ; les appels à cinq
-- arguments sont inchangés ; réinviter une adresse en attente ne change pas le
-- groupe ; le journal ne contient ni adresse ni groupe.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(37);

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

-- Invitation à cinq ou six arguments : renvoie le jeton en clair ou « ERR:... ».
CREATE FUNCTION pg_temp.inviter(p_uid uuid, p_campagne uuid, p_email text, p_groupe uuid DEFAULT NULL) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    CASE WHEN p_groupe IS NULL
         THEN format($q$select jeton from app.inviter(%L, %L, 'Prénom')$q$, p_campagne, p_email)
         ELSE format($q$select jeton from app.inviter(%L, %L, 'Prénom', NULL, NULL, %L)$q$, p_campagne, p_email, p_groupe) END)
$$;

CREATE FUNCTION pg_temp.groupe_de(p_email text, p_campagne uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT COALESCE((SELECT i.group_id::text FROM app.invitations i WHERE i.email = p_email AND i.campaign_id = p_campagne), 'aucune')
$$;

-- Personnages : ra responsable A, ca consultant A, pa participant A, rb responsable B, ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');

-- Campagnes : CA (A, deux groupes créés par le responsable puis ouverture), CX (A, un groupe : « autre campagne »),
-- CN (A, aucun groupe), CD (A, brouillon avec un groupe), CB (B, un groupe).
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'CA'),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'CX'),
  ('c0000000-0000-4000-8000-0000000000a3', 'a1000000-0000-4000-8000-00000000000a', 'CN'),
  ('c0000000-0000-4000-8000-0000000000a4', 'a1000000-0000-4000-8000-00000000000a', 'CD'),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'CB');
SELECT set_config('zz.g1', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-0000000000a1', 'Direction')::text$q$), true);
SELECT set_config('zz.g2', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-0000000000a1', 'Production')::text$q$), true);
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Groupe de CX', 0),
  ('f0000000-0000-4000-8000-0000000000a4', 'c0000000-0000-4000-8000-0000000000a4', 'a1000000-0000-4000-8000-00000000000a', 'Groupe de CD', 0),
  ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Groupe de CB', 0);
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now()
 WHERE id IN ('c0000000-0000-4000-8000-0000000000a1', 'c0000000-0000-4000-8000-0000000000a2', 'c0000000-0000-4000-8000-0000000000a3', 'c0000000-0000-4000-8000-0000000000b1');
SELECT is((SELECT count(*)::int FROM app.groups WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a1'), 2, 'cadre : deux groupes créés en brouillon dans CA');

-- ===== Appels existants : cinq arguments, aucun groupe =====
SELECT matches(set_config('zz.j0', pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'sans-groupe@example.test'), true),
  '^[A-Za-z0-9_-]{43}$', 'inviter à cinq arguments : toujours valable, jeton de 43 caractères');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE email = 'sans-groupe@example.test' AND group_id IS NULL), 1, 'cinq arguments : l''invitation ne porte aucun groupe');
SELECT matches(set_config('zz.jn', pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a3', 'cn@example.test'), true),
  '^[A-Za-z0-9_-]{43}$', 'campagne sans aucun groupe : invitation inchangée');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a3' AND group_id IS NULL), 1, 'campagne sans groupe : group_id nul');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select jeton from app.inviter('c0000000-0000-4000-8000-0000000000a3', 'nul@example.test', NULL, NULL, NULL, NULL)$q$),
  '^[A-Za-z0-9_-]{43}$', 'p_groupe explicitement nul : aucun groupe, aucune erreur');

-- ===== Avec un groupe =====
SELECT matches(set_config('zz.j1', pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'un@example.test', current_setting('zz.g1')::uuid), true),
  '^[A-Za-z0-9_-]{43}$', 'le responsable invite avec le groupe de la campagne');
SELECT is(pg_temp.groupe_de('un@example.test', 'c0000000-0000-4000-8000-0000000000a1'), current_setting('zz.g1'), 'l''invitation porte exactement ce groupe');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select jeton from app.inviter(p_campagne => %L, p_email => %L, p_groupe => %L)$q$, 'c0000000-0000-4000-8000-0000000000a1', 'nomme@example.test', current_setting('zz.g2'))),
  '^[A-Za-z0-9_-]{43}$', 'appel par paramètres nommés avec p_groupe');
SELECT matches(pg_temp.inviter('a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-0000000000a1', 'admin@example.test', current_setting('zz.g2')::uuid),
  '^[A-Za-z0-9_-]{43}$', 'l''administrateur Tenga invite aussi avec un groupe');
SELECT is(pg_temp.groupe_de('admin@example.test', 'c0000000-0000-4000-8000-0000000000a1'), current_setting('zz.g2'), 'groupe de l''invitation de l''administrateur');
SELECT is((SELECT i.organization_id::text || '|' || i.invitant_id::text FROM app.invitations i WHERE i.email = 'un@example.test'),
  'a1000000-0000-4000-8000-00000000000a|a0000000-0000-4000-8000-000000000003', 'l''organisation et l''invitant sont ceux de la campagne et de l''appelant');

-- ===== Groupes refusés =====
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'x1@example.test', 'f0000000-0000-4000-8000-0000000000a3'),
  'ERR:P0002:Groupe introuvable dans cette campagne', 'un groupe d''une AUTRE campagne de la même organisation est refusé');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'x2@example.test', 'f0000000-0000-4000-8000-0000000000b1'),
  'ERR:P0002:Groupe introuvable dans cette campagne', 'un groupe d''une autre organisation est refusé');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'x3@example.test', 'f0000000-0000-4000-8000-0000000000ff'),
  'ERR:P0002:Groupe introuvable dans cette campagne', 'un groupe inexistant est refusé, avec le même message (aucun contrôle d''existence révélé)');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a3', 'x4@example.test', current_setting('zz.g1')::uuid),
  'ERR:P0002:Groupe introuvable dans cette campagne', 'un groupe d''une campagne sans groupe (CN) est refusé');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE email IN ('x1@example.test', 'x2@example.test', 'x3@example.test', 'x4@example.test')), 0, 'ces refus n''ont créé aucune invitation');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a4', 'x5@example.test', 'f0000000-0000-4000-8000-0000000000a4'),
  'ERR:55000:Campagne non ouverte : invitation impossible', 'campagne en brouillon : pas d''invitation, même avec un groupe');

-- ===== Droit contrôlé avant le groupe : aucun contrôle d'existence révélé =====
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1', 'y1@example.test', current_setting('zz.g1')::uuid),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'consultant : refusé, avec un groupe réel');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'y2@example.test', current_setting('zz.g1')::uuid),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'participant : refusé, avec un groupe réel');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-0000000000a1', 'y3@example.test', current_setting('zz.g1')::uuid),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'responsable d''une autre organisation : refusé, avec un groupe réel');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-0000000000a1', 'y4@example.test', 'f0000000-0000-4000-8000-0000000000ff'),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'responsable d''une autre organisation : même refus avec un groupe inexistant (existence non révélée)');
SELECT is(pg_temp.comme(NULL, 'anon', format($q$select jeton from app.inviter('c0000000-0000-4000-8000-0000000000a1', 'z@example.test', NULL, NULL, NULL, %L)$q$, current_setting('zz.g1'))),
  'ERR:42501:permission denied for schema app', 'anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select jeton from app.inviter('c0000000-0000-4000-8000-0000000000a1', 'z@example.test', NULL, NULL, NULL, %L)$q$, current_setting('zz.g1'))),
  'ERR:42501:permission denied for function inviter', 'le serveur (service_role) n''exécute pas inviter');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE email ~ '^[yz][0-9]*@example\.test$'), 0, 'ces refus n''ont créé aucune invitation');

-- ===== L'invitation ne crée jamais de groupe =====
SELECT is((SELECT count(*)::int FROM app.groups WHERE campaign_id = 'c0000000-0000-4000-8000-0000000000a1'), 2, 'après toutes ces invitations, CA compte toujours ses deux groupes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-0000000000a1', 'Tardif')::text$q$),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'campagne ouverte : un groupe ne se crée plus, ni par l''invitation ni autrement');

-- ===== Réinviter une adresse en attente : le groupe ne change pas =====
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'un@example.test', current_setting('zz.g1')::uuid) <> current_setting('zz.j1'),
  true, 'réinvitation avec le même groupe : un nouveau jeton est émis');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE email = 'un@example.test' AND campaign_id = 'c0000000-0000-4000-8000-0000000000a1'), 1, 'une seule invitation en attente pour cette adresse');
SELECT is(pg_temp.groupe_de('un@example.test', 'c0000000-0000-4000-8000-0000000000a1'), current_setting('zz.g1'), 'le groupe est resté le même');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'un@example.test', current_setting('zz.g2')::uuid),
  'ERR:55000:Une invitation en attente existe pour cette adresse avec un autre groupe : le groupe ne change pas', 'réinvitation avec un AUTRE groupe : refusée');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'un@example.test'),
  'ERR:55000:Une invitation en attente existe pour cette adresse avec un autre groupe : le groupe ne change pas', 'réinvitation SANS groupe d''une invitation qui en porte un : refusée');
SELECT is(pg_temp.inviter('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'sans-groupe@example.test', current_setting('zz.g1')::uuid),
  'ERR:55000:Une invitation en attente existe pour cette adresse avec un autre groupe : le groupe ne change pas', 'réinvitation AVEC un groupe d''une invitation qui n''en porte pas : refusée');
SELECT is(pg_temp.groupe_de('un@example.test', 'c0000000-0000-4000-8000-0000000000a1') || '|' || pg_temp.groupe_de('sans-groupe@example.test', 'c0000000-0000-4000-8000-0000000000a1'),
  current_setting('zz.g1') || '|aucune', 'ces refus n''ont changé aucun groupe');

-- ===== Journal : ni adresse, ni groupe =====
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'invitation.creer' AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 7,
  'sept invitations ou renouvellements journalisés pour A (aucun refus)');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l.organization_id = 'a1000000-0000-4000-8000-00000000000a'
             AND (l::text LIKE '%' || current_setting('zz.g1') || '%' OR l::text LIKE '%' || current_setting('zz.g2') || '%')
             AND l.action LIKE 'invitation.%'), 0, 'le journal des invitations ne contient jamais l''identifiant d''un groupe');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l::text LIKE '%@%' AND (l.organization_id IN ('a1000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000b') OR l.acteur::text LIKE 'a0000000-%')), 0, 'aucune adresse e-mail dans le journal');

SELECT * FROM finish();
