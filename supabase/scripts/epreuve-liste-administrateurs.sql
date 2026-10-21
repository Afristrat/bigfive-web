-- Épreuve de la migration 0010 (app.lister_administrateurs_tenga) sur la base de
-- production, APRÈS l'application de la migration. Tout est annulé : aucune ligne
-- n'est conservée (ROLLBACK final), hormis l'avance des compteurs d'identité du
-- journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-liste-administrateurs.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse n'est affichée : seuls des comptes jetables sont créés.
BEGIN;

DO $e$
DECLARE
  v_admin   uuid := (SELECT user_id FROM private.tenga_admins ORDER BY ajoute_le, user_id LIMIT 1);
  v_simple  uuid := 'e1000000-0000-4000-8000-000000000001';
  v_oid     oid  := to_regprocedure('app.lister_administrateurs_tenga()');
  v_n       integer;
  v_nmoi    integer;
  v_j0      integer;
  v_cols    text;
  v_ordre   text;
  v_ordre_a text;
  v_moi     text;
  v_adresse text;
  v_msg     text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'aucun super administrateur en base : épreuve impossible';
  END IF;

  -- 1. La fonction existe, avec les droits attendus (lus dans le catalogue).
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'app.lister_administrateurs_tenga() n''existe pas : migration 0010 non appliquée ?';
  END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_oid) THEN
    RAISE EXCEPTION 'la fonction n''est pas SECURITY DEFINER';
  END IF;
  IF (SELECT proconfig FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM ARRAY['search_path=""']::text[] THEN
    RAISE EXCEPTION 'search_path n''est pas vide : %', (SELECT proconfig FROM pg_proc WHERE oid = v_oid);
  END IF;
  IF (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid) <> 'tenga_owner' THEN
    RAISE EXCEPTION 'propriétaire inattendu : %', (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid);
  END IF;
  IF has_function_privilege('anon', v_oid, 'EXECUTE')
     OR has_function_privilege('public', v_oid, 'EXECUTE')
     OR has_function_privilege('service_role', v_oid, 'EXECUTE')
     OR NOT has_function_privilege('authenticated', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'droits d''exécution inattendus (attendu : authenticated seul)';
  END IF;
  RAISE NOTICE 'OK : fonction SECURITY DEFINER, search_path vide, propriétaire tenga_owner, exécutable par authenticated seul';

  INSERT INTO auth.users (id, email) VALUES (v_simple, 'epreuve-liste-simple@example.test');
  SELECT count(*) INTO v_j0 FROM private.audit_log WHERE action = 'admin.lister';

  -- 2. Le super administrateur réel liste : toutes les lignes, une seule est_moi.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*), count(*) FILTER (WHERE x.est_moi), string_agg(x.user_id::text, ',') FILTER (WHERE x.est_moi)
    INTO v_n, v_nmoi, v_moi
    FROM app.lister_administrateurs_tenga() x;
  RESET ROLE;
  IF v_n <> (SELECT count(*) FROM private.tenga_admins) THEN
    RAISE EXCEPTION 'nombre de lignes : % rendues pour % super administrateurs', v_n, (SELECT count(*) FROM private.tenga_admins);
  END IF;
  IF v_nmoi <> 1 OR v_moi <> v_admin::text THEN
    RAISE EXCEPTION 'est_moi doit désigner une seule ligne, celle de l''appelant';
  END IF;
  RAISE NOTICE 'OK : % ligne(s) rendue(s), est_moi vrai pour la seule ligne de l''appelant', v_n;

  -- 3. Colonnes exactement prévues, ordre par date d'ajout, adresse lue dans auth.users.
  SET LOCAL ROLE authenticated;
  SELECT (SELECT string_agg(k, ',' ORDER BY k) FROM jsonb_object_keys(to_jsonb(t)) k)
    INTO v_cols FROM app.lister_administrateurs_tenga() t LIMIT 1;
  SELECT string_agg(x.user_id::text, ',') INTO v_ordre FROM app.lister_administrateurs_tenga() x;
  SELECT x.adresse INTO v_adresse FROM app.lister_administrateurs_tenga() x WHERE x.est_moi;
  RESET ROLE;
  IF v_cols <> 'adresse,ajoute_le,est_moi,user_id' THEN
    RAISE EXCEPTION 'colonnes inattendues : %', v_cols;
  END IF;
  SELECT string_agg(a.user_id::text, ',' ORDER BY a.ajoute_le, a.user_id) INTO v_ordre_a FROM private.tenga_admins a;
  IF v_ordre IS DISTINCT FROM v_ordre_a THEN
    RAISE EXCEPTION 'ordre inattendu : la liste n''est pas triée par date d''ajout';
  END IF;
  IF v_adresse IS DISTINCT FROM (SELECT u.email::text FROM auth.users u WHERE u.id = v_admin) THEN
    RAISE EXCEPTION 'l''adresse rendue n''est pas celle du compte de l''appelant';
  END IF;
  RAISE NOTICE 'OK : colonnes adresse, ajoute_le, est_moi, user_id ; triée par date d''ajout ; adresse lue dans auth.users';

  -- 4. Journal : quatre consultations réussies depuis le début (une à l'étape 2,
  -- trois à l'étape 3), avec l'acteur réel et la quantité, sans adresse.
  IF (SELECT count(*) FROM private.audit_log WHERE action = 'admin.lister') - v_j0 <> 4 THEN
    RAISE EXCEPTION 'journal : quatre consultations attendues, obtenu %',
      (SELECT count(*) FROM private.audit_log WHERE action = 'admin.lister') - v_j0;
  END IF;
  IF EXISTS (SELECT 1 FROM private.audit_log l WHERE l.action = 'admin.lister' AND l.acteur = v_admin
               AND l.cree_le >= now()
               AND (to_jsonb(l)::text ~ '@' OR l.quantite IS DISTINCT FROM v_n)) THEN
    RAISE EXCEPTION 'journal : une ligne contient une adresse ou une quantité inattendue';
  END IF;
  RAISE NOTICE 'OK : consultations journalisées avec l''acteur réel et la quantité, sans adresse';

  -- 5. Refus : compte sans rôle d'administrateur (42501).
  v_j0 := (SELECT count(*) FROM private.audit_log WHERE action = 'admin.lister');
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_simple, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM count(*) FROM app.lister_administrateurs_tenga();
    RESET ROLE;
    RAISE EXCEPTION 'un compte sans rôle a pu lister';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    RESET ROLE;
    IF v_msg <> 'Réservé aux administrateurs Tenga' THEN
      RAISE EXCEPTION 'message inattendu : %', v_msg;
    END IF;
    RAISE NOTICE 'OK : compte sans rôle refusé (42501)';
  END;

  -- 6. Refus : identité nulle.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', NULL, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM count(*) FROM app.lister_administrateurs_tenga();
    RESET ROLE;
    RAISE EXCEPTION 'une identité nulle a pu lister';
  EXCEPTION WHEN insufficient_privilege THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    RESET ROLE;
    IF v_msg <> 'Connexion requise' THEN
      RAISE EXCEPTION 'message inattendu : %', v_msg;
    END IF;
    RAISE NOTICE 'OK : identité nulle refusée (Connexion requise)';
  END;

  -- 7. Refus : service_role et anon, même sous l'identité d'un super administrateur.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'service_role')::text, true);
  BEGIN
    SET LOCAL ROLE service_role;
    PERFORM count(*) FROM app.lister_administrateurs_tenga();
    RESET ROLE;
    RAISE EXCEPTION 'service_role a pu lister';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK : service_role refusé (droit d''exécution)';
  END;
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'anon')::text, true);
  BEGIN
    SET LOCAL ROLE anon;
    PERFORM count(*) FROM app.lister_administrateurs_tenga();
    RESET ROLE;
    RAISE EXCEPTION 'anon a pu lister';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK : anon refusé (droit d''exécution)';
  END;
  IF (SELECT count(*) FROM private.audit_log WHERE action = 'admin.lister') <> v_j0 THEN
    RAISE EXCEPTION 'un refus a inscrit une consultation au journal';
  END IF;
  RAISE NOTICE 'OK : aucun refus n''est journalisé comme consultation';

  -- 8. La lecture n'a rien écrit dans private.tenga_admins.
  IF (SELECT count(*) FROM private.tenga_admins) <> v_n THEN
    RAISE EXCEPTION 'private.tenga_admins a changé pendant la lecture';
  END IF;
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
