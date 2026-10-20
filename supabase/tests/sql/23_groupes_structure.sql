-- Lot 4 : structure des groupes et des agrégats (migration 0005). Protection
-- de toutes les nouvelles tables (RLS forcée, anonyme et service_role sans
-- droit, écriture fermée), listes figées (règles, déclencheurs, colonnes,
-- fonctions exécutables), contraintes (une personne dans un seul groupe par
-- campagne, plancher d'effectif), composition GELÉE dès l'ouverture (même pour
-- le superutilisateur, sauf l'effacement en cascade), photographie en lecture
-- seule posée une seule fois.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(75);

-- ===== Protection de toutes les tables =====
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates'))
        OR (n.nspname = 'private' AND c.relname = 'agregats_poses'))
      AND c.relkind = 'r' AND c.relrowsecurity AND c.relforcerowsecurity),
  4, 'les quatre tables du lot 4 ont la RLS activée et forcée');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates'))
        OR (n.nspname = 'private' AND c.relname = 'agregats_poses'))
      AND c.relowner = 'tenga_owner'::regrole),
  4, 'les quatre tables appartiennent à tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates'))
        OR (n.nspname = 'private' AND c.relname = 'agregats_poses'))
      AND (has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('anon', c.oid, 'DELETE') OR has_table_privilege('anon', c.oid, 'TRUNCATE')
           OR has_table_privilege('anon', c.oid, 'TRIGGER'))),
  0, 'l''anonyme n''a aucun droit sur les quatre tables');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE ((n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates'))
        OR (n.nspname = 'private' AND c.relname = 'agregats_poses'))
      AND (has_any_column_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('service_role', c.oid, 'DELETE') OR has_table_privilege('service_role', c.oid, 'TRUNCATE'))),
  0, 'service_role (qui contourne la RLS) n''a aucun droit sur les quatre tables');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates')
      AND (has_table_privilege('authenticated', c.oid, 'INSERT') OR has_table_privilege('authenticated', c.oid, 'UPDATE')
           OR has_table_privilege('authenticated', c.oid, 'DELETE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
           OR has_table_privilege('authenticated', c.oid, 'TRIGGER') OR has_table_privilege('authenticated', c.oid, 'REFERENCES'))),
  0, 'le rôle connecté n''a aucun droit d''écriture sur les trois tables (verrou 1)');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('groups', 'group_members', 'group_aggregates')
      AND has_table_privilege('authenticated', c.oid, 'SELECT')),
  3, 'le rôle connecté lit les trois tables (lecture seule, filtrée par les règles)');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'private' AND c.relname = 'agregats_poses'
      AND (has_any_column_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('authenticated', c.oid, 'DELETE'))),
  0, 'le marqueur de pose (private) est fermé au rôle connecté');

-- ===== Fonctions : exécutables par l'API, figées =====
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private')
      AND p.proname IN ('creer_groupe', 'renommer_groupe', 'supprimer_groupe', 'affecter_membre', 'retirer_membre',
                        'poser_agregats', 'geler_composition', 'verifier_photographie', 'autoriser_composition')
      AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'l''anonyme n''exécute aucune fonction du lot 4');
SELECT is(
  (SELECT string_agg(p.proname, ',' ORDER BY p.proname) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private')
      AND p.proname IN ('creer_groupe', 'renommer_groupe', 'supprimer_groupe', 'affecter_membre', 'retirer_membre',
                        'poser_agregats', 'geler_composition', 'verifier_photographie', 'autoriser_composition')
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  'affecter_membre,creer_groupe,renommer_groupe,retirer_membre,supprimer_groupe',
  'le rôle connecté n''exécute que les cinq fonctions de gestion des groupes (pas poser_agregats)');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private')
      AND p.proname IN ('creer_groupe', 'renommer_groupe', 'supprimer_groupe', 'affecter_membre', 'retirer_membre',
                        'poser_agregats', 'geler_composition', 'verifier_photographie', 'autoriser_composition')
      AND (has_function_privilege('service_role', p.oid, 'EXECUTE') OR has_function_privilege('public', p.oid, 'EXECUTE'))),
  0, 'service_role et PUBLIC n''exécutent aucune fonction du lot 4');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND p.proname IN ('creer_groupe', 'renommer_groupe', 'supprimer_groupe', 'affecter_membre', 'retirer_membre')
      AND p.prosecdef AND 'search_path=""' = ANY (COALESCE(p.proconfig, '{}')) AND p.proowner = 'tenga_owner'::regrole),
  5, 'les cinq fonctions de gestion sont SECURITY DEFINER, search_path vide, propriété de tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private' AND p.proname IN ('poser_agregats', 'geler_composition', 'verifier_photographie', 'autoriser_composition')
      AND 'search_path=""' = ANY (COALESCE(p.proconfig, '{}'))),
  4, 'les quatre fonctions internes du lot 4 épinglent un search_path vide');
