-- Épreuve de la migration 0014 (plafonds journaliers d'invitations tenus en
-- base) sur la base de production, APRÈS l'application de la migration. Tout
-- est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance
-- des compteurs d'identité de private.plafonds_invitations, que PostgreSQL ne
-- restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-plafonds-invitations.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée : seules des empreintes jetables (condensats
-- de textes d'épreuve) et une organisation fictive sont employées. La fonction est
-- appelée sous le rôle réel service_role (celui de la clé secrète de l'application).
-- Les plafonds employés ici (2 et 3) ne sont pas ceux de l'application (300 et 5,
-- défauts non validés par Amine, transmis par l'application en paramètres).
BEGIN;

-- Appel d'une requête sous un rôle réel : renvoie le résultat en texte ou
-- « ERR:SQLSTATE:message ». Fonction temporaire, détruite avec la transaction.
CREATE FUNCTION pg_temp.comme(p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  EXECUTE p_sql INTO v;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

CREATE FUNCTION pg_temp.conso(p_role text, p_org text, p_dest text, p_max_org text, p_max_dest text, p_fenetre text DEFAULT '86400')
RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_role, format(
    $q$select app.consommer_plafond_invitation(%L::uuid, %L::text, %L::integer, %L::integer, %L::integer)$q$,
    p_org, p_dest, p_max_org, p_max_dest, p_fenetre))
$$;

CREATE FUNCTION pg_temp.d(p_texte text) RETURNS text
LANGUAGE sql AS $$
  SELECT encode(sha256(convert_to('epreuve-t19:' || p_texte, 'UTF8')), 'hex')
$$;

DO $e$
DECLARE
  v_oid   oid  := to_regprocedure('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)');
  v_org1  text := 'e6000000-0000-4000-8000-0000000000a1';
  v_org2  text := 'e6000000-0000-4000-8000-0000000000a2';
  v_r     text;
  v_n     integer;
  v_audit integer;
  v_avant integer;
BEGIN
  -- 1. Fonction et table de la migration 0014, lues dans le catalogue.
  IF v_oid IS NULL OR to_regclass('private.plafonds_invitations') IS NULL THEN
    RAISE EXCEPTION 'migration 0014 non appliquée : fonction ou table absente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc
                  WHERE oid = v_oid AND prosecdef AND proconfig = ARRAY['search_path=""']::text[]
                    AND pg_get_userbyid(proowner) = 'tenga_owner') THEN
    RAISE EXCEPTION 'attributs inattendus (SECURITY DEFINER, search_path vide, propriétaire tenga_owner)';
  END IF;
  IF NOT has_function_privilege('service_role', v_oid, 'EXECUTE')
     OR has_function_privilege('anon', v_oid, 'EXECUTE')
     OR has_function_privilege('authenticated', v_oid, 'EXECUTE')
     OR has_function_privilege('public', v_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'droits d''exécution inattendus (service_role seul attendu)';
  END IF;
  IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = 'private.plafonds_invitations'::regclass) THEN
    RAISE EXCEPTION 'RLS non forcée sur private.plafonds_invitations';
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) r(rol)
              CROSS JOIN unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) pr
             WHERE has_table_privilege(r.rol, 'private.plafonds_invitations', pr)) THEN
    RAISE EXCEPTION 'un rôle de l''API a un droit sur private.plafonds_invitations';
  END IF;
  RAISE NOTICE 'OK : fonction SECURITY DEFINER, search_path vide, tenga_owner, service_role seul ; table à RLS forcée sans droit pour l''API';

  SELECT count(*) INTO v_audit FROM private.audit_log;

  -- 2. Plafond d'organisation (2) : deux acceptés, le troisième refusé sans rien consommer.
  v_r := pg_temp.conso('service_role', v_org1, pg_temp.d('a'), '2', '3');
  IF v_r IS DISTINCT FROM 'accepte' THEN RAISE EXCEPTION 'premier appel : % au lieu de accepte', v_r; END IF;
  v_r := pg_temp.conso('service_role', v_org1, pg_temp.d('b'), '2', '3');
  IF v_r IS DISTINCT FROM 'accepte' THEN RAISE EXCEPTION 'deuxième appel : % au lieu de accepte', v_r; END IF;
  SELECT count(*) INTO v_avant FROM private.plafonds_invitations;
  v_r := pg_temp.conso('service_role', v_org1, pg_temp.d('c'), '2', '3');
  IF v_r IS DISTINCT FROM 'refuse_organisation' THEN RAISE EXCEPTION 'troisième appel : % au lieu de refuse_organisation', v_r; END IF;
  SELECT count(*) INTO v_n FROM private.plafonds_invitations;
  IF v_n <> v_avant THEN RAISE EXCEPTION 'un refus d''organisation a consommé % ligne(s)', v_n - v_avant; END IF;
  RAISE NOTICE 'OK : plafond d''organisation tenu, le refus ne consomme rien';

  -- 3. Plafond de destinataire (3) toutes organisations confondues.
  v_r := pg_temp.conso('service_role', v_org2, pg_temp.d('a'), '10', '3');
  IF v_r IS DISTINCT FROM 'accepte' THEN RAISE EXCEPTION 'destinataire, 2e événement : % au lieu de accepte', v_r; END IF;
  v_r := pg_temp.conso('service_role', v_org2, pg_temp.d('a'), '10', '3');
  IF v_r IS DISTINCT FROM 'accepte' THEN RAISE EXCEPTION 'destinataire, 3e événement : % au lieu de accepte', v_r; END IF;
  SELECT count(*) INTO v_avant FROM private.plafonds_invitations;
  v_r := pg_temp.conso('service_role', v_org2, pg_temp.d('a'), '10', '3');
  IF v_r IS DISTINCT FROM 'refuse_destinataire' THEN RAISE EXCEPTION 'destinataire, 4e événement : % au lieu de refuse_destinataire', v_r; END IF;
  SELECT count(*) INTO v_n FROM private.plafonds_invitations;
  IF v_n <> v_avant THEN RAISE EXCEPTION 'un refus de destinataire a consommé % ligne(s)', v_n - v_avant; END IF;
  RAISE NOTICE 'OK : plafond de destinataire tenu entre organisations, le refus ne consomme rien';

  -- 4. Fenêtre glissante et purge.
  UPDATE private.plafonds_invitations SET cree_le = now() - interval '25 hours'
   WHERE portee = 'organisation'
     AND cle = extensions.hmac(convert_to('plafond-invitation:organisation:' || v_org1, 'UTF8'),
                               (SELECT s.cle_hmac_code FROM private.settings s), 'sha256');
  v_r := pg_temp.conso('service_role', v_org1, pg_temp.d('d'), '2', '3');
  IF v_r IS DISTINCT FROM 'accepte' THEN RAISE EXCEPTION 'fenêtre : % au lieu de accepte après 25 heures', v_r; END IF;
  INSERT INTO private.plafonds_invitations (portee, cle, cree_le)
    VALUES ('organisation', sha256('epreuve-t19-ancien'), now() - interval '49 hours');
  v_r := pg_temp.conso('service_role', v_org2, pg_temp.d('z'), '10', '3');
  IF EXISTS (SELECT 1 FROM private.plafonds_invitations WHERE cree_le < now() - interval '48 hours') THEN
    RAISE EXCEPTION 'la purge n''a pas retiré les événements de plus de 48 heures';
  END IF;
  RAISE NOTICE 'OK : fenêtre glissante respectée, événements de plus de 48 heures purgés';

  -- 5. Paramètres invalides : 22023, rien d'écrit.
  SELECT count(*) INTO v_avant FROM private.plafonds_invitations;
  FOR v_r IN
    SELECT pg_temp.conso('service_role', o, e, mo, md, f)
      FROM (VALUES
        (NULL, pg_temp.d('i'), '2', '3', '86400'),
        (v_org1, NULL, '2', '3', '86400'),
        (v_org1, 'adresse@example.test', '2', '3', '86400'),
        (v_org1, pg_temp.d('i'), '0', '3', '86400'),
        (v_org1, pg_temp.d('i'), '2', '100001', '86400'),
        (v_org1, pg_temp.d('i'), '2', '3', '59'),
        (v_org1, pg_temp.d('i'), '2', '3', '172801')
      ) AS t(o, e, mo, md, f)
  LOOP
    IF v_r NOT LIKE 'ERR:22023:%' THEN
      RAISE EXCEPTION 'paramètre invalide non refusé : %', v_r;
    END IF;
  END LOOP;
  SELECT count(*) INTO v_n FROM private.plafonds_invitations;
  IF v_n <> v_avant THEN RAISE EXCEPTION 'un paramètre invalide a écrit % ligne(s)', v_n - v_avant; END IF;
  RAISE NOTICE 'OK : paramètres invalides refusés (22023), rien d''écrit';

  -- 6. anon, authenticated : refusés (42501) ; service_role ne lit pas la table.
  v_r := pg_temp.conso('anon', v_org1, pg_temp.d('j'), '2', '3');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'anon n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.conso('authenticated', v_org1, pg_temp.d('j'), '2', '3');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'authenticated n''est pas refusé : %', v_r; END IF;
  v_r := pg_temp.comme('service_role', 'select count(*)::text from private.plafonds_invitations');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'service_role lit la table directement : %', v_r; END IF;
  RAISE NOTICE 'OK : anon et authenticated refusés (42501), la table n''est pas lisible par l''API';

  -- 7. Aucune empreinte reçue ni identifiant d'organisation en clair, aucune ligne de journal.
  IF EXISTS (SELECT 1 FROM private.plafonds_invitations p
              WHERE p.cle = decode(pg_temp.d('a'), 'hex') OR to_jsonb(p)::text LIKE '%' || pg_temp.d('a') || '%'
                 OR to_jsonb(p)::text LIKE '%' || v_org1 || '%') THEN
    RAISE EXCEPTION 'une empreinte reçue ou un identifiant d''organisation apparaît en clair dans la table';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log;
  IF v_n <> v_audit THEN RAISE EXCEPTION 'le journal a reçu % ligne(s)', v_n - v_audit; END IF;
  RAISE NOTICE 'OK : aucune empreinte ni organisation en clair, aucune ligne de journal';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
