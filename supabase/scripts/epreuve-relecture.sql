-- Épreuve de la migration 0022 (atelier de relecture de la bibliothèque :
-- private.relecteurs_bibliotheque, app.relectures_blocs, app.suis_relecteur, app.relire_bloc,
-- app.historique_relecture, app.etat_relecture_blocs, app.frequence_facettes,
-- app.designer_relecteur, app.retirer_relecteur, app.lister_relecteurs, conservation par
-- private.purger_historique_relecture appelée par private.purger_quotidien) sur la base de
-- production, AVANT puis APRÈS l'application de la migration. Décisions d'Amine éprouvées :
-- historique filtré en base (un relecteur désigné ne lit que ses verdicts, sans identité),
-- conservation de 30 jours (verdict courant conservé et anonymisé, le reste effacé, déclencheur
-- qui ne laisse passer que la purge), plafonds de 200 verdicts et de 5 désignations par heure. Avant : elle doit sortir ROUGE
-- avec « migration 0022 non appliquée ». Après : « EPREUVE VERTE ».
-- Tout est annulé : aucune ligne n'est conservée (ROLLBACK final), hormis l'avance des
-- compteurs d'identité (journal, ordre des verdicts), que PostgreSQL ne restitue jamais.
--
--   docker exec -i tenga-sb-db psql -U supabase_admin -d postgres -X -v ON_ERROR_STOP=1 < epreuve-relecture.sql
--
-- Lecture attendue : des lignes NOTICE « OK : ... » et, à la fin, « EPREUVE VERTE ».
-- Toute erreur arrête le script (ON_ERROR_STOP) : la transaction est alors annulée.
-- Aucune adresse réelle n'est utilisée ni affichée : seuls des comptes, une organisation, une
-- campagne, des participations, des résultats, des verdicts et des désignations jetables sont
-- créés. Les appels se font sous le rôle réel authenticated (ou service_role) avec un jeton
-- simulé (sub, role), comme l'API. Les comptages portent sur les seuls identifiants et
-- empreintes jetables (la production contient des données réelles). Le seuil d'anonymat est
-- relevé le temps de l'épreuve (annulé avec elle) pour éprouver la fréquence quel que soit le
-- nombre de résultats réels.
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

