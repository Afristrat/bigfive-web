-- Épreuve de la migration 0015 (contrat de passation tenu en base : forme des
-- réponses et des scores « tenga-scores-1 » ; colonne campagne_statut de
-- app.mes_resultats) sur la base de production, AVANT puis APRÈS l'application de
-- la migration. Avant : elle doit sortir ROUGE avec « migration 0015 non
-- appliquée ». Après : « EPREUVE VERTE ». Tout est annulé : aucune ligne n'est
-- conservée (ROLLBACK final), hormis l'avance des compteurs d'identité du
-- journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-passation-scores.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée ni affichée : seuls une organisation et des
-- comptes jetables sont créés. Les appels se font sous le rôle réel authenticated
-- avec un jeton simulé (sub, role), comme l'API.
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

-- Réponses valides : 120 clés, toutes à 3.
CREATE FUNCTION pg_temp.rep() RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_object_agg(i::text, 3) FROM generate_series(1, 120) i
$$;

-- Scores valides : cinq domaines de score 72 (24 réponses à 3), six facettes de score 12.
CREATE FUNCTION pg_temp.sc() RETURNS jsonb
LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1', 'meta', jsonb_build_object('duree_secondes', 1234))
         || (SELECT jsonb_object_agg(d, jsonb_build_object('score', 72, 'count', 24, 'moyenne', 3,
               'facettes', (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', 12, 'count', 4, 'moyenne', 3))
                              FROM generate_series(1, 6) f)))
               FROM unnest(ARRAY['N', 'E', 'O', 'A', 'C']) d)
$$;

CREATE FUNCTION pg_temp.soum(p_uid uuid, p_participation uuid, p_reponses jsonb, p_scores jsonb) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format($q$select app.soumettre_resultat(%L, %L::jsonb, %L::jsonb, 'q-epreuve', 'tenga-somme-1')::text$q$,
           p_participation, p_reponses::text, p_scores::text))
$$;

DO $e$
DECLARE
  v_pa     uuid := 'e7000000-0000-4000-8000-000000000001';
  v_pb     uuid := 'e7000000-0000-4000-8000-000000000002';
  v_org    uuid := 'e7000000-0000-4000-8000-00000000000a';
  v_camp1  uuid := 'e7000000-0000-4000-8000-0000000000c1';
  v_camp2  uuid := 'e7000000-0000-4000-8000-0000000000c2';
  v_camp3  uuid := 'e7000000-0000-4000-8000-0000000000c3';
  v_part1  uuid := 'e7000000-0000-4000-8000-0000000000d1';
  v_part2  uuid := 'e7000000-0000-4000-8000-0000000000d2';
  v_part3  uuid := 'e7000000-0000-4000-8000-0000000000d3';
  v_part4  uuid := 'e7000000-0000-4000-8000-0000000000d4';
  v_soum   oid  := to_regprocedure('app.soumettre_resultat(uuid, jsonb, jsonb, text, text)');
  v_mes    oid  := to_regprocedure('app.mes_resultats()');
  v_msg_s  constant text := 'ERR:22023:Scores invalides : forme tenga-scores-1 attendue';
  v_msg_r  constant text := 'ERR:22023:Réponses invalides : 120 entiers de 1 à 5 attendus';
  v_r      text;
  v_n      integer;
  v_audit  integer;
  v_cas    record;
