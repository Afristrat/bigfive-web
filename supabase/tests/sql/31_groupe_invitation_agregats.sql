-- Migration 0006, agrégats : le seuil d'anonymat de 0005 reste respecté quand la
-- composition vient des invitations. Un groupe de 4 personnes composé par
-- invitation ne publie rien ; 5 publient (moyenne et écart type EXACTS,
-- valeurs calculées à part) ; un compte effacé avant la clôture ramène un
-- groupe de 5 à 4 et il ne publie plus ; le complément reste retenu quand ce qui
-- reste hors des groupes publiés est trop petit ; la campagne sans groupe ne
-- publie rien.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(19);

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

CREATE FUNCTION pg_temp.c(s int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('c0000000-0000-4000-8000-' || lpad(s::text, 12, '0'))::uuid $$;
CREATE FUNCTION pg_temp.g(s int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('f0000000-0000-4000-8000-' || lpad(s::text, 12, '0'))::uuid $$;
CREATE FUNCTION pg_temp.u(n int) RETURNS uuid LANGUAGE sql AS $$ SELECT ('b0000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid $$;

-- Une personne : compte, invitation du responsable A (avec ou sans groupe), acceptation par le serveur
-- (participation ET composition), participation terminée, résultat déposé (score O = p_o, autres domaines constants).
CREATE FUNCTION pg_temp.recruter(p_s int, p_n int, p_groupe uuid, p_o int) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_jeton text;
  v_part  text;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (pg_temp.u(p_n), 'p' || p_n || '@example.test');
  v_jeton := pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated',
    format($q$select jeton from app.inviter(%L, %L, NULL, NULL, NULL, %L)$q$, pg_temp.c(p_s), 'p' || p_n || '@example.test', p_groupe));
  v_part := pg_temp.comme(NULL, 'service_role', format($q$select app.accepter_invitation(%L, %L)::text$q$, v_jeton, pg_temp.u(p_n)));
  IF v_part LIKE 'ERR:%' THEN
    RAISE EXCEPTION 'recruter % : %', p_n, v_part;
  END IF;
  UPDATE app.participations SET statut = 'terminee', commencee_le = now(), terminee_le = now() WHERE id = v_part::uuid;
  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
  VALUES (v_part::uuid, 'a1000000-0000-4000-8000-00000000000a', pg_temp.u(p_n), '{}'::jsonb,
          jsonb_build_object('O', p_o, 'C', 40, 'E', 30, 'A', 20, 'N', 10), 'v1', 'c1');
END
$$;

-- Bilan d'une campagne : lignes « groupe » / lignes « complément » / marqueur de pose (1 ou 0).
CREATE FUNCTION pg_temp.bilan(p_s int) RETURNS text LANGUAGE sql AS $$
  SELECT (SELECT count(*) FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(p_s) AND a.portee = 'groupe')::text
         || '/' || (SELECT count(*) FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(p_s) AND a.portee = 'complement')::text
         || '/' || (SELECT count(*) FROM private.agregats_poses a WHERE a.campaign_id = pg_temp.c(p_s))::text
$$;
CREATE FUNCTION pg_temp.clore(p_s int) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', format($q$select app.clore_campagne(%L)::text$q$, pg_temp.c(p_s)))
$$;

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant');

-- Cinq campagnes : 1 (groupe de 4), 2 (groupe de 5 + 2 hors groupe), 3 (groupe de 5, puis un compte effacé),
-- 4 (campagne sans groupe, 6 personnes), 5 (deux groupes de 5, personne hors groupe).
INSERT INTO app.campaigns (id, organization_id, titre) VALUES
  (pg_temp.c(1), 'a1000000-0000-4000-8000-00000000000a', 'S1'),
  (pg_temp.c(2), 'a1000000-0000-4000-8000-00000000000a', 'S2'),
  (pg_temp.c(3), 'a1000000-0000-4000-8000-00000000000a', 'S3'),
  (pg_temp.c(4), 'a1000000-0000-4000-8000-00000000000a', 'S4'),
  (pg_temp.c(5), 'a1000000-0000-4000-8000-00000000000a', 'S5');
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  (pg_temp.g(1), pg_temp.c(1), 'a1000000-0000-4000-8000-00000000000a', 'Groupe', 0),
  (pg_temp.g(2), pg_temp.c(2), 'a1000000-0000-4000-8000-00000000000a', 'Groupe', 0),
  (pg_temp.g(3), pg_temp.c(3), 'a1000000-0000-4000-8000-00000000000a', 'Groupe', 0),
  (pg_temp.g(51), pg_temp.c(5), 'a1000000-0000-4000-8000-00000000000a', 'Groupe 1', 0),
  (pg_temp.g(52), pg_temp.c(5), 'a1000000-0000-4000-8000-00000000000a', 'Groupe 2', 1);
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id IN (pg_temp.c(1), pg_temp.c(2), pg_temp.c(3), pg_temp.c(4), pg_temp.c(5));

-- S1 : QUATRE personnes dans le groupe, par invitation.
SELECT pg_temp.recruter(1, 101, pg_temp.g(1), 10);
SELECT pg_temp.recruter(1, 102, pg_temp.g(1), 20);
SELECT pg_temp.recruter(1, 103, pg_temp.g(1), 30);
SELECT pg_temp.recruter(1, 104, pg_temp.g(1), 40);
-- S2 : CINQ personnes dans le groupe (O = 10, 20, 30, 40, 50), deux hors groupe.
SELECT pg_temp.recruter(2, 201, pg_temp.g(2), 10);
SELECT pg_temp.recruter(2, 202, pg_temp.g(2), 20);
SELECT pg_temp.recruter(2, 203, pg_temp.g(2), 30);
SELECT pg_temp.recruter(2, 204, pg_temp.g(2), 40);
SELECT pg_temp.recruter(2, 205, pg_temp.g(2), 50);
SELECT pg_temp.recruter(2, 206, NULL, 90);
SELECT pg_temp.recruter(2, 207, NULL, 95);
-- S3 : CINQ personnes dans le groupe, dont une effacera son compte avant la clôture.
SELECT pg_temp.recruter(3, 301, pg_temp.g(3), 10);
SELECT pg_temp.recruter(3, 302, pg_temp.g(3), 20);
SELECT pg_temp.recruter(3, 303, pg_temp.g(3), 30);
SELECT pg_temp.recruter(3, 304, pg_temp.g(3), 40);
SELECT pg_temp.recruter(3, 305, pg_temp.g(3), 50);
-- S4 : six personnes, aucun groupe dans la campagne.
SELECT pg_temp.recruter(4, 401, NULL, 10);
SELECT pg_temp.recruter(4, 402, NULL, 20);
SELECT pg_temp.recruter(4, 403, NULL, 30);
SELECT pg_temp.recruter(4, 404, NULL, 40);
SELECT pg_temp.recruter(4, 405, NULL, 50);
SELECT pg_temp.recruter(4, 406, NULL, 60);
-- S5 : deux groupes de cinq.
SELECT pg_temp.recruter(5, 501, pg_temp.g(51), 10);
SELECT pg_temp.recruter(5, 502, pg_temp.g(51), 20);
SELECT pg_temp.recruter(5, 503, pg_temp.g(51), 30);
SELECT pg_temp.recruter(5, 504, pg_temp.g(51), 40);
SELECT pg_temp.recruter(5, 505, pg_temp.g(51), 50);
SELECT pg_temp.recruter(5, 506, pg_temp.g(52), 60);
SELECT pg_temp.recruter(5, 507, pg_temp.g(52), 70);
SELECT pg_temp.recruter(5, 508, pg_temp.g(52), 80);
SELECT pg_temp.recruter(5, 509, pg_temp.g(52), 90);
SELECT pg_temp.recruter(5, 510, pg_temp.g(52), 100);

SELECT is((SELECT count(*)::int FROM app.group_members WHERE campaign_id IN (pg_temp.c(1), pg_temp.c(2), pg_temp.c(3), pg_temp.c(4), pg_temp.c(5))), 24,
  'cadre : vingt-quatre personnes composées par invitation (4 + 5 + 5 + 0 + 10), les huit autres sans groupe');
SELECT is((SELECT count(*)::int FROM app.group_aggregates WHERE campaign_id IN (pg_temp.c(1), pg_temp.c(2), pg_temp.c(3), pg_temp.c(4), pg_temp.c(5))), 0, 'cadre : aucun agrégat avant la clôture');

-- ===== S1 : quatre dans le groupe, rien ne se publie =====
SELECT is(pg_temp.clore(1), '', 'S1 : la clôture réussit');
SELECT is(pg_temp.bilan(1), '0/0/1', 'S1 : quatre personnes dans un groupe composé par invitation : aucune ligne publiée, marqueur de pose présent');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'agregats.poser' AND ressource_id = pg_temp.c(1)), 0, 'S1 : la pose journalise zéro ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates'), '0', 'S1 : le responsable ne voit aucun agrégat');

