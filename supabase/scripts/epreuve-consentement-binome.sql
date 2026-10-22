-- Épreuve de la migration 0021 (consentement du binôme : app.binomes, app.proposer_binome,
-- app.repondre_binome, app.mes_binomes, app.lire_binome, clé « binomes » de l'export) sur la base de production, AVANT
-- puis APRÈS l'application de la migration. Avant : elle doit sortir ROUGE avec
-- « migration 0021 non appliquée ». Après : « EPREUVE VERTE ».
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance des
-- compteurs d'identité du journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-consentement-binome.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée ni affichée : seuls une organisation, des comptes, des
-- campagnes, des participations, des résultats et des binômes jetables sont créés. Les appels se
-- font sous le rôle réel authenticated avec un jeton simulé (sub, role), comme l'API. Les
-- comptages portent sur les seuls identifiants jetables (la production contient des données réelles).
BEGIN;

-- Appel d'une requête sous un rôle réel : renvoie le résultat en texte ou
-- « ERR:SQLSTATE:message ». Fonction temporaire, détruite avec la transaction.
CREATE FUNCTION pg_temp.comme(p_uid uuid, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  EXECUTE p_sql INTO v;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

CREATE FUNCTION pg_temp.prop(p_uid uuid, p_a uuid, p_b uuid, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.proposer_binome(%L, %L)::text', p_a, p_b))
$$;
CREATE FUNCTION pg_temp.rep(p_uid uuid, p_binome uuid, p_accord boolean, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.repondre_binome(%L, %L)::text', p_binome, p_accord))
$$;
CREATE FUNCTION pg_temp.lire(p_uid uuid, p_binome uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.lire_binome(%L) x', p_expr, p_binome))
$$;
CREATE FUNCTION pg_temp.mes(p_uid uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.mes_binomes() x', p_expr))
$$;
CREATE FUNCTION pg_temp.col(p_uid uuid, p_binome uuid, p_col text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format('select x.%I::text from app.mes_binomes() x where x.binome_id = %L', p_col, p_binome))
$$;

-- Export de la personne (app.exporter_mes_donnees) sous une identité donnée.
CREATE FUNCTION pg_temp.exp(p_uid uuid, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, 'select app.exporter_mes_donnees()::text')
$$;

-- Scores jetables : domaine O avec six facettes dont O6 = p_o6, domaine E.
CREATE FUNCTION pg_temp.sc(p_o6 integer) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1',
    'O', jsonb_build_object('score', 50 + p_o6, 'facettes',
         (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', CASE WHEN f = 6 THEN p_o6 ELSE 10 END))
            FROM generate_series(1, 6) f)),
    'E', jsonb_build_object('score', 50))
$$;

DO $e$
DECLARE
  v_pa    uuid := 'e9000000-0000-4000-8000-000000000001';
  v_pb    uuid := 'e9000000-0000-4000-8000-000000000002';
  v_pc    uuid := 'e9000000-0000-4000-8000-000000000003';
  v_pd    uuid := 'e9000000-0000-4000-8000-000000000004';
  v_ra    uuid := 'e9000000-0000-4000-8000-000000000005';
  v_ca    uuid := 'e9000000-0000-4000-8000-000000000006';
  v_cx    uuid := 'e9000000-0000-4000-8000-000000000007';
  v_ad    uuid := 'e9000000-0000-4000-8000-000000000008';
  v_nx    uuid := 'e9000000-0000-4000-8000-000000000009';
  v_qb    uuid := 'e9000000-0000-4000-8000-00000000000a';
  v_orga  uuid := 'e9000000-0000-4000-8000-0000000000a1';
  v_orgb  uuid := 'e9000000-0000-4000-8000-0000000000b1';
  v_c1    uuid := 'e9000000-0000-4000-8000-0000000000c1';
  v_c2    uuid := 'e9000000-0000-4000-8000-0000000000c2';
  v_cb    uuid := 'e9000000-0000-4000-8000-0000000000cb';
  v_d1    uuid := 'e9000000-0000-4000-8000-0000000000d1';
  v_d2    uuid := 'e9000000-0000-4000-8000-0000000000d2';
  v_d3    uuid := 'e9000000-0000-4000-8000-0000000000d3';
  v_d4    uuid := 'e9000000-0000-4000-8000-0000000000d4';
  v_d5    uuid := 'e9000000-0000-4000-8000-0000000000d5';
  v_d6    uuid := 'e9000000-0000-4000-8000-0000000000d6';
  v_dfaux uuid := 'e9000000-0000-4000-8000-0000000000ff';
  v_b1    uuid;
  v_b2    uuid;
  v_b2bis uuid;
  v_b3    uuid;
  v_refus_prop constant text := 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga';
  v_refus_lire constant text := 'ERR:42501:Réservé aux deux personnes, au consultant affecté ou à un administrateur Tenga';
  v_sans_acc   constant text := 'ERR:55000:Lecture impossible : le consentement des deux personnes est requis';
  v_introuv    constant text := 'ERR:P0002:Proposition introuvable';
  v_definitif  constant text := 'ERR:55000:Proposition close : un refus ou un retrait est définitif';
  v_inval      constant text := 'ERR:22023:Binôme invalide : deux participations terminées, de deux personnes différentes, de la même organisation';
  v_uuid_re    constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_o6         constant text := 'string_agg(coalesce(x.scores #>> ''{O,facettes,6,score}'', ''absent''), '','' order by x.cote)';
  v_r     text;
  v_n     integer;
  v_cas   record;
BEGIN
  -- 1. La migration est appliquée : table, quatre fonctions.
  IF to_regclass('app.binomes') IS NULL THEN
    RAISE EXCEPTION 'migration 0021 non appliquée : app.binomes n''existe pas';
  END IF;
  IF to_regprocedure('app.proposer_binome(uuid, uuid)') IS NULL
     OR to_regprocedure('app.repondre_binome(uuid, boolean)') IS NULL
     OR to_regprocedure('app.mes_binomes()') IS NULL
     OR to_regprocedure('app.lire_binome(uuid)') IS NULL THEN
    RAISE EXCEPTION 'migration 0021 non appliquée : une des quatre fonctions de binôme manque';
  END IF;

  IF to_regclass('app.binomes_propose_par_idx') IS NULL
     OR position('binomes' IN pg_get_functiondef('app.exporter_mes_donnees()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'migration 0021 non appliquée : index binomes_propose_par_idx ou clé binomes de l''export absents';
  END IF;

  -- 2. Structure et droits, lus dans le catalogue.
  IF NOT (SELECT c.relrowsecurity AND c.relforcerowsecurity AND c.relowner = 'tenga_owner'::regrole AND c.relkind = 'r'
            FROM pg_class c WHERE c.oid = 'app.binomes'::regclass) THEN
    RAISE EXCEPTION 'app.binomes : RLS non activée et forcée, ou propriétaire différent de tenga_owner';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
              WHERE c.oid = 'app.binomes'::regclass
                AND (has_any_column_privilege(r.rol, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                     OR has_table_privilege(r.rol, c.oid, 'DELETE') OR has_table_privilege(r.rol, c.oid, 'TRUNCATE')
                     OR has_table_privilege(r.rol, c.oid, 'TRIGGER'))) THEN
    RAISE EXCEPTION 'un rôle de l''API a un droit sur app.binomes (attendu : aucun)';
  END IF;
  SELECT string_agg(policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY policyname) INTO v_r
    FROM pg_policies WHERE schemaname = 'app' AND tablename = 'binomes';
  IF v_r IS DISTINCT FROM E'binomes_insertion_owner|INSERT|tenga_owner\nbinomes_lecture_owner|SELECT|tenga_owner\nbinomes_modification_owner|UPDATE|tenga_owner' THEN
    RAISE EXCEPTION 'règles inattendues sur app.binomes : %', v_r;
  END IF;
  SELECT count(*) INTO v_n FROM pg_trigger t
   WHERE t.tgrelid = 'app.binomes'::regclass AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
     AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) <> 0) OR (t.tgtype & 32) = 32);
  IF v_n <> 2 THEN RAISE EXCEPTION 'refuser_ecriture_api actif % fois sur app.binomes au lieu de 2 (ligne et vidage)', v_n; END IF;
  SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") INTO v_r FROM pg_trigger t
   WHERE t.tgrelid = 'app.binomes'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O' AND t.tgname !~ '_sans_(ecriture|vidage)_api$';
  IF v_r IS DISTINCT FROM 'binomes_transition' THEN RAISE EXCEPTION 'déclencheurs inattendus sur app.binomes : %', v_r; END IF;
  SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                    || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                    || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text, E'\n' ORDER BY p.proname) INTO v_r
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'app' AND p.proname IN ('proposer_binome', 'repondre_binome', 'mes_binomes', 'lire_binome');
  IF v_r IS DISTINCT FROM E'lire_binome|true|v|true|tenga_owner|false|false|false|true\nmes_binomes|true|s|true|tenga_owner|false|false|false|true\nproposer_binome|true|v|true|tenga_owner|false|false|false|true\nrepondre_binome|true|v|true|tenga_owner|false|false|false|true' THEN
    RAISE EXCEPTION 'attributs ou droits inattendus des fonctions de binôme : %', v_r;
  END IF;
  IF pg_get_function_result('app.lire_binome(uuid)'::regprocedure) IS DISTINCT FROM
       'TABLE(participation_id uuid, cote text, est_la_mienne boolean, scores jsonb, questionnaire_version text, calcul_version text, soumis_le timestamp with time zone)'
     OR pg_get_function_result('app.mes_binomes()'::regprocedure) IS DISTINCT FROM
       'TABLE(binome_id uuid, organisation_nom text, ma_participation uuid, propose_le timestamp with time zone, statut text, mon_accord_le timestamp with time zone, autre_nom text)' THEN
    RAISE EXCEPTION 'colonnes inattendues : % / %', pg_get_function_result('app.lire_binome(uuid)'::regprocedure), pg_get_function_result('app.mes_binomes()'::regprocedure);
  END IF;
  RAISE NOTICE 'OK : migration 0021 appliquée ; table fermée à l''API (RLS forcée, trois règles tenga_owner, déclencheurs), quatre fonctions SECURITY DEFINER, search_path vide, tenga_owner, authenticated seul';

  -- Données jetables : deux organisations. A : pa, pb, pc (résultats), pd (en cours), ra, ca ; B : cx, qb.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (v_pa, 'epreuve-c2a-pa@example.test', '{"nom": "Alice"}'), (v_pb, 'epreuve-c2a-pb@example.test', '{"nom": "Bruno"}'),
    (v_pc, 'epreuve-c2a-pc@example.test', '{"nom": "Camille"}'), (v_pd, 'epreuve-c2a-pd@example.test', '{}'),
    (v_ra, 'epreuve-c2a-ra@example.test', '{}'), (v_ca, 'epreuve-c2a-ca@example.test', '{}'),
    (v_cx, 'epreuve-c2a-cx@example.test', '{}'), (v_ad, 'epreuve-c2a-ad@example.test', '{}'),
    (v_nx, 'epreuve-c2a-nx@example.test', '{}'), (v_qb, 'epreuve-c2a-qb@example.test', '{}');
  INSERT INTO app.organizations (id, slug, nom) VALUES
    (v_orga, 'epreuve-c2a-a', 'Organisation d''épreuve C2a A'),
    (v_orgb, 'epreuve-c2a-b', 'Organisation d''épreuve C2a B');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES
    (v_pa, v_orga, 'participant'), (v_pb, v_orga, 'participant'), (v_pc, v_orga, 'participant'), (v_pd, v_orga, 'participant'),
    (v_ra, v_orga, 'responsable'), (v_ca, v_orga, 'consultant'),
    (v_cx, v_orgb, 'consultant'), (v_qb, v_orgb, 'participant');
  INSERT INTO private.tenga_admins (user_id) VALUES (v_ad);
  INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
    (v_c1, v_orga, 'Épreuve C2a, campagne 1', 'ouverte', now(), NULL),
    (v_c2, v_orga, 'Épreuve C2a, campagne 2', 'ouverte', now(), NULL),
    (v_cb, v_orgb, 'Épreuve C2a, campagne B', 'ouverte', now(), NULL);
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
    (v_d1, v_c1, v_orga, v_pa, 'terminee', now(), now()),
    (v_d2, v_c1, v_orga, v_pb, 'terminee', now(), now()),
    (v_d3, v_c1, v_orga, v_pc, 'terminee', now(), now()),
    (v_d4, v_c2, v_orga, v_pa, 'terminee', now(), now()),
    (v_d5, v_cb, v_orgb, v_qb, 'terminee', now(), now()),
    (v_d6, v_c1, v_orga, v_pd, 'en_cours', now(), NULL);
  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES
    (v_d1, v_orga, v_pa, '{"1": 3}', pg_temp.sc(11), 'q-epreuve', 'c-epreuve'),
    (v_d2, v_orga, v_pb, '{"1": 2}', pg_temp.sc(7), 'q-epreuve', 'c-epreuve'),
    (v_d3, v_orga, v_pc, '{"1": 4}', pg_temp.sc(9), 'q-epreuve', 'c-epreuve'),
    (v_d4, v_orga, v_pa, '{"1": 5}', pg_temp.sc(5), 'q-epreuve', 'c-epreuve'),
    (v_d5, v_orgb, v_qb, '{"1": 1}', pg_temp.sc(6), 'q-epreuve', 'c-epreuve');

  -- 3. Accès direct fermé à l'API, même au consultant.
  FOR v_cas IN
    SELECT * FROM (VALUES ('participant', v_pa, 'authenticated'), ('consultant', v_ca, 'authenticated'),
                          ('serveur', v_pa, 'service_role')) AS t(nom, uid, rol)
  LOOP
    v_r := pg_temp.comme(v_cas.uid, v_cas.rol, 'select count(*)::text from app.binomes');
    IF v_r IS DISTINCT FROM 'ERR:42501:permission denied for table binomes' THEN
      RAISE EXCEPTION 'lecture directe de app.binomes (%) : % au lieu du refus', v_cas.nom, v_r;
    END IF;
  END LOOP;
  v_r := pg_temp.comme(v_ca, 'authenticated',
    format('insert into app.binomes (organization_id, participation_a, participation_b) values (%L, %L, %L) returning id::text', v_orga, v_d1, v_d2));
  IF v_r IS DISTINCT FROM 'ERR:42501:permission denied for table binomes' THEN
    RAISE EXCEPTION 'écriture directe dans app.binomes par le consultant : % au lieu du refus', v_r;
  END IF;
  RAISE NOTICE 'OK : le rôle connecté (participant, consultant) et le serveur ne lisent ni n''écrivent app.binomes directement';

  -- 4. Proposer : consultant, administrateur Tenga ; rangement dans l'ordre croissant ; doublon refusé.
  v_r := pg_temp.prop(v_ca, v_d2, v_d1);
  IF v_r !~ v_uuid_re THEN RAISE EXCEPTION 'proposition (d2, d1) par le consultant : %', v_r; END IF;
  v_b1 := v_r::uuid;
  IF NOT EXISTS (SELECT 1 FROM app.binomes b WHERE b.id = v_b1 AND b.participation_a = v_d1 AND b.participation_b = v_d2
                    AND b.organization_id = v_orga AND b.propose_par = v_ca
                    AND b.accord_a_le IS NULL AND b.accord_b_le IS NULL AND b.retire_le IS NULL) THEN
    RAISE EXCEPTION 'la proposition n''est pas rangée dans l''ordre croissant avec l''organisation et le consultant';
  END IF;
  IF pg_temp.prop(v_ca, v_d1, v_d2) IS DISTINCT FROM 'ERR:23505:Une proposition est déjà en cours pour ces deux personnes'
     OR pg_temp.prop(v_ca, v_d2, v_d1) IS DISTINCT FROM 'ERR:23505:Une proposition est déjà en cours pour ces deux personnes' THEN
    RAISE EXCEPTION 'le doublon d''une proposition en cours n''est pas refusé';
  END IF;
  v_r := pg_temp.prop(v_ca, v_d1, v_d3);
  IF v_r !~ v_uuid_re THEN RAISE EXCEPTION 'proposition (d1, d3) : %', v_r; END IF;
  v_b2 := v_r::uuid;
  v_r := pg_temp.prop(v_ad, v_d3, v_d2);
  IF v_r !~ v_uuid_re THEN RAISE EXCEPTION 'proposition (d3, d2) par l''administrateur Tenga : %', v_r; END IF;
  v_b3 := v_r::uuid;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id IN (v_orga, v_orgb);
  IF v_n <> 3 THEN RAISE EXCEPTION '% proposition(s) au lieu de 3 : un refus ou un doublon a écrit', v_n; END IF;
  RAISE NOTICE 'OK : le consultant et l''administrateur Tenga proposent ; couple rangé dans l''ordre croissant ; une seule proposition en cours par couple';

  -- 5. Proposer : refus de même message, entrées invalides de même message, rien d'écrit.
  FOR v_cas IN
    SELECT * FROM (VALUES
      ('responsable',                v_ra, v_d1,    v_d2,    v_refus_prop),
      ('participant',                v_pa, v_d1,    v_d2,    v_refus_prop),
      ('personne sans rôle',         v_nx, v_d1,    v_d2,    v_refus_prop),
      ('consultant autre organisation', v_cx, v_d1, v_d2,    v_refus_prop),
      ('participation inexistante, consultant', v_ca, v_dfaux, v_d1, v_refus_prop),
      ('participation inexistante, administrateur', v_ad, v_dfaux, v_d1, v_refus_prop),
      ('première participation nulle', v_ca, NULL::uuid, v_d1, v_refus_prop),
      ('deux organisations, consultant', v_ca, v_d1, v_d5,   v_inval),
      ('deux organisations, administrateur', v_ad, v_d1, v_d5, v_inval),
      ('même participation',         v_ca, v_d1,    v_d1,    v_inval),
      ('même personne',              v_ca, v_d1,    v_d4,    v_inval),
      ('participation non terminée', v_ca, v_d1,    v_d6,    v_inval),
      ('seconde participation nulle', v_ca, v_d1,   NULL::uuid, v_inval),
      ('seconde participation inexistante', v_ca, v_d1, v_dfaux, v_inval)
    ) AS t(nom, uid, pa, pb, attendu)
  LOOP
    v_r := pg_temp.prop(v_cas.uid, v_cas.pa, v_cas.pb);
    IF v_r IS DISTINCT FROM v_cas.attendu THEN
      RAISE EXCEPTION 'proposition, cas « % » : % au lieu de %', v_cas.nom, v_r, v_cas.attendu;
    END IF;
  END LOOP;
  IF pg_temp.prop(v_ca, v_d1, v_d2, 'anon') NOT LIKE 'ERR:42501:%'
     OR pg_temp.prop(v_ca, v_d1, v_d2, 'service_role') NOT LIKE 'ERR:42501:%'
     OR pg_temp.prop(NULL, v_d1, v_d2) IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN
    RAISE EXCEPTION 'anon, service_role ou une session sans identité ne sont pas refusés pour proposer_binome';
  END IF;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id IN (v_orga, v_orgb);
  IF v_n <> 3 THEN RAISE EXCEPTION 'un refus a écrit une proposition (% au lieu de 3)', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.proposer' AND organization_id = v_orga;
  IF v_n <> 3 THEN RAISE EXCEPTION 'journal de proposition : % ligne(s) au lieu de 3 (un refus a écrit)', v_n; END IF;
  RAISE NOTICE 'OK : responsable, participant, personne sans rôle, autre organisation, participation inexistante ou nulle : refus 42501 de même message ; deux organisations, même personne, non terminée : 22023 ; anon, service_role, sans identité refusés ; rien d''écrit';

  -- 6. Mes propositions : noms, statuts, aucune identité, personne d'autre n'en voit.
  IF pg_temp.mes(v_pa) IS DISTINCT FROM '2' OR pg_temp.mes(v_pb) IS DISTINCT FROM '2' OR pg_temp.mes(v_pc) IS DISTINCT FROM '2' THEN
    RAISE EXCEPTION 'chaque personne devait voir ses deux propositions';
  END IF;
  FOR v_cas IN SELECT * FROM (VALUES ('pd', v_pd), ('responsable', v_ra), ('consultant', v_ca), ('consultant B', v_cx),
                                     ('sans rôle', v_nx), ('participant B', v_qb), ('administrateur', v_ad)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.mes(v_cas.uid);
    IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'mes_binomes (%) : % ligne(s) au lieu de 0', v_cas.nom, v_r; END IF;
  END LOOP;
  IF pg_temp.mes(v_pa, 'string_agg(x.autre_nom, '','' order by x.autre_nom)') IS DISTINCT FROM 'Bruno,Camille'
     OR pg_temp.mes(v_pb, 'string_agg(x.autre_nom, '','' order by x.autre_nom)') IS DISTINCT FROM 'Alice,Camille' THEN
    RAISE EXCEPTION 'le nom de l''autre personne n''est pas montré';
  END IF;
  IF pg_temp.mes(v_pa, 'string_agg(distinct x.statut, '','')') IS DISTINCT FROM 'en_attente' THEN
    RAISE EXCEPTION 'statut initial différent de en_attente';
  END IF;
  v_r := pg_temp.mes(v_pa, '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)');
  IF v_r IS DISTINCT FROM 'autre_nom,binome_id,ma_participation,mon_accord_le,organisation_nom,propose_le,statut' THEN
    RAISE EXCEPTION 'colonnes de mes_binomes : %', v_r;
  END IF;
  v_r := pg_temp.mes(v_pa, 'count(*) filter (where to_jsonb(x)::text ~ ''(e9000000-0000-4000-8000-00000000000[1-9a]|@|example)'')');
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'mes_binomes laisse sortir une identité : % ligne(s)', v_r; END IF;
  IF pg_temp.mes(v_pa, 'count(*)', 'anon') NOT LIKE 'ERR:42501:%' OR pg_temp.mes(v_pa, 'count(*)', 'service_role') NOT LIKE 'ERR:42501:%'
     OR pg_temp.mes(NULL) IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN
    RAISE EXCEPTION 'anon, service_role ou une session sans identité ne sont pas refusés pour mes_binomes';
  END IF;
  RAISE NOTICE 'OK : mes_binomes : deux propositions par personne concernée, aucune pour les autres, nom de l''autre personne, sept colonnes, aucune identité';

  -- 7. Répondre : refus de même message pour tout autre que le titulaire ; entrées invalides.
  FOR v_cas IN SELECT * FROM (VALUES ('responsable', v_ra), ('consultant', v_ca), ('administrateur', v_ad), ('troisième personne', v_pc)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.rep(v_cas.uid, v_b1, true);
    IF v_r IS DISTINCT FROM v_introuv THEN RAISE EXCEPTION 'répondre (%) : % au lieu du refus', v_cas.nom, v_r; END IF;
  END LOOP;
  IF pg_temp.rep(v_pa, 'e9000000-0000-4000-8000-0000000000fe', true) IS DISTINCT FROM v_introuv
     OR pg_temp.rep(v_pa, NULL, true) IS DISTINCT FROM v_introuv
     OR pg_temp.rep(v_pa, v_b1, NULL) IS DISTINCT FROM 'ERR:22023:Réponse invalide : accord ou refus attendu'
     OR pg_temp.rep(v_pa, v_b1, true, 'anon') NOT LIKE 'ERR:42501:%'
     OR pg_temp.rep(v_pa, v_b1, true, 'service_role') NOT LIKE 'ERR:42501:%'
     OR pg_temp.rep(NULL, v_b1, true) IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN
    RAISE EXCEPTION 'une réponse invalide, forgée ou sans droit n''est pas refusée comme attendu';
  END IF;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id IN (v_orga, v_orgb)
     AND (accord_a_le IS NOT NULL OR accord_b_le IS NOT NULL OR retire_le IS NOT NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus a écrit un accord ou un retrait (% ligne(s))', v_n; END IF;
  RAISE NOTICE 'OK : seule une des deux personnes répond ; proposition forgée, nulle, réponse nulle, anon, service_role, sans identité : refus ; rien d''écrit';

  -- 8. Un seul accord : aucune lecture, pour personne.
  IF pg_temp.rep(v_pa, v_b1, true) IS DISTINCT FROM 'en_attente' OR pg_temp.rep(v_pa, v_b1, true) IS DISTINCT FROM 'en_attente' THEN
    RAISE EXCEPTION 'l''accord de pa devait laisser la proposition en attente, y compris rejoué';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.accepter' AND acteur = v_pa AND ressource_id = v_b1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'un accord rejoué a inscrit % ligne(s) de journal au lieu de 1', v_n; END IF;
  IF pg_temp.col(v_pa, v_b1, 'mon_accord_le') IS NULL OR pg_temp.col(v_pb, v_b1, 'mon_accord_le') IS NOT NULL
     OR pg_temp.col(v_pa, v_b1, 'statut') IS DISTINCT FROM 'en_attente' OR pg_temp.col(v_pb, v_b1, 'statut') IS DISTINCT FROM 'en_attente' THEN
    RAISE EXCEPTION 'mes_binomes montre un accord qui n''est pas le sien, ou un statut inattendu';
  END IF;
  FOR v_cas IN SELECT * FROM (VALUES ('pa', v_pa), ('pb', v_pb), ('consultant', v_ca), ('administrateur', v_ad)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.lire(v_cas.uid, v_b1);
    IF v_r IS DISTINCT FROM v_sans_acc THEN RAISE EXCEPTION 'lecture avec un seul accord (%) : % au lieu du refus', v_cas.nom, v_r; END IF;
  END LOOP;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.lire' AND organization_id = v_orga;
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus de lecture a écrit % ligne(s) de journal', v_n; END IF;
  RAISE NOTICE 'OK : avec un seul accord, personne ne lit (pa, pb, consultant, administrateur) ; l''accord rejoué n''inscrit qu''une ligne ; chacun ne voit que son propre accord';

  -- 9. Deux accords : lecture par pa, pb, le consultant et l'administrateur ; O6 de l'autre retirée.
  IF pg_temp.rep(v_pb, v_b1, true) IS DISTINCT FROM 'actif' THEN RAISE EXCEPTION 'le second accord devait rendre le binôme actif'; END IF;
  IF pg_temp.col(v_pa, v_b1, 'statut') IS DISTINCT FROM 'actif' THEN RAISE EXCEPTION 'statut actif non visible par pa'; END IF;
  FOR v_cas IN SELECT * FROM (VALUES ('pa', v_pa), ('pb', v_pb), ('consultant', v_ca), ('administrateur', v_ad)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.lire(v_cas.uid, v_b1);
    IF v_r IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'lecture à deux accords (%) : % au lieu de 2 lignes', v_cas.nom, v_r; END IF;
  END LOOP;
  v_r := pg_temp.lire(v_pa, v_b1, '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)');
  IF v_r IS DISTINCT FROM 'calcul_version,cote,est_la_mienne,participation_id,questionnaire_version,scores,soumis_le' THEN
    RAISE EXCEPTION 'colonnes de lire_binome : %', v_r;
  END IF;
  IF pg_temp.lire(v_pa, v_b1, 'string_agg(x.participation_id::text, '','' order by x.cote)') IS DISTINCT FROM v_d1::text || ',' || v_d2::text THEN
    RAISE EXCEPTION 'ordre ou contenu des lignes de lire_binome';
  END IF;
  IF pg_temp.lire(v_pa, v_b1, 'string_agg(x.est_la_mienne::text, '','' order by x.cote)') IS DISTINCT FROM 'true,false'
     OR pg_temp.lire(v_pb, v_b1, 'string_agg(x.est_la_mienne::text, '','' order by x.cote)') IS DISTINCT FROM 'false,true'
     OR pg_temp.lire(v_ca, v_b1, 'string_agg(x.est_la_mienne::text, '','' order by x.cote)') IS DISTINCT FROM 'false,false' THEN
    RAISE EXCEPTION 'est_la_mienne incorrect';
  END IF;
  IF pg_temp.lire(v_pa, v_b1, v_o6) IS DISTINCT FROM '11,absent' OR pg_temp.lire(v_pb, v_b1, v_o6) IS DISTINCT FROM 'absent,7'
     OR pg_temp.lire(v_ca, v_b1, v_o6) IS DISTINCT FROM 'absent,absent' OR pg_temp.lire(v_ad, v_b1, v_o6) IS DISTINCT FROM 'absent,absent' THEN
    RAISE EXCEPTION 'la facette O6 de l''autre personne sort, ou la sienne disparaît';
  END IF;
  v_r := pg_temp.lire(v_ca, v_b1,
    'count(*) filter (where x.scores #>> ''{O,facettes,5,score}'' = ''10'' and x.scores #>> ''{E,score}'' = ''50'' and x.scores #>> ''{O,score}'' is not null)');
  IF v_r IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'd''autres facettes ou domaines ont disparu : % ligne(s) complète(s) au lieu de 2', v_r; END IF;
  RAISE NOTICE 'OK : à deux accords, pa, pb, le consultant et l''administrateur lisent deux lignes (sept colonnes, jamais les réponses) ; O6 de l''autre personne retirée, le reste conservé';

  -- 10. Lecture : refus de même message, journal sans adresse.
  FOR v_cas IN SELECT * FROM (VALUES ('responsable', v_ra), ('troisième personne', v_pc), ('participant en cours', v_pd),
                                     ('personne sans rôle', v_nx), ('consultant autre organisation', v_cx), ('participant autre organisation', v_qb)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.lire(v_cas.uid, v_b1);
    IF v_r IS DISTINCT FROM v_refus_lire THEN RAISE EXCEPTION 'lecture refusée (%) : % au lieu du refus attendu', v_cas.nom, v_r; END IF;
  END LOOP;
  IF pg_temp.lire(v_ca, 'e9000000-0000-4000-8000-0000000000fe') IS DISTINCT FROM v_refus_lire
     OR pg_temp.lire(v_ca, NULL) IS DISTINCT FROM v_refus_lire
     OR pg_temp.lire(v_ca, v_d1) IS DISTINCT FROM v_refus_lire
     OR pg_temp.lire(v_pa, v_b1, 'count(*)', 'anon') NOT LIKE 'ERR:42501:%'
     OR pg_temp.lire(v_pa, v_b1, 'count(*)', 'service_role') NOT LIKE 'ERR:42501:%'
     OR pg_temp.lire(NULL, v_b1) IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN
    RAISE EXCEPTION 'un binôme forgé, nul, un identifiant de participation, anon, service_role ou une session sans identité ne sont pas refusés comme attendu';
  END IF;
  SELECT string_agg(DISTINCT acteur::text, ',' ORDER BY acteur::text) INTO v_r FROM private.audit_log
   WHERE action = 'binome.lire' AND organization_id = v_orga;
  IF v_r IS DISTINCT FROM v_pa::text || ',' || v_pb::text || ',' || v_ca::text || ',' || v_ad::text THEN
    RAISE EXCEPTION 'acteurs du journal de lecture : % (attendu : pa, pb, consultant, administrateur seulement)', v_r;
  END IF;
  SELECT string_agg(DISTINCT ressource_type || '|' || ressource_id::text || '|' || quantite::text, ',') INTO v_r FROM private.audit_log
   WHERE action = 'binome.lire' AND organization_id = v_orga;
  IF v_r IS DISTINCT FROM 'binome|' || v_b1::text || '|2' THEN RAISE EXCEPTION 'ligne de journal de lecture : %', v_r; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log l
   WHERE l.action ~ '^binome\.' AND l.organization_id IN (v_orga, v_orgb) AND to_jsonb(l)::text ~ '@';
  IF v_n <> 0 THEN RAISE EXCEPTION 'une ligne de journal de binôme contient une adresse'; END IF;
  RAISE NOTICE 'OK : responsable, troisième personne, participant en cours, personne sans rôle, autre organisation, binôme forgé ou nul, anon, service_role, sans identité : refus ; journal : lectures autorisées seules, type binome, quantité 2, sans adresse';

  -- 11. Refus d'une personne : définitif ; nouvelle proposition possible, repartant de zéro.
  IF pg_temp.rep(v_pc, v_b2, false) IS DISTINCT FROM 'retire' THEN RAISE EXCEPTION 'le refus de pc devait clore la proposition'; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.refuser' AND acteur = v_pc AND ressource_id = v_b2;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal du refus : % ligne(s) au lieu de 1', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.retirer' AND organization_id = v_orga;
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus ne devait pas écrire binome.retirer'; END IF;
  IF pg_temp.col(v_pa, v_b2, 'statut') IS DISTINCT FROM 'retire' OR pg_temp.col(v_pa, v_b2, 'autre_nom') IS NOT NULL THEN
    RAISE EXCEPTION 'une proposition refusée doit apparaître retirée, sans le nom de l''autre personne';
  END IF;
  IF pg_temp.rep(v_pa, v_b2, true) IS DISTINCT FROM v_definitif OR pg_temp.rep(v_pc, v_b2, true) IS DISTINCT FROM v_definitif
     OR pg_temp.rep(v_pa, v_b2, false) IS DISTINCT FROM v_definitif THEN
    RAISE EXCEPTION 'une proposition refusée n''est pas définitive';
  END IF;
  v_r := pg_temp.prop(v_ca, v_d1, v_d3);
  IF v_r !~ v_uuid_re THEN RAISE EXCEPTION 'nouvelle proposition après un refus : %', v_r; END IF;
  v_b2bis := v_r::uuid;
  IF v_b2bis = v_b2 OR NOT EXISTS (SELECT 1 FROM app.binomes b WHERE b.id = v_b2bis AND b.accord_a_le IS NULL AND b.accord_b_le IS NULL AND b.retire_le IS NULL) THEN
    RAISE EXCEPTION 'la nouvelle proposition doit être une autre ligne, sans accord hérité';
  END IF;
  RAISE NOTICE 'OK : un refus est définitif (accord et retrait refusés ensuite), journalisé binome.refuser, nom masqué ; une nouvelle proposition repart de zéro';

  -- 12. Retrait après deux accords : plus aucune lecture.
  IF pg_temp.rep(v_pb, v_b3, true) IS DISTINCT FROM 'en_attente' OR pg_temp.rep(v_pc, v_b3, true) IS DISTINCT FROM 'actif' THEN
    RAISE EXCEPTION 'les deux accords de d2-d3 devaient rendre le binôme actif';
  END IF;
  IF pg_temp.lire(v_ca, v_b3) IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'le binôme d2-d3 actif devait être lisible'; END IF;
  IF pg_temp.rep(v_pb, v_b3, false) IS DISTINCT FROM 'retire' THEN RAISE EXCEPTION 'le retrait de pb devait clore la proposition'; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.retirer' AND acteur = v_pb AND ressource_id = v_b3;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal du retrait : % ligne(s) au lieu de 1', v_n; END IF;
  FOR v_cas IN SELECT * FROM (VALUES ('pb', v_pb), ('pc', v_pc), ('consultant', v_ca), ('administrateur', v_ad)) AS t(nom, uid)
  LOOP
    v_r := pg_temp.lire(v_cas.uid, v_b3);
    IF v_r IS DISTINCT FROM v_sans_acc THEN RAISE EXCEPTION 'lecture après retrait (%) : % au lieu du refus', v_cas.nom, v_r; END IF;
  END LOOP;
  IF pg_temp.rep(v_pc, v_b3, true) IS DISTINCT FROM v_definitif THEN RAISE EXCEPTION 'un retrait n''est pas définitif'; END IF;
  IF pg_temp.lire(v_pa, v_b1) IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'le retrait de d2-d3 a touché le binôme d1-d2'; END IF;
  RAISE NOTICE 'OK : après le retrait de pb, plus de lecture pour personne ; le retrait est définitif ; l''autre binôme reste actif';

  -- 13. Le consentement ne se réécrit pas (écritures directes du superutilisateur de l'épreuve).
  BEGIN
    UPDATE app.binomes SET accord_a_le = NULL WHERE id = v_b1;
    RAISE EXCEPTION 'un accord donné a pu être effacé par écriture directe';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> 'Un accord ne se modifie pas : il se retire' THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  BEGIN
    UPDATE app.binomes SET retire_le = NULL WHERE id = v_b3;
    RAISE EXCEPTION 'un retrait a pu être défait par écriture directe';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> 'Proposition close : un refus ou un retrait est définitif' THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  BEGIN
    UPDATE app.binomes SET participation_b = v_d3 WHERE id = v_b1;
    RAISE EXCEPTION 'les personnes d''une proposition ont pu changer';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> 'Une proposition de binôme ne change ni de personnes ni d''origine' THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  BEGIN
    INSERT INTO app.binomes (organization_id, participation_a, participation_b) VALUES (v_orga, v_d1, v_d3);
    RAISE EXCEPTION 'un second couple en cours a pu être inséré';
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO app.binomes (organization_id, participation_a, participation_b) VALUES (v_orga, v_d1, v_d5);
    RAISE EXCEPTION 'une participation d''une autre organisation a pu être insérée';
  EXCEPTION WHEN foreign_key_violation THEN
    NULL;
  END;
  BEGIN
    INSERT INTO app.binomes (organization_id, participation_a, participation_b) VALUES (v_orga, v_d2, v_d1);
    RAISE EXCEPTION 'un couple à l''envers a pu être inséré';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;
  RAISE NOTICE 'OK : accord non effaçable, retrait non défait, personnes immuables, couple unique et ordonné, même organisation (clé étrangère composite)';

  -- 13 bis. Droit d'accès : l'export contient les binômes de la personne, jamais l'autre personne.
  -- État : d1-d2 actif, d1-d3 refusée (retirée), d1-d3 nouvelle en attente, d2-d3 retirée.
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = 'app.exporter_mes_donnees()'::regprocedure AND p.prosecdef
                    AND p.provolatile = 'v' AND p.proconfig = ARRAY['search_path=""']::text[] AND pg_get_userbyid(p.proowner) = 'tenga_owner')
     OR NOT has_function_privilege('authenticated', 'app.exporter_mes_donnees()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('anon', 'app.exporter_mes_donnees()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('public', 'app.exporter_mes_donnees()'::regprocedure, 'EXECUTE')
     OR has_function_privilege('service_role', 'app.exporter_mes_donnees()'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'attributs ou droits inattendus pour app.exporter_mes_donnees';
  END IF;
  SELECT string_agg(k, ',' ORDER BY k COLLATE "C") INTO v_r FROM jsonb_object_keys(pg_temp.exp(v_pa)::jsonb) k;
  IF v_r IS DISTINCT FROM 'appartenances,binomes,compte,exporte_le,journal,participations,profil,resultats,tentatives' THEN
    RAISE EXCEPTION 'clés de l''export : %', v_r;
  END IF;
  IF jsonb_array_length(pg_temp.exp(v_pa)::jsonb -> 'binomes') <> 3 THEN RAISE EXCEPTION 'pa devait exporter trois propositions'; END IF;
  SELECT string_agg(e ->> 'statut', ',' ORDER BY e ->> 'statut') INTO v_r FROM jsonb_array_elements(pg_temp.exp(v_pa)::jsonb -> 'binomes') e;
  IF v_r IS DISTINCT FROM 'actif,en_attente,retire' THEN RAISE EXCEPTION 'statuts exportés : %', v_r; END IF;
  SELECT string_agg(k, ',' ORDER BY k COLLATE "C") INTO v_r FROM jsonb_object_keys(pg_temp.exp(v_pa)::jsonb -> 'binomes' -> 0) k;
  IF v_r IS DISTINCT FROM 'binome,ma_participation,mon_accord_le,organisation,propose_le,retire_le,statut' THEN
    RAISE EXCEPTION 'clés d''une proposition exportée : %', v_r;
  END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(pg_temp.exp(v_pa)::jsonb -> 'binomes') e
   WHERE e ->> 'statut' = 'actif' AND e ->> 'mon_accord_le' IS NOT NULL AND e ->> 'retire_le' IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'le binôme actif de pa devait porter son accord et aucun retrait'; END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(pg_temp.exp(v_pa)::jsonb -> 'binomes') e
   WHERE e ->> 'statut' = 'retire' AND e ->> 'retire_le' IS NOT NULL AND e ->> 'mon_accord_le' IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'la proposition refusée devait porter sa date de retrait et aucun accord de pa'; END IF;
  SELECT count(*) INTO v_n FROM jsonb_array_elements(pg_temp.exp(v_pc)::jsonb -> 'binomes') e WHERE e ->> 'mon_accord_le' IS NOT NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'pc devait exporter son seul accord (% trouvé(s))', v_n; END IF;
  v_r := (pg_temp.exp(v_pa)::jsonb -> 'binomes')::text;
  IF v_r ~ (v_d2::text || '|' || v_d3::text || '|' || v_pb::text || '|' || v_pc::text || '|' || v_ca::text || '|score|@') THEN
    RAISE EXCEPTION 'l''export de pa contient un score, un identifiant ou une adresse d''une autre personne';
  END IF;
  IF pg_temp.exp(v_pd)::jsonb -> 'binomes' IS DISTINCT FROM '[]'::jsonb
     OR pg_temp.exp(v_ra)::jsonb -> 'binomes' IS DISTINCT FROM '[]'::jsonb
     OR pg_temp.exp(v_ca)::jsonb -> 'binomes' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'une personne sans proposition (ou le responsable, le consultant) devait exporter une liste vide';
  END IF;
  IF pg_temp.exp(v_pa, 'anon') NOT LIKE 'ERR:42501:%' OR pg_temp.exp(v_pa, 'service_role') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'anon ou service_role n''est pas refusé sur l''export';
  END IF;
  RAISE NOTICE 'OK : l''export de la personne contient ses binômes (statut, son accord, dates), sans score, nom, identifiant ni adresse d''autrui ; vide pour qui n''en a pas ; attributs et droits inchangés';

  -- 14. Effacement en cascade : le compte du consultant, puis les personnes.
  DELETE FROM auth.users WHERE id = v_ca;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id = v_orga;
  IF v_n <> 4 THEN RAISE EXCEPTION 'effacer le consultant a laissé % proposition(s) au lieu de 4', v_n; END IF;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id = v_orga AND propose_par IS NULL;
  IF v_n <> 3 THEN RAISE EXCEPTION '% proposition(s) sans origine au lieu de 3', v_n; END IF;
  IF pg_temp.lire(v_pa, v_b1) IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'le binôme actif devait rester lisible après l''effacement du consultant'; END IF;
  DELETE FROM auth.users WHERE id = v_pc;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id = v_orga;
  IF v_n <> 1 THEN RAISE EXCEPTION 'effacer pc a laissé % proposition(s) au lieu de 1', v_n; END IF;
  DELETE FROM auth.users WHERE id = v_pa;
  SELECT count(*) INTO v_n FROM app.binomes WHERE organization_id = v_orga;
  IF v_n <> 0 THEN RAISE EXCEPTION 'effacer pa a laissé % proposition(s) au lieu de 0', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'binome.proposer' AND organization_id = v_orga;
  IF v_n <> 4 THEN RAISE EXCEPTION 'le journal a perdu des lignes de proposition (% au lieu de 4)', v_n; END IF;
  RAISE NOTICE 'OK : l''effacement du consultant ne supprime aucune proposition (origine à NULL) ; l''effacement d''une personne efface ses propositions en cascade ; le journal est conservé';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
