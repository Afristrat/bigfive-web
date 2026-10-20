-- Lots 2 et 3 : structure des campagnes, invitations, participations,
-- tentatives et résultats. Protection de toutes les tables, anonyme sans droit,
-- liste des règles figée pour ces tables, contraintes, clés étrangères
-- composites (l'organisation d'un résultat est celle de sa campagne),
-- déclencheurs (statut, campagne ouverte, résultat immuable, écriture par
-- l'API), invitation sans colonne de rôle et adresse effacée à l'acceptation.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(52);

-- ===== Protection de toutes les tables =====
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND c.relkind = 'r' AND c.relrowsecurity AND c.relforcerowsecurity),
  5, 'les cinq tables des lots 2 et 3 ont la RLS activée et forcée');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND c.relowner = 'tenga_owner'::regrole),
  5, 'les cinq tables appartiennent à tenga_owner');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND (has_any_column_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('anon', c.oid, 'DELETE') OR has_table_privilege('anon', c.oid, 'TRUNCATE')
           OR has_table_privilege('anon', c.oid, 'TRIGGER'))),
  0, 'l''anonyme n''a aucun droit sur les cinq tables');
SELECT is(
  (SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('app', 'private') AND has_function_privilege('anon', p.oid, 'EXECUTE')),
  0, 'l''anonyme n''exécute aucune fonction, nouvelles comprises');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND (has_any_column_privilege('service_role', c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
           OR has_table_privilege('service_role', c.oid, 'DELETE') OR has_table_privilege('service_role', c.oid, 'TRUNCATE'))),
  0, 'service_role (qui contourne la RLS) n''a aucun droit sur les cinq tables');
SELECT is(
  (SELECT count(*)::int FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'app' AND c.relname IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND (has_table_privilege('authenticated', c.oid, 'INSERT') OR has_table_privilege('authenticated', c.oid, 'UPDATE')
           OR has_table_privilege('authenticated', c.oid, 'DELETE') OR has_table_privilege('authenticated', c.oid, 'TRUNCATE')
           OR has_table_privilege('authenticated', c.oid, 'TRIGGER') OR has_table_privilege('authenticated', c.oid, 'REFERENCES'))),
  0, 'le rôle connecté n''a aucun droit d''écriture sur les cinq tables (verrou 1)');
SELECT is(
  (SELECT count(*)::int FROM pg_views WHERE schemaname IN ('app', 'private')),
  0, 'aucune vue dans app ni private (donc aucune vue sans security_invoker)');