-- ===== S2 : cinq dans le groupe, deux hors groupe =====
SELECT is(pg_temp.clore(2), '', 'S2 : la clôture réussit');
SELECT is(pg_temp.bilan(2), '5/0/1', 'S2 : le groupe de cinq publie ses cinq domaines ; le complément est retenu (deux personnes hors groupe, moins que le seuil)');
SELECT is((SELECT a.effectif::text || '|' || a.moyenne::text || '|' || a.ecart_type::text FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(2) AND a.domaine = 'O' AND a.portee = 'groupe'),
  '5|30.00|14.14', 'S2 : domaine O, effectif 5, moyenne 30 et écart type de population 14,14 (racine de 200), calculés à part');
SELECT is((SELECT a.effectif::text || '|' || a.moyenne::text || '|' || a.ecart_type::text FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(2) AND a.domaine = 'C' AND a.portee = 'groupe'),
  '5|40.00|0.00', 'S2 : domaine C constant (40) : moyenne 40, écart type nul');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_aggregates where campaign_id = ''' || pg_temp.c(2) || ''''), '5', 'S2 : le responsable lit les cinq lignes agrégées');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.group_members'), '0', 'S2 : et toujours aucune composition nominative');
SELECT is((SELECT count(*)::int FROM app.group_aggregates a WHERE a.campaign_id = pg_temp.c(2) AND a.portee = 'complement'), 0, 'S2 : le complément de deux personnes hors groupe n''est pas publié (il désignerait ces deux personnes)');

