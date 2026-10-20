-- Lot 4 : photographie des agrégats posée à la clôture (app.clore_campagne ->
-- private.poser_agregats). Seuil d'anonymat (effectif 4 : rien ; 5 : publié ;
-- seuil relevé), complément (1 à 4 : non publié ; 0 ou 5 et plus : publié ;
-- durcissement contre la différence avec une personne sans groupe ou un petit
-- groupe), moyenne et écart type EXACTS sur un jeu connu (valeurs calculées à
-- part, en arithmétique décimale exacte, pas par le code testé), une seule
-- photographie par clôture, campagne close sans passation, le responsable ne
-- lit aucun résultat, vue individuelle du consultant affecté (journal), refus
-- du consultant non affecté.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(56);

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

-- Identifiants : campagne c(s), groupe g(s,k), compte u(n), participation p(n).
CREATE FUNCTION pg_temp.c(s int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('c0000000-0000-4000-8000-' || lpad(s::text, 12, '0'))::uuid $$;
CREATE FUNCTION pg_temp.g(s int, k int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('f0000000-0000-4000-8000-' || lpad((s * 10 + k)::text, 12, '0'))::uuid $$;
CREATE FUNCTION pg_temp.u(n int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
CREATE FUNCTION pg_temp.p(n int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('b2000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;
-- Scores génériques d'une personne (valeurs quelconques : seuls les effectifs comptent pour ces scénarios).
CREATE FUNCTION pg_temp.sc(n int) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('O', n % 90 + 5, 'C', n % 70 + 10, 'E', n % 50 + 20, 'A', n % 30 + 30, 'N', n % 10 + 40)
$$;

CREATE TEMP TABLE zz_scores (s int, org uuid, n int, scores jsonb);

-- Une personne : compte, rôle de participant, participation (terminée si elle a un résultat), groupe éventuel.
CREATE FUNCTION pg_temp.membre(s int, p_org uuid, n int, p_groupe uuid, p_scores jsonb, p_resultat boolean DEFAULT true) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO auth.users (id, email) VALUES (pg_temp.u(n), 'u' || n || '@example.test');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES (pg_temp.u(n), p_org, 'participant');
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le)
  VALUES (pg_temp.p(n), pg_temp.c(s), p_org, pg_temp.u(n),
          CASE WHEN p_resultat THEN 'terminee' ELSE 'ouverte' END,
          CASE WHEN p_resultat THEN now() END, CASE WHEN p_resultat THEN now() END);
  IF p_groupe IS NOT NULL THEN
    INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
    VALUES (p_groupe, pg_temp.c(s), p_org, pg_temp.p(n));
  END IF;
  IF p_resultat THEN
    INSERT INTO zz_scores VALUES (s, p_org, n, p_scores);
  END IF;
END
$$;

-- Scénario générique : une campagne en brouillon, des groupes de tailles données, p_sans personnes hors groupe.
CREATE FUNCTION pg_temp.scenario(s int, p_org uuid, p_tailles int[], p_sans int) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  k int;
  i int;
  n int := 0;
BEGIN
  INSERT INTO app.campaigns (id, organization_id, titre) VALUES (pg_temp.c(s), p_org, 'Scénario ' || s);
  FOR k IN 1 .. COALESCE(array_length(p_tailles, 1), 0) LOOP
    INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES (pg_temp.g(s, k), pg_temp.c(s), p_org, 'Groupe ' || k, k);
    FOR i IN 1 .. p_tailles[k] LOOP
      n := n + 1;
      PERFORM pg_temp.membre(s, p_org, s * 1000 + n, pg_temp.g(s, k), pg_temp.sc(s * 1000 + n));
    END LOOP;
  END LOOP;
  FOR i IN 1 .. p_sans LOOP
    n := n + 1;
    PERFORM pg_temp.membre(s, p_org, s * 1000 + n, NULL, pg_temp.sc(s * 1000 + n));
  END LOOP;
END
$$;

-- Ouverture (superutilisateur) puis dépôt des résultats préparés.
CREATE FUNCTION pg_temp.ouvrir(p_s int) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = pg_temp.c(p_s);
  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
  SELECT pg_temp.p(z.n), z.org, pg_temp.u(z.n), '{}'::jsonb, z.scores, 'v1', 'c1' FROM zz_scores z WHERE z.s = p_s;
END
$$;

-- Clôture par la fonction, en tant que p_uid.
CREATE FUNCTION pg_temp.clore(p_s int, p_uid uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, pg_temp.c(p_s)))
$$;

-- Bilan d'une campagne : lignes « groupe » / lignes « complément » / quantité du journal « agregats.poser ».
CREATE FUNCTION pg_temp.bilan(p_s int) RETURNS text LANGUAGE sql AS $$
  SELECT (count(*) FILTER (WHERE a.portee = 'groupe'))::text || '/' || (count(*) FILTER (WHERE a.portee = 'complement'))::text || '/'
         || COALESCE((SELECT l.quantite::text FROM private.audit_log l WHERE l.action = 'agregats.poser' AND l.ressource_id = pg_temp.c(p_s)), 'aucune')
  FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(p_s)
$$;

-- Personnages : ra responsable A, ca consultant affecté A, cx consultant B, rb responsable B, ad administrateur Tenga.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'cx@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000b', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');

-- ===== Composition des scénarios (en brouillon : groupes et membres) =====
-- Scénario 1, jeu de scores connu : un groupe de six, cinq personnes hors groupe, une personne sans résultat.
INSERT INTO app.campaigns (id, organization_id, titre) VALUES (pg_temp.c(1), 'a1000000-0000-4000-8000-00000000000a', 'Scénario 1');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES (pg_temp.g(1, 1), pg_temp.c(1), 'a1000000-0000-4000-8000-00000000000a', 'Groupe 1', 1);
SELECT pg_temp.membre(1, 'a1000000-0000-4000-8000-00000000000a', 1000 + v.i, pg_temp.g(1, 1), v.s::jsonb) FROM (VALUES
  (1, '{"O": 12, "C": 40, "E": 5,  "A": 33, "N": 70}'),
  (2, '{"O": 18, "C": 40, "E": 95, "A": 47, "N": 64}'),
  (3, '{"O": 25, "C": 40, "E": 5,  "A": 52, "N": 81}'),
  (4, '{"O": 31, "C": 40, "E": 95, "A": 61, "N": 59}'),
  (5, '{"O": 44, "C": 40, "E": 5,  "A": 28, "N": 77}'),
  (6, '{"O": 50, "C": 40, "E": 95, "A": 39, "N": 66}')) AS v(i, s);
SELECT pg_temp.membre(1, 'a1000000-0000-4000-8000-00000000000a', 1000 + v.i, NULL, v.s::jsonb) FROM (VALUES
  (7,  '{"O": 60,  "C": 10, "E": 22, "A": 90, "N": 15}'),
  (8,  '{"O": 70,  "C": 20, "E": 33, "A": 85, "N": 25}'),
  (9,  '{"O": 80,  "C": 30, "E": 44, "A": 80, "N": 35}'),
  (10, '{"O": 90,  "C": 40, "E": 55, "A": 75, "N": 45}'),
  (11, '{"O": 100, "C": 50, "E": 66, "A": 70, "N": 55}')) AS v(i, s);
SELECT pg_temp.membre(1, 'a1000000-0000-4000-8000-00000000000a', 1012, NULL, NULL, false);
-- Autres scénarios : tailles des groupes / personnes hors groupe.
SELECT pg_temp.scenario(2, 'a1000000-0000-4000-8000-00000000000a', ARRAY[4, 5], 0);      -- un groupe de 4 et un de 5
SELECT pg_temp.scenario(3, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5], 0);         -- complément vide
SELECT pg_temp.scenario(4, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5], 5);         -- complément de 5 (frontière)
SELECT pg_temp.scenario(5, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5], 4);         -- complément de 4
SELECT pg_temp.scenario(6, 'a1000000-0000-4000-8000-00000000000a', ARRAY[7], 1);         -- complément de 1
SELECT pg_temp.scenario(7, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5, 5], 2);      -- deux groupes publiés, deux personnes hors groupe
SELECT pg_temp.scenario(8, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5, 5], 0);      -- deux groupes publiés, personne hors groupe
SELECT pg_temp.scenario(9, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5, 5, 3], 0);   -- deux groupes publiés et un petit groupe
-- Scénario 10 : un format de score en objet, une valeur non numérique, un domaine absent.
INSERT INTO app.campaigns (id, organization_id, titre) VALUES (pg_temp.c(10), 'a1000000-0000-4000-8000-00000000000a', 'Scénario 10');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES (pg_temp.g(10, 1), pg_temp.c(10), 'a1000000-0000-4000-8000-00000000000a', 'Groupe 1', 1);
SELECT pg_temp.membre(10, 'a1000000-0000-4000-8000-00000000000a', 10000 + v.i, pg_temp.g(10, 1), v.s::jsonb) FROM (VALUES
  (1, '{"O": {"score": 40, "count": 24}, "C": 10, "E": 5,   "A": 1, "N": 7}'),
  (2, '{"O": 10, "C": 20, "E": "x", "A": 2, "N": 7}'),
  (3, '{"O": 20, "C": 30, "E": 5,   "A": 3}'),
  (4, '{"O": 30, "C": 40, "E": 5,   "A": 4, "N": 7}'),
  (5, '{"O": 50, "C": 50, "E": 5,   "A": 5, "N": 7}')) AS v(i, s);