-- ===== Règles : liste figée pour ces tables =====
SELECT is(
  (SELECT string_agg(tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY tablename, policyname)
     FROM pg_policies WHERE schemaname = 'app' AND tablename IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')),
  $f$attempts|attempts_insertion_owner|INSERT|tenga_owner
attempts|attempts_lecture_owner|SELECT|tenga_owner
attempts|attempts_lecture_proprietaire|SELECT|authenticated
attempts|attempts_modification_owner|UPDATE|tenga_owner
attempts|attempts_suppression_owner|DELETE|tenga_owner
campaigns|campaigns_insertion_owner|INSERT|tenga_owner
campaigns|campaigns_lecture|SELECT|authenticated
campaigns|campaigns_lecture_owner|SELECT|tenga_owner
campaigns|campaigns_modification_owner|UPDATE|tenga_owner
invitations|invitations_insertion_owner|INSERT|tenga_owner
invitations|invitations_lecture_owner|SELECT|tenga_owner
invitations|invitations_lecture_responsable|SELECT|authenticated
invitations|invitations_modification_owner|UPDATE|tenga_owner
invitations|invitations_suppression_owner|DELETE|tenga_owner
participations|participations_insertion_owner|INSERT|tenga_owner
participations|participations_lecture_owner|SELECT|tenga_owner
participations|participations_lecture_proprietaire|SELECT|authenticated
participations|participations_lecture_responsable|SELECT|authenticated
participations|participations_modification_owner|UPDATE|tenga_owner
results|results_insertion_owner|INSERT|tenga_owner
results|results_lecture_owner|SELECT|tenga_owner
results|results_lecture_proprietaire|SELECT|authenticated
results|results_suppression_owner|DELETE|tenga_owner$f$,
  'liste figée des règles des cinq tables');
-- Le responsable, le consultant et l'administrateur n'ont aucune règle de lecture sur attempts ni results.
SELECT is(
  (SELECT string_agg(tablename || '|' || policyname, E'\n' ORDER BY tablename, policyname)
     FROM pg_policies WHERE schemaname = 'app' AND tablename IN ('attempts', 'results') AND 'authenticated' = ANY (roles)),
  E'attempts|attempts_lecture_proprietaire\nresults|results_lecture_proprietaire',
  'attempts et results : une seule règle pour le rôle connecté, celle du titulaire');
SELECT is(
  (SELECT string_agg(DISTINCT regexp_replace(qual, '\s+', ' ', 'g'), ' ; ') FROM pg_policies
    WHERE schemaname = 'app' AND tablename IN ('attempts', 'results') AND 'authenticated' = ANY (roles)),
  '(user_id = ( SELECT auth.uid() AS uid))',
  'attempts et results : la règle ne dépend que de l''identité du titulaire, jamais d''un rôle ni d''une organisation');
SELECT is(
  (SELECT count(*)::int FROM pg_policies WHERE schemaname = 'app'
      AND tablename IN ('campaigns', 'invitations', 'participations', 'attempts', 'results')
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND NOT (roles = ARRAY['tenga_owner']::name[])),
  0, 'aucune règle d''écriture pour un autre rôle que tenga_owner (verrou 2)');

-- ===== Déclencheurs =====
SELECT is(
  (SELECT count(DISTINCT t.tgrelid)::int FROM pg_trigger t
    WHERE t.tgrelid IN ('app.campaigns'::regclass, 'app.invitations'::regclass, 'app.participations'::regclass,
                        'app.attempts'::regclass, 'app.results'::regclass)
      AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
      AND (t.tgtype & 1) = 1),
  5, 'refuser_ecriture_api est actif par ligne (INSERT, UPDATE, DELETE) sur les cinq tables (verrou 3)');
SELECT is(
  (SELECT count(*)::int FROM pg_trigger t
    WHERE t.tgrelid IN ('app.campaigns'::regclass, 'app.invitations'::regclass, 'app.participations'::regclass,
                        'app.attempts'::regclass, 'app.results'::regclass)
      AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
      AND (t.tgtype & 32) = 32),
  5, 'refuser_ecriture_api couvre aussi TRUNCATE sur les cinq tables');
SELECT is(
  (SELECT string_agg(t.tgname, ',' ORDER BY t.tgname) FROM pg_trigger t
    WHERE t.tgrelid IN ('app.campaigns'::regclass, 'app.attempts'::regclass, 'app.results'::regclass)
      AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgname !~ '_sans_(ecriture|vidage)_api$'),
  'attempts_campagne_ouverte,campaigns_transition,results_campagne_ouverte,results_immuables',
  'déclencheurs de transition, de campagne ouverte et de résultat immuable, actifs');

-- ===== Réglages utilisés par les lots 2 et 3 =====
SELECT is(
  (SELECT conservation_invitations_jours || '|' || conservation_tentatives_jours || '|' || conservation_resultats_mois
          || '|' || conservation_comptes_vides_mois || '|' || seuil_anonymat FROM private.settings),
  '14|30|36|12|5', 'invitations 14 jours, tentatives 30 jours, résultats 36 mois, comptes vides 12 mois, seuil d''anonymat 5');

-- ===== Colonnes : invitation sans colonne de rôle =====
SELECT is(
  (SELECT string_agg(a.attname, ',' ORDER BY a.attnum) FROM pg_attribute a
    WHERE a.attrelid = 'app.invitations'::regclass AND a.attnum > 0 AND NOT a.attisdropped),
  'id,campaign_id,organization_id,email,prenom,invitant_id,message,langue,jeton_hash,cree_le,expire_le,acceptee_le,acceptee_par',
  'colonnes de app.invitations, figées');
SELECT is(
  (SELECT count(*)::int FROM pg_attribute a
    WHERE a.attrelid = 'app.invitations'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND (a.attname ~* 'role|droit|permission|privilege|admin')),
  0, 'app.invitations n''a aucune colonne de rôle ni de droit');
SELECT is(
  (SELECT a.atttypid::regtype::text FROM pg_attribute a WHERE a.attrelid = 'app.invitations'::regclass AND a.attname = 'jeton_hash'),
  'bytea', 'le jeton est stocké sous forme d''empreinte binaire (jamais en clair)');

-- Cadre : fixtures (superutilisateur)
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'deux@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'Campagne ouverte', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'Campagne brouillon', 'brouillon', NULL, NULL),
  ('c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'Campagne close', 'close', now(), now()),
  ('c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'Campagne de B', 'ouverte', now(), NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-00000000000c', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-00000000000d', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001');

-- ===== Campagnes : contraintes et transitions =====
SELECT throws_ok($$INSERT INTO app.campaigns (organization_id, titre, statut) VALUES ('a1000000-0000-4000-8000-00000000000a', 'X', 'archivee')$$,
  '23514', NULL, 'statut de campagne borné à brouillon, ouverte, close');
SELECT throws_ok($$INSERT INTO app.campaigns (organization_id, titre, langue) VALUES ('a1000000-0000-4000-8000-00000000000a', 'X', 'de')$$,
  '23514', NULL, 'langue de campagne bornée à fr, ar, en');
SELECT throws_ok($$INSERT INTO app.campaigns (organization_id, titre) VALUES ('a1000000-0000-4000-8000-00000000000a', ' ')$$,
  '23514', NULL, 'titre de campagne non vide et sans espace en tête');
SELECT throws_ok($$INSERT INTO app.campaigns (organization_id, titre, statut, ouverte_le) VALUES ('a1000000-0000-4000-8000-00000000000a', 'X', 'close', now())$$,
  '23514', NULL, 'une campagne close porte sa date de clôture');
SELECT throws_ok($$INSERT INTO app.campaigns (organization_id, titre) VALUES ('a1000000-0000-4000-8000-0000000000ff', 'X')$$,
  '23503', NULL, 'une campagne exige une organisation existante');
SELECT throws_ok($$UPDATE app.campaigns SET statut = 'ouverte', cloture_le = NULL WHERE id = 'c0000000-0000-4000-8000-00000000000c'$$,
  '55000', 'Transition de campagne interdite : close vers ouverte', 'une campagne close ne se rouvre pas, même pour le superutilisateur');
SELECT throws_ok($$UPDATE app.campaigns SET statut = 'close', cloture_le = now(), ouverte_le = now() WHERE id = 'c0000000-0000-4000-8000-00000000000d'$$,
  '55000', 'Transition de campagne interdite : brouillon vers close', 'un brouillon ne se clôt pas sans être ouvert');
SELECT throws_ok($$UPDATE app.campaigns SET organization_id = 'a1000000-0000-4000-8000-00000000000b' WHERE id = 'c0000000-0000-4000-8000-00000000000d'$$,
  '55000', 'Une campagne ne change pas d''organisation', 'une campagne ne change pas d''organisation');

-- ===== Invitations : contraintes =====
INSERT INTO app.invitations (id, campaign_id, organization_id, email, prenom, invitant_id, langue, jeton_hash, expire_le)
VALUES ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a',
        'invite@example.test', 'Nour', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-1'), now() + interval '14 days');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'autre@example.test', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-1'), now() + interval '14 days')$$,
  '23505', NULL, 'le jeton haché est unique');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'autre@example.test', 'a0000000-0000-4000-8000-000000000002', 'fr', '\x0102'::bytea, now() + interval '14 days')$$,
  '23514', NULL, 'le jeton haché fait 32 octets');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'invite@example.test', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-2'), now() + interval '14 days')$$,
  '23505', NULL, 'une seule invitation en attente par adresse et par campagne');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'pas-une-adresse', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-3'), now() + interval '14 days')$$,
  '23514', NULL, 'adresse mal formée refusée');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'Majuscule@Example.test', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-4'), now() + interval '14 days')$$,
  '23514', NULL, 'adresse stockée en minuscules seulement');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-5'), now() + interval '14 days')$$,
  '23514', NULL, 'une invitation en attente porte son adresse');
