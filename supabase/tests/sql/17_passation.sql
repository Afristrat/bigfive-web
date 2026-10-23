-- Lots 2 et 3 : passation. Progression avec contrôle de révision (point d'API
-- stable), soumission du résultat (une seule, campagne ouverte, participation
-- du titulaire), lecture individuelle par le consultant affecté ou
-- l'administrateur Tenga : la fonction écrit la ligne de journal PUIS renvoie.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(68);

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

-- Sauvegarde de progression en tant que « p_uid » : renvoie la nouvelle révision ou « ERR:... ».
CREATE FUNCTION pg_temp.sauver(p_uid uuid, p_participation uuid, p_revision integer, p_reponses text, p_version text DEFAULT 'v1') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format($q$select app.enregistrer_progression(%L, %s, %L::jsonb, %L)::text$q$, p_participation, p_revision, p_reponses, p_version))
$$;

-- Soumission en tant que « p_uid ».
CREATE FUNCTION pg_temp.soumettre(p_uid uuid, p_participation uuid, p_reponses text, p_scores text, p_vq text DEFAULT 'v1', p_vc text DEFAULT 'c1') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format($q$select app.soumettre_resultat(%L, %L::jsonb, %L::jsonb, %L, %L)::text$q$, p_participation, p_reponses, p_scores, p_vq, p_vc))
$$;

-- Contrat de passation de la migration 0019 : réponses (120 entiers de 1 à 5) et scores
-- « tenga-scores-1 » valides, que la base accepte (les refus de forme sont éprouvés par 39).
CREATE FUNCTION pg_temp.rep_ok() RETURNS text
LANGUAGE sql AS $$
  SELECT (SELECT jsonb_object_agg(i::text, 3) FROM generate_series(1, 120) i)::text
$$;
CREATE FUNCTION pg_temp.sc_ok() RETURNS text
LANGUAGE sql AS $$
  SELECT (jsonb_build_object('format', 'tenga-scores-1')
          || (SELECT jsonb_object_agg(d, jsonb_build_object('score', 72, 'count', 24, 'moyenne', 3,
                'facettes', (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', 12, 'count', 4, 'moyenne', 3))
                               FROM generate_series(1, 6) f)))
                FROM unnest(ARRAY['N', 'E', 'O', 'A', 'C']) d))::text
$$;

-- Personnages : pa et pb participants A, pc participant A sans accès (rôle retiré plus loin), ra responsable A,
-- ca consultant affecté A, cx consultant B, rb responsable B, ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('a0000000-0000-4000-8000-000000000009', 'pc@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'cx@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
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
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne ouverte', 'ouverte', now(), NULL),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne close', 'close', now(), now());
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009'),
  ('d0000000-0000-4000-8000-0000000000c1', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001');

-- ===== Progression : droits d'exécution et titulaire =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.enregistrer_progression(gen_random_uuid(), 0, '{}'::jsonb, 'v1')::text$q$), 'ERR:42501:permission denied for schema app', 'enregistrer_progression, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.enregistrer_progression(gen_random_uuid(), 0, '{}'::jsonb, 'v1')::text$q$), 'ERR:42501:permission denied for function enregistrer_progression', 'enregistrer_progression, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select app.enregistrer_progression(gen_random_uuid(), 0, '{}'::jsonb, 'v1')::text$q$), 'ERR:42501:Connexion requise', 'enregistrer_progression, rôle connecté sans identité : refusé');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 0, '{"1": 3}'), 'ERR:P0002:Participation introuvable', 'enregistrer_progression : la participation d''un autre est introuvable');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 0, '{"1": 3}'), 'ERR:P0002:Participation introuvable', 'enregistrer_progression : le responsable ne sauvegarde pas pour un participant');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-0000000000ff', 0, '{"1": 3}'), 'ERR:P0002:Participation introuvable', 'enregistrer_progression : participation inexistante, même refus');
SELECT is((SELECT count(*)::int FROM app.attempts), 0, 'aucune tentative créée par ces refus');

-- ===== Progression : révisions =====
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 0, '{"1": 3, "2": 4}'), '1', 'première sauvegarde (révision attendue 0) : révision 1');
SELECT is((SELECT revision::text || '|' || reponses::text || '|' || questionnaire_version FROM app.attempts WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'),
  '1|{"1": 3, "2": 4}|v1', 'la tentative stocke les réponses, la révision et la version du questionnaire');
SELECT ok((SELECT expire_le - mis_a_jour_le BETWEEN interval '29 days 23 hours' AND interval '30 days 1 hour' FROM app.attempts), 'la tentative expire 30 jours après la dernière sauvegarde');
SELECT is((SELECT statut || '|' || (commencee_le IS NOT NULL)::text FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000001'), 'en_cours|true', 'la participation passe « en cours »');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 0, '{"1": 1}'), 'ERR:40001:Conflit de révision', 'seconde sauvegarde avec la révision 0 : conflit de révision');
SELECT is((SELECT reponses::text FROM app.attempts), '{"1": 3, "2": 4}', 'le conflit ne modifie pas la progression');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, '{"1": 3, "2": 4, "3": 5}', 'v2'), '2', 'sauvegarde avec la bonne révision : révision 2');
SELECT is((SELECT revision::text || '|' || reponses::text || '|' || questionnaire_version FROM app.attempts), '2|{"1": 3, "2": 4, "3": 5}|v2', 'les réponses remplacent l''état précédent');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, '{"1": 1}'), 'ERR:40001:Conflit de révision', 'une révision périmée (1 au lieu de 2) est refusée');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 7, '{"1": 1}'), 'ERR:40001:Conflit de révision', 'une révision future est refusée');
DO $$
DECLARE
  v_detail text;
