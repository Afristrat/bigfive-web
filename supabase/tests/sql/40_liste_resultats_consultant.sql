-- Migration 0020 (étape C0) : app.lister_resultats_campagne(p_campagne). Le
-- consultant de l'organisation et l'administrateur Tenga listent les résultats
-- d'une campagne (identifiant opaque de participation et date de soumission,
-- AUCUNE identité) pour ouvrir ensuite chaque rapport par
-- app.lire_resultat_individuel. Refus 42501 de même message pour une campagne
-- inexistante et pour une campagne interdite (responsable, consultant d'une autre
-- organisation, participant, personne sans rôle, anonyme). Chaque consultation
-- autorisée est journalisée (resultat.lister, quantité = nombre de lignes) ; un
-- refus n'écrit rien.
-- Exécution à l'épreuve de déploiement (T10), jamais sur le poste ; épreuve en
-- transaction annulée : scripts/epreuve-liste-resultats-consultant.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(45);

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

-- Appel de la fonction en tant que « p_uid » ; p_expr est l'expression sélectionnée sur la ligne « x ».
CREATE FUNCTION pg_temp.liste(p_uid uuid, p_campagne uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.lister_resultats_campagne(%L) x', p_expr, p_campagne))
$$;

CREATE FUNCTION pg_temp.refus() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga'
$$;

-- Personnages : pa et pb participants A (résultats), pc participant A (en cours, sans résultat),
-- ra responsable A, ca consultant A, cx consultant B, rb responsable B, qb participant B (résultat),
-- ad administrateur Tenga, nx sans aucun rôle.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'cx@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test'),
  ('a0000000-0000-4000-8000-000000000009', 'pc@example.test'),
  ('a0000000-0000-4000-8000-00000000000a', 'nx@example.test'),
  ('a0000000-0000-4000-8000-00000000000b', 'qb@example.test');
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
  ('a0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000b', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
-- Trois campagnes de A (a1 : deux résultats et une personne en cours ; a2 : un résultat, close plus bas ;
-- a3 : aucun résultat) et une campagne de B (un résultat).
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A1', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A2', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000a3', 'a1000000-0000-4000-8000-00000000000a', 'Campagne A3', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'Campagne B1', 'ouverte', now(), NULL);
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009', 'en_cours', now(), NULL),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-0000000000b1', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', 'terminee', now(), now());
-- Dates de soumission explicites (now() est identique dans toute la transaction) :
-- d2 avant d1, pour que l'ordre par date se distingue de l'ordre par identifiant.
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version, soumis_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}', 'v1', 'c1', '2026-03-02 10:00:00+00'),
  ('d0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '{"1": 2}', '{"O": 40}', 'v1', 'c1', '2026-03-01 10:00:00+00'),
  ('d0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 4}', '{"O": 60}', 'v1', 'c1', '2026-04-01 10:00:00+00'),
  ('d0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', '{"1": 5}', '{"O": 90}', 'v1', 'c1', '2026-05-01 10:00:00+00');
-- La campagne A2 est close APRÈS la soumission de son résultat : la liste reste lisible après la clôture.
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a2';

-- ===== Garde : les données de ce fichier ont le sens attendu =====
SELECT is((SELECT count(*)::int FROM app.results), 4, 'fixture : quatre résultats (A1 deux, A2 un, B1 un)');
SELECT is((SELECT statut FROM app.campaigns WHERE id = 'c0000000-0000-4000-8000-0000000000a2'), 'close', 'fixture : la campagne A2 est close');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.lister'), 0, 'avant tout appel, aucune consultation au journal');

-- ===== Le consultant de l'organisation liste =====
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1'),
  '2', 'consultant A : deux résultats pour la campagne A1 (la personne en cours n''y figure pas)');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1', 'string_agg(x.participation_id::text, '','')'),
  'd0000000-0000-4000-8000-000000000002,d0000000-0000-4000-8000-000000000001',
  'consultant A : les participations terminées de A1, triées par date de soumission (d2 puis d1), et non par identifiant');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1',
  'string_agg(to_char(x.soumis_le AT TIME ZONE ''UTC'', ''YYYY-MM-DD''), '','')'),
  '2026-03-01,2026-03-02', 'consultant A : chaque ligne porte la date de soumission de son résultat');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1',
  '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)'),
  'participation_id,soumis_le', 'consultant A : exactement deux colonnes, participation_id et soumis_le');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1',
  'count(*) filter (where to_jsonb(x)::text ~ ''(a0000000|@|example)'')'),
  '0', 'consultant A : aucune identité dans la liste (ni identifiant de compte, ni adresse)');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a2'),
  '1', 'consultant A : la liste d''une campagne close reste lisible');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a2', 'string_agg(x.participation_id::text, '','')'),
  'd0000000-0000-4000-8000-000000000004', 'consultant A : la liste de A2 ne contient que les résultats de A2');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a3'),
  '0', 'consultant A : une campagne sans résultat donne une liste vide, sans erreur');