SELECT throws_ok($$INSERT INTO app.invitations (campaign_id, organization_id, email, invitant_id, langue, jeton_hash, expire_le) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000b', 'x@example.test', 'a0000000-0000-4000-8000-000000000002', 'fr', sha256('jeton-6'), now() + interval '14 days')$$,
  '23503', NULL, 'l''organisation d''une invitation est celle de sa campagne (clé composite)');
SELECT throws_ok($$UPDATE app.invitations SET acceptee_le = now(), acceptee_par = 'a0000000-0000-4000-8000-000000000001' WHERE id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'accepter sans effacer l''adresse est refusé par la base');
SELECT lives_ok($$UPDATE app.invitations SET email = NULL, prenom = NULL, acceptee_le = now(), acceptee_par = 'a0000000-0000-4000-8000-000000000001' WHERE id = 'e0000000-0000-4000-8000-000000000001'$$,
  'accepter en effaçant l''adresse et le prénom est accepté');
SELECT throws_ok($$UPDATE app.invitations SET email = 'revenu@example.test' WHERE id = 'e0000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'une invitation acceptée ne retrouve pas d''adresse');

-- ===== Participations =====
SELECT throws_ok($$INSERT INTO app.participations (campaign_id, organization_id, user_id) VALUES ('c0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001')$$,
  '23505', NULL, 'une participation par personne et par campagne');
SELECT throws_ok($$INSERT INTO app.participations (campaign_id, organization_id, user_id) VALUES ('c0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001')$$,
  '23503', NULL, 'l''organisation d''une participation est celle de sa campagne (clé composite)');
SELECT throws_ok($$UPDATE app.participations SET statut = 'terminee' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'une participation terminée porte sa date de fin');
SELECT throws_ok($$UPDATE app.participations SET statut = 'en_cours' WHERE id = 'd0000000-0000-4000-8000-000000000001'$$,
  '23514', NULL, 'une participation en cours porte sa date de début');

-- ===== Tentatives et résultats : campagne ouverte, un résultat par participation =====
SELECT lives_ok($$INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le) VALUES ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'v1', '{"1": 3}', now() + interval '30 days')$$,
  'une tentative s''ouvre sur une campagne ouverte');