BEGIN
  PERFORM set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  SET LOCAL ROLE authenticated;
  PERFORM app.enregistrer_progression('d0000000-0000-4000-8000-000000000001', 1, '{"1": 1}'::jsonb, 'v1');
  PERFORM set_config('zz.detail', 'aucune erreur', true);
EXCEPTION WHEN others THEN
  GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
  PERFORM set_config('zz.detail', COALESCE(v_detail, '-'), true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.detail'), 'revision_actuelle=2', 'le conflit indique la révision actuelle dans le détail de l''erreur');

-- ===== Progression : validation =====
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2, '[1, 2]'), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'des réponses en tableau sont refusées');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2, '{"1": "trois"}'), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'une réponse non numérique est refusée');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2, '{"1": null}'), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'une réponse nulle est refusée');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2, (SELECT jsonb_object_agg(g::text, 3)::text FROM generate_series(1, 501) g)), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'plus de 500 réponses sont refusées');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2, '{"1": 1}', 'v 1!'), 'ERR:22023:Version du questionnaire invalide', 'une version de questionnaire mal formée est refusée');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', -1, '{"1": 1}'), 'ERR:22023:Révision attendue invalide', 'une révision négative est refusée');
SELECT is((SELECT revision FROM app.attempts), 2, 'aucun refus de validation n''a modifié la tentative');

-- ===== Progression : campagne close et rôle retiré =====
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-0000000000c1', 0, '{"1": 1}'), 'ERR:55000:Campagne non ouverte : passation refusée', 'une campagne close n''accepte plus de sauvegarde');
DELETE FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000009';
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000009', 0, '{"1": 1}'), 'ERR:42501:Rôle de participant requis', 'sans rôle de participant dans l''organisation, plus de sauvegarde');

-- ===== Soumission : droits et titulaire =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.soumettre_resultat(gen_random_uuid(), '{}'::jsonb, '{}'::jsonb, 'v1', 'c1')::text$q$), 'ERR:42501:permission denied for schema app', 'soumettre_resultat, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.soumettre_resultat(gen_random_uuid(), '{}'::jsonb, '{}'::jsonb, 'v1', 'c1')::text$q$), 'ERR:42501:permission denied for function soumettre_resultat', 'soumettre_resultat, service_role : aucun droit d''exécution');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}'), 'ERR:P0002:Participation introuvable', 'soumettre : la participation d''un autre est introuvable');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}'), 'ERR:P0002:Participation introuvable', 'soumettre : le responsable ne soumet pas pour un participant');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-0000000000c1', '{"1": 3}', '{"O": 50}'), 'ERR:55000:Campagne non ouverte : passation refusée', 'soumettre : une campagne close n''accepte plus de résultat');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000009', '{"1": 3}', '{"O": 50}'), 'ERR:42501:Rôle de participant requis', 'soumettre : sans rôle de participant, refusé');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '[1]', '{"O": 50}'), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'soumettre : réponses invalides refusées');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{"1": 3}', '[50]'), 'ERR:22023:Scores invalides : un objet est attendu', 'soumettre : scores invalides refusés');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}', 'v 1', 'c1'), 'ERR:22023:Version du questionnaire ou du calcul invalide', 'soumettre : version du questionnaire invalide refusée');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 50}', 'v1', ''), 'ERR:22023:Version du questionnaire ou du calcul invalide', 'soumettre : version du calcul invalide refusée');
SELECT is((SELECT count(*)::int FROM app.results), 0, 'aucun résultat enregistré par ces refus');

-- ===== Soumission =====
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep_ok(), pg_temp.sc_ok(), 'v2', 'c7'),
  'd0000000-0000-4000-8000-000000000001', 'soumettre : renvoie l''identifiant de participation');