SELECT is(
  (SELECT p.pronargs::int FROM pg_proc p WHERE p.oid = 'app.clore_campagne(uuid)'::regprocedure),
  1, 'app.clore_campagne garde sa signature (un seul argument : la campagne)');
SELECT ok(
  (SELECT position('private.poser_agregats' IN p.prosrc) > 0 FROM pg_proc p WHERE p.oid = 'app.clore_campagne(uuid)'::regprocedure),
  'app.clore_campagne pose la photographie dans sa transaction');
SELECT ok(
  (SELECT p.prosecdef AND position('FOR SHARE OF c' IN p.prosrc) > 0 FROM pg_proc p WHERE p.oid = 'private.exiger_campagne_ouverte()'::regprocedure),
  'le contrôle « campagne ouverte » prend un verrou partagé sur la campagne : une clôture en cours est attendue, aucun résultat ne naît hors photographie');

-- ===== Règles : liste figée pour les quatre tables =====
SELECT is(
  (SELECT string_agg(tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY tablename COLLATE "C", policyname COLLATE "C")
     FROM pg_policies WHERE (schemaname = 'app' AND tablename IN ('groups', 'group_members', 'group_aggregates'))
                         OR (schemaname = 'private' AND tablename = 'agregats_poses')),
  $f$agregats_poses|agregats_poses_insertion_owner|INSERT|tenga_owner
agregats_poses|agregats_poses_lecture_owner|SELECT|tenga_owner
group_aggregates|group_aggregates_insertion_owner|INSERT|tenga_owner
group_aggregates|group_aggregates_lecture|SELECT|authenticated
group_aggregates|group_aggregates_lecture_owner|SELECT|tenga_owner
group_members|group_members_insertion_owner|INSERT|tenga_owner
group_members|group_members_lecture|SELECT|authenticated
group_members|group_members_lecture_owner|SELECT|tenga_owner
group_members|group_members_suppression_owner|DELETE|tenga_owner
groups|groups_insertion_owner|INSERT|tenga_owner
groups|groups_lecture|SELECT|authenticated
groups|groups_lecture_owner|SELECT|tenga_owner
groups|groups_modification_owner|UPDATE|tenga_owner
groups|groups_suppression_owner|DELETE|tenga_owner$f$,
  'liste figée des règles des quatre tables');
SELECT is(
  (SELECT string_agg(policyname, ',' ORDER BY policyname COLLATE "C") FROM pg_policies
    WHERE schemaname = 'app' AND tablename IN ('groups', 'group_members', 'group_aggregates') AND 'authenticated' = ANY (roles)),
  'group_aggregates_lecture,group_members_lecture,groups_lecture',
  'une seule règle de lecture par table pour le rôle connecté');
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE ((schemaname = 'app' AND tablename IN ('groups', 'group_members', 'group_aggregates'))
        OR (schemaname = 'private' AND tablename = 'agregats_poses'))
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND NOT (roles = ARRAY['tenga_owner']::name[])),
  0, 'aucune règle d''écriture pour un autre rôle que tenga_owner (verrou 2)');
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'app' AND tablename IN ('groups', 'group_members', 'group_aggregates')
      AND 'authenticated' = ANY (roles) AND coalesce(qual, '') ~* 'participant|results|attempts|participations'),
  0, 'les règles de lecture ne dépendent ni des résultats, ni des tentatives, ni de la qualité de participant');
SELECT is(
  (SELECT count(*)::int FROM pg_policies
    WHERE schemaname = 'app' AND tablename IN ('groups', 'group_members', 'group_aggregates')
      AND 'authenticated' = ANY (roles) AND qual ~ 'SELECT app\.suis_admin_tenga'),
  3, 'les trois règles de lecture enveloppent suis_admin_tenga dans un (SELECT ...)');