SELECT pg_temp.scenario(11, 'a1000000-0000-4000-8000-00000000000a', ARRAY[6], 0);        -- seuil relevé à 6 : un groupe de 6
SELECT pg_temp.scenario(12, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5], 0);        -- seuil relevé à 6 : un groupe de 5
SELECT pg_temp.scenario(13, 'a1000000-0000-4000-8000-00000000000b', ARRAY[5], 5);        -- autre organisation
SELECT pg_temp.scenario(14, 'a1000000-0000-4000-8000-00000000000a', ARRAY[5], 0);        -- marqueur déjà posé : la clôture doit échouer en bloc
SELECT pg_temp.scenario(15, 'a1000000-0000-4000-8000-00000000000a', ARRAY[]::int[], 0);  -- campagne sans personne
SELECT pg_temp.scenario(16, 'a1000000-0000-4000-8000-00000000000a', ARRAY[]::int[], 0);  -- campagne qui restera ouverte

-- ===== Ouverture : les résultats se déposent campagne ouverte =====
SELECT pg_temp.ouvrir(s) FROM generate_series(1, 16) AS s;
INSERT INTO private.agregats_poses (campaign_id) VALUES (pg_temp.c(14));

-- ===== Scénario 1 : clôture, exactitude, une seule photographie =====
SELECT is(pg_temp.clore(1, 'a0000000-0000-4000-8000-000000000003'), '', 'clore_campagne, responsable : clôt et pose la photographie dans la même transaction');
SELECT is(pg_temp.bilan(1), '5/5/10', 'bilan : cinq domaines pour le groupe de 6, cinq pour son complément de 5, journal « agregats.poser » à 10');
SELECT is(
  (SELECT string_agg(a.domaine || '|' || a.effectif || '|' || a.moyenne || '|' || a.ecart_type, E'\n' ORDER BY a.domaine)
     FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(1) AND a.portee = 'groupe'),
  E'A|6|43.33|11.26\nC|6|40.00|0.00\nE|6|50.00|45.00\nN|6|69.50|7.54\nO|6|30.00|13.48',
  'groupe de 6 : effectif, moyenne et écart type de population exacts (valeurs calculées à part, arrondies à 2 décimales)');