BEGIN
  -- 1. Objets de la migration 0015, lus dans le catalogue.
  IF v_soum IS NULL OR v_mes IS NULL THEN
    RAISE EXCEPTION 'fonctions de passation absentes (app.soumettre_resultat ou app.mes_resultats)';
  END IF;
  IF position('tenga-scores-1' IN pg_get_functiondef(v_soum)) = 0
     OR position('campagne_statut' IN pg_get_function_result(v_mes)) = 0 THEN
    RAISE EXCEPTION 'migration 0015 non appliquée : contrôle de forme ou colonne campagne_statut absent';
  END IF;
  IF pg_get_function_result(v_mes) IS DISTINCT FROM
     'TABLE(participation_id uuid, campagne_id uuid, campagne_titre text, organisation_nom text, organisation_slug text, statut text, ouverte_le timestamp with time zone, terminee_le timestamp with time zone, scores jsonb, questionnaire_version text, calcul_version text, campagne_statut text)' THEN
    RAISE EXCEPTION 'colonnes inattendues de app.mes_resultats : %', pg_get_function_result(v_mes);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_soum AND prosecdef AND proconfig = ARRAY['search_path=""']::text[]
                    AND pg_get_userbyid(proowner) = 'tenga_owner')
     OR NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_mes AND prosecdef AND provolatile = 's' AND proconfig = ARRAY['search_path=""']::text[]
                    AND pg_get_userbyid(proowner) = 'tenga_owner') THEN
    RAISE EXCEPTION 'attributs inattendus (SECURITY DEFINER, STABLE pour mes_resultats, search_path vide, propriétaire tenga_owner)';
  END IF;
  IF NOT has_function_privilege('authenticated', v_soum, 'EXECUTE') OR NOT has_function_privilege('authenticated', v_mes, 'EXECUTE')
     OR has_function_privilege('anon', v_soum, 'EXECUTE') OR has_function_privilege('anon', v_mes, 'EXECUTE')
     OR has_function_privilege('service_role', v_soum, 'EXECUTE') OR has_function_privilege('service_role', v_mes, 'EXECUTE')
     OR has_function_privilege('public', v_soum, 'EXECUTE') OR has_function_privilege('public', v_mes, 'EXECUTE') THEN
    RAISE EXCEPTION 'droits d''exécution inattendus (authenticated seul attendu)';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'app' AND p.proname IN ('soumettre_resultat', 'mes_resultats')) <> 2 THEN
    RAISE EXCEPTION 'une signature en trop pour app.soumettre_resultat ou app.mes_resultats';
  END IF;
  RAISE NOTICE 'OK : migration 0015 appliquée ; deux fonctions SECURITY DEFINER, search_path vide, tenga_owner, authenticated seul ; campagne_statut en dernière colonne';

  -- Données jetables : une organisation, deux participants, trois campagnes
  -- (deux ouvertes, une close), quatre participations.
  INSERT INTO auth.users (id, email) VALUES
    (v_pa, 'epreuve-m3-pa@example.test'),
    (v_pb, 'epreuve-m3-pb@example.test');
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-m3', 'Organisation d''épreuve M3');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES
    (v_pa, v_org, 'participant'),
    (v_pb, v_org, 'participant');
  INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
    (v_camp1, v_org, 'Épreuve M3, campagne 1', 'ouverte', now(), NULL),
    (v_camp2, v_org, 'Épreuve M3, campagne 2', 'ouverte', now(), NULL),
    (v_camp3, v_org, 'Épreuve M3, campagne close', 'close', now(), now());
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
    (v_part1, v_camp1, v_org, v_pa),
    (v_part2, v_camp1, v_org, v_pb),
    (v_part3, v_camp2, v_org, v_pa),
    (v_part4, v_camp3, v_org, v_pa);
  SELECT count(*) INTO v_audit FROM private.audit_log;

  -- 2. Refus de forme des réponses : 22023, rien d'écrit.
  FOR v_cas IN
    SELECT * FROM (VALUES
      ('119 réponses',          pg_temp.rep() - '120',                         pg_temp.sc(), v_msg_r),
      ('121 réponses',          pg_temp.rep() || '{"121": 3}'::jsonb,           pg_temp.sc(), v_msg_r),
      ('aucune réponse',        '{}'::jsonb,                                    pg_temp.sc(), v_msg_r),
      ('réponse à 6',           jsonb_set(pg_temp.rep(), '{7}', '6'),           pg_temp.sc(), v_msg_r),
      ('réponse à 0',           jsonb_set(pg_temp.rep(), '{7}', '0'),           pg_temp.sc(), v_msg_r),
      ('réponse à 2,5',         jsonb_set(pg_temp.rep(), '{7}', '2.5'),         pg_temp.sc(), v_msg_r),
      ('réponse en chaîne',     jsonb_set(pg_temp.rep(), '{7}', '"3"'),         pg_temp.sc(), 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus')
    ) AS t(nom, rep, sc, attendu)
  LOOP
    v_r := pg_temp.soum(v_pa, v_part1, v_cas.rep, v_cas.sc);
    IF v_r IS DISTINCT FROM v_cas.attendu THEN
      RAISE EXCEPTION 'réponses, cas « % » : % au lieu de %', v_cas.nom, v_r, v_cas.attendu;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK : réponses de forme inconnue refusées (22023)';

  -- 3. Refus de forme des scores : 22023, rien d'écrit.
  FOR v_cas IN
    SELECT * FROM (VALUES
      ('format absent',              pg_temp.sc() - 'format'),
      ('autre format',               jsonb_set(pg_temp.sc(), '{format}', '"tenga-scores-2"')),
      ('domaine manquant',           pg_temp.sc() - 'C'),
      ('domaine qui n''est pas un objet', jsonb_set(pg_temp.sc(), '{O}', '72')),
      ('count de domaine faux',      jsonb_set(pg_temp.sc(), '{N,count}', '23')),
      ('somme incohérente',          jsonb_set(pg_temp.sc(), '{N,score}', '73')),
      ('score de domaine décimal',   jsonb_set(pg_temp.sc(), '{N,score}', '72.5')),
      ('score de domaine en chaîne', jsonb_set(pg_temp.sc(), '{N,score}', '"72"')),
      ('score de domaine à 1000',    jsonb_set(pg_temp.sc(), '{N,score}', '1000')),
      ('score de domaine à 121',     jsonb_set(pg_temp.sc(), '{N,score}', '121')),
      ('facettes absentes',          pg_temp.sc() #- '{N,facettes}'),
      ('cinq facettes',              pg_temp.sc() #- '{O,facettes,6}'),
      ('sept facettes',              jsonb_set(pg_temp.sc(), '{O,facettes,7}', '{"score": 12, "count": 4}')),
      ('count de facette faux',      jsonb_set(pg_temp.sc(), '{E,facettes,2,count}', '5')),
      ('facette à 21, somme gardée', jsonb_set(jsonb_set(pg_temp.sc(), '{A,facettes,1,score}', '21'), '{A,facettes,2,score}', '3')),
      ('facette à 3, somme gardée',  jsonb_set(jsonb_set(pg_temp.sc(), '{A,facettes,1,score}', '3'), '{A,facettes,2,score}', '21')),
      ('facette en chaîne',          jsonb_set(jsonb_set(pg_temp.sc(), '{C,facettes,3,score}', '"13"'), '{C,facettes,4,score}', '11'))
    ) AS t(nom, sc)
  LOOP
    v_r := pg_temp.soum(v_pa, v_part1, pg_temp.rep(), v_cas.sc);
    IF v_r IS DISTINCT FROM v_msg_s THEN
      RAISE EXCEPTION 'scores, cas « % » : % au lieu de %', v_cas.nom, v_r, v_msg_s;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK : scores de forme inconnue refusés (22023)';

  SELECT count(*) INTO v_n FROM app.results WHERE participation_id IN (v_part1, v_part2, v_part3, v_part4);
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus a écrit % résultat(s)', v_n; END IF;
  IF (SELECT statut FROM app.participations WHERE id = v_part1) <> 'en_cours' THEN
    RAISE EXCEPTION 'un refus a modifié le statut de la participation';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log;
  IF v_n <> v_audit THEN RAISE EXCEPTION 'un refus a écrit % ligne(s) de journal', v_n - v_audit; END IF;
  RAISE NOTICE 'OK : un refus n''écrit ni résultat, ni statut, ni journal';

  -- 4. Ordre des refus : ceux de 0003 passent avant la forme.
  v_r := pg_temp.soum(v_pa, v_part4, '{}'::jsonb, '{}'::jsonb);
  IF v_r IS DISTINCT FROM 'ERR:55000:Campagne non ouverte : passation refusée' THEN
    RAISE EXCEPTION 'campagne close, charge invalide : % au lieu du refus de campagne', v_r;
  END IF;
  v_r := pg_temp.soum(v_pb, v_part1, pg_temp.rep(), pg_temp.sc());
  IF v_r IS DISTINCT FROM 'ERR:P0002:Participation introuvable' THEN
    RAISE EXCEPTION 'participation d''un autre : % au lieu de P0002', v_r;
  END IF;
  v_r := pg_temp.soum(v_pa, v_part1, '[1]'::jsonb, pg_temp.sc());
  IF v_r IS DISTINCT FROM 'ERR:22023:Réponses invalides : un objet de nombres, 500 au plus' THEN
    RAISE EXCEPTION 'réponses non objet : % au lieu du message de 0003', v_r;
  END IF;
  v_r := pg_temp.soum(v_pa, v_part1, pg_temp.rep(), '[50]'::jsonb);
  IF v_r IS DISTINCT FROM 'ERR:22023:Scores invalides : un objet est attendu' THEN
    RAISE EXCEPTION 'scores non objet : % au lieu du message de 0003', v_r;
  END IF;
  RAISE NOTICE 'OK : refus de campagne, de titulaire et de type conservés et prioritaires';

  -- 5. Soumissions valides : acceptées, relues à l'identique, journalisées une fois, non rejouables.
  v_r := pg_temp.soum(v_pa, v_part1, pg_temp.rep(), pg_temp.sc());
  IF v_r IS DISTINCT FROM v_part1::text THEN RAISE EXCEPTION 'soumission valide : % au lieu de la participation', v_r; END IF;
  IF NOT EXISTS (SELECT 1 FROM app.results r WHERE r.participation_id = v_part1
                    AND r.reponses = pg_temp.rep() AND r.scores = pg_temp.sc()
                    AND r.questionnaire_version = 'q-epreuve' AND r.calcul_version = 'tenga-somme-1') THEN
    RAISE EXCEPTION 'le résultat relu diffère de celui soumis';
  END IF;
  IF (SELECT count(*) FROM private.audit_log WHERE action = 'resultat.soumettre' AND ressource_id = v_part1) <> 1 THEN
    RAISE EXCEPTION 'la soumission valide n''est pas journalisée une fois';
  END IF;
  v_r := pg_temp.soum(v_pa, v_part1, pg_temp.rep(), pg_temp.sc());
  IF v_r IS DISTINCT FROM 'ERR:23505:Résultat déjà soumis' THEN RAISE EXCEPTION 'rejeu : % au lieu de 23505', v_r; END IF;
  v_r := pg_temp.soum(v_pb, v_part2, pg_temp.rep(), pg_temp.sc() - 'meta');
  IF v_r IS DISTINCT FROM v_part2::text THEN RAISE EXCEPTION 'soumission sans meta : % au lieu de la participation', v_r; END IF;
  RAISE NOTICE 'OK : soumission valide acceptée (avec et sans meta), relue à l''identique, journalisée une fois, non rejouable';

  -- 6. mes_resultats : campagne_statut distinct du statut de la participation.
  v_r := pg_temp.comme(v_pa, 'authenticated', format($q$select campagne_statut from app.mes_resultats() where campagne_id = %L$q$, v_camp2));
  IF v_r IS DISTINCT FROM 'ouverte' THEN RAISE EXCEPTION 'campagne ouverte : campagne_statut % au lieu de ouverte', v_r; END IF;
  v_r := pg_temp.comme(v_pa, 'authenticated', format($q$select campagne_statut || '|' || statut from app.mes_resultats() where campagne_id = %L$q$, v_camp1));
  IF v_r IS DISTINCT FROM 'ouverte|terminee' THEN RAISE EXCEPTION 'participation terminée : % au lieu de ouverte|terminee', v_r; END IF;
  UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = v_camp2;
  v_r := pg_temp.comme(v_pa, 'authenticated', format($q$select campagne_statut || '|' || statut from app.mes_resultats() where campagne_id = %L$q$, v_camp2));
  IF v_r IS DISTINCT FROM 'close|en_cours' THEN RAISE EXCEPTION 'campagne close : % au lieu de close|en_cours', v_r; END IF;
  v_r := pg_temp.comme(v_pa, 'authenticated', 'select count(*)::text from app.mes_resultats()');
  IF v_r IS DISTINCT FROM '3' THEN RAISE EXCEPTION 'mes_resultats de pa : % ligne(s) au lieu de 3', v_r; END IF;
  v_r := pg_temp.comme(v_pb, 'authenticated', 'select count(*)::text from app.mes_resultats()');
  IF v_r IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'mes_resultats de pb : % ligne(s) au lieu de 1', v_r; END IF;
  RAISE NOTICE 'OK : campagne_statut suit la campagne (ouverte puis close), statut reste celui de la participation, chacun ne voit que les siennes';

  -- 7. Droits réels : anon, service_role refusés ; connecté sans identité refusé.
  v_r := pg_temp.comme(NULL, 'anon', 'select count(*) from app.mes_resultats()');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'anon n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.comme(NULL, 'service_role', 'select count(*) from app.mes_resultats()');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'service_role n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.mes_resultats()');
  IF v_r IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN RAISE EXCEPTION 'sans identité : % au lieu de Connexion requise', v_r; END IF;
  RAISE NOTICE 'OK : anon et service_role refusés (42501), rôle connecté sans identité refusé';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
