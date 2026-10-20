-- Lot 4 : fonctions de gestion des groupes (créer, renommer, supprimer un
-- groupe ; affecter, retirer un membre). Réservées au responsable de
-- l'organisation et à l'administrateur Tenga, tant que la campagne est en
-- brouillon ; chaque geste est journalisé, chaque refus ne laisse aucune trace ;
-- un refus ne distingue pas « inexistant » de « interdit » ; composition gelée
-- après l'ouverture ; l'effacement d'un compte n'est jamais bloqué par le gel.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(57);

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

-- Personnages : pa, pb, pc participants A ; ra responsable A ; ca consultant affecté A ; cx consultant B ;
-- rb responsable B ; ab participant B ; ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('a0000000-0000-4000-8000-000000000009', 'pc@example.test'),
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
  ('a0000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable'),
  ('a0000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-00000000000b', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
-- CD brouillon A ; CO ouverte A ; CB brouillon B ; CF brouillon A (ouverte puis close par la fonction plus bas)
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Brouillon A', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'Ouverte A', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'Brouillon B', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000f', 'a1000000-0000-4000-8000-00000000000a', 'Gel A', 'brouillon', NULL, NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000007'),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-00000000000f', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001');

-- ===== creer_groupe =====
SELECT set_config('zz.g1', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Direction')::text$q$), true);
SELECT ok(current_setting('zz.g1') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', 'creer_groupe, responsable : renvoie l''identifiant du groupe');
SELECT is((SELECT nom || '|' || ordre || '|' || organization_id FROM app.groups WHERE id = current_setting('zz.g1')::uuid),
  'Direction|0|a1000000-0000-4000-8000-00000000000a', 'le premier groupe a l''ordre 0 et l''organisation de la campagne');
SELECT set_config('zz.g2', pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', '  Production  ')::text$q$), true);
SELECT is((SELECT nom || '|' || ordre FROM app.groups WHERE id = current_setting('zz.g2')::uuid),
  'Production|1', 'creer_groupe, administrateur Tenga : nom nettoyé, ordre suivant attribué');
SELECT set_config('zz.g3', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Support', 7)::text$q$), true);
SELECT is((SELECT ordre FROM app.groups WHERE id = current_setting('zz.g3')::uuid), 7, 'creer_groupe : l''ordre demandé est respecté');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.creer' AND ressource_type = 'groupe'
            AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 3, 'les trois créations sont journalisées (groupe, organisation)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Direction')::text$q$),
  'ERR:23505:duplicate key value violates unique constraint "groups_campaign_id_nom_key"', 'creer_groupe : un nom déjà pris dans la campagne est refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', '   ')::text$q$),
  'ERR:23514:new row for relation "groups" violates check constraint "groups_nom_check"', 'creer_groupe : un nom vide est refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_groupe, consultant affecté : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_groupe, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_groupe, consultant d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_groupe, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-0000000000ff', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'creer_groupe, campagne inexistante : même refus (aucune fuite d''existence)');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:Connexion requise', 'creer_groupe, sans identité : refusé');
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000d', 'Pirate')::text$q$),
  'ERR:42501:permission denied for schema app', 'creer_groupe, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000a', 'Tardif')::text$q$),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'creer_groupe : une campagne ouverte n''accepte plus de groupe');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.creer'), 3, 'aucun refus ne laisse de ligne de journal');

-- ===== renommer_groupe =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.renommer_groupe(%L, 'Fabrication', 3)::text$q$, current_setting('zz.g2'))),
  '', 'renommer_groupe, responsable : renomme et réordonne');
SELECT is((SELECT nom || '|' || ordre FROM app.groups WHERE id = current_setting('zz.g2')::uuid), 'Fabrication|3', 'le groupe porte son nouveau nom et son nouvel ordre');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.renommer_groupe(%L, 'Fabrication')::text$q$, current_setting('zz.g2'))),
  '', 'renommer_groupe : sans ordre, l''ordre est conservé');
SELECT is((SELECT ordre FROM app.groups WHERE id = current_setting('zz.g2')::uuid), 3, 'l''ordre n''a pas bougé');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.renommer' AND ressource_id = current_setting('zz.g2')::uuid), 2, 'chaque renommage est journalisé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.renommer_groupe(%L, 'Pirate')::text$q$, current_setting('zz.g2'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'renommer_groupe, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select app.renommer_groupe(%L, 'Pirate')::text$q$, current_setting('zz.g2'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'renommer_groupe, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.renommer_groupe('f0000000-0000-4000-8000-0000000000ff', 'Pirate')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'renommer_groupe, groupe inexistant : même refus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.renommer_groupe(%L, 'Direction')::text$q$, current_setting('zz.g2'))),
  'ERR:23505:duplicate key value violates unique constraint "groups_campaign_id_nom_key"', 'renommer_groupe : un nom déjà pris est refusé');

