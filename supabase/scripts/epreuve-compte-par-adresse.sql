-- Épreuve de la migration 0013 (recherche de compte par adresse, retrait d'un
-- compte sans appartenance) sur la base de production, APRÈS l'application de la
-- migration. Tout est annulé : aucune ligne n'est conservée (ROLLBACK final),
-- hormis l'avance des compteurs d'identité du journal, que PostgreSQL ne
-- restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-compte-par-adresse.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est affichée ni créée ni retirée : seuls des comptes
-- jetables en example.test sont créés puis annulés ; la recherche d'une adresse
-- inexistante ne révèle rien. La recherche et le retrait sont appelés sous le
-- rôle réel service_role (celui de la clé secrète de l'application).
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

DO $e$
DECLARE
  v_libre uuid := 'e4000000-0000-4000-8000-000000000001';
  v_lie   uuid := 'e4000000-0000-4000-8000-000000000002';
  v_org   uuid := 'e4000000-0000-4000-8000-00000000000a';
  v_oid1  oid  := to_regprocedure('app.compte_par_adresse(text)');
  v_oid2  oid  := to_regprocedure('app.retirer_compte_sans_appartenance(uuid)');
  v_r     text;
  v_n     integer;
  v_avant integer;
BEGIN
  -- 1. Les deux fonctions de la migration 0013, lues dans le catalogue.
  IF v_oid1 IS NULL OR v_oid2 IS NULL THEN
    RAISE EXCEPTION 'migration 0013 non appliquée : fonction(s) absente(s)';
  END IF;
  IF (SELECT count(*) FROM pg_proc
       WHERE oid IN (v_oid1, v_oid2) AND prosecdef AND proconfig = ARRAY['search_path=""']::text[]
         AND pg_get_userbyid(proowner) = 'tenga_owner') <> 2 THEN
    RAISE EXCEPTION 'attributs inattendus (SECURITY DEFINER, search_path vide, propriétaire tenga_owner)';
  END IF;
  IF NOT (has_function_privilege('service_role', v_oid1, 'EXECUTE') AND has_function_privilege('service_role', v_oid2, 'EXECUTE')) THEN
    RAISE EXCEPTION 'service_role n''exécute pas les deux fonctions';
  END IF;
  IF has_function_privilege('anon', v_oid1, 'EXECUTE') OR has_function_privilege('anon', v_oid2, 'EXECUTE')
     OR has_function_privilege('authenticated', v_oid1, 'EXECUTE') OR has_function_privilege('authenticated', v_oid2, 'EXECUTE')
     OR has_function_privilege('public', v_oid1, 'EXECUTE') OR has_function_privilege('public', v_oid2, 'EXECUTE') THEN
    RAISE EXCEPTION 'une fonction est exécutable par anon, authenticated ou PUBLIC';
  END IF;
  RAISE NOTICE 'OK : deux fonctions SECURITY DEFINER, search_path vide, propriétaire tenga_owner, service_role seul';

  -- 2. La recherche porte le prédicat de l'index partiel d'adresse (pas de parcours de la table).
  IF position('u.is_sso_user = false' IN pg_get_functiondef(v_oid1)) = 0 THEN
    RAISE EXCEPTION 'la recherche ne porte pas le prédicat is_sso_user = false de l''index partiel';
  END IF;
  RAISE NOTICE 'OK : la recherche porte le prédicat de l''index partiel d''adresse';

  -- Données jetables : un compte sans lien, un compte membre d'une organisation.
  INSERT INTO auth.users (id, email) VALUES
    (v_libre, 'epreuve-t14-libre@example.test'),
    (v_lie,   'epreuve-t14-lie@example.test');
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-t14', 'Organisation d''épreuve T14');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES (v_lie, v_org, 'participant');

  -- 3. Recherche : exacte, casse et espaces ignorés, inconnue, piégée.
  v_r := pg_temp.comme('service_role', format('select app.compte_par_adresse(%L)::text', 'epreuve-t14-libre@example.test'));
  IF v_r IS DISTINCT FROM v_libre::text THEN
    RAISE EXCEPTION 'recherche exacte : résultat inattendu %', v_r;
  END IF;
  v_r := pg_temp.comme('service_role', format('select app.compte_par_adresse(%L)::text', '  EPREUVE-T14-Libre@Example.TEST '));
  IF v_r IS DISTINCT FROM v_libre::text THEN
    RAISE EXCEPTION 'recherche casse et espaces : résultat inattendu %', v_r;
  END IF;
  v_r := pg_temp.comme('service_role', format('select app.compte_par_adresse(%L)::text', 'epreuve-t14-inconnu@example.test'));
  IF v_r IS NOT NULL THEN
    RAISE EXCEPTION 'recherche d''une adresse inconnue : % au lieu de NULL', v_r;
  END IF;
  v_r := pg_temp.comme('service_role', format('select app.compte_par_adresse(%L)::text', '''" OR ''1''=''1'));
  IF v_r IS NOT NULL THEN
    RAISE EXCEPTION 'recherche d''une adresse piégée : % au lieu de NULL', v_r;
  END IF;
  RAISE NOTICE 'OK : recherche par adresse (exacte, casse et espaces ignorés, inconnue et piégée : NULL)';

  -- 4. Au-delà de 10 000 comptes : la recherche ne dépend plus d'un parcours de liste.
  SELECT count(*) INTO v_n FROM auth.users;
  RAISE NOTICE 'INFO : % compte(s) en base (le parcours de liste de l''ancienne méthode s''arrêtait à 10 000)', v_n;

  -- 5. anon et authenticated : refusés (42501), service_role seul.
  v_r := pg_temp.comme('anon', format('select app.compte_par_adresse(%L)::text', 'epreuve-t14-libre@example.test'));
  IF v_r NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'anon n''est pas refusé pour la recherche : %', v_r;
  END IF;
  v_r := pg_temp.comme('authenticated', format('select app.compte_par_adresse(%L)::text', 'epreuve-t14-libre@example.test'));
  IF v_r NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'authenticated n''est pas refusé pour la recherche : %', v_r;
  END IF;
  v_r := pg_temp.comme('anon', format('select app.retirer_compte_sans_appartenance(%L)::text', v_libre));
  IF v_r NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'anon n''est pas refusé pour le retrait : %', v_r;
  END IF;
  v_r := pg_temp.comme('authenticated', format('select app.retirer_compte_sans_appartenance(%L)::text', v_libre));
  IF v_r NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'authenticated n''est pas refusé pour le retrait : %', v_r;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_libre) THEN
    RAISE EXCEPTION 'un refus a retiré le compte';
  END IF;
  RAISE NOTICE 'OK : anon et authenticated refusés (42501) pour la recherche et le retrait, aucun compte retiré';

  -- 6. Un compte rattaché est conservé (faux), un compte libre est retiré (vrai).
  v_r := pg_temp.comme('service_role', format('select app.retirer_compte_sans_appartenance(%L)::text', v_lie));
  IF v_r IS DISTINCT FROM 'false' OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_lie) THEN
    RAISE EXCEPTION 'un compte membre n''est pas conservé : %', v_r;
  END IF;
  SELECT count(*) INTO v_avant FROM private.audit_log WHERE action = 'compte.retirer_orphelin';
  v_r := pg_temp.comme('service_role', format('select app.retirer_compte_sans_appartenance(%L)::text', v_libre));
  IF v_r IS DISTINCT FROM 'true' OR EXISTS (SELECT 1 FROM auth.users WHERE id = v_libre) THEN
    RAISE EXCEPTION 'un compte sans appartenance n''est pas retiré : %', v_r;
  END IF;
  IF EXISTS (SELECT 1 FROM app.profiles WHERE user_id = v_libre) THEN
    RAISE EXCEPTION 'le profil n''est pas parti en cascade';
  END IF;
  v_r := pg_temp.comme('service_role', format('select app.retirer_compte_sans_appartenance(%L)::text', v_libre));
  IF v_r IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'le retrait rejoué ne répond pas faux : %', v_r;
  END IF;
  RAISE NOTICE 'OK : compte membre conservé, compte libre retiré (profil en cascade), rejeu faux';

  -- 7. Journal : une seule ligne nouvelle, au nom de l'identifiant, sans adresse.
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'compte.retirer_orphelin';
  IF v_n - v_avant <> 1 THEN
    RAISE EXCEPTION 'journal : % ligne(s) nouvelle(s) au lieu d''une', v_n - v_avant;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.audit_log
                  WHERE action = 'compte.retirer_orphelin' AND acteur = v_libre AND ressource_id = v_libre) THEN
    RAISE EXCEPTION 'journal : la ligne n''est pas au nom de l''identifiant du compte';
  END IF;
  IF EXISTS (SELECT 1 FROM private.audit_log a WHERE to_jsonb(a)::text ~* 'example\.test') THEN
    RAISE EXCEPTION 'journal : une adresse apparaît';
  END IF;
  RAISE NOTICE 'OK : une ligne de journal au nom de l''identifiant, aucune adresse';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