SELECT is(
  (SELECT string_agg(a.domaine || '|' || a.effectif || '|' || a.moyenne || '|' || a.ecart_type, E'\n' ORDER BY a.domaine)
     FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(1) AND a.portee = 'complement'),
  E'A|5|80.00|7.07\nC|5|30.00|14.14\nE|5|44.00|15.56\nN|5|35.00|14.14\nO|5|80.00|14.14',
  'complément de 5 (les personnes hors du groupe, sans celle qui n''a pas de résultat) : valeurs exactes');
SELECT is(
  (SELECT l.acteur::text || '|' || l.ressource_type || '|' || l.organization_id::text FROM private.audit_log l
    WHERE l.action = 'agregats.poser' AND l.ressource_id = pg_temp.c(1)),
  'a0000000-0000-4000-8000-000000000003|campagne|a1000000-0000-4000-8000-00000000000a', 'la pose est journalisée : acteur, campagne, organisation');
SELECT throws_ok(format($$SELECT private.poser_agregats(%L)$$, pg_temp.c(1)),
  '55000', 'Agrégats déjà posés pour cette campagne : une seule photographie', 'une seconde pose est refusée');
SELECT is(pg_temp.bilan(1), '5/5/10', 'après la seconde pose refusée, la photographie est inchangée');
SELECT is(pg_temp.clore(1, 'a0000000-0000-4000-8000-000000000003'), 'ERR:55000:Seule une campagne ouverte se clôt', 'une campagne close ne se clôt pas deux fois (donc aucune seconde photographie)');
SELECT is((SELECT count(*)::int FROM private.agregats_poses WHERE campaign_id = pg_temp.c(1)), 1, 'un seul marqueur de pose pour la campagne');
-- La photographie est figée : un effacement de compte ne la modifie pas.
DELETE FROM auth.users WHERE id = pg_temp.u(1001);
SELECT is(
  (SELECT a.effectif || '|' || a.moyenne || '|' || a.ecart_type FROM app.group_aggregates a
    WHERE a.campaign_id = pg_temp.c(1) AND a.portee = 'groupe' AND a.domaine = 'O'),
  '6|30.00|13.48', 'la suppression d''un compte après la clôture ne modifie pas la photographie (effectif toujours 6)');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE campaign_id = pg_temp.c(1)), 5, 'alors que la composition perd bien la ligne de cette personne');

