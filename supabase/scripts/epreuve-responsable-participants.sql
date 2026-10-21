-- Épreuve de la migration 0012 (le responsable n'attribue plus que participant,
-- décision I2) sur la base de production, APRÈS l'application de la migration.
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance
-- des compteurs d'identité du journal, que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-responsable-participants.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est affichée ni créée : seuls une organisation et des
-- comptes jetables sont créés ; le super administrateur réel n'agit que sur eux.
BEGIN;

-- Attribution par un appelant donné : 'ok' ou « SQLSTATE:message ». Fonction
-- temporaire, détruite avec la transaction.
CREATE FUNCTION pg_temp.tente(p_uid uuid, p_cible uuid, p_org uuid, p_role text) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM app.attribuer_role(p_cible, p_org, p_role);
  RESET ROLE;
  RETURN 'ok';
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN SQLSTATE || ':' || SQLERRM;
END
$$;

DO $e$
DECLARE
  v_admin uuid := (SELECT user_id FROM private.tenga_admins ORDER BY ajoute_le, user_id LIMIT 1);
  v_org   uuid := 'e2000000-0000-4000-8000-00000000000a';
  v_resp  uuid := 'e2000000-0000-4000-8000-000000000001';
  v_cons  uuid := 'e2000000-0000-4000-8000-000000000002';
  v_part  uuid := 'e2000000-0000-4000-8000-000000000003';
  v_cible uuid := 'e2000000-0000-4000-8000-000000000004';
  v_cible2 uuid := 'e2000000-0000-4000-8000-000000000005';
  v_oid   oid  := to_regprocedure('private.peut_attribuer(uuid,text)');
  v_def   text;
  v_refus constant text := '42501:Réservé à un administrateur Tenga ou au responsable de l''organisation';
  v_r     text;
  v_role  text;
  v_n     integer;
