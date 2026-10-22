-- Épreuve de la migration 0016 (app.lister_resultats_campagne : liste des résultats
-- d'une campagne pour le consultant et l'administrateur Tenga) sur la base de
-- production, AVANT puis APRÈS l'application de la migration. Avant : elle doit
-- sortir ROUGE avec « migration 0016 non appliquée ». Après : « EPREUVE VERTE ».
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance
-- des compteurs d'identité du journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-liste-resultats-consultant.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée ni affichée : seuls une organisation, des
-- comptes, des campagnes et des résultats jetables sont créés. Les appels se font
-- sous le rôle réel authenticated avec un jeton simulé (sub, role), comme l'API.
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

-- Appel de la fonction en tant que « p_uid » ; p_expr est l'expression sélectionnée sur la ligne « x ».
CREATE FUNCTION pg_temp.liste(p_uid uuid, p_campagne uuid, p_expr text DEFAULT 'count(*)', p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select %s from app.lister_resultats_campagne(%L) x', p_expr, p_campagne))
$$;

DO $e$
DECLARE
  v_pa    uuid := 'e8000000-0000-4000-8000-000000000001';
  v_pb    uuid := 'e8000000-0000-4000-8000-000000000002';
  v_pc    uuid := 'e8000000-0000-4000-8000-000000000003';
  v_ra    uuid := 'e8000000-0000-4000-8000-000000000004';
  v_ca    uuid := 'e8000000-0000-4000-8000-000000000005';
  v_cx    uuid := 'e8000000-0000-4000-8000-000000000006';
  v_ad    uuid := 'e8000000-0000-4000-8000-000000000007';
  v_nx    uuid := 'e8000000-0000-4000-8000-000000000008';
  v_qb    uuid := 'e8000000-0000-4000-8000-000000000009';
  v_orga  uuid := 'e8000000-0000-4000-8000-00000000000a';
  v_orgb  uuid := 'e8000000-0000-4000-8000-00000000000b';
  v_c1    uuid := 'e8000000-0000-4000-8000-0000000000c1';
  v_c2    uuid := 'e8000000-0000-4000-8000-0000000000c2';
  v_c3    uuid := 'e8000000-0000-4000-8000-0000000000c3';
  v_cb    uuid := 'e8000000-0000-4000-8000-0000000000cb';
  v_cfaux uuid := 'e8000000-0000-4000-8000-0000000000ff';
  v_d1    uuid := 'e8000000-0000-4000-8000-0000000000d1';
  v_d2    uuid := 'e8000000-0000-4000-8000-0000000000d2';
  v_d3    uuid := 'e8000000-0000-4000-8000-0000000000d3';
  v_d4    uuid := 'e8000000-0000-4000-8000-0000000000d4';
  v_d5    uuid := 'e8000000-0000-4000-8000-0000000000d5';
  v_oid   oid  := to_regprocedure('app.lister_resultats_campagne(uuid)');
  v_refus constant text := 'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga';
  v_r     text;
  v_n     integer;
  v_cas   record;
BEGIN
  -- 1. La fonction existe, avec les attributs et les droits attendus (lus dans le catalogue).
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'migration 0016 non appliquée : app.lister_resultats_campagne(uuid) n''existe pas';
  END IF;
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'app' AND p.proname = 'lister_resultats_campagne') <> 1 THEN
    RAISE EXCEPTION 'plusieurs signatures de app.lister_resultats_campagne';
  END IF;
  IF pg_get_function_result(v_oid) IS DISTINCT FROM 'TABLE(participation_id uuid, soumis_le timestamp with time zone)' THEN
    RAISE EXCEPTION 'colonnes inattendues : %', pg_get_function_result(v_oid);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE oid = v_oid AND prosecdef AND provolatile = 'v'
                    AND proconfig = ARRAY['search_path=""']::text[] AND pg_get_userbyid(proowner) = 'tenga_owner') THEN
    RAISE EXCEPTION 'attributs inattendus (SECURITY DEFINER, VOLATILE, search_path vide, propriétaire tenga_owner)';
  END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE')
     OR has_function_privilege('public', v_oid, 'EXECUTE')
     OR has_function_privilege('service_role', v_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'droits d''exécution inattendus (attendu : authenticated seul)';
  END IF;
  RAISE NOTICE 'OK : migration 0016 appliquée ; fonction SECURITY DEFINER, VOLATILE, search_path vide, tenga_owner, authenticated seul ; deux colonnes';

  -- Données jetables : deux organisations ; A1 (deux résultats, une personne en cours),
  -- A2 (un résultat, close ensuite), A3 (aucun résultat), B1 (un résultat).
  INSERT INTO auth.users (id, email) VALUES
    (v_pa, 'epreuve-c0-pa@example.test'), (v_pb, 'epreuve-c0-pb@example.test'), (v_pc, 'epreuve-c0-pc@example.test'),
    (v_ra, 'epreuve-c0-ra@example.test'), (v_ca, 'epreuve-c0-ca@example.test'), (v_cx, 'epreuve-c0-cx@example.test'),
    (v_ad, 'epreuve-c0-ad@example.test'), (v_nx, 'epreuve-c0-nx@example.test'), (v_qb, 'epreuve-c0-qb@example.test');
  INSERT INTO app.organizations (id, slug, nom) VALUES
    (v_orga, 'epreuve-c0-a', 'Organisation d''épreuve C0 A'),
    (v_orgb, 'epreuve-c0-b', 'Organisation d''épreuve C0 B');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES
    (v_pa, v_orga, 'participant'), (v_pb, v_orga, 'participant'), (v_pc, v_orga, 'participant'),
    (v_ra, v_orga, 'responsable'), (v_ca, v_orga, 'consultant'),
    (v_cx, v_orgb, 'consultant'), (v_qb, v_orgb, 'participant');
  INSERT INTO private.tenga_admins (user_id) VALUES (v_ad);
  INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
    (v_c1, v_orga, 'Épreuve C0, campagne 1', 'ouverte', now(), NULL),
    (v_c2, v_orga, 'Épreuve C0, campagne 2', 'ouverte', now(), NULL),
    (v_c3, v_orga, 'Épreuve C0, campagne 3', 'ouverte', now(), NULL),
    (v_cb, v_orgb, 'Épreuve C0, campagne B', 'ouverte', now(), NULL);
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
    (v_d1, v_c1, v_orga, v_pa, 'terminee', now(), now()),
    (v_d2, v_c1, v_orga, v_pb, 'terminee', now(), now()),
    (v_d3, v_c1, v_orga, v_pc, 'en_cours', now(), NULL),
    (v_d4, v_c2, v_orga, v_pa, 'terminee', now(), now()),
    (v_d5, v_cb, v_orgb, v_qb, 'terminee', now(), now());
  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version, soumis_le) VALUES
    (v_d1, v_orga, v_pa, '{"1": 3}', '{"O": 50}', 'q-epreuve', 'c-epreuve', '2026-03-02 10:00:00+00'),
    (v_d2, v_orga, v_pb, '{"1": 2}', '{"O": 40}', 'q-epreuve', 'c-epreuve', '2026-03-01 10:00:00+00'),
    (v_d4, v_orga, v_pa, '{"1": 4}', '{"O": 60}', 'q-epreuve', 'c-epreuve', '2026-04-01 10:00:00+00'),
    (v_d5, v_orgb, v_qb, '{"1": 5}', '{"O": 90}', 'q-epreuve', 'c-epreuve', '2026-05-01 10:00:00+00');
  UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = v_c2;

  -- 2. Le consultant de l'organisation : liste triée par date, deux colonnes, aucune identité.
  v_r := pg_temp.liste(v_ca, v_c1);
  IF v_r IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'consultant, campagne 1 : % ligne(s) au lieu de 2', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c1, 'string_agg(x.participation_id::text, '','')');
  IF v_r IS DISTINCT FROM v_d2::text || ',' || v_d1::text THEN
    RAISE EXCEPTION 'ordre ou contenu de la liste : % au lieu de d2 puis d1', v_r;
  END IF;
  v_r := pg_temp.liste(v_ca, v_c1, 'string_agg(to_char(x.soumis_le AT TIME ZONE ''UTC'', ''YYYY-MM-DD''), '','')');
  IF v_r IS DISTINCT FROM '2026-03-01,2026-03-02' THEN RAISE EXCEPTION 'dates de soumission : %', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c1, '(select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k)');
  IF v_r IS DISTINCT FROM 'participation_id,soumis_le' THEN RAISE EXCEPTION 'colonnes renvoyées : %', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c1, 'count(*) filter (where to_jsonb(x)::text ~ ''(e8000000-0000-4000-8000-00000000000[1-9]|@|example)'')');
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'une identité sort dans la liste : % ligne(s)', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c2);
  IF v_r IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'campagne close : % ligne(s) au lieu de 1', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c3);
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'campagne sans résultat : % au lieu de 0', v_r; END IF;
  RAISE NOTICE 'OK : le consultant liste (triée par date, deux colonnes, aucune identité, campagne close comprise, liste vide sans erreur)';

  -- 3. L'administrateur Tenga et le consultant de l'autre organisation, chacun chez soi.
  v_r := pg_temp.liste(v_ad, v_c1);
  IF v_r IS DISTINCT FROM '2' THEN RAISE EXCEPTION 'administrateur, campagne 1 : % au lieu de 2', v_r; END IF;
  v_r := pg_temp.liste(v_ad, v_cb);
  IF v_r IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'administrateur, campagne B : % au lieu de 1', v_r; END IF;
  v_r := pg_temp.liste(v_cx, v_cb);
  IF v_r IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'consultant B, campagne B : % au lieu de 1', v_r; END IF;
  RAISE NOTICE 'OK : l''administrateur Tenga liste dans toute organisation ; le consultant de B liste la campagne de B';

  -- 4. Journal : une ligne par consultation autorisée, quantité = lignes rendues, sans adresse.
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action = 'resultat.lister' AND acteur = v_ca AND ressource_id = v_c2 AND ressource_type = 'campagne'
     AND organization_id = v_orga AND quantite = 1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal de la campagne 2 : % ligne(s) conforme(s) au lieu de 1', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action = 'resultat.lister' AND acteur = v_ca AND ressource_id = v_c3 AND quantite = 0;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal de la campagne 3 : % ligne(s) de quantité 0 au lieu de 1', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action = 'resultat.lister' AND acteur = v_ad AND ressource_id = v_cb AND organization_id = v_orgb AND quantite = 1;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal de l''administrateur : % ligne(s) conforme(s) au lieu de 1', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log l
   WHERE l.action = 'resultat.lister' AND l.acteur IN (v_ca, v_ad, v_cx) AND to_jsonb(l)::text ~ '@';
  IF v_n <> 0 THEN RAISE EXCEPTION 'une ligne de journal contient une adresse'; END IF;
  RAISE NOTICE 'OK : chaque consultation autorisée est journalisée (type campagne, organisation, quantité), sans adresse';

  -- 5. Refus de même message, interdit ou inexistant ; rien d'écrit au journal.
  FOR v_cas IN
    SELECT * FROM (VALUES
      ('responsable de l''organisation',        v_ra, v_c1),
      ('participant titulaire d''un résultat',  v_pa, v_c1),
      ('participant en cours',                  v_pc, v_c1),
      ('personne sans rôle',                    v_nx, v_c1),
      ('consultant d''une autre organisation',  v_cx, v_c1),
      ('consultant de A sur la campagne de B',  v_ca, v_cb),
      ('campagne inexistante, consultant',      v_ca, v_cfaux),
      ('campagne inexistante, administrateur',  v_ad, v_cfaux),
      ('identifiant de participation',          v_ca, v_d1),
      ('identifiant nul',                       v_ca, NULL::uuid)
    ) AS t(nom, uid, camp)
  LOOP
    v_r := pg_temp.liste(v_cas.uid, v_cas.camp);
    IF v_r IS DISTINCT FROM v_refus THEN
      RAISE EXCEPTION 'refus, cas « % » : % au lieu du refus attendu', v_cas.nom, v_r;
    END IF;
  END LOOP;
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action = 'resultat.lister'
     AND (acteur IN (v_pa, v_pc, v_ra, v_nx)
          OR ressource_id IN (v_cfaux, v_d1)
          OR (acteur = v_cx AND ressource_id = v_c1)
          OR (acteur = v_ca AND ressource_id = v_cb));
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus a écrit % ligne(s) de journal', v_n; END IF;
  RAISE NOTICE 'OK : responsable, participants, personne sans rôle, autre organisation, campagne inexistante, identifiants forgés ou nuls : refus de même message, sans journal';

  -- 6. Droits réels : anon et service_role refusés ; connecté sans identité refusé.
  v_r := pg_temp.liste(v_ca, v_c1, 'count(*)', 'anon');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'anon n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.liste(v_ca, v_c1, 'count(*)', 'service_role');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'service_role n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.liste(NULL, v_c1);
  IF v_r IS DISTINCT FROM 'ERR:42501:Connexion requise' THEN RAISE EXCEPTION 'sans identité : % au lieu de Connexion requise', v_r; END IF;
  RAISE NOTICE 'OK : anon et service_role refusés (42501), rôle connecté sans identité refusé';

  -- 7. La liste n'ouvre aucune lecture directe au consultant.
  v_r := pg_temp.comme(v_ca, 'authenticated', 'select count(*)::text from app.participations');
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'le consultant lit % participation(s) directement', v_r; END IF;
  v_r := pg_temp.comme(v_ca, 'authenticated', 'select count(*)::text from app.results');
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'le consultant lit % résultat(s) directement', v_r; END IF;
  RAISE NOTICE 'OK : le consultant ne lit toujours ni participation ni résultat directement';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