-- ===== Déclencheurs =====
SELECT is(
  (SELECT count(DISTINCT t.tgrelid)::int FROM pg_trigger t
    WHERE t.tgrelid IN ('app.groups'::regclass, 'app.group_members'::regclass, 'app.group_aggregates'::regclass)
      AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O' AND (t.tgtype & 1) = 1),
  3, 'refuser_ecriture_api est actif par ligne sur les trois tables (verrou 3)');
SELECT is(
  (SELECT count(DISTINCT t.tgrelid)::int FROM pg_trigger t
    WHERE t.tgrelid IN ('app.groups'::regclass, 'app.group_members'::regclass, 'app.group_aggregates'::regclass)
      AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O' AND (t.tgtype & 32) = 32),
  3, 'refuser_ecriture_api couvre aussi TRUNCATE sur les trois tables');
SELECT is(
  (SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
    WHERE t.tgrelid IN ('app.groups'::regclass, 'app.group_members'::regclass, 'app.group_aggregates'::regclass)
      AND NOT t.tgisinternal AND t.tgenabled = 'O'),
  'group_aggregates_sans_ecriture_api,group_aggregates_sans_vidage_api,group_aggregates_verrou_photographie,group_aggregates_verrou_vidage,group_members_sans_ecriture_api,group_members_sans_vidage_api,group_members_verrou_composition,groups_sans_ecriture_api,groups_sans_vidage_api,groups_verrou_composition',
  'liste figée des déclencheurs des trois tables, tous actifs');
SELECT is(
  (SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
    WHERE t.tgrelid = 'app.groups'::regclass AND NOT t.tgisinternal AND (t.tgtype & 1) = 1),
  'groups_sans_ecriture_api,groups_verrou_composition',
  'le verrou de l''API se déclenche avant le gel de la composition (ordre alphabétique des déclencheurs)');

-- ===== Colonnes =====
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid = 'app.group_aggregates'::regclass AND a.attnum > 0 AND NOT a.attisdropped),
  'campaign_id,organization_id,group_id,portee,domaine,effectif,moyenne,ecart_type,pose_le',
  'colonnes de app.group_aggregates, figées : effectif, moyenne, écart type, rien d''autre');
SELECT is(
  (SELECT count(*)::int FROM pg_attribute a
    WHERE a.attrelid = 'app.group_aggregates'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname ~* 'min|max|median|percentile|extreme|user|mail|nom|participation'),
  0, 'aucune valeur minimale ni maximale, aucune identité dans les agrégats');
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid = 'app.group_members'::regclass AND a.attnum > 0 AND NOT a.attisdropped),
  'group_id,campaign_id,organization_id,participation_id,cree_le',
  'colonnes de app.group_members, figées (aucun nom, aucune adresse)');
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid = 'app.groups'::regclass AND a.attnum > 0 AND NOT a.attisdropped),
  'id,campaign_id,organization_id,nom,ordre,cree_le', 'colonnes de app.groups, figées');
SELECT is(
  (SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c WHERE c.conrelid = 'app.group_members'::regclass AND c.contype = 'p'),
  'PRIMARY KEY (campaign_id, participation_id)',
  'une personne dans un seul groupe par campagne : clé primaire sur (campagne, participation)');
SELECT is(
  (SELECT count(*)::int FROM pg_constraint c WHERE c.conrelid = 'app.group_aggregates'::regclass
      AND c.conname IN ('effectif_publie_plancher', 'statistiques_si_effectif')),
  2, 'le plancher d''effectif et la cohérence des statistiques sont des contraintes de la table');

-- Cadre : fixtures (superutilisateur)
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'deux@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'trois@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'quatre@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000b', 'participant');
-- CD brouillon A ; CB brouillon B ; CG brouillon A (qu'on ouvre puis clôt plus bas) ; CC brouillon A (clôturée plus bas)
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Brouillon A', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'Brouillon B', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'Gel A', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'Close A', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'Ouverte A', 'ouverte', now(), NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000004'),
  ('d0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003');

-- ===== Groupes : contraintes =====
SELECT lives_ok($$INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Direction', 0)$$,
  'un groupe se crée en brouillon');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Production', 1),
  ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'Groupe de B', 0);
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Direction')$$,
  '23505', NULL, 'un nom de groupe est unique dans la campagne');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', ' ')$$,
  '23514', NULL, 'nom de groupe non vide et sans espace en tête');