-- ===== Scénario 1 : une campagne close n'accepte plus de passation =====
SELECT is(pg_temp.comme(pg_temp.u(1012), 'authenticated', format($q$select app.enregistrer_progression(%L, 0, '{"1": 3}'::jsonb, 'v1')::text$q$, pg_temp.p(1012))),
  'ERR:55000:Campagne non ouverte : passation refusée', 'campagne close : plus de progression enregistrée');
SELECT is(pg_temp.comme(pg_temp.u(1012), 'authenticated', format($q$select app.soumettre_resultat(%L, '{"1": 3}'::jsonb, '{"O": 99}'::jsonb, 'v1', 'c1')::text$q$, pg_temp.p(1012))),
  'ERR:55000:Campagne non ouverte : passation refusée', 'campagne close : plus de résultat soumis');
SELECT throws_ok(format($$INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES (%L, 'a1000000-0000-4000-8000-00000000000a', %L, '{}', '{"O": 99}', 'v1', 'c1')$$, pg_temp.p(1012), pg_temp.u(1012)),
  '55000', 'Campagne non ouverte : passation refusée', 'campagne close : aucun résultat ne s''écrit, même en écriture directe');
SELECT is(pg_temp.bilan(1), '5/5/10', 'la photographie ne bouge pas après ces refus');

