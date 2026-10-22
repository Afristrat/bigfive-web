-- Épreuve de la migration 0018 (mot de passe et TOTP des administrateurs Tenga)
-- sur la base de production. Tout est annulé : aucune ligne n'est conservée
-- (ROLLBACK final), hormis l'avance des compteurs d'identité (journal,
-- private.echecs_mdp), que PostgreSQL ne restitue jamais.
--
-- Deux usages :
--
--   1. APRÈS l'application de la migration (comme les autres épreuves) :
--        docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-mot-de-passe-administrateur.sql
--      Sur une base SANS la migration, l'épreuve s'arrête en rouge dès l'étape 1
--      (« app.mdp_tentative(text) n'existe pas »).
--
--   2. AVANT l'application, migration jouée DANS la transaction annulée, sous
--      tenga_owner comme le fait migrate.sh :
--        docker cp ../migrations/0018_mot_de_passe_administrateur.sql tenga-sb-db:/tmp/0018.sql
--        docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 -v migration=/tmp/0018.sql < epreuve-mot-de-passe-administrateur.sql
--        docker exec tenga-sb-db rm /tmp/0018.sql
--      Le contrôle final vérifie alors que les tables de la migration n'existent
--      plus après le ROLLBACK.
--
-- Lecture attendue : des lignes NOTICE « OK : ... », « EPREUVE VERTE », puis
-- « OK : aucun résidu ». Toute erreur arrête le script (ON_ERROR_STOP) : la
-- transaction est alors annulée.
-- Aucune adresse réelle n'est affichée, créée ni modifiée : seuls des comptes
-- jetables en example.test sont créés, promus administrateurs dans la
-- transaction, puis annulés. Les administrateurs réels ne sont ni lus ni
-- appelés. Deux manipulations directes, en superutilisateur, simulent le temps
-- qui passe (now() est figé dans une transaction) : l'échéance d'un blocage et
-- un verrouillage posé par un essai antérieur ; elles sont signalées sur place.
BEGIN;

\if :{?migration}
SET LOCAL ROLE tenga_owner;
\i :migration
RESET ROLE;
\endif

-- Requête sous un rôle réel (anon, authenticated, service_role), avec un
-- utilisateur (sub) facultatif : renvoie le résultat en texte, « NULL », ou
-- « ERR:SQLSTATE:message ». Fonction temporaire, détruite avec la transaction.
CREATE FUNCTION pg_temp.comme(p_role text, p_sub uuid, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_sub IS NULL THEN json_build_object('role', p_role)
         ELSE json_build_object('sub', p_sub, 'role', p_role) END::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  EXECUTE p_sql INTO v;
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN COALESCE(v, 'NULL');
EXCEPTION WHEN others THEN
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '', true);
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

-- Un essai de mot de passe tel que le fait l'application (clé secrète,
-- service_role) : « admin|etat|tentative » (tentative « - » si aucune).
CREATE FUNCTION pg_temp.essai(p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme('service_role', NULL, format(
    'SELECT format(''%%s|%%s|%%s'', admin::text, etat, COALESCE(tentative::text, ''-'')) FROM app.mdp_tentative(%L)',
    p_email))
$$;

DO $e$
DECLARE
  v_a     uuid := 'e5000000-0000-4000-8000-000000000001';  -- administrateur dont on éprouve le mot de passe
  v_b     uuid := 'e5000000-0000-4000-8000-000000000002';  -- autre administrateur, qui déverrouille
  v_r     uuid := 'e5000000-0000-4000-8000-000000000003';  -- responsable d'organisation
  v_p     uuid := 'e5000000-0000-4000-8000-000000000004';  -- participant
  v_org   uuid := 'e5000000-0000-4000-8000-00000000000a';
  v_mail_a constant text := 'epreuve-mdp-a@example.test';
  v_fn    text;
  v_oid   oid;
  v_role  text;
  v_r1    text;
  v_t     bigint[] := '{}';
  v_t5    bigint;
  v_t6    bigint;
  v_n     integer;
  v_etat  private.etat_mdp;
  v_i     integer;
  v_refus constant text := 'ERR:42501:Interdit';
  -- La fonction renvoie void : l'appel est enveloppé pour obtenir « ok ».
  v_deverrouille constant text := 'SELECT ''ok'' FROM (SELECT app.deverrouiller_mot_de_passe(%L)) AS appel';
BEGIN
  -- 1. Catalogue : fonctions, propriétaire, search_path, tables en RLS forcée.
  FOREACH v_fn IN ARRAY ARRAY[
    'app.mdp_tentative(text)', 'app.mdp_rembourser(bigint)', 'app.mdp_succes(uuid,bigint)',
    'app.deverrouiller_mot_de_passe(uuid)', 'app.mdp_comptes_a_surveiller()',
    'private.peut_deverrouiller(uuid)'] LOOP
    v_oid := to_regprocedure(v_fn);
    IF v_oid IS NULL THEN
      RAISE EXCEPTION '% n''existe pas : migration 0018 non appliquée ?', v_fn;
    END IF;
    IF (SELECT proconfig FROM pg_proc WHERE oid = v_oid) IS DISTINCT FROM ARRAY['search_path=""']::text[] THEN
      RAISE EXCEPTION '% : search_path n''est pas vide (%)', v_fn, (SELECT proconfig FROM pg_proc WHERE oid = v_oid);
    END IF;
    IF (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid) <> 'tenga_owner' THEN
      RAISE EXCEPTION '% : propriétaire inattendu (%)', v_fn, (SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid = v_oid);
    END IF;
    IF v_fn LIKE 'app.%' AND NOT (SELECT prosecdef FROM pg_proc WHERE oid = v_oid) THEN
      RAISE EXCEPTION '% n''est pas SECURITY DEFINER', v_fn;
    END IF;
  END LOOP;
  FOREACH v_fn IN ARRAY ARRAY['private.echecs_mdp', 'private.etat_mdp'] LOOP
    IF to_regclass(v_fn) IS NULL THEN
      RAISE EXCEPTION 'table % absente', v_fn;
    END IF;
    IF NOT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid = to_regclass(v_fn)) THEN
      RAISE EXCEPTION 'table % sans RLS forcée', v_fn;
    END IF;
  END LOOP;
  IF position('private.echecs_mdp' IN pg_get_functiondef('private.purger_quotidien()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'private.purger_quotidien ne purge pas private.echecs_mdp';
  END IF;
  IF has_schema_privilege('authenticated', 'private', 'USAGE') OR has_schema_privilege('anon', 'private', 'USAGE')
     OR has_schema_privilege('service_role', 'private', 'USAGE') THEN
    RAISE EXCEPTION 'le schéma private est ouvert à l''API';
  END IF;
  RAISE NOTICE 'OK : six fonctions présentes, search_path vide, propriétaire tenga_owner, SECURITY DEFINER ; tables en RLS forcée ; purge étendue ; schéma private fermé';

  -- 2. Droits d'exécution et de lecture des trois rôles de l'API.
  FOREACH v_fn IN ARRAY ARRAY['app.mdp_tentative(text)', 'app.mdp_rembourser(bigint)', 'app.mdp_succes(uuid,bigint)'] LOOP
    IF NOT has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role ne peut pas exécuter %', v_fn;
    END IF;
    IF has_function_privilege('anon', v_fn, 'EXECUTE') OR has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION '% est exécutable par anon ou authenticated', v_fn;
    END IF;
  END LOOP;
  FOREACH v_fn IN ARRAY ARRAY['app.deverrouiller_mot_de_passe(uuid)', 'app.mdp_comptes_a_surveiller()'] LOOP
    IF NOT has_function_privilege('authenticated', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated ne peut pas exécuter %', v_fn;
    END IF;
    IF has_function_privilege('anon', v_fn, 'EXECUTE') OR has_function_privilege('service_role', v_fn, 'EXECUTE') THEN
      RAISE EXCEPTION '% est exécutable par anon ou service_role', v_fn;
    END IF;
  END LOOP;
  FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF has_function_privilege(v_role, 'private.peut_deverrouiller(uuid)', 'EXECUTE') THEN
      RAISE EXCEPTION '% peut exécuter private.peut_deverrouiller', v_role;
    END IF;
    IF has_table_privilege(v_role, 'private.echecs_mdp', 'SELECT,INSERT,UPDATE,DELETE')
       OR has_table_privilege(v_role, 'private.etat_mdp', 'SELECT,INSERT,UPDATE,DELETE') THEN
      RAISE EXCEPTION '% a un droit sur les compteurs de mot de passe', v_role;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK : tentative, remboursement et succès réservés à service_role ; déverrouillage et liste réservés à authenticated ; aucun droit sur les tables ni sur private.peut_deverrouiller';

  -- Comptes jetables : deux administrateurs, un responsable, un participant ;
  -- l'administrateur A est aussi participant de l'organisation du responsable (I4).
  INSERT INTO auth.users (id, email) VALUES
    (v_a, v_mail_a),
    (v_b, 'epreuve-mdp-b@example.test'),
    (v_r, 'epreuve-mdp-r@example.test'),
    (v_p, 'epreuve-mdp-p@example.test');
  INSERT INTO private.tenga_admins (user_id) VALUES (v_a), (v_b);
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-mdp', 'Organisation d''épreuve mot de passe');
  INSERT INTO app.memberships (user_id, organization_id, role) VALUES
    (v_r, v_org, 'responsable'),
    (v_p, v_org, 'participant'),
    (v_a, v_org, 'participant');

  -- 3. Refus à l'exécution des fonctions du serveur pour authenticated et anon.
  FOREACH v_fn IN ARRAY ARRAY[
    format('SELECT app.mdp_tentative(%L)::text', v_mail_a),
    'SELECT app.mdp_rembourser(1)::text',
    format('SELECT app.mdp_succes(%L, 1)::text', v_a)] LOOP
    IF pg_temp.comme('authenticated', v_a, v_fn) NOT LIKE 'ERR:42501:%'
       OR pg_temp.comme('anon', NULL, v_fn) NOT LIKE 'ERR:42501:%' THEN
      RAISE EXCEPTION 'appel permis hors service_role : %', v_fn;
    END IF;
  END LOOP;
  RAISE NOTICE 'OK : authenticated et anon sont refusés (42501) sur tentative, remboursement et succès';

  -- 4. Adresse qui n'est pas administrateur, ou inconnue : « faux libre », rien n'est écrit.
  v_r1 := pg_temp.essai('epreuve-mdp-r@example.test');
  IF v_r1 <> 'false|libre|-' THEN
    RAISE EXCEPTION 'responsable : réponse inattendue %', v_r1;
  END IF;
  v_r1 := pg_temp.essai('epreuve-mdp-inconnue@example.test');
  IF v_r1 <> 'false|libre|-' THEN
    RAISE EXCEPTION 'adresse inconnue : réponse inattendue %', v_r1;
  END IF;
  IF EXISTS (SELECT 1 FROM private.echecs_mdp WHERE user_id IN (v_r, v_p)) THEN
    RAISE EXCEPTION 'un essai sur une adresse non administrateur a été compté';
  END IF;
  RAISE NOTICE 'OK : une adresse non administrateur ou inconnue reçoit « faux libre » sans rien écrire';

  -- 5. Blocage au 5e échec : quatre essais admis sans blocage, le 5e est admis
  --    et bloque les suivants ; l'essai suivant est refusé sans débit.
  FOR i IN 1..5 LOOP
    -- Adresse avec casse et espaces : la fonction la normalise.
    v_r1 := pg_temp.essai(CASE WHEN i = 1 THEN '  EPREUVE-MDP-A@example.test ' ELSE v_mail_a END);
    IF split_part(v_r1, '|', 1) <> 'true' OR split_part(v_r1, '|', 2) <> 'libre' OR split_part(v_r1, '|', 3) = '-' THEN
      RAISE EXCEPTION 'essai % refusé ou sans identifiant : %', i, v_r1;
    END IF;
    v_t := v_t || split_part(v_r1, '|', 3)::bigint;
    IF i < 5 AND EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a) THEN
      RAISE EXCEPTION 'blocage posé dès l''essai %', i;
    END IF;
  END LOOP;
  v_t5 := v_t[5];
  SELECT * INTO v_etat FROM private.etat_mdp WHERE user_id = v_a;
  IF NOT FOUND OR v_etat.bloque_jusqu IS DISTINCT FROM now() + interval '30 minutes'
     OR v_etat.verrouille_le IS NOT NULL OR v_etat.cause IS DISTINCT FROM v_t5 THEN
    RAISE EXCEPTION 'pas de blocage de 30 minutes causé par le 5e essai : %', row_to_json(v_etat);
  END IF;
  v_r1 := pg_temp.essai(v_mail_a);
  IF v_r1 <> 'true|temporaire|-' THEN
    RAISE EXCEPTION 'essai pendant le blocage : réponse inattendue %', v_r1;
  END IF;
  SELECT count(*) INTO v_n FROM private.echecs_mdp WHERE user_id = v_a;
  IF v_n <> 5 THEN
    RAISE EXCEPTION 'un essai refusé pendant le blocage a été débité (% échecs)', v_n;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.audit_log WHERE action = 'connexion.mdp.blocage' AND ressource_id = v_a) THEN
    RAISE EXCEPTION 'blocage non journalisé';
  END IF;
  RAISE NOTICE 'OK : le 5e échec bloque 30 minutes, l''essai suivant est refusé sans débit, blocage journalisé';

  -- 6. Remboursement : le mot de passe juste du 5e essai retire son débit et le
  --    blocage qu'il a causé ; un second remboursement est refusé.
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_rembourser(%s)::text', v_t5)) <> 'true' THEN
    RAISE EXCEPTION 'remboursement du 5e essai refusé';
  END IF;
  IF EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a) THEN
    RAISE EXCEPTION 'le remboursement n''a pas levé le blocage qu''il avait causé';
  END IF;
  SELECT count(*) INTO v_n FROM private.echecs_mdp WHERE user_id = v_a;
  IF v_n <> 4 THEN
    RAISE EXCEPTION 'après remboursement : % échecs au lieu de 4', v_n;
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_rembourser(%s)::text', v_t5)) <> 'false' THEN
    RAISE EXCEPTION 'un essai déjà remboursé a été remboursé deux fois';
  END IF;
  RAISE NOTICE 'OK : mdp_rembourser retire le débit et le blocage de son essai, une seule fois';

  -- 7. Succès seulement pour le dernier essai admis du compte.
  v_r1 := pg_temp.essai(v_mail_a);  -- 5e échec à nouveau : bloque, cause = cet essai
  v_t6 := split_part(v_r1, '|', 3)::bigint;
  IF split_part(v_r1, '|', 2) <> 'libre' OR v_t6 IS NULL THEN
    RAISE EXCEPTION 'nouvel essai non admis : %', v_r1;
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, %s)::text', v_a, v_t[1])) <> 'false' THEN
    RAISE EXCEPTION 'mdp_succes accepté pour un essai qui n''est pas le dernier';
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, %s)::text', v_b, v_t6)) <> 'false' THEN
    RAISE EXCEPTION 'mdp_succes accepté pour l''essai d''un autre compte';
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, %s)::text', v_r, v_t6)) <> 'false' THEN
    RAISE EXCEPTION 'mdp_succes accepté pour un compte non administrateur';
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, NULL)::text', v_a)) <> 'false' THEN
    RAISE EXCEPTION 'mdp_succes accepté sans essai';
  END IF;
  SELECT count(*) INTO v_n FROM private.echecs_mdp WHERE user_id = v_a;
  IF v_n <> 5 OR NOT EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a) THEN
    RAISE EXCEPTION 'un succès refusé a effacé des compteurs (% échecs)', v_n;
  END IF;
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, %s)::text', v_a, v_t6)) <> 'true' THEN
    RAISE EXCEPTION 'mdp_succes refusé pour le dernier essai admis';
  END IF;
  IF EXISTS (SELECT 1 FROM private.echecs_mdp WHERE user_id = v_a) OR EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a) THEN
    RAISE EXCEPTION 'la connexion réussie n''a pas remis les compteurs à zéro';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.audit_log WHERE action = 'connexion.reussie' AND ressource_id = v_a) THEN
    RAISE EXCEPTION 'connexion réussie non journalisée';
  END IF;
  RAISE NOTICE 'OK : mdp_succes refusé pour un essai ancien, un autre compte, un non administrateur ou sans essai ; accepté pour le dernier essai admis, compteurs remis à zéro';

  -- 8. Un verrouillage posé par un AUTRE essai ne s'efface pas par une connexion.
  --    Manipulation directe (superutilisateur) : verrouillage sans cause.
  v_r1 := pg_temp.essai(v_mail_a);
  INSERT INTO private.etat_mdp (user_id, verrouille_le, cause) VALUES (v_a, now(), NULL);
  IF pg_temp.comme('service_role', NULL, format('SELECT app.mdp_succes(%L, %s)::text', v_a, split_part(v_r1, '|', 3))) <> 'false' THEN
    RAISE EXCEPTION 'une connexion a levé un verrouillage antérieur';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a AND verrouille_le IS NOT NULL) THEN
    RAISE EXCEPTION 'le verrouillage antérieur a disparu';
  END IF;
  DELETE FROM private.etat_mdp WHERE user_id = v_a;
  DELETE FROM private.echecs_mdp WHERE user_id = v_a;
  RAISE NOTICE 'OK : mdp_succes ne lève jamais un verrouillage posé par un autre essai';

  -- 9. Verrouillage au 6e échec dans les 24 heures. Cinq échecs bloquent ;
  --    manipulation directe : le blocage est déclaré échu (le temps est figé
  --    dans la transaction) ; le 6e échec verrouille, l'essai suivant est refusé.
  FOR i IN 1..5 LOOP
    v_r1 := pg_temp.essai(v_mail_a);
    IF split_part(v_r1, '|', 2) <> 'libre' THEN
      RAISE EXCEPTION 'essai % non admis : %', i, v_r1;
    END IF;
  END LOOP;
  UPDATE private.etat_mdp SET bloque_jusqu = now() - interval '1 second' WHERE user_id = v_a;
  v_r1 := pg_temp.essai(v_mail_a);
  IF split_part(v_r1, '|', 2) <> 'libre' OR split_part(v_r1, '|', 3) = '-' THEN
    RAISE EXCEPTION '6e essai non admis après l''échéance du blocage : %', v_r1;
  END IF;
  SELECT * INTO v_etat FROM private.etat_mdp WHERE user_id = v_a;
  IF NOT FOUND OR v_etat.verrouille_le IS NULL OR v_etat.cause IS DISTINCT FROM split_part(v_r1, '|', 3)::bigint THEN
    RAISE EXCEPTION 'pas de verrouillage au 6e échec : %', row_to_json(v_etat);
  END IF;
  v_r1 := pg_temp.essai(v_mail_a);
  IF v_r1 <> 'true|definitif|-' THEN
    RAISE EXCEPTION 'essai pendant le verrouillage : réponse inattendue %', v_r1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.audit_log WHERE action = 'connexion.mdp.verrouillage' AND ressource_id = v_a) THEN
    RAISE EXCEPTION 'verrouillage non journalisé';
  END IF;
  RAISE NOTICE 'OK : le 6e échec en 24 heures verrouille, l''essai suivant est refusé (definitif), verrouillage journalisé';

  -- 10. Liste des comptes à surveiller : l'autre administrateur voit A ; A ne se
  --     voit pas ; responsable et participant n'obtiennent aucune ligne ; anon et
  --     service_role sont refusés.
  v_r1 := pg_temp.comme('authenticated', v_b, format(
    'SELECT string_agg(etat, '','') FROM app.mdp_comptes_a_surveiller() WHERE utilisateur = %L', v_a));
  IF v_r1 <> 'definitif' THEN
    RAISE EXCEPTION 'l''autre administrateur ne voit pas A verrouillé : %', v_r1;
  END IF;
  -- A est administrateur : il peut voir d'autres comptes réels, on ne compte
  -- que les comptes de l'épreuve ; responsable et participant : aucune ligne du tout.
  v_r1 := pg_temp.comme('authenticated', v_a,
    'SELECT count(*)::text FROM app.mdp_comptes_a_surveiller() WHERE utilisateur::text LIKE ''e5000000-%''');
  IF v_r1 <> '0' THEN
    RAISE EXCEPTION 'A voit son propre compte dans la liste : %', v_r1;
  END IF;
  FOR v_i IN 1..2 LOOP
    v_r1 := pg_temp.comme('authenticated', (ARRAY[v_r, v_p])[v_i],
      'SELECT count(*)::text FROM app.mdp_comptes_a_surveiller()');
    IF v_r1 <> '0' THEN
      RAISE EXCEPTION 'la liste n''est pas vide pour % : %', (ARRAY['le responsable', 'le participant'])[v_i], v_r1;
    END IF;
  END LOOP;
  IF pg_temp.comme('anon', NULL, 'SELECT count(*)::text FROM app.mdp_comptes_a_surveiller()') NOT LIKE 'ERR:42501:%'
     OR pg_temp.comme('service_role', NULL, 'SELECT count(*)::text FROM app.mdp_comptes_a_surveiller()') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'la liste est lisible par anon ou service_role';
  END IF;
  RAISE NOTICE 'OK : liste visible du seul autre administrateur ; vide pour soi, le responsable et le participant ; refusée à anon et service_role';

  -- 11. Déverrouillage : refusé au responsable (même organisation que A), au
  --     participant, à A lui-même, à anon et sans cible ; accepté à B.
  FOR v_i IN 1..3 LOOP
    v_r1 := pg_temp.comme('authenticated', (ARRAY[v_r, v_p, v_a])[v_i], format(v_deverrouille, v_a));
    IF v_r1 <> v_refus THEN
      RAISE EXCEPTION 'déverrouillage par % : réponse inattendue %', (ARRAY['le responsable', 'le participant', 'A lui-même'])[v_i], v_r1;
    END IF;
  END LOOP;
  IF pg_temp.comme('anon', NULL, format(v_deverrouille, v_a)) NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'déverrouillage permis à anon';
  END IF;
  IF pg_temp.comme('authenticated', v_b, format(v_deverrouille, NULL)) <> v_refus THEN
    RAISE EXCEPTION 'déverrouillage sans cible non refusé';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a AND verrouille_le IS NOT NULL) THEN
    RAISE EXCEPTION 'un refus a levé le verrouillage';
  END IF;
  IF EXISTS (SELECT 1 FROM private.audit_log WHERE action = 'connexion.mdp.deverrouillage' AND ressource_id = v_a) THEN
    RAISE EXCEPTION 'un refus a été journalisé comme déverrouillage';
  END IF;
  v_r1 := pg_temp.comme('authenticated', v_b, format(v_deverrouille, v_a));
  IF v_r1 <> 'ok' THEN
    RAISE EXCEPTION 'déverrouillage par l''autre administrateur refusé : %', v_r1;
  END IF;
  IF EXISTS (SELECT 1 FROM private.etat_mdp WHERE user_id = v_a) OR EXISTS (SELECT 1 FROM private.echecs_mdp WHERE user_id = v_a) THEN
    RAISE EXCEPTION 'le déverrouillage a laissé des compteurs';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.audit_log WHERE action = 'connexion.mdp.deverrouillage' AND acteur = v_b AND ressource_id = v_a) THEN
    RAISE EXCEPTION 'déverrouillage non journalisé au nom de son auteur';
  END IF;
  v_r1 := pg_temp.essai(v_mail_a);
  IF split_part(v_r1, '|', 2) <> 'libre' OR split_part(v_r1, '|', 3) = '-' THEN
    RAISE EXCEPTION 'après déverrouillage, essai non admis : %', v_r1;
  END IF;
  RAISE NOTICE 'OK : déverrouillage refusé (42501) au responsable, au participant, à soi-même, à anon et sans cible ; accepté à un autre administrateur Tenga, journalisé, essais de nouveau admis';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;

-- Contrôle de non-résidu, hors transaction.
\if :{?migration}
DO $r$
BEGIN
  IF to_regclass('private.echecs_mdp') IS NOT NULL OR to_regprocedure('app.mdp_tentative(text)') IS NOT NULL THEN
    RAISE EXCEPTION 'RÉSIDU : la migration jouée dans l''épreuve est restée en base';
  END IF;
END
$r$;
\endif
DO $r$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email LIKE 'epreuve-mdp-%@example.test')
     OR EXISTS (SELECT 1 FROM app.organizations WHERE slug = 'epreuve-mdp')
     OR EXISTS (SELECT 1 FROM private.tenga_admins WHERE user_id::text LIKE 'e5000000-%')
     OR EXISTS (SELECT 1 FROM private.audit_log WHERE ressource_id::text LIKE 'e5000000-%' OR acteur::text LIKE 'e5000000-%') THEN
    RAISE EXCEPTION 'RÉSIDU : des comptes, une organisation ou des lignes de journal de l''épreuve sont restés';
  END IF;
  RAISE NOTICE 'OK : aucun résidu';
END
$r$;