SELECT is((SELECT organization_id::text || '|' || user_id::text || '|' || scores::text || '|' || questionnaire_version || '|' || calcul_version FROM app.results WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'),
  'a1000000-0000-4000-8000-00000000000a|a0000000-0000-4000-8000-000000000001|' || pg_temp.sc_ok()::jsonb::text || '|v2|c7', 'le résultat porte l''organisation de la campagne, la personne, les scores et les deux versions');
SELECT is((SELECT count(*)::int FROM app.attempts WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'), 0, 'la tentative est effacée à la soumission');
SELECT is((SELECT statut || '|' || (terminee_le IS NOT NULL)::text FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000001'), 'terminee|true', 'la participation est terminée');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.soumettre' AND acteur = 'a0000000-0000-4000-8000-000000000001' AND ressource_id = 'd0000000-0000-4000-8000-000000000001'), 1, 'la soumission est journalisée une fois');
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{"1": 1}', '{"O": 1}'), 'ERR:23505:Résultat déjà soumis', 'une seule soumission par participation');
SELECT is(pg_temp.sauver('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 0, '{"1": 1}'), 'ERR:23505:Résultat déjà soumis', 'plus de sauvegarde après la soumission');
SELECT is((SELECT scores::text FROM app.results), pg_temp.sc_ok()::jsonb::text, 'le résultat soumis est resté intact');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.results'), '1', 'le titulaire lit son résultat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.results'), '0', 'un autre participant ne le lit pas');
-- Soumission directe, sans sauvegarde préalable
SELECT is(pg_temp.soumettre('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', pg_temp.rep_ok(), pg_temp.sc_ok()), 'd0000000-0000-4000-8000-000000000002', 'soumettre sans sauvegarde préalable : accepté');
SELECT is((SELECT statut || '|' || (commencee_le IS NOT NULL)::text || '|' || (terminee_le IS NOT NULL)::text FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000002'), 'terminee|true|true', 'la date de début est posée même sans sauvegarde préalable');

-- ===== Lecture individuelle : une fonction, journal avant résultat =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select count(*) from app.lire_resultat_individuel(gen_random_uuid())$q$), 'ERR:42501:permission denied for schema app', 'lire_resultat_individuel, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.lire_resultat_individuel(gen_random_uuid())$q$), 'ERR:42501:permission denied for function lire_resultat_individuel', 'lire_resultat_individuel, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select count(*) from app.lire_resultat_individuel(gen_random_uuid())$q$), 'ERR:42501:Connexion requise', 'lire_resultat_individuel, rôle connecté sans identité : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select count(*) from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'lire_resultat_individuel, responsable de l''organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', $q$select count(*) from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'lire_resultat_individuel, consultant d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', $q$select count(*) from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'lire_resultat_individuel, responsable d''une autre organisation : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select count(*) from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'lire_resultat_individuel, le titulaire lui-même : refusé (il lit son résultat dans la table)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select count(*) from app.lire_resultat_individuel('d0000000-0000-4000-8000-0000000000ff')$q$),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'lire_resultat_individuel, résultat inexistant : même refus (aucune fuite d''existence)');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.lire'), 0, 'aucun refus ne laisse de ligne de lecture dans le journal');

SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated',
  $q$select concat_ws('|', participation_id, organization_id, reponses, scores, questionnaire_version, calcul_version) from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  'd0000000-0000-4000-8000-000000000001|a1000000-0000-4000-8000-00000000000a|' || pg_temp.rep_ok()::jsonb::text || '|' || pg_temp.sc_ok()::jsonb::text || '|v2|c7',
  'lire_resultat_individuel, consultant affecté : reçoit réponses, scores et versions');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.lire' AND acteur = 'a0000000-0000-4000-8000-000000000004'
            AND ressource_type = 'participation' AND ressource_id = 'd0000000-0000-4000-8000-000000000001' AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 1,
  'la lecture est journalisée : lecteur, participation et organisation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select scores::text from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  pg_temp.sc_ok()::jsonb::text, 'lire_resultat_individuel, administrateur Tenga : lit');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.lire' AND acteur = 'a0000000-0000-4000-8000-000000000008'), 1, 'la lecture de l''administrateur est journalisée aussi');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select scores::text from app.lire_resultat_individuel('d0000000-0000-4000-8000-000000000001')$q$),
  pg_temp.sc_ok()::jsonb::text, 'lire_resultat_individuel : une seconde lecture fonctionne');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'resultat.lire' AND acteur = 'a0000000-0000-4000-8000-000000000004'), 2, 'chaque lecture écrit sa propre ligne de journal');
SELECT ok(
  (SELECT position('private.journaliser' IN p.prosrc) > 0 AND position('private.journaliser' IN p.prosrc) < position('RETURN QUERY' IN p.prosrc)
     FROM pg_proc p WHERE p.oid = 'app.lire_resultat_individuel(uuid)'::regprocedure),
  'dans le code de la fonction, la ligne de journal précède le renvoi du résultat');
SELECT is(
  (SELECT string_agg(n.attname, ',' ORDER BY n.attnum) FROM pg_proc p, LATERAL unnest(p.proargnames) WITH ORDINALITY AS n(attname, attnum)
    WHERE p.oid = 'app.lire_resultat_individuel(uuid)'::regprocedure),
  'p_participation,participation_id,campaign_id,organization_id,reponses,scores,questionnaire_version,calcul_version,soumis_le',
  'la lecture individuelle ne renvoie aucune identité de personne (ni compte, ni adresse, ni nom)');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal');

SELECT * FROM finish();