CREATE FUNCTION pg_temp.relire(p_uid uuid, p_bloc text, p_emp text, p_verdict text, p_com text DEFAULT NULL,
                               p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.relire_bloc(%L, %L, %L, %L)::text', p_bloc, p_emp, p_verdict, p_com))
$$;

-- Scores jetables : trente facettes de score p_s, format tenga-scores-1.
CREATE FUNCTION pg_temp.sc(p_s integer) RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1')
         || (SELECT jsonb_object_agg(d, jsonb_build_object('score', p_s * 6, 'count', 24, 'facettes',
                     (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', p_s, 'count', 4))
                        FROM generate_series(1, 6) f)))
               FROM unnest(ARRAY['N', 'E', 'O', 'A', 'C']) d)
$$;

DO $e$
DECLARE
  v_ad    uuid := 'e9220000-0000-4000-8000-000000000001';
  v_rl    uuid := 'e9220000-0000-4000-8000-000000000002';
  v_nx    uuid := 'e9220000-0000-4000-8000-000000000003';
  v_bn    uuid := 'e9220000-0000-4000-8000-000000000004';
  v_faux  uuid := 'e9220000-0000-4000-8000-0000000000ff';
  v_org   uuid := 'e9220000-0000-4000-8000-0000000000a1';
  v_camp  uuid := 'e9220000-0000-4000-8000-0000000000c1';
  v_e1    constant text := repeat('e9', 31) || 'e1';
  v_e2    constant text := repeat('e9', 31) || 'e2';
  v_e3    constant text := repeat('e9', 31) || 'e3';
  v_q     uuid[] := ARRAY['e9220000-0000-4000-8000-000000000031', 'e9220000-0000-4000-8000-000000000032',
                          'e9220000-0000-4000-8000-000000000033', 'e9220000-0000-4000-8000-000000000034']::uuid[];
  v_plafond_v   constant text := 'ERR:PT429:Plafond de verdicts atteint';
  v_plafond_d   constant text := 'ERR:PT429:Plafond de désignations atteint';
  v_refus_rel   constant text := 'ERR:42501:Réservé aux relecteurs de la bibliothèque';
  v_refus_admin constant text := 'ERR:42501:Réservé aux administrateurs Tenga';
  v_invalide    constant text := 'ERR:22023:Relecture invalide : bloc, empreinte, verdict ou commentaire';
  v_ajout_seul  constant text := 'Historique de relecture en ajout seul';
  v_uuid_re     constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  v_etat        constant text := 'select string_agg(x.bloc || ''|'' || right(x.empreinte, 2) || ''|'' || x.verdict, '','' order by x.bloc, x.empreinte) from app.etat_relecture_blocs() x where x.empreinte like repeat(''e9'', 31) || ''%''';
  v_r     text;
  v_id    text;
  v_n     integer;
  v_reel  integer;
  v_base  integer;
  v_seuil integer;
  v_k     integer;
  v_cas   record;
BEGIN
  -- 1. La migration est appliquée : deux tables, huit fonctions.
  IF to_regclass('app.relectures_blocs') IS NULL OR to_regclass('private.relecteurs_bibliotheque') IS NULL THEN
    RAISE EXCEPTION 'migration 0022 non appliquée : app.relectures_blocs ou private.relecteurs_bibliotheque n''existe pas';
  END IF;
  IF to_regprocedure('app.suis_relecteur()') IS NULL OR to_regprocedure('app.relire_bloc(text, text, text, text)') IS NULL
     OR to_regprocedure('app.historique_relecture()') IS NULL OR to_regprocedure('app.etat_relecture_blocs()') IS NULL
     OR to_regprocedure('app.frequence_facettes()') IS NULL OR to_regprocedure('app.designer_relecteur(uuid)') IS NULL
     OR to_regprocedure('app.retirer_relecteur(uuid)') IS NULL OR to_regprocedure('app.lister_relecteurs()') IS NULL THEN
    RAISE EXCEPTION 'migration 0022 non appliquée : une des huit fonctions de relecture manque';
  END IF;
  IF to_regprocedure('private.purger_historique_relecture()') IS NULL OR to_regprocedure('private.duree_historique_relecture()') IS NULL
     OR position('PERFORM private.purger_historique_relecture();' IN pg_get_functiondef('private.purger_quotidien()'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'migration 0022 non appliquée : purge de l''historique de relecture absente ou non appelée par la purge quotidienne';
  END IF;

  -- 2. Structure et droits, lus dans le catalogue.
  IF NOT (SELECT bool_and(c.relrowsecurity AND c.relforcerowsecurity AND c.relowner = 'tenga_owner'::regrole AND c.relkind = 'r')
            FROM pg_class c WHERE c.oid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)) THEN
    RAISE EXCEPTION 'tables de relecture : RLS non activée et forcée, ou propriétaire différent de tenga_owner';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
              WHERE c.oid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)
                AND (has_any_column_privilege(r.rol, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                     OR has_table_privilege(r.rol, c.oid, 'DELETE') OR has_table_privilege(r.rol, c.oid, 'TRUNCATE')
                     OR has_table_privilege(r.rol, c.oid, 'TRIGGER'))) THEN
    RAISE EXCEPTION 'un rôle de l''API a un droit sur une table de relecture (attendu : aucun)';
  END IF;
  SELECT string_agg(tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','), E'\n' ORDER BY tablename, policyname) INTO v_r
    FROM pg_policies WHERE tablename IN ('relectures_blocs', 'relecteurs_bibliotheque');
  IF v_r IS DISTINCT FROM E'relecteurs_bibliotheque|relecteurs_insertion_owner|INSERT|tenga_owner\nrelecteurs_bibliotheque|relecteurs_lecture_owner|SELECT|tenga_owner\nrelecteurs_bibliotheque|relecteurs_suppression_owner|DELETE|tenga_owner\nrelectures_blocs|relectures_blocs_insertion_owner|INSERT|tenga_owner\nrelectures_blocs|relectures_blocs_lecture_owner|SELECT|tenga_owner\nrelectures_blocs|relectures_blocs_modification_owner|UPDATE|tenga_owner\nrelectures_blocs|relectures_blocs_suppression_owner|DELETE|tenga_owner' THEN
    RAISE EXCEPTION 'règles inattendues sur les tables de relecture : %', v_r;
  END IF;
  SELECT count(*) INTO v_n FROM pg_trigger t
   WHERE t.tgrelid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)
     AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
     AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) <> 0) OR (t.tgtype & 32) = 32);
  IF v_n <> 4 THEN RAISE EXCEPTION 'refuser_ecriture_api actif % fois au lieu de 4 (deux tables, ligne et vidage)', v_n; END IF;
  SELECT count(*) INTO v_n FROM pg_trigger t WHERE t.tgrelid = 'app.relectures_blocs'::regclass
     AND t.tgname IN ('relectures_blocs_transition', 'relectures_blocs_vidage_interdit') AND t.tgenabled = 'O';
  IF v_n <> 2 THEN
    RAISE EXCEPTION 'déclencheur relectures_blocs_transition ou relectures_blocs_vidage_interdit absent ou inactif';
  END IF;
  IF pg_get_function_result('app.designer_relecteur(uuid)'::regprocedure) IS DISTINCT FROM 'TABLE(ajoute boolean, langue text)'
     OR (SELECT p.prosecdef AND p.proconfig = ARRAY['search_path=""']::text[] AND p.proowner = 'tenga_owner'::regrole
                AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
                AND NOT has_function_privilege('service_role', p.oid, 'EXECUTE')
                AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
           FROM pg_proc p WHERE p.oid = 'private.purger_historique_relecture()'::regprocedure) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'désignation sans langue rendue, ou purge de l''historique mal protégée';
  END IF;
  IF private.duree_historique_relecture() <> interval '30 days' THEN
    RAISE EXCEPTION 'conservation de l''historique de relecture : % au lieu de 30 jours', private.duree_historique_relecture();
  END IF;
  SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                    || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                    || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                    || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text, E'\n' ORDER BY p.proname) INTO v_r
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'app' AND p.proname IN ('suis_relecteur', 'relire_bloc', 'historique_relecture', 'etat_relecture_blocs',
                                              'frequence_facettes', 'designer_relecteur', 'retirer_relecteur', 'lister_relecteurs');
  IF v_r IS DISTINCT FROM E'designer_relecteur|true|v|true|tenga_owner|false|false|false|true\netat_relecture_blocs|true|s|true|tenga_owner|false|false|true|false\nfrequence_facettes|true|s|true|tenga_owner|false|false|false|true\nhistorique_relecture|true|v|true|tenga_owner|false|false|false|true\nlister_relecteurs|true|v|true|tenga_owner|false|false|false|true\nrelire_bloc|true|v|true|tenga_owner|false|false|false|true\nretirer_relecteur|true|v|true|tenga_owner|false|false|false|true\nsuis_relecteur|true|s|true|tenga_owner|false|false|false|true' THEN
    RAISE EXCEPTION 'attributs ou droits inattendus des fonctions de relecture : %', v_r;
  END IF;
  RAISE NOTICE 'OK : migration 0022 appliquée ; tables fermées à l''API (RLS forcée, règles tenga_owner, déclencheurs de ligne et de vidage), huit fonctions SECURITY DEFINER, search_path vide, tenga_owner, authenticated seul sauf l''état servi (service_role seul) ; purge de l''historique (30 jours) appelée par la purge quotidienne, fermée à l''API';

  -- Données jetables.
  INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
    (v_ad, 'epreuve-0022-ad@example.test', '{}'), (v_rl, 'epreuve-0022-rl@example.test', '{"nom": "Relectrice d''épreuve"}'),
    (v_nx, 'epreuve-0022-nx@example.test', '{}'), (v_bn, 'epreuve-0022-bn@example.test', '{}');
  UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = v_bn;
  INSERT INTO private.tenga_admins (user_id) VALUES (v_ad);
  INSERT INTO auth.users (id, email, raw_user_meta_data)
    SELECT v_q[i], 'epreuve-0022-q' || i || '@example.test', CASE WHEN i = 1 THEN '{"langue": "ar"}' ELSE '{}' END::jsonb
      FROM generate_series(1, 4) i;

  -- 3. Accès direct fermé à l'API, même à l'administrateur.
  v_r := pg_temp.comme(v_ad, 'authenticated', 'select count(*)::text from app.relectures_blocs');
  IF v_r IS DISTINCT FROM 'ERR:42501:permission denied for table relectures_blocs' THEN
    RAISE EXCEPTION 'lecture directe de app.relectures_blocs par l''administrateur : %', v_r;
  END IF;
  IF pg_temp.comme(v_ad, 'service_role', 'select count(*)::text from app.relectures_blocs') NOT LIKE 'ERR:42501:%'
     OR pg_temp.comme(v_ad, 'authenticated', 'select count(*)::text from private.relecteurs_bibliotheque') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'le serveur lit l''historique, ou l''administrateur lit la liste des relecteurs, directement';
  END IF;
  RAISE NOTICE 'OK : ni le rôle connecté ni le serveur ne lisent les tables de relecture directement';

  -- 4. Désigner : super administrateur seul ; compte inconnu, nul ou suspendu refusé ; rejouable.
  FOR v_cas IN SELECT * FROM (VALUES
      ('personne sans rôle', v_nx, v_rl, v_refus_admin),
      ('soi-même', v_rl, v_rl, v_refus_admin),
      ('compte inconnu', v_ad, v_faux, 'ERR:22023:Compte inconnu'),
      ('compte nul', v_ad, NULL::uuid, 'ERR:22023:Compte inconnu'),
      ('compte suspendu', v_ad, v_bn, 'ERR:22023:Compte suspendu')) AS t(nom, uid, cible, attendu)
  LOOP
    v_r := pg_temp.comme(v_cas.uid, 'authenticated', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_cas.cible));
    IF v_r IS DISTINCT FROM v_cas.attendu THEN RAISE EXCEPTION 'désignation, cas « % » : % au lieu de %', v_cas.nom, v_r, v_cas.attendu; END IF;
  END LOOP;
  IF pg_temp.comme(v_ad, 'anon', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_rl)) NOT LIKE 'ERR:42501:%'
     OR pg_temp.comme(v_ad, 'service_role', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_rl)) NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'anon ou service_role peut désigner un relecteur';
  END IF;
  IF pg_temp.comme(v_rl, 'authenticated', 'select app.suis_relecteur()::text') IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'un compte non désigné est relecteur';
  END IF;
  IF pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text || ''|'' || x.langue from app.designer_relecteur(%L) x', v_rl)) IS DISTINCT FROM 'true|fr'
     OR pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_rl)) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'désignation : vrai (langue du compte fr) puis faux attendus';
  END IF;
  IF pg_temp.comme(v_rl, 'authenticated', 'select app.suis_relecteur()::text') IS DISTINCT FROM 'true'
     OR pg_temp.comme(v_ad, 'authenticated', 'select app.suis_relecteur()::text') IS DISTINCT FROM 'true'
     OR pg_temp.comme(v_nx, 'authenticated', 'select app.suis_relecteur()::text') IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'suis_relecteur : relectrice et administrateur vrais, personne sans rôle faux';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'relecture.designer' AND ressource_id IN (v_rl, v_nx, v_bn, v_faux);
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal de désignation : % ligne(s) au lieu de 1', v_n; END IF;
  v_r := pg_temp.comme(v_ad, 'authenticated', format('select count(*)::text from app.lister_relecteurs() x where x.user_id = %L and x.adresse = %L', v_rl, 'epreuve-0022-rl@example.test'));
  IF v_r IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'la liste des relecteurs ne rend pas la relectrice et son adresse : %', v_r; END IF;
  IF pg_temp.comme(v_rl, 'authenticated', 'select count(*)::text from app.lister_relecteurs()') IS DISTINCT FROM v_refus_admin THEN
    RAISE EXCEPTION 'une relectrice lit la liste des relecteurs';
  END IF;
  RAISE NOTICE 'OK : seul le super administrateur désigne et liste ; compte inconnu, nul, suspendu refusés ; rejouer ne fait rien ; une ligne de journal';

  -- 5. Rendre un verdict : refus, entrées invalides, rien d'écrit.
  IF pg_temp.relire(v_nx, 'N1/bas', v_e1, 'relu') IS DISTINCT FROM v_refus_rel
     OR pg_temp.relire(NULL, 'N1/bas', v_e1, 'relu') IS DISTINCT FROM 'ERR:42501:Connexion requise'
     OR pg_temp.relire(v_rl, 'N1/bas', v_e1, 'relu', NULL, 'anon') NOT LIKE 'ERR:42501:%'
     OR pg_temp.relire(v_rl, 'N1/bas', v_e1, 'relu', NULL, 'service_role') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'une personne sans rôle, sans identité, l''anonyme ou le serveur rend un verdict';
  END IF;
  FOR v_cas IN SELECT * FROM (VALUES
      ('bloc nul', NULL, v_e1, 'relu', NULL), ('facette 7', 'N7/bas', v_e1, 'relu', NULL),
      ('niveau inconnu', 'N1/moyen', v_e1, 'relu', NULL), ('empreinte courte', 'N1/bas', left(v_e1, 63), 'relu', NULL),
      ('empreinte majuscule', 'N1/bas', upper(v_e1), 'relu', NULL), ('verdict inconnu', 'N1/bas', v_e1, 'valide', NULL),
      ('correction sans commentaire', 'N1/bas', v_e1, 'a_corriger', E' \n '),
      ('commentaire trop long', 'N1/bas', v_e1, 'relu', repeat('x', 2001))) AS t(nom, bloc, emp, verdict, com)
  LOOP
    v_r := pg_temp.relire(v_rl, v_cas.bloc, v_cas.emp, v_cas.verdict, v_cas.com);
    IF v_r IS DISTINCT FROM v_invalide THEN RAISE EXCEPTION 'verdict invalide, cas « % » : % au lieu du refus', v_cas.nom, v_r; END IF;
  END LOOP;
  SELECT count(*) INTO v_n FROM app.relectures_blocs WHERE relecteur IN (v_ad, v_rl, v_nx);
  IF v_n <> 0 THEN RAISE EXCEPTION 'un refus a écrit % verdict(s)', v_n; END IF;
  RAISE NOTICE 'OK : verdict refusé (personne sans rôle, sans identité, anon, service_role) ; huit entrées invalides : 22023, un seul message ; rien d''écrit';

  -- 6. Verdicts, rejeu, journal, état servi.
  v_id := pg_temp.relire(v_rl, 'N1/bas', v_e1, 'relu');
  IF v_id !~ v_uuid_re THEN RAISE EXCEPTION 'verdict de la relectrice : %', v_id; END IF;
  IF pg_temp.relire(v_rl, 'N1/bas', v_e1, 'relu') IS DISTINCT FROM v_id THEN
    RAISE EXCEPTION 'un verdict rejoué n''a pas rendu la ligne existante';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action = 'relecture.relu' AND cree_le = now() AND acteur IS NULL AND ressource_type = 'relecture' AND ressource_id IS NULL;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal du verdict : % ligne(s) sans auteur ni identifiant au lieu de 1', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log
   WHERE action ~ '^relecture\.(relu|a_corriger)$' AND cree_le = now() AND (acteur IS NOT NULL OR ressource_id IS NOT NULL);
  IF v_n <> 0 THEN RAISE EXCEPTION 'un verdict est inscrit au journal avec son auteur ou son identifiant'; END IF;
  v_r := pg_temp.relire(v_ad, 'N1/bas', v_e1, 'a_corriger', E'  Tournure à revoir.\n');
  IF v_r !~ v_uuid_re THEN RAISE EXCEPTION 'demande de correction de l''administrateur : %', v_r; END IF;
  IF (SELECT r.commentaire FROM app.relectures_blocs r WHERE r.id = v_r::uuid) IS DISTINCT FROM 'Tournure à revoir.' THEN
    RAISE EXCEPTION 'le commentaire n''est pas rangé sans ses blancs';
  END IF;
  v_r := pg_temp.comme(NULL, 'service_role', v_etat);
  IF v_r IS DISTINCT FROM 'N1/bas|e1|a_corriger' THEN RAISE EXCEPTION 'état servi après la correction : %', v_r; END IF;
  IF pg_temp.relire(v_rl, 'N1/bas', v_e1, 'relu') !~ v_uuid_re OR pg_temp.relire(v_rl, 'N1/bas', v_e2, 'a_corriger', 'Nouveau texte') !~ v_uuid_re THEN
    RAISE EXCEPTION 'verdicts suivants refusés';
  END IF;
  v_r := pg_temp.comme(NULL, 'service_role', v_etat);
  IF v_r IS DISTINCT FROM 'N1/bas|e1|relu,N1/bas|e2|a_corriger' THEN RAISE EXCEPTION 'état servi : % (attendu : dernier verdict par texte)', v_r; END IF;
  IF pg_temp.comme(v_ad, 'authenticated', 'select count(*)::text from app.etat_relecture_blocs()') NOT LIKE 'ERR:42501:%'
     OR pg_temp.comme(v_ad, 'anon', 'select count(*)::text from app.etat_relecture_blocs()') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'l''état servi est ouvert au rôle connecté ou à l''anonyme';
  END IF;
  RAISE NOTICE 'OK : verdicts écrits, rejeu sans écriture, commentaire rangé sans blancs, journal lié ; état servi : dernier verdict par texte, au serveur seul';

  -- 7. Historique filtré en base : tout pour le super administrateur ; pour la relectrice
  --    désignée, ses seuls verdicts, sans nom ni adresse ; journalisé, sans adresse au journal.
  v_r := pg_temp.comme(v_rl, 'authenticated', format('select count(*)::text || ''|'' || count(*) filter (where x.est_moi)::text || ''|'' || count(*) filter (where x.relecteur_nom is not null or x.relecteur_adresse is not null)::text from app.historique_relecture() x where x.empreinte in (%L, %L)', v_e1, v_e2));
  IF v_r IS DISTINCT FROM '3|3|0' THEN
    RAISE EXCEPTION 'historique de la relectrice désignée : % (attendu 3|3|0 : ses trois verdicts, aucune identité)', v_r;
  END IF;
  v_r := pg_temp.comme(v_rl, 'authenticated', format('select count(*)::text from app.historique_relecture() x where x.empreinte = %L and x.commentaire like ''Tournure%%''', v_e1));
  IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'la relectrice désignée lit le verdict de l''administrateur'; END IF;
  v_r := pg_temp.comme(v_ad, 'authenticated', format('select count(*)::text || ''|'' || string_agg(distinct x.est_moi::text || ''/'' || coalesce(x.relecteur_nom, ''-''), '','') from app.historique_relecture() x where x.empreinte in (%L, %L)', v_e1, v_e2));
  IF v_r IS DISTINCT FROM '4|false/Relectrice d''épreuve,true/-' THEN
    RAISE EXCEPTION 'historique du super administrateur : % (attendu : quatre verdicts, nom de profil)', v_r;
  END IF;
  IF pg_temp.comme(v_nx, 'authenticated', 'select count(*)::text from app.historique_relecture()') IS DISTINCT FROM v_refus_rel
     OR pg_temp.comme(v_rl, 'service_role', 'select count(*)::text from app.historique_relecture()') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'historique ouvert à une personne sans rôle ou au serveur';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'relecture.lister' AND acteur IN (v_rl, v_ad);
  IF v_n <> 3 THEN RAISE EXCEPTION 'journal des lectures d''historique : % ligne(s) au lieu de 3', v_n; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log l WHERE l.action ~ '^relecture\.' AND l.acteur IN (v_ad, v_rl, v_nx) AND to_jsonb(l)::text ~ '@';
  IF v_n <> 0 THEN RAISE EXCEPTION 'une ligne de journal de relecture contient une adresse'; END IF;
  v_r := pg_temp.comme(v_rl, 'authenticated', format('select (e -> ''relecture'' ->> ''ajoute_le'' is not null)::text || ''|'' || (select count(*) from jsonb_array_elements(e -> ''relecture'' -> ''verdicts'') x where x ->> ''empreinte'' in (%L, %L))::text || ''|'' || (e::text like ''%%Tournure%%'')::text from app.exporter_mes_donnees() e', v_e1, v_e2));
  IF v_r IS DISTINCT FROM 'true|3|false' THEN
    RAISE EXCEPTION 'export de la relectrice : % (attendu : date de désignation, ses trois verdicts, pas celui de l''administrateur)', v_r;
  END IF;
  RAISE NOTICE 'OK : historique filtré en base (super administrateur : tout, avec le nom ; relectrice désignée : ses seuls verdicts, sans identité), refusé aux autres ; chaque lecture journalisée, sans adresse ; l''export de la relectrice porte ses seuls verdicts';

  -- 8. Historique en ajout seul (écritures directes du superutilisateur de l'épreuve).
  BEGIN
    UPDATE app.relectures_blocs SET verdict = 'relu' WHERE empreinte = v_e2;
    RAISE EXCEPTION 'un verdict a pu être réécrit';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> v_ajout_seul THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  BEGIN
    DELETE FROM app.relectures_blocs WHERE empreinte = v_e2;
    RAISE EXCEPTION 'un verdict a pu être effacé';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> v_ajout_seul THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  BEGIN
    TRUNCATE app.relectures_blocs;
    RAISE EXCEPTION 'l''historique a pu être vidé';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> v_ajout_seul THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  RAISE NOTICE 'OK : un verdict ne se réécrit ni ne s''efface, l''historique ne se vide pas, même par un superutilisateur';

  -- 9. Fréquence : relecteur seul ; rien sous le seuil d'anonymat ; effectif exact au seuil.
  IF pg_temp.comme(v_nx, 'authenticated', 'select count(*)::text from app.frequence_facettes()') IS DISTINCT FROM v_refus_rel
     OR pg_temp.comme(v_rl, 'service_role', 'select count(*)::text from app.frequence_facettes()') NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'fréquence ouverte à une personne sans rôle ou au serveur';
  END IF;
  SELECT count(*) INTO v_reel FROM app.results r WHERE r.scores ->> 'format' = 'tenga-scores-1';
  SELECT count(*) INTO v_base FROM app.results r
   WHERE r.scores ->> 'format' = 'tenga-scores-1' AND jsonb_typeof(r.scores #> '{N,facettes,1,score}') = 'number'
     AND (r.scores #>> '{N,facettes,1,score}')::numeric = 13;
  IF v_reel + 1 <= 100 THEN
    v_seuil := GREATEST(5, v_reel + 1);
    UPDATE private.settings SET seuil_anonymat = v_seuil;
    v_r := pg_temp.comme(v_rl, 'authenticated', 'select count(*)::text from app.frequence_facettes()');
    IF v_r IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'sous le seuil (% résultat(s), seuil %) : % ligne(s) au lieu de 0', v_reel, v_seuil, v_r; END IF;
    v_k := v_seuil - v_reel;
    RAISE NOTICE 'OK : sous le seuil d''anonymat (seuil relevé à % le temps de l''épreuve), aucune ligne', v_seuil;
  ELSE
    v_k := 1;
    RAISE NOTICE 'ATTENTION : plus de 99 résultats réels, le cas « sous le seuil » n''est pas éprouvé ici (il l''est par le test 42)';
  END IF;
  INSERT INTO app.organizations (id, slug, nom) VALUES (v_org, 'epreuve-0022', 'Organisation d''épreuve 0022');
  INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le)
  VALUES (v_camp, v_org, 'Épreuve 0022', 'ouverte', now(), NULL);
  INSERT INTO auth.users (id, email, raw_user_meta_data)
    SELECT ('e9220000-0000-4000-8000-00000000001' || i)::uuid, 'epreuve-0022-p' || i || '@example.test', '{}'
      FROM generate_series(1, v_k) i;
  INSERT INTO app.memberships (user_id, organization_id, role)
    SELECT ('e9220000-0000-4000-8000-00000000001' || i)::uuid, v_org, 'participant' FROM generate_series(1, v_k) i;
  INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le)
    SELECT ('e9220000-0000-4000-8000-00000000002' || i)::uuid, v_camp, v_org, ('e9220000-0000-4000-8000-00000000001' || i)::uuid,
           'terminee', now(), now() FROM generate_series(1, v_k) i;
  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
    SELECT ('e9220000-0000-4000-8000-00000000002' || i)::uuid, v_org, ('e9220000-0000-4000-8000-00000000001' || i)::uuid,
           '{"1": 3}', pg_temp.sc(13), 'q-epreuve', 'c-epreuve' FROM generate_series(1, v_k) i;
  v_r := pg_temp.comme(v_rl, 'authenticated', 'select x.effectif::text from app.frequence_facettes() x where x.facette = ''N1'' and x.score = 13');
  IF v_r IS DISTINCT FROM (v_base + v_k)::text THEN
    RAISE EXCEPTION 'effectif de N1 au score 13 : % au lieu de %', v_r, v_base + v_k;
  END IF;
  v_r := pg_temp.comme(v_rl, 'authenticated', 'select count(distinct x.facette)::text from app.frequence_facettes() x where x.score = 13');
  IF v_r IS DISTINCT FROM '30' THEN RAISE EXCEPTION 'trente facettes attendues au score 13 : %', v_r; END IF;
  v_r := pg_temp.comme(v_rl, 'authenticated', 'select (select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k) from app.frequence_facettes() x limit 1');
  IF v_r IS DISTINCT FROM 'effectif,facette,score' THEN RAISE EXCEPTION 'colonnes de la fréquence : %', v_r; END IF;
  RAISE NOTICE 'OK : fréquence au seuil : effectif exact (% réel(s) + % jetable(s)), trente facettes, trois colonnes sans identité', v_base, v_k;

  -- 10. Retrait, puis effacement des comptes.
  IF pg_temp.comme(v_nx, 'authenticated', format('select app.retirer_relecteur(%L)::text', v_rl)) IS DISTINCT FROM v_refus_admin
     OR pg_temp.comme(v_ad, 'service_role', format('select app.retirer_relecteur(%L)::text', v_rl)) NOT LIKE 'ERR:42501:%' THEN
    RAISE EXCEPTION 'retrait permis à une personne sans rôle ou au serveur';
  END IF;
  IF pg_temp.comme(v_ad, 'authenticated', format('select app.retirer_relecteur(%L)::text', v_rl)) IS DISTINCT FROM 'true'
     OR pg_temp.comme(v_ad, 'authenticated', format('select app.retirer_relecteur(%L)::text', v_rl)) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'retrait : vrai puis faux attendus';
  END IF;
  IF pg_temp.relire(v_rl, 'N1/bas', v_e1, 'a_corriger', 'après retrait') IS DISTINCT FROM v_refus_rel THEN
    RAISE EXCEPTION 'une relectrice retirée rend encore un verdict';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'relecture.retirer' AND acteur = v_ad AND ressource_id = v_rl;
  IF v_n <> 1 THEN RAISE EXCEPTION 'journal du retrait : % ligne(s) au lieu de 1', v_n; END IF;
  IF pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_nx)) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'nouvelle désignation refusée';
  END IF;
  DELETE FROM auth.users WHERE id = v_nx;
  IF EXISTS (SELECT 1 FROM private.relecteurs_bibliotheque WHERE user_id = v_nx) THEN
    RAISE EXCEPTION 'l''effacement du compte n''a pas retiré la désignation';
  END IF;
  DELETE FROM auth.users WHERE id = v_rl;
  SELECT count(*) INTO v_n FROM app.relectures_blocs WHERE empreinte IN (v_e1, v_e2);
  IF v_n <> 4 THEN RAISE EXCEPTION 'l''effacement de la relectrice a supprimé des verdicts (% au lieu de 4)', v_n; END IF;
  SELECT count(*) INTO v_n FROM app.relectures_blocs WHERE empreinte IN (v_e1, v_e2) AND relecteur IS NULL;
  IF v_n <> 3 THEN RAISE EXCEPTION '% verdict(s) sans auteur au lieu de 3', v_n; END IF;
  RAISE NOTICE 'OK : retrait réservé au super administrateur, journalisé, effectif ; effacer un compte retire sa désignation et garde ses verdicts sans auteur';

  -- 11. Plafonds (décision d'Amine) : 200 verdicts et 5 désignations par heure et par personne.
  SELECT count(*) INTO v_n FROM app.relectures_blocs r WHERE r.relecteur = v_ad AND r.cree_le > now() - interval '1 hour';
  INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, relecteur, cree_le)
    SELECT 'C6/haut', repeat('e9', 28) || lpad(to_hex(i), 8, '0'), 'relu', v_ad, now() - interval '59 minutes'
      FROM generate_series(1, 199 - v_n) i;
  INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, relecteur, cree_le)
    SELECT 'C6/haut', repeat('e9', 28) || lpad(to_hex(100000 + i), 8, '0'), 'relu', v_ad, now() - interval '61 minutes'
      FROM generate_series(1, 20) i;
  IF pg_temp.relire(v_ad, 'C6/haut', repeat('e9', 28) || 'f0000001', 'relu') !~ v_uuid_re THEN
    RAISE EXCEPTION 'plafond des verdicts : le 200e de l''heure est refusé';
  END IF;
  v_r := pg_temp.relire(v_ad, 'C6/haut', repeat('e9', 28) || 'f0000002', 'relu');
  IF v_r IS DISTINCT FROM v_plafond_v THEN RAISE EXCEPTION 'plafond des verdicts : 201e de l''heure : % au lieu du refus', v_r; END IF;
  SELECT count(*) INTO v_n FROM private.audit_log WHERE action = 'relecture.designer' AND acteur = v_ad AND cree_le > now() - interval '1 hour';
  IF v_n <> 2 THEN RAISE EXCEPTION 'fixture : % désignation(s) de l''administrateur d''épreuve au lieu de 2', v_n; END IF;
  FOR v_k IN 1..3 LOOP
    v_r := pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text || ''|'' || x.langue from app.designer_relecteur(%L) x', v_q[v_k]));
    IF v_r IS DISTINCT FROM (CASE WHEN v_k = 1 THEN 'true|ar' ELSE 'true|fr' END) THEN
      RAISE EXCEPTION 'plafond des désignations : désignation n° % de l''heure : %', v_k + 2, v_r;
    END IF;
  END LOOP;
  v_r := pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_q[4]));
  IF v_r IS DISTINCT FROM v_plafond_d THEN RAISE EXCEPTION 'plafond des désignations : 6e de l''heure : % au lieu du refus', v_r; END IF;
  IF pg_temp.comme(v_ad, 'authenticated', format('select x.ajoute::text from app.designer_relecteur(%L) x', v_q[1])) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'au plafond, une désignation rejouée doit rendre faux';
  END IF;
  IF EXISTS (SELECT 1 FROM private.relecteurs_bibliotheque WHERE user_id = v_q[4])
     OR EXISTS (SELECT 1 FROM app.relectures_blocs WHERE empreinte = repeat('e9', 28) || 'f0000002') THEN
    RAISE EXCEPTION 'un refus de plafond a écrit';
  END IF;
  RAISE NOTICE 'OK : plafonds : 200e verdict de l''heure accepté, 201e refusé (PT429) ; 5e désignation acceptée (langue du compte rendue), 6e refusée ; rejeu sans erreur ; aucun refus n''écrit';

  -- 12. Conservation : 30 jours ; verdict courant conservé et anonymisé (décision d'Amine). La
  --     purge de l'historique est appelée seule : la purge quotidienne n'est pas jouée ici.
  INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, commentaire, relecteur, cree_le) VALUES
    ('A2/milieu', v_e3, 'relu',       'épreuve 40 jours', v_ad, now() - interval '40 days'),
    ('A2/milieu', v_e3, 'a_corriger', 'épreuve 31 jours', v_ad, now() - interval '31 days'),
    ('A3/milieu', v_e3, 'a_corriger', 'épreuve 29 jours', v_ad, now() - interval '29 days'),
    ('A3/milieu', v_e3, 'relu',       NULL,               v_ad, now() - interval '1 day');
  BEGIN
    DELETE FROM app.relectures_blocs WHERE empreinte = v_e3 AND cree_le < now() - interval '35 days';
    RAISE EXCEPTION 'hors purge, un verdict échu a pu être effacé';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> v_ajout_seul THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  PERFORM set_config('tenga.purge_relecture', 'on', true);
  BEGIN
    DELETE FROM app.relectures_blocs WHERE empreinte = v_e3 AND cree_le < now() - interval '35 days';
    RAISE EXCEPTION 'le réglage de purge posé à la main a suffi au superutilisateur';
  EXCEPTION WHEN SQLSTATE '55000' THEN
    IF SQLERRM <> v_ajout_seul THEN RAISE EXCEPTION 'message inattendu : %', SQLERRM; END IF;
  END;
  PERFORM set_config('tenga.purge_relecture', '', true);
  PERFORM private.purger_historique_relecture();
  SELECT string_agg(r.bloc || '|' || r.verdict || '|' || coalesce(r.commentaire, '-') || '|' || coalesce((r.relecteur = v_ad)::text, '-') || '|' || r.anonymise::text,
                    ',' ORDER BY r.ordre) INTO v_r
    FROM app.relectures_blocs r WHERE r.empreinte = v_e3;
  IF v_r IS DISTINCT FROM 'A2/milieu|a_corriger|-|-|true,A3/milieu|a_corriger|épreuve 29 jours|true|false,A3/milieu|relu|-|true|false' THEN
    RAISE EXCEPTION 'conservation après la purge de l''historique : % (attendu : 40 jours effacé, courant de 31 jours anonymisé, 29 jours et moins intacts)', v_r;
  END IF;
  IF coalesce(current_setting('tenga.purge_relecture', true), '') <> '' THEN
    RAISE EXCEPTION 'le réglage de purge survit à la purge';
  END IF;
  SELECT count(*) INTO v_n FROM private.audit_log l
   WHERE l.action IN ('purge.relectures', 'purge.relectures_anonymisees') AND l.cree_le = now() AND l.acteur IS NULL;
  IF v_n <> 2 THEN RAISE EXCEPTION 'traces de purge de l''historique : % au lieu de 2, sans acteur', v_n; END IF;
  v_r := pg_temp.comme(NULL, 'service_role', 'select private.purger_historique_relecture()::text');
  IF v_r NOT LIKE 'ERR:42501:%' THEN RAISE EXCEPTION 'la purge de l''historique est appelable par le serveur : %', v_r; END IF;
  RAISE NOTICE 'OK : conservation : verdict antérieur de 40 jours effacé, verdict courant de 31 jours conservé et anonymisé, 29 jours et moins intacts ; hors purge, rien ne s''efface (superutilisateur, réglage posé à la main) ; traces sans acteur ; purge fermée au serveur';
  RAISE NOTICE 'EPREUVE VERTE';
END
$e$;

ROLLBACK;