-- ===== affecter_membre =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000001')::text$q$, current_setting('zz.g1'))),
  '', 'affecter_membre, responsable : affecte une personne à un groupe');
SELECT is((SELECT group_id::text FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'), current_setting('zz.g1'), 'la personne est dans le groupe demandé');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.affecter' AND ressource_type = 'participation'
            AND ressource_id = 'd0000000-0000-4000-8000-000000000001' AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'l''affectation est journalisée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000001')::text$q$, current_setting('zz.g2'))),
  'ERR:23505:Cette personne est déjà dans un groupe de la campagne : la retirer d''abord', 'affecter_membre : une personne ne peut être dans deux groupes de la campagne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000001')::text$q$, current_setting('zz.g1'))),
  'ERR:23505:Cette personne est déjà dans un groupe de la campagne : la retirer d''abord', 'affecter_membre : pas non plus deux fois dans le même groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000004')::text$q$, current_setting('zz.g1'))),
  'ERR:P0002:Participation introuvable dans cette campagne', 'affecter_membre : une participation d''une autre campagne est refusée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000005')::text$q$, current_setting('zz.g1'))),
  'ERR:P0002:Participation introuvable dans cette campagne', 'affecter_membre : une participation d''une autre organisation, même message (aucune fuite)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-0000000000ff')::text$q$, current_setting('zz.g1'))),
  'ERR:P0002:Participation introuvable dans cette campagne', 'affecter_membre : une participation inexistante, même message');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000002')::text$q$, current_setting('zz.g1'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'affecter_membre, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000002')::text$q$, current_setting('zz.g1'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'affecter_membre, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000002')::text$q$, current_setting('zz.g1'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'affecter_membre, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000002')::text$q$, current_setting('zz.g2'))),
  '', 'affecter_membre, administrateur Tenga : affecte');

-- ===== retirer_membre =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-000000000001')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'retirer_membre, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-000000000001')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'retirer_membre, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-0000000000ff')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'retirer_membre, participation inexistante : même refus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-000000000001')::text$q$),
  'true', 'retirer_membre, responsable : retire et renvoie vrai');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-000000000001')::text$q$),
  'false', 'retirer_membre : une personne déjà hors groupe renvoie faux');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.retirer' AND ressource_id = 'd0000000-0000-4000-8000-000000000001'), 1, 'seul le retrait effectif est journalisé');

-- ===== supprimer_groupe (les membres partent avec le groupe) =====
SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000003')::text$q$, current_setting('zz.g3')));
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select app.supprimer_groupe(%L)::text$q$, current_setting('zz.g3'))),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'supprimer_groupe, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.supprimer_groupe('f0000000-0000-4000-8000-0000000000ff')::text$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'supprimer_groupe, groupe inexistant : même refus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.supprimer_groupe(%L)::text$q$, current_setting('zz.g3'))),
  '', 'supprimer_groupe, responsable : supprime');
SELECT is((SELECT (SELECT count(*) FROM app.groups WHERE id = current_setting('zz.g3')::uuid)
              + (SELECT count(*) FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000003'))::int,
  0, 'le groupe et son membre ont disparu');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'groupe.supprimer' AND ressource_id = current_setting('zz.g3')::uuid), 1, 'la suppression est journalisée');

-- ===== Gel après l'ouverture, par les fonctions =====
SELECT set_config('zz.gf', pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000f', 'Groupe de gel')::text$q$), true);
SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.affecter_membre(%L, 'd0000000-0000-4000-8000-000000000006')::text$q$, current_setting('zz.gf')));
SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.ouvrir_campagne('c0000000-0000-4000-8000-00000000000f')::text$q$);
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.creer_groupe('c0000000-0000-4000-8000-00000000000f', 'Tardif')::text$q$),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'après l''ouverture : plus de nouveau groupe');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.renommer_groupe(%L, 'Tardif')::text$q$, current_setting('zz.gf'))),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'après l''ouverture : plus de renommage');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.supprimer_groupe(%L)::text$q$, current_setting('zz.gf'))),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'après l''ouverture : plus de suppression');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.retirer_membre('d0000000-0000-4000-8000-000000000006')::text$q$),
  'ERR:55000:Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture', 'après l''ouverture : plus de retrait, même pour l''administrateur Tenga');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000006'), 1, 'la composition est restée telle quelle');

-- ===== Effacement d'un compte après clôture : jamais bloqué par le gel =====
SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select app.clore_campagne('c0000000-0000-4000-8000-00000000000f')::text$q$);
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.supprimer_mon_compte()::text$q$),
  '', 'supprimer_mon_compte : un participant d''une campagne close, membre d''un groupe, efface son compte sans erreur');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000006'), 0, 'sa ligne de composition a disparu avec lui');
SELECT is((SELECT count(*)::int FROM app.groups WHERE id = current_setting('zz.gf')::uuid), 1, 'le groupe, lui, reste');

SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal');

SELECT * FROM finish();