-- ===== L'administrateur Tenga liste, dans toute organisation =====
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-0000000000a1'),
  '2', 'administrateur Tenga : la liste de la campagne A1');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-0000000000b1', 'string_agg(x.participation_id::text, '','')'),
  'd0000000-0000-4000-8000-000000000005', 'administrateur Tenga : la liste de la campagne B1, sans appartenance à B');
-- Un consultant de B liste sa propre campagne (contrôle positif de l'étanchéité qui suit).
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-0000000000b1'),
  '1', 'consultant B : la liste de sa propre campagne B1');

-- ===== Journal : une consultation autorisée, une ligne, sans identité =====
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND acteur = 'a0000000-0000-4000-8000-000000000004'
              AND ressource_id = 'c0000000-0000-4000-8000-0000000000a3'),
  1, 'la consultation de A3 est inscrite au journal, une ligne');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND ressource_id = 'c0000000-0000-4000-8000-0000000000a3'),
  0, 'la ligne de journal d''une liste vide porte la quantité 0');
SELECT is((SELECT string_agg(DISTINCT ressource_type || '|' || organization_id::text || '|' || acteur::text, ',')
             FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND ressource_id = 'c0000000-0000-4000-8000-0000000000a2'),
  'campagne|a1000000-0000-4000-8000-00000000000a|a0000000-0000-4000-8000-000000000004',
  'la ligne de journal porte le type campagne, l''organisation de la campagne et le consultant réel comme acteur');
SELECT is((SELECT string_agg(DISTINCT quantite::text, ',') FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND ressource_id = 'c0000000-0000-4000-8000-0000000000a2'),
  '1', 'les lignes de journal portent le nombre de lignes rendues (A2 : une)');
SELECT is((SELECT string_agg(DISTINCT quantite::text, ',') FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND ressource_id = 'c0000000-0000-4000-8000-0000000000a1'),
  '2', 'les lignes de journal portent le nombre de lignes rendues (A1 : deux)');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister' AND acteur = 'a0000000-0000-4000-8000-000000000008'
              AND ressource_id = 'c0000000-0000-4000-8000-0000000000b1' AND organization_id = 'a1000000-0000-4000-8000-00000000000b'),
  1, 'la consultation de l''administrateur Tenga est inscrite avec l''organisation de la campagne');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l
            WHERE l.action = 'resultat.lister' AND to_jsonb(l)::text ~ '@'),
  0, 'aucune ligne de journal ne contient d''adresse');

