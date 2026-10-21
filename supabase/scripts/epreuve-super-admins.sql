-- Épreuve de la migration 0009 sur la base de production, AVANT toute décision.
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final).
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-super-admins.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
BEGIN;

DO $e$
DECLARE
  v_admin uuid := (SELECT user_id FROM private.tenga_admins ORDER BY ajoute_le LIMIT 1);
  v_cible uuid := 'e0000000-0000-4000-8000-000000000001';
  v_banni uuid := 'e0000000-0000-4000-8000-000000000002';
  v_autre uuid := 'e0000000-0000-4000-8000-000000000003';
  v_res   text;
  v_def   text;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'aucun super administrateur en base : épreuve impossible';
  END IF;

  -- 1. Règles : liées à l'appelant, rôle tenga_owner seul.
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'private' AND tablename = 'tenga_admins'
        AND roles = ARRAY['tenga_owner']::name[]
        AND policyname IN ('tenga_admins_insertion_owner', 'tenga_admins_suppression_owner', 'tenga_admins_verrou_owner', 'tenga_admins_lecture_owner')) <> 4 THEN
    RAISE EXCEPTION 'les quatre règles de private.tenga_admins ne sont pas toutes présentes sous tenga_owner';
  END IF;
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'private' AND tablename = 'tenga_admins'
        AND coalesce(qual, '') || coalesce(with_check, '') ~ 'suis_admin_tenga') <> 3 THEN
    RAISE EXCEPTION 'insertion, suppression et verrou doivent appeler suis_admin_tenga()';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'private' AND tablename = 'tenga_admins'
               AND (qual = 'true' OR with_check = 'true') AND cmd <> 'SELECT') THEN
    RAISE EXCEPTION 'une règle d''écriture reste ouverte (true)';
  END IF;
  RAISE NOTICE 'OK : règles liées à l''appelant';

  -- 2. auth.uid() reste l'identité de l'appelant : sa définition est lue, non supposée.
  v_def := pg_get_functiondef('auth.uid()'::regprocedure);
  IF v_def !~ 'request\.jwt\.claim' THEN
    RAISE EXCEPTION 'auth.uid() ne lit pas les réglages request.jwt.* : définition inattendue : %', v_def;
  END IF;
  RAISE NOTICE 'OK : auth.uid() lit request.jwt.* (réglage de session, inchangé par SECURITY DEFINER)';

  INSERT INTO auth.users (id, email) VALUES (v_cible, 'epreuve-cible@example.test'), (v_autre, 'epreuve-autre@example.test');
  INSERT INTO auth.users (id, email, banned_until) VALUES (v_banni, 'epreuve-banni@example.test', now() + interval '1 day');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);

  -- 3. Ajout par le super administrateur réel, puis verrou posé sur sa ligne.
  SET LOCAL ROLE authenticated;
  v_res := app.ajouter_admin_tenga(v_cible)::text;
  RESET ROLE;
  IF v_res <> 'true' THEN RAISE EXCEPTION 'ajout attendu true, obtenu %', v_res; END IF;
  IF (SELECT xmax::text FROM private.tenga_admins WHERE user_id = v_admin) = '0' THEN
    RAISE EXCEPTION 'la ligne de l''appelant n''est pas verrouillée (FOR SHARE sans effet : règle UPDATE manquante ?)';
  END IF;
  RAISE NOTICE 'OK : ajout par le super administrateur réel, ligne de l''appelant verrouillée';

  -- 4. Compte banni refusé.
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM app.ajouter_admin_tenga(v_banni);
    RESET ROLE;
    RAISE EXCEPTION 'le compte banni a été accepté';
  EXCEPTION WHEN SQLSTATE '22023' THEN
    RESET ROLE;
    RAISE NOTICE 'OK : compte banni refusé (22023)';
  END;

  -- 5. Écriture directe sous tenga_owner par une identité qui n'est pas super administrateur : refusée.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_autre, 'role', 'authenticated')::text, true);
  BEGIN
    SET LOCAL ROLE tenga_owner;
    INSERT INTO private.tenga_admins (user_id) VALUES (v_autre);
    RESET ROLE;
    RAISE EXCEPTION 'insertion directe acceptée pour un non-administrateur';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK : INSERT sous tenga_owner refusé pour un non-administrateur';
  END;

  -- 6. Retrait par le super administrateur réel, journal inscrit.
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  v_res := app.retirer_admin_tenga(v_cible)::text;
  RESET ROLE;
  IF v_res <> 'true' THEN RAISE EXCEPTION 'retrait attendu true, obtenu %', v_res; END IF;
  IF (SELECT count(*) FROM private.audit_log WHERE action IN ('admin.ajouter', 'admin.retirer')
        AND acteur = v_admin AND ressource_id = v_cible AND cree_le >= now() - interval '1 minute') <> 2 THEN
    RAISE EXCEPTION 'journal : deux lignes attendues (ajout et retrait)';
  END IF;
  RAISE NOTICE 'OK : retrait par le super administrateur réel, ajout et retrait journalisés';

  -- 7. Retrait de soi-même refusé ; le dernier administrateur n'est jamais touché.
  BEGIN
    SET LOCAL ROLE authenticated;
    PERFORM app.retirer_admin_tenga(v_admin);
    RESET ROLE;
    RAISE EXCEPTION 'auto-retrait accepté';
  EXCEPTION WHEN insufficient_privilege THEN
    RESET ROLE;
    RAISE NOTICE 'OK : auto-retrait refusé (42501)';
  END;

  IF (SELECT count(*) FROM private.tenga_admins WHERE user_id = v_admin) <> 1 THEN
    RAISE EXCEPTION 'le super administrateur réel a disparu';
  END IF;
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