-- ===== Lecture des agrégats photographiés, et rien d'individuel =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(1))), '10', 'le responsable de l''organisation lit les dix lignes de la photographie');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(1))), '10', 'le consultant affecté lit les dix lignes');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(1))), '0', 'le consultant d''une autre organisation n''en lit aucune (identifiant de campagne forgé)');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(1))), '0', 'le responsable d''une autre organisation n''en lit aucune');
SELECT is(pg_temp.comme(pg_temp.u(1002), 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'un participant ne lit aucun agrégat');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(1))), '10', 'l''administrateur Tenga lit la photographie');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.results'), '0', 'le responsable ne lit toujours aucun résultat individuel, photographie posée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.attempts'), '0', 'le responsable ne lit aucune tentative');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select private.poser_agregats(''c0000000-0000-4000-8000-000000000001'')::text'),
  'ERR:42501:permission denied for schema private', 'le responsable ne peut pas poser lui-même une photographie');

-- ===== Vue individuelle : consultant affecté ou administrateur, journal AVANT de renvoyer =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000005', 'authenticated', format($q$select count(*) from app.lire_resultat_individuel(%L)$q$, pg_temp.p(1002))),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'consultant d''une autre organisation (non affecté) : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select count(*) from app.lire_resultat_individuel(%L)$q$, pg_temp.p(1002))),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'responsable de l''organisation : refusé');
SELECT is(pg_temp.comme(pg_temp.u(1003), 'authenticated', format($q$select count(*) from app.lire_resultat_individuel(%L)$q$, pg_temp.p(1002))),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga', 'un autre participant : refusé');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'resultat.lire'), 0, 'aucun refus ne laisse de ligne de lecture dans le journal');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', format($q$select scores ->> 'O' from app.lire_resultat_individuel(%L)$q$, pg_temp.p(1002))),
  '18', 'consultant affecté à l''organisation : reçoit le résultat individuel, après la clôture comme avant');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'resultat.lire' AND acteur = 'a0000000-0000-4000-8000-000000000004'
            AND ressource_id = pg_temp.p(1002) AND organization_id = 'a1000000-0000-4000-8000-00000000000a'), 1, 'cette lecture est journalisée : lecteur, participation, organisation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', format($q$select scores ->> 'O' from app.lire_resultat_individuel(%L)$q$, pg_temp.p(1002))),
  '18', 'administrateur Tenga : lit aussi');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'resultat.lire'), 2, 'chaque lecture écrit sa ligne de journal');

-- ===== Seuil d'anonymat et complément, scénario par scénario =====
SELECT pg_temp.clore(s, 'a0000000-0000-4000-8000-000000000003') FROM generate_series(2, 10) AS s;
SELECT is(pg_temp.bilan(2), '5/0/5', 'groupes de 4 et de 5 : seul le groupe de 5 est publié (cinq lignes), le groupe de 4 ne laisse aucune ligne, et le complément du groupe de 5 (4 personnes) n''est pas publié');
SELECT is((SELECT count(*)::int FROM app.group_aggregates WHERE group_id = pg_temp.g(2, 1)), 0, 'le groupe de 4 ne laisse aucune ligne, ni groupe ni complément');
SELECT is(pg_temp.bilan(3), '5/5/10', 'complément de 0 : publié (cinq lignes de complément)');
SELECT is((SELECT string_agg(DISTINCT a.effectif || '|' || COALESCE(a.moyenne::text, 'nul') || '|' || COALESCE(a.ecart_type::text, 'nul'), ',')
             FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(3) AND a.portee = 'complement'),
  '0|nul|nul', 'un complément vide porte l''effectif 0 et aucune statistique');