-- ===== Refus : même message pour interdit et pour inexistant =====
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1'),
  pg_temp.refus(), 'le responsable de l''organisation ne liste pas les résultats');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1'),
  pg_temp.refus(), 'un participant (même titulaire d''un résultat de la campagne) ne liste pas');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-0000000000a1'),
  pg_temp.refus(), 'un participant en cours ne liste pas');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000000a1'),
  pg_temp.refus(), 'une personne sans aucun rôle ne liste pas');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-0000000000a1'),
  pg_temp.refus(), 'un consultant d''une autre organisation ne liste pas la campagne de A');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000b1'),
  pg_temp.refus(), 'le consultant de A ne liste pas la campagne de B');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-0000000000b1'),
  pg_temp.refus(), 'le responsable de B ne liste pas la campagne de B');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000ff'),
  pg_temp.refus(), 'identifiant forgé (campagne inexistante), consultant : même message que pour une campagne interdite');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-0000000000ff'),
  pg_temp.refus(), 'identifiant forgé (campagne inexistante), administrateur Tenga : même message');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', NULL),
  pg_temp.refus(), 'identifiant nul : refusé');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001'),
  pg_temp.refus(), 'un identifiant de participation passé pour une campagne : refusé');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1', 'count(*)', 'anon'),
  'ERR:42501:permission denied for schema app', 'le rôle anonyme n''exécute pas la fonction');
SELECT is(pg_temp.liste('a0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a1', 'count(*)', 'service_role'),
  'ERR:42501:permission denied for function lister_resultats_campagne', 'service_role n''exécute pas la fonction, même sous l''identité du consultant');
SELECT is(pg_temp.liste(NULL, 'c0000000-0000-4000-8000-0000000000a1'),
  'ERR:42501:Connexion requise', 'sans identité : refusé');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log
            WHERE action = 'resultat.lister'
              AND (acteur IN ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003',
                              'a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000009',
                              'a0000000-0000-4000-8000-00000000000a')
                   OR acteur IS NULL
                   OR ressource_id IN ('c0000000-0000-4000-8000-0000000000ff', 'd0000000-0000-4000-8000-000000000001')
                   OR (acteur = 'a0000000-0000-4000-8000-000000000005' AND ressource_id = 'c0000000-0000-4000-8000-0000000000a1')
                   OR (acteur = 'a0000000-0000-4000-8000-000000000004' AND ressource_id = 'c0000000-0000-4000-8000-0000000000b1'))),
  0, 'un refus n''inscrit aucune consultation au journal');

-- ===== Définition et droits =====
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'app' AND p.proname = 'lister_resultats_campagne'), 1, 'une seule signature');
SELECT is(pg_get_function_result('app.lister_resultats_campagne(uuid)'::regprocedure),
  'TABLE(participation_id uuid, soumis_le timestamp with time zone)', 'colonnes : participation_id et soumis_le, rien d''autre');
SELECT ok((SELECT p.prosecdef AND p.provolatile = 'v' AND p.proconfig = ARRAY['search_path=""']::text[] AND pg_get_userbyid(p.proowner) = 'tenga_owner'
             FROM pg_proc p WHERE p.oid = 'app.lister_resultats_campagne(uuid)'::regprocedure),
  'SECURITY DEFINER, VOLATILE (elle écrit au journal), search_path vide, propriétaire tenga_owner');
SELECT is(has_function_privilege('anon', 'app.lister_resultats_campagne(uuid)', 'EXECUTE'), false, 'anon n''a pas le droit d''exécution');
SELECT is(has_function_privilege('public', 'app.lister_resultats_campagne(uuid)', 'EXECUTE'), false, 'PUBLIC n''a pas le droit d''exécution');
SELECT is(has_function_privilege('service_role', 'app.lister_resultats_campagne(uuid)', 'EXECUTE'), false, 'service_role n''a pas le droit d''exécution');
SELECT is(has_function_privilege('authenticated', 'app.lister_resultats_campagne(uuid)', 'EXECUTE'), true,
  'authenticated a le droit d''exécution (le contrôle du rôle est dans la fonction)');

-- ===== La liste n'ouvre aucune lecture directe =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.participations'), '0',
  'le consultant ne lit toujours aucune participation directement');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', 'select count(*) from app.results'), '0',
  'le consultant ne lit toujours aucun résultat directement');

SELECT * FROM finish();
