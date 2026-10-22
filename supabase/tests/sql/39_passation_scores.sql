-- Migration 0015 (étape M3) : contrat de passation tenu en base.
-- app.soumettre_resultat refuse (22023) une forme inconnue : réponses = exactement
-- 120 entiers de 1 à 5 ; scores = format 'tenga-scores-1', cinq domaines (N, E, O,
-- A, C) de score entier 24 à 120 et de count 24, six facettes numérotées 1 à 6 de
-- score entier 4 à 20 et de count 4, somme des facettes = score du domaine.
-- Les refus de 0003 passent AVANT le contrôle de forme (connexion, participation,
-- déjà soumis, campagne close, rôle, versions, type objet) et conservent leur
-- message. Un refus n'écrit rien. app.mes_resultats() gagne la colonne
-- campagne_statut (statut de la campagne, pas de la participation), droits
-- inchangés (authenticated seul).
-- Exécution à l'épreuve de déploiement (T10), jamais sur le poste ; épreuve en
-- transaction annulée : scripts/epreuve-passation-scores.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(73);

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

-- Réponses valides : 120 clés, toutes à 3.
CREATE FUNCTION pg_temp.rep() RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_object_agg(i::text, 3) FROM generate_series(1, 120) i
$$;

-- Scores valides : cinq domaines de score 72 (24 réponses à 3), six facettes de score 12 (4 réponses à 3).
CREATE FUNCTION pg_temp.sc() RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1', 'meta', jsonb_build_object('duree_secondes', 1234))
         || (SELECT jsonb_object_agg(d, jsonb_build_object('score', 72, 'count', 24, 'moyenne', 3,
               'facettes', (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', 12, 'count', 4, 'moyenne', 3))
                              FROM generate_series(1, 6) f)))
               FROM unnest(ARRAY['N', 'E', 'O', 'A', 'C']) d)
$$;

-- Soumission en tant que « p_uid » ; les charges sont passées en jsonb pour être altérées en SQL.
CREATE FUNCTION pg_temp.soum(p_uid uuid, p_participation uuid, p_reponses jsonb, p_scores jsonb,
                             p_vq text DEFAULT 'q1', p_vc text DEFAULT 'tenga-somme-1') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format($q$select app.soumettre_resultat(%L, %L::jsonb, %L::jsonb, %L, %L)::text$q$,
           p_participation, p_reponses::text, p_scores::text, p_vq, p_vc))
$$;

CREATE FUNCTION pg_temp.m_rep() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:22023:Réponses invalides : 120 entiers de 1 à 5 attendus'
$$;
CREATE FUNCTION pg_temp.m_sc() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:22023:Scores invalides : forme tenga-scores-1 attendue'
$$;

-- Personnages : pa et pb participants A, pc participant A dont le rôle est retiré plus loin,
-- ra responsable A.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000009', 'pc@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le, cree_par) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne 1', 'ouverte', now(), NULL, 'a0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne 2', 'ouverte', now(), NULL, 'a0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-0000000000a3', 'a1000000-0000-4000-8000-00000000000a', 'Campagne close', 'close', now(), now(), 'a0000000-0000-4000-8000-000000000003');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-0000000000a3', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001'),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009');

-- ===== Les fixtures de ce fichier sont elles-mêmes valides (garde contre un test vide de sens) =====
SELECT is((SELECT count(*)::int FROM jsonb_object_keys(pg_temp.rep())), 120, 'fixture : 120 réponses');
SELECT is((SELECT sum((v ->> 'score')::int)::int FROM jsonb_each(pg_temp.sc() -> 'N' -> 'facettes') AS t(k, v)),
          (pg_temp.sc() -> 'N' ->> 'score')::int, 'fixture : la somme des facettes égale le score du domaine');