SELECT throws_ok($$INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le) VALUES ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'v1', '{}', now() + interval '30 days')$$,
  '55000', 'Campagne non ouverte : passation refusée', 'une campagne close n''accepte aucune tentative, même en écriture directe');
SELECT throws_ok($$INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le) VALUES ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'v1', '{}', now() + interval '30 days')$$,
  '55000', 'Campagne non ouverte : passation refusée', 'un brouillon n''accepte aucune tentative');
SELECT throws_ok($$INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le) VALUES ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'v1', '{}', now() + interval '30 days')$$,
  '23503', NULL, 'une tentative est liée à la personne de la participation (clé composite)');
SELECT throws_ok($$INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le) VALUES ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'v1', '[1]', now() + interval '30 days')$$,
  '23514', NULL, 'les réponses d''une tentative forment un objet');
SELECT throws_ok($$INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES ('d0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{}', '{}', 'v1', 'c1')$$,
  '55000', 'Campagne non ouverte : passation refusée', 'une campagne close n''accepte aucun résultat, même en écriture directe');
SELECT throws_ok($$INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-000000000001', '{}', '{}', 'v1', 'c1')$$,
  '23503', NULL, 'l''organisation d''un résultat est celle de la campagne de sa participation');
SELECT lives_ok($$INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}', 'v1', 'c1')$$,
  'un résultat s''enregistre sur une campagne ouverte, avec la bonne organisation');
SELECT throws_ok($$INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{}', '{}', 'v1', 'c1')$$,
  '23505', NULL, 'un seul résultat par participation');
SELECT throws_ok($$UPDATE app.results SET scores = '{"O": 99}' WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'$$,
  '23001', 'Un résultat soumis ne se modifie pas', 'un résultat soumis ne se modifie jamais, même pour le superutilisateur');

-- ===== Cascade : supprimer une organisation efface campagnes, invitations, participations, tentatives, résultats =====
DELETE FROM app.organizations WHERE id = 'a1000000-0000-4000-8000-00000000000a';
SELECT is(
  (SELECT (SELECT count(*) FROM app.campaigns WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.invitations WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.participations WHERE organization_id = 'a1000000-0000-4000-8000-00000000000a')
        + (SELECT count(*) FROM app.attempts WHERE participation_id = 'd0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.results WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'))::int,
  0, 'supprimer une organisation efface ses campagnes, invitations, participations, tentatives et résultats');
SELECT is((SELECT count(*)::int FROM app.campaigns), 1, 'la campagne de l''autre organisation est intacte');

SELECT * FROM finish();