-- ===== S3 : un compte effacé avant la clôture ramène le groupe à quatre =====
SELECT is(pg_temp.comme(pg_temp.u(305), 'authenticated', $q$select app.supprimer_mon_compte()::text$q$), '', 'S3 : une des cinq personnes efface son compte, campagne ouverte (le gel ne bloque pas l''effacement)');
SELECT is((SELECT count(*)::int FROM app.group_members WHERE group_id = pg_temp.g(3)), 4, 'S3 : le groupe compte désormais quatre membres');
SELECT is(pg_temp.clore(3), '', 'S3 : la clôture réussit');
SELECT is(pg_temp.bilan(3), '0/0/1', 'S3 : le groupe tombé à quatre ne publie plus rien');

-- ===== S4 : campagne sans groupe =====
SELECT is(pg_temp.clore(4) || '|' || pg_temp.bilan(4), '|0/0/1', 'S4 : campagne sans groupe, six personnes : aucune ligne publiée (inchangé)');

-- ===== S5 : deux groupes de cinq publient, compléments publiés (reste nul) =====
SELECT is(pg_temp.clore(5) || '|' || pg_temp.bilan(5), '|10/10/1', 'S5 : deux groupes de cinq : dix lignes de groupe et dix lignes de complément (le reste hors groupes publiés est vide)');

SELECT * FROM finish();