SELECT throws_ok(format($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', %L)$$, repeat('x', 81)),
  '23514', NULL, 'nom de groupe borné à 80 caractères');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom, ordre) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Ordre', -1)$$,
  '23514', NULL, 'ordre de groupe borné (négatif refusé)');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom, ordre) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Ordre', 1001)$$,
  '23514', NULL, 'ordre de groupe borné (1001 refusé)');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-0000000000ff', 'a1000000-0000-4000-8000-00000000000a', 'Fantôme')$$,
  '23503', NULL, 'un groupe exige une campagne existante');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000b', 'Autre org')$$,
  '23503', NULL, 'l''organisation d''un groupe est celle de sa campagne (clé composite)');

-- ===== Membres : une personne dans un seul groupe par campagne =====
SELECT lives_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001')$$,
  'une personne s''affecte à un groupe en brouillon');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001')$$,
  '23505', NULL, 'la même personne dans un second groupe de la campagne est refusée (unicité)');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000004')$$,
  '23503', NULL, 'une participation d''une autre campagne ne s''affecte pas (clé composite)');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000b1', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000002')$$,
  '23503', NULL, 'un groupe d''une autre campagne ne reçoit pas de membre (clé composite)');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000002')$$,
  '23503', NULL, 'l''organisation d''un membre est celle de la campagne (clé composite)');
SELECT throws_ok($$UPDATE app.group_members SET campaign_id = 'c0000000-0000-4000-8000-00000000000b', organization_id = 'a1000000-0000-4000-8000-00000000000b' WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'$$,
  '55000', 'Une composition ne change pas de campagne', 'un membre ne change pas de campagne');

-- ===== Composition gelée dès l'ouverture, même pour le superutilisateur =====
INSERT INTO app.groups (id, campaign_id, organization_id, nom) VALUES
  ('f0000000-0000-4000-8000-0000000000e1', 'c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'Gel 1');
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
  ('f0000000-0000-4000-8000-0000000000e1', 'c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000006');
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = 'c0000000-0000-4000-8000-00000000000e';
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'Tardif')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de nouveau groupe');
SELECT throws_ok($$UPDATE app.groups SET nom = 'Renommé' WHERE id = 'f0000000-0000-4000-8000-0000000000e1'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de renommage');
SELECT throws_ok($$DELETE FROM app.groups WHERE id = 'f0000000-0000-4000-8000-0000000000e1'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de suppression de groupe');
SELECT throws_ok($$INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES ('f0000000-0000-4000-8000-0000000000e1', 'c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000007')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de nouveau membre');
SELECT throws_ok($$DELETE FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000006'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de retrait de membre');
SELECT throws_ok($$UPDATE app.group_members SET group_id = group_id WHERE participation_id = 'd0000000-0000-4000-8000-000000000006'$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'campagne ouverte : plus de modification de membre');
SELECT throws_ok($$INSERT INTO app.groups (campaign_id, organization_id, nom) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'Ouverte d''emblée')$$,
  '55000', 'Composition gelée : la campagne n''est plus en brouillon', 'une campagne ouverte n''a jamais accepté de groupe');

-- Effacement en cascade : un compte supprimé en campagne ouverte emporte sa ligne de composition (RGPD), les groupes restent.
DELETE FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000002';
SELECT is(
  (SELECT count(*)::int FROM app.group_members WHERE participation_id = 'd0000000-0000-4000-8000-000000000006'),
  0, 'la suppression d''un compte efface sa ligne de composition même dans une campagne ouverte (cascade non bloquée)');
SELECT is(
  (SELECT count(*)::int FROM app.groups WHERE id = 'f0000000-0000-4000-8000-0000000000e1'),
  1, 'le groupe, lui, reste');

-- ===== Photographie : posée à la clôture, en lecture seule =====
-- CC : un groupe créé en brouillon, puis la campagne est ouverte et close (superutilisateur) ; son marqueur de pose est celui de cette transaction.
INSERT INTO app.groups (id, campaign_id, organization_id, nom) VALUES
  ('f0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'Groupe photographié');
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = 'c0000000-0000-4000-8000-00000000000c';
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000e1', 'groupe', 'O', 5, 10, 1)$$,
  '55000', 'Agrégats posés à la clôture d''une campagne seulement', 'campagne ouverte : aucun agrégat ne s''écrit');
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id IN ('c0000000-0000-4000-8000-00000000000c', 'c0000000-0000-4000-8000-00000000000e');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000e1', 'groupe', 'O', 5, 10, 1)$$,
  '55000', 'Agrégats : une seule pose, par la clôture', 'campagne close sans marqueur de pose : aucun agrégat ne s''écrit');
INSERT INTO private.agregats_poses (campaign_id, pose_le) VALUES ('c0000000-0000-4000-8000-00000000000e', now() - interval '1 day');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000e', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000e1', 'groupe', 'O', 5, 10, 1)$$,
  '55000', 'Agrégats : une seule pose, par la clôture', 'photographie déjà posée dans une transaction passée : plus aucune ligne ne s''ajoute');