SELECT is(pg_temp.bilan(4), '5/5/10', 'complément de 5 : publié');
SELECT is((SELECT string_agg(DISTINCT a.effectif::text, ',') FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(4) AND a.portee = 'complement'), '5', 'le complément publié compte 5 personnes');
SELECT is(pg_temp.bilan(5), '5/0/5', 'groupe de 5, complément de 4 : groupe publié, complément non publié');
SELECT is(pg_temp.bilan(6), '5/0/5', 'groupe de 7, complément de 1 : complément non publié (il désignerait une personne)');
SELECT is(pg_temp.bilan(7), '10/0/10', 'deux groupes de 5 et deux personnes hors groupe : les compléments (7 personnes) ne sont pas publiés, la différence révélerait les deux personnes');
SELECT is(pg_temp.bilan(8), '10/10/20', 'deux groupes de 5 sans personne hors groupe : groupes et compléments publiés');
SELECT is(pg_temp.bilan(9), '10/0/10', 'deux groupes de 5 et un groupe de 3 : les compléments (8 personnes) ne sont pas publiés, la différence révélerait le groupe de 3');
SELECT is(
  (SELECT string_agg(a.domaine || '|' || a.effectif || '|' || COALESCE(a.moyenne::text, 'nul'), E'\n' ORDER BY a.portee, a.domaine) FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(10)),
  E'A|0|nul\nC|0|nul\nO|0|nul\nA|5|3.00\nC|5|30.00\nO|5|30.00',
  'score en objet lu, valeur non numérique et domaine absent exclus : E et N (effectif 4) ne sont pas publiés, A, C et O le sont');

-- Seuil relevé à 6 (réglage de l'exploitation).
UPDATE private.settings SET seuil_anonymat = 6;
SELECT pg_temp.clore(11, 'a0000000-0000-4000-8000-000000000003');
SELECT pg_temp.clore(12, 'a0000000-0000-4000-8000-000000000003');
UPDATE private.settings SET seuil_anonymat = 5;
SELECT is(pg_temp.bilan(11), '5/5/10', 'seuil relevé à 6 : un groupe de 6 est publié');
SELECT is(pg_temp.bilan(12), '0/0/0', 'seuil relevé à 6 : un groupe de 5 ne l''est plus (aucune ligne, la pose est tout de même faite)');
SELECT is((SELECT count(*)::int FROM private.agregats_poses WHERE campaign_id = pg_temp.c(12)), 1, 'sans aucune ligne publiée, le marqueur de pose existe et interdit une seconde pose');

-- Autre organisation : clôture par son responsable, étanchéité.
SELECT pg_temp.clore(13, 'a0000000-0000-4000-8000-000000000006');
SELECT is(pg_temp.bilan(13), '5/5/10', 'organisation B : sa photographie est posée par son responsable');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select count(*) from app.group_aggregates where campaign_id = %L$q$, pg_temp.c(13))), '0', 'le responsable de A ne lit rien de la photographie de B');
SELECT is(pg_temp.clore(13, 'a0000000-0000-4000-8000-000000000003'), 'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'le responsable de A ne clôt pas une campagne de B');

-- Atomicité : si la pose échoue, la campagne reste ouverte.
SELECT is(pg_temp.clore(14, 'a0000000-0000-4000-8000-000000000003'), 'ERR:55000:Agrégats déjà posés pour cette campagne : une seule photographie', 'une pose impossible fait échouer toute la clôture');
SELECT is((SELECT statut || '|' || (cloture_le IS NULL)::text FROM app.campaigns WHERE id = pg_temp.c(14)), 'ouverte|true', 'la campagne est restée ouverte, sans date de clôture');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE ressource_id = pg_temp.c(14) AND action = 'campagne.clore'), 0, 'et rien n''a été journalisé');

-- La photographie ne se pose pas sur une campagne ouverte.
SELECT throws_ok(format($$SELECT private.poser_agregats(%L)$$, pg_temp.c(16)),
  '55000', 'Agrégats posés à la clôture d''une campagne seulement', 'la photographie ne se pose pas sur une campagne ouverte');
SELECT is((SELECT count(*)::int FROM private.agregats_poses WHERE campaign_id = pg_temp.c(16)), 0, 'et elle ne laisse aucun marqueur de pose');

-- Campagne sans personne.
SELECT pg_temp.clore(15, 'a0000000-0000-4000-8000-000000000003');
SELECT is(pg_temp.bilan(15), '0/0/0', 'campagne sans personne : photographie vide, journal à 0');

SELECT * FROM finish();