-- ===== Définition : attributs inchangés de app.soumettre_resultat =====
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'app' AND p.proname = 'soumettre_resultat'), 1, 'soumettre_resultat : une seule signature');
SELECT ok((SELECT p.prosecdef AND p.proconfig = ARRAY['search_path=""']::text[] AND pg_get_userbyid(p.proowner) = 'tenga_owner'
             FROM pg_proc p WHERE p.oid = 'app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure),
  'soumettre_resultat : SECURITY DEFINER, search_path vide, propriétaire tenga_owner');
SELECT ok(has_function_privilege('authenticated', 'app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('anon', 'app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('public', 'app.soumettre_resultat(uuid, jsonb, jsonb, text, text)'::regprocedure, 'EXECUTE'),
  'soumettre_resultat : exécutable par authenticated seul');

-- ===== Réponses : refus de forme (22023), la participation reste ouverte =====
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep() - '120', pg_temp.sc()),
  pg_temp.m_rep(), '119 réponses : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep() || '{"121": 3}'::jsonb, pg_temp.sc()),
  pg_temp.m_rep(), '121 réponses : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '{}'::jsonb, pg_temp.sc()),
  pg_temp.m_rep(), 'aucune réponse : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '6'), pg_temp.sc()),
  pg_temp.m_rep(), 'une réponse à 6 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '0'), pg_temp.sc()),
  pg_temp.m_rep(), 'une réponse à 0 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '-1'), pg_temp.sc()),
  pg_temp.m_rep(), 'une réponse négative : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '2.5'), pg_temp.sc()),
  pg_temp.m_rep(), 'une réponse à 2,5 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '3.0'), pg_temp.sc()),
  pg_temp.m_rep(), 'une réponse écrite 3.0 (non canonique) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', jsonb_set(pg_temp.rep(), '{7}', '"3"'), pg_temp.sc()),
  'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'une réponse en chaîne : refusée par le contrôle de type de 0003 (message inchangé)');

-- ===== Scores : refus de forme (22023) =====
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() - 'format'),
  pg_temp.m_sc(), 'format absent : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{format}', '"tenga-scores-2"')),
  pg_temp.m_sc(), 'autre format : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{format}', '["tenga-scores-1"]')),
  pg_temp.m_sc(), 'format qui n''est pas un texte : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() - 'C'),
  pg_temp.m_sc(), 'domaine manquant : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{O}', '72')),
  pg_temp.m_sc(), 'domaine qui n''est pas un objet : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,count}', '23')),
  pg_temp.m_sc(), 'count de domaine faux (23 au lieu de 24) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() #- '{E,count}'),
  pg_temp.m_sc(), 'count de domaine absent : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '73')),
  pg_temp.m_sc(), 'somme des facettes différente du score du domaine (73 contre 72) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '72.5')),
  pg_temp.m_sc(), 'score de domaine décimal : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '"72"')),
  pg_temp.m_sc(), 'score de domaine en chaîne : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() #- '{A,score}'),
  pg_temp.m_sc(), 'score de domaine absent : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '1000')),
  pg_temp.m_sc(), 'score de domaine à quatre chiffres : refusé sans erreur de conversion');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '23')),
  pg_temp.m_sc(), 'score de domaine sous 24 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,score}', '121')),
  pg_temp.m_sc(), 'score de domaine au-dessus de 120 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() #- '{N,facettes}'),
  pg_temp.m_sc(), 'facettes absentes : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{N,facettes}', '[]')),
  pg_temp.m_sc(), 'facettes qui ne forment pas un objet : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() #- '{O,facettes,6}'),
  pg_temp.m_sc(), 'cinq facettes seulement : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{O,facettes,7}', '{"score": 12, "count": 4}')),
  pg_temp.m_sc(), 'sept facettes : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(),
  jsonb_set(pg_temp.sc() #- '{O,facettes,6}', '{O,facettes,0}', '{"score": 12, "count": 4}')),
  pg_temp.m_sc(), 'six facettes mais numérotées 0 à 5 : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), jsonb_set(pg_temp.sc(), '{E,facettes,2,count}', '5')),
  pg_temp.m_sc(), 'count de facette faux (5 au lieu de 4) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc() #- '{E,facettes,2,score}'),
  pg_temp.m_sc(), 'score de facette absent : refusé');