SELECT throws_ok($$INSERT INTO private.agregats_poses (campaign_id) VALUES ('c0000000-0000-4000-8000-00000000000e')$$,
  '23505', NULL, 'un seul marqueur de pose par campagne');

INSERT INTO private.agregats_poses (campaign_id) VALUES ('c0000000-0000-4000-8000-00000000000c');
SELECT lives_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'O', 5, 10.50, 2.00)$$,
  'dans la transaction de la clôture, un groupe de 5 se publie');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'C', 4, 10, 1)$$,
  '23514', NULL, 'plancher : un groupe de 4 ne se publie pas, même par le superutilisateur');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'C', 0)$$,
  '23514', NULL, 'plancher : un groupe vide ne se publie pas');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'complement', 'E', 3, 10, 1)$$,
  '23514', NULL, 'plancher : un complément de 3 ne se publie pas');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'complement', 'E', 0, 5, 1)$$,
  '23514', NULL, 'un complément vide ne porte aucune moyenne');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'complement', 'E', 5)$$,
  '23514', NULL, 'un complément de 5 porte sa moyenne et son écart type');
SELECT lives_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'complement', 'A', 0)$$,
  'un complément vide (effectif 0, sans statistique) est publiable');
SELECT lives_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'complement', 'N', 7, 20, 3)$$,
  'un complément de 7 est publiable');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'X', 6, 10, 1)$$,
  '23514', NULL, 'domaine borné aux cinq domaines du Big Five');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'total', 'O', 6, 10, 1)$$,
  '23514', NULL, 'portée bornée à groupe et complément (aucun total de campagne)');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'E', 6, 10, -1)$$,
  '23514', NULL, 'un écart type n''est jamais négatif');
SELECT throws_ok($$INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type) VALUES ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-0000000000c1', 'groupe', 'O', 6, 10, 1)$$,
  '23505', NULL, 'une seule ligne par groupe, portée et domaine');
SELECT throws_ok($$UPDATE app.group_aggregates SET effectif = 6 WHERE campaign_id = 'c0000000-0000-4000-8000-00000000000c' AND portee = 'groupe'$$,
  '23001', 'Une photographie d''agrégats ne se modifie pas', 'une photographie ne se modifie pas, même pour le superutilisateur');
SELECT throws_ok($$DELETE FROM app.group_aggregates WHERE campaign_id = 'c0000000-0000-4000-8000-00000000000c'$$,
  '23001', 'Une photographie d''agrégats ne s''efface pas', 'une photographie ne s''efface pas, même pour le superutilisateur');
SELECT throws_ok($$TRUNCATE app.group_aggregates$$,
  '23001', 'Une photographie d''agrégats ne se vide pas', 'une photographie ne se vide pas, même pour le superutilisateur');

-- Disparition de la campagne : la photographie et son marqueur s'en vont avec elle.
DELETE FROM app.campaigns WHERE id = 'c0000000-0000-4000-8000-00000000000c';
SELECT is(
  (SELECT (SELECT count(*) FROM app.group_aggregates WHERE campaign_id = 'c0000000-0000-4000-8000-00000000000c')
        + (SELECT count(*) FROM private.agregats_poses WHERE campaign_id = 'c0000000-0000-4000-8000-00000000000c')
        + (SELECT count(*) FROM app.groups WHERE campaign_id = 'c0000000-0000-4000-8000-00000000000c'))::int,
  0, 'supprimer une campagne close efface ses groupes, sa photographie et son marqueur');

-- Disparition de l'organisation : tout s'efface, même une composition gelée.
DELETE FROM app.organizations WHERE id = 'a1000000-0000-4000-8000-00000000000a';
SELECT is(
  (SELECT (SELECT count(*) FROM app.groups WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.group_members WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.group_aggregates WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a'))::int,
  0, 'supprimer une organisation efface ses groupes et sa composition, même gelés');
SELECT is((SELECT count(*)::int FROM app.groups), 1, 'le groupe de l''autre organisation est intact');

SELECT * FROM finish();