BEGIN
  IF v_admin IS NULL THEN
    RAISE EXCEPTION 'aucun super administrateur en base : épreuve impossible';
  END IF;

  -- 1. La règle posée par la migration 0012, lue dans le catalogue.
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'private.peut_attribuer(uuid,text) n''existe pas';
  END IF;
  v_def := pg_get_functiondef(v_oid);
  IF position('p_role = ''participant''' IN v_def) = 0 OR position('''consultant''' IN v_def) > 0 THEN
    RAISE EXCEPTION 'la règle n''est pas celle de la migration 0012 (participant seul) : migration non appliquée ? %', v_def;
  END IF;
  IF (SELECT proconfig FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM ARRAY['search_path=""']::text[] THEN
    RAISE EXCEPTION 'search_path n''est pas vide : %', (SELECT proconfig FROM pg_proc WHERE oid = v_oid);
  END IF;
  IF (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid) <> 'tenga_owner' THEN
    RAISE EXCEPTION 'propriétaire inattendu : %', (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid);
  END IF;
  IF has_schema_privilege('authenticated', 'private', 'USAGE') OR has_schema_privilege('anon', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'le schéma private est ouvert à l''API';
  END IF;
  RAISE NOTICE 'OK : private.peut_attribuer ne nomme que participant pour le responsable, search_path vide, propriétaire tenga_owner, schéma private fermé à l''API';

  -- Données jetables : une organisation, un responsable, un consultant, un
  -- participant, deux cibles sans rôle.
  INSERT INTO auth.users (id, email) VALUES
    (v_resp,   'epreuve-i2-resp@example.test'),
    (v_cons,   'epreuve-i2-cons@example.test'),
    (v_part,   'epreuve-i2-part@example.test'),
    (v_cible,  'epreuve-i2-cible@example.test'),
    (v_cible2, 'epreuve-i2-cible2@example.test');
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-i2', 'Organisation d''épreuve I2');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES
    (v_resp, v_org, 'responsable'),
    (v_cons, v_org, 'consultant'),
    (v_part, v_org, 'participant');

  -- 2. Le responsable : consultant et responsable refusés (42501), rien n'est écrit.
  v_r := pg_temp.tente(v_resp, v_cible, v_org, 'consultant');
  IF v_r <> v_refus THEN
    RAISE EXCEPTION 'le responsable a pu nommer un consultant, ou message inattendu : %', v_r;
  END IF;
  v_r := pg_temp.tente(v_resp, v_cible, v_org, 'responsable');
  IF v_r <> v_refus THEN
    RAISE EXCEPTION 'le responsable a pu nommer un responsable, ou message inattendu : %', v_r;
  END IF;
  IF EXISTS (SELECT 1 FROM app.memberships WHERE user_id = v_cible) THEN
    RAISE EXCEPTION 'un refus a laissé une appartenance';
  END IF;
  RAISE NOTICE 'OK : le responsable est refusé (42501) pour consultant et pour responsable, sans rien écrire';

  -- 3. Le responsable : participant accepté, puis promotion refusée.
  v_r := pg_temp.tente(v_resp, v_cible, v_org, 'participant');
  IF v_r <> 'ok' THEN
    RAISE EXCEPTION 'le responsable n''a pas pu nommer un participant : %', v_r;
  END IF;
  v_r := pg_temp.tente(v_resp, v_cible, v_org, 'consultant');
  IF v_r <> v_refus THEN
    RAISE EXCEPTION 'le responsable a pu promouvoir un participant consultant : %', v_r;
  END IF;
  SELECT role INTO v_role FROM app.memberships WHERE user_id = v_cible AND organization_id = v_org;
  IF v_role IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'le rôle de la cible devrait être participant, obtenu %', v_role;
  END IF;
  RAISE NOTICE 'OK : le responsable nomme participant, ne le promeut pas';

  -- 4. Le responsable peut retirer un pouvoir : consultant vers participant.
  v_r := pg_temp.tente(v_resp, v_cons, v_org, 'participant');
  IF v_r <> 'ok' THEN
    RAISE EXCEPTION 'le responsable n''a pas pu rétrograder un consultant : %', v_r;
  END IF;
  UPDATE app.memberships SET role = 'consultant' WHERE user_id = v_cons AND organization_id = v_org;
  RAISE NOTICE 'OK : le responsable rétrograde un consultant en participant (retrait de pouvoir permis)';

  -- 5. Aucune nomination de consultant n'est journalisée au nom du responsable.
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE acteur = v_resp AND action IN ('role.attribuer.consultant', 'role.attribuer.responsable');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'journal : % nomination(s) de consultant ou responsable au nom du responsable', v_n;
  END IF;
  RAISE NOTICE 'OK : les refus ne laissent aucune trace de nomination';

  -- 6. Consultant et participant : refusés pour les trois rôles.
  FOREACH v_role IN ARRAY ARRAY['participant', 'consultant', 'responsable'] LOOP
    v_r := pg_temp.tente(v_cons, v_cible2, v_org, v_role);
    IF v_r <> v_refus THEN
      RAISE EXCEPTION 'un consultant a pu nommer % ou message inattendu : %', v_role, v_r;
    END IF;
    v_r := pg_temp.tente(v_part, v_cible2, v_org, v_role);
    IF v_r <> v_refus THEN
      RAISE EXCEPTION 'un participant a pu nommer % ou message inattendu : %', v_role, v_r;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM app.memberships WHERE user_id = v_cible2) THEN
    RAISE EXCEPTION 'un refus a laissé une appartenance';
  END IF;
  RAISE NOTICE 'OK : consultant et participant refusés pour participant, consultant et responsable';

  -- 7. Le super administrateur réel garde les trois rôles (sur les seuls comptes jetables).
  FOREACH v_role IN ARRAY ARRAY['consultant', 'responsable', 'participant'] LOOP
    v_r := pg_temp.tente(v_admin, v_cible2, v_org, v_role);
    IF v_r <> 'ok' THEN
      RAISE EXCEPTION 'le super administrateur n''a pas pu nommer % : %', v_role, v_r;
    END IF;
    SELECT role INTO v_r FROM app.memberships WHERE user_id = v_cible2 AND organization_id = v_org;
    IF v_r IS DISTINCT FROM v_role THEN
      RAISE EXCEPTION 'rôle posé % au lieu de %', v_r, v_role;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK : le super administrateur nomme consultant, responsable puis participant';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