-- La somme reste 72 dans les deux cas suivants : seule la borne de facette (4 à 20) refuse.
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(),
  jsonb_set(jsonb_set(pg_temp.sc(), '{A,facettes,1,score}', '21'), '{A,facettes,2,score}', '3')),
  pg_temp.m_sc(), 'facette à 21 (somme conservée) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(),
  jsonb_set(jsonb_set(pg_temp.sc(), '{A,facettes,1,score}', '3'), '{A,facettes,2,score}', '21')),
  pg_temp.m_sc(), 'facette à 3 (somme conservée) : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(),
  jsonb_set(jsonb_set(pg_temp.sc(), '{C,facettes,3,score}', '"13"'), '{C,facettes,4,score}', '11')),
  pg_temp.m_sc(), 'score de facette en chaîne : refusé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(),
  jsonb_set(jsonb_set(pg_temp.sc(), '{C,facettes,3,score}', '12.5'), '{C,facettes,4,score}', '11.5')),
  pg_temp.m_sc(), 'scores de facette décimaux (somme conservée) : refusé');

-- ===== Un refus n'écrit rien =====
SELECT is((SELECT count(*)::int FROM app.results), 0, 'aucun résultat enregistré par ces refus');
SELECT is((SELECT statut FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000001'), 'en_cours',
  'la participation reste en cours après les refus');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'resultat.soumettre'), 0, 'aucun refus ne laisse de ligne de journal');

-- ===== Ordre des refus : ceux de 0003 passent avant la forme, message inchangé =====
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000004', '{}'::jsonb, '{}'::jsonb),
  'ERR:55000:Campagne non ouverte : passation refusée', 'campagne close avec une charge de forme invalide : refus de campagne d''abord');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc()),
  'ERR:P0002:Participation introuvable', 'la participation d''un autre reste introuvable');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc(), 'v 1', 'c1'),
  'ERR:22023:Version du questionnaire ou du calcul invalide', 'version invalide : refus de version, message inchangé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', '[1]'::jsonb, pg_temp.sc()),
  'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus', 'réponses qui ne sont pas un objet : message de 0003 inchangé');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), '[50]'::jsonb),
  'ERR:22023:Scores invalides : un objet est attendu', 'scores qui ne sont pas un objet : message de 0003 inchangé');
DELETE FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000009';
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000009', '{}'::jsonb, '{}'::jsonb),
  'ERR:42501:Rôle de participant requis', 'sans rôle de participant : refus de rôle d''abord');

-- ===== Soumission valide =====
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc()),
  'd0000000-0000-4000-8000-000000000001', 'une soumission valide est acceptée et renvoie la participation');
SELECT is((SELECT reponses = pg_temp.rep() AND scores = pg_temp.sc() AND questionnaire_version = 'q1' AND calcul_version = 'tenga-somme-1'
             FROM app.results WHERE participation_id = 'd0000000-0000-4000-8000-000000000001'),
  true, 'le résultat porte exactement les réponses, les scores et les versions soumis');
SELECT is((SELECT statut || '|' || (terminee_le IS NOT NULL)::text FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000001'),
  'terminee|true', 'la participation est terminée');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'resultat.soumettre' AND ressource_id = 'd0000000-0000-4000-8000-000000000001'),
  1, 'la soumission valide est journalisée une fois');
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', pg_temp.rep(), pg_temp.sc()),
  'ERR:23505:Résultat déjà soumis', 'une seule soumission : le rejeu garde son refus');
-- « meta » et « moyenne » ne sont pas contrôlées ; « meta » est facultative.
SELECT is(pg_temp.soum('a0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', pg_temp.rep(), pg_temp.sc() - 'meta'),
  'd0000000-0000-4000-8000-000000000002', 'sans meta : accepté');
-- Les agrégats lisent scores.<domaine>.score : la forme acceptée les alimente (chemin lu par 0005).
SELECT is((SELECT (r.scores -> 'N' ->> 'score') || '|' || (r.scores -> 'C' -> 'facettes' -> '6' ->> 'score')
             FROM app.results r WHERE r.participation_id = 'd0000000-0000-4000-8000-000000000002'),
  '72|12', 'le score de domaine reste lisible à scores.<domaine>.score');

-- ===== mes_resultats : colonne campagne_statut =====
SELECT is((SELECT count(*)::int FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'app' AND p.proname = 'mes_resultats'), 1, 'mes_resultats : une seule signature');
SELECT is(pg_get_function_result('app.mes_resultats()'::regprocedure),
  'TABLE(participation_id uuid, campagne_id uuid, campagne_titre text, organisation_nom text, organisation_slug text, statut text, ouverte_le timestamp with time zone, terminee_le timestamp with time zone, scores jsonb, questionnaire_version text, calcul_version text, campagne_statut text)',
  'mes_resultats : colonnes de 0003 dans le même ordre, campagne_statut en dernier');
SELECT ok((SELECT p.prosecdef AND p.provolatile = 's' AND p.proconfig = ARRAY['search_path=""']::text[] AND pg_get_userbyid(p.proowner) = 'tenga_owner'
             FROM pg_proc p WHERE p.oid = 'app.mes_resultats()'::regprocedure),
  'mes_resultats : SECURITY DEFINER, STABLE, search_path vide, propriétaire tenga_owner');
SELECT ok(has_function_privilege('authenticated', 'app.mes_resultats()'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('anon', 'app.mes_resultats()'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'app.mes_resultats()'::regprocedure, 'EXECUTE')
          AND NOT has_function_privilege('public', 'app.mes_resultats()'::regprocedure, 'EXECUTE'),
  'mes_resultats : exécutable par authenticated seul (droits rétablis après la recréation)');
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.mes_resultats()'), 'ERR:42501:permission denied for schema app', 'mes_resultats, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.mes_resultats()'), 'ERR:42501:permission denied for function mes_resultats', 'mes_resultats, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.mes_resultats()'), 'ERR:42501:Connexion requise', 'mes_resultats, rôle connecté sans identité : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select campagne_statut from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a2'$q$),
  'ouverte', 'mes_resultats : la campagne ouverte porte campagne_statut ouverte');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select campagne_statut from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a1'$q$),
  'ouverte', 'mes_resultats : la participation terminée d''une campagne ouverte porte aussi campagne_statut ouverte (distinct de statut)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select statut from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a1'$q$),
  'terminee', 'mes_resultats : statut reste celui de la participation');
UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = 'c0000000-0000-4000-8000-0000000000a2';
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select campagne_statut from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a2'$q$),
  'close', 'mes_resultats : après la clôture de la campagne, campagne_statut vaut close');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select statut from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a2'$q$),
  'en_cours', 'mes_resultats : la participation reste en cours alors que la campagne est close (le cas de X10)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select string_agg(campagne_statut, ',' order by campagne_id) from app.mes_resultats()$q$),
  'ouverte,close,close', 'mes_resultats : une valeur de campagne_statut par participation (a1 ouverte, a2 et a3 closes)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.mes_resultats()'), '3',
  'mes_resultats : trois participations pour pa, aucune de plus');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.mes_resultats()'), '1',
  'mes_resultats : pb ne voit que sa participation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.mes_resultats()'), '0',
  'mes_resultats : le responsable n''a aucune participation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select (scores is null)::text from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a2'$q$),
  'true', 'mes_resultats : les scores d''une participation sans résultat sont nuls');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select (scores = (select scores from app.results where participation_id = 'd0000000-0000-4000-8000-000000000001'))::text from app.mes_resultats() where campagne_id = 'c0000000-0000-4000-8000-0000000000a1'$q$),
  'true', 'mes_resultats : les scores de la participation terminée sont ceux du résultat');

SELECT * FROM finish();
