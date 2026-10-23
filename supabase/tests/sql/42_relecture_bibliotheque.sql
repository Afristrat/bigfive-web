-- Migration 0022 : atelier de relecture de la bibliothèque de textes.
-- private.relecteurs_bibliotheque et app.relectures_blocs (RLS forcée, aucun droit de
-- table pour l'API, écriture refusée à l'API, historique en ajout seul, vidage refusé) et
-- huit fonctions contrôlées : app.suis_relecteur, app.relire_bloc (super administrateur ou
-- relecteur désigné ; entrées invalides refusées en 22023 de même message ; verdict
-- rejoué sans écriture ; plafond de 200 verdicts par heure et par personne),
-- app.historique_relecture (lecture journalisée, filtrée en base : tout pour un super
-- administrateur, ses seuls verdicts et aucune identité pour un relecteur désigné),
-- app.etat_relecture_blocs (service_role seul : dernier verdict par bloc et empreinte),
-- app.frequence_facettes (histogramme, rien sous le seuil d'anonymat),
-- app.designer_relecteur (langue du compte rendue pour l'avis ; plafond de 5 désignations
-- par heure et par personne), app.retirer_relecteur, app.lister_relecteurs (super
-- administrateur seul). Verdicts inscrits au journal sans auteur ni identifiant ;
-- app.exporter_mes_donnees gagne la clé « relecture ». Conservation :
-- private.purger_historique_relecture, appelée par
-- private.purger_quotidien, efface à 30 jours tout verdict qui n'est plus le verdict courant
-- de son couple (bloc, empreinte) et anonymise le verdict courant échu ; le déclencheur
-- d'immuabilité ne laisse passer que ce contexte (tenga_owner et réglage de la fonction).
-- Exécution à l'épreuve de déploiement, jamais sur le poste ; épreuve en transaction
-- annulée : scripts/epreuve-relecture.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(131);

CREATE FUNCTION pg_temp.comme(p_uid uuid, p_role text, p_sql text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  v text;
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', p_role)::text, true);
  EXECUTE format('SET LOCAL ROLE %I', p_role);
  IF p_sql ~* '^\s*select' THEN
    EXECUTE p_sql INTO v;
  ELSE
    EXECUTE p_sql;
    v := 'ok';
  END IF;
  RESET ROLE;
  RETURN v;
EXCEPTION WHEN others THEN
  RESET ROLE;
  RETURN 'ERR:' || SQLSTATE || ':' || SQLERRM;
END
$$;

-- Personnages : ad et ad2 administrateurs Tenga, rl relectrice (désignée en cours de
-- fichier), nx sans aucun rôle (compte en arabe), bn compte suspendu, pl autrice des
-- verdicts anciens de la purge, q1 à q5 comptes à désigner (plafond), p1 à p5
-- participants (résultats de fréquence).
CREATE FUNCTION pg_temp.u_ad() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.u_rl() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.u_nx() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000003'::uuid $$;
CREATE FUNCTION pg_temp.u_bn() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000004'::uuid $$;
CREATE FUNCTION pg_temp.u_ad2() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000005'::uuid $$;
CREATE FUNCTION pg_temp.u_pl() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000006'::uuid $$;
CREATE FUNCTION pg_temp.u_q(i integer) RETURNS uuid LANGUAGE sql AS $$ SELECT ('b2000000-0000-4000-8000-00000000002' || i)::uuid $$;
CREATE FUNCTION pg_temp.u_x9() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-0000000000ff'::uuid $$;
-- Empreintes de texte (64 caractères hexadécimaux).
CREATE FUNCTION pg_temp.e1() RETURNS text LANGUAGE sql AS $$ SELECT repeat('e1', 32) $$;
CREATE FUNCTION pg_temp.e2() RETURNS text LANGUAGE sql AS $$ SELECT repeat('e2', 32) $$;
CREATE FUNCTION pg_temp.e3() RETURNS text LANGUAGE sql AS $$ SELECT repeat('e3', 32) $$;
CREATE FUNCTION pg_temp.hx(i integer) RETURNS text LANGUAGE sql AS $$ SELECT lpad(to_hex(i), 64, '0') $$;

CREATE FUNCTION pg_temp.relire(p_uid uuid, p_bloc text, p_emp text, p_verdict text, p_com text DEFAULT NULL,
                               p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.relire_bloc(%L, %L, %L, %L)::text', p_bloc, p_emp, p_verdict, p_com))
$$;
CREATE FUNCTION pg_temp.appel(p_uid uuid, p_sql text, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, p_sql)
$$;
-- Désignation : « ajoute » seul, ou « ajoute|langue ».
CREATE FUNCTION pg_temp.designer(p_uid uuid, p_cible uuid, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select x.ajoute::text from app.designer_relecteur(%L) x', p_cible))
$$;
CREATE FUNCTION pg_temp.designer_langue(p_uid uuid, p_cible uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select x.ajoute::text || ''|'' || x.langue from app.designer_relecteur(%L) x', p_cible))
$$;
CREATE FUNCTION pg_temp.refus_relecteur() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé aux relecteurs de la bibliothèque'
$$;
CREATE FUNCTION pg_temp.refus_admin() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:42501:Réservé aux administrateurs Tenga'
$$;
CREATE FUNCTION pg_temp.invalide() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:22023:Relecture invalide : bloc, empreinte, verdict ou commentaire'
$$;
CREATE FUNCTION pg_temp.ajout_seul() RETURNS text LANGUAGE sql AS $$
  SELECT 'ERR:55000:Historique de relecture en ajout seul'
$$;
-- Scores de fixture : trente facettes de score 13 (moyenne 3,25), format tenga-scores-1.
CREATE FUNCTION pg_temp.sc13() RETURNS jsonb LANGUAGE sql AS $$
  SELECT jsonb_build_object('format', 'tenga-scores-1')
         || (SELECT jsonb_object_agg(d, jsonb_build_object('score', 78, 'count', 24, 'facettes',
                     (SELECT jsonb_object_agg(f::text, jsonb_build_object('score', 13, 'count', 4))
                        FROM generate_series(1, 6) f)))
               FROM unnest(ARRAY['N', 'E', 'O', 'A', 'C']) d)
$$;

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('b2000000-0000-4000-8000-000000000001', 'ad-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000002', 'rl-relecture@example.test', '{"nom": "Relectrice Essai"}'),
  ('b2000000-0000-4000-8000-000000000003', 'nx-relecture@example.test', '{"langue": "ar"}'),
  ('b2000000-0000-4000-8000-000000000004', 'bn-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000005', 'ad2-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000006', 'pl-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000011', 'p1-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000012', 'p2-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000013', 'p3-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000014', 'p4-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000015', 'p5-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000021', 'q1-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000022', 'q2-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000023', 'q3-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000024', 'q4-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000025', 'q5-relecture@example.test', '{}');
UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = 'b2000000-0000-4000-8000-000000000004';
INSERT INTO private.tenga_admins (user_id) VALUES ('b2000000-0000-4000-8000-000000000001'), ('b2000000-0000-4000-8000-000000000005');
INSERT INTO app.organizations (id, slug, nom) VALUES ('b3000000-0000-4000-8000-000000000001', 'org-relecture', 'Organisation relecture');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cloture_le) VALUES
  ('b4000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'Campagne relecture', 'ouverte', now(), NULL);
INSERT INTO app.memberships (user_id, organization_id, role)
  SELECT u, 'b3000000-0000-4000-8000-000000000001', 'participant'
    FROM unnest(ARRAY['b2000000-0000-4000-8000-000000000011', 'b2000000-0000-4000-8000-000000000012',
                      'b2000000-0000-4000-8000-000000000013', 'b2000000-0000-4000-8000-000000000014',
                      'b2000000-0000-4000-8000-000000000015']::uuid[]) u;
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le)
  SELECT ('b5000000-0000-4000-8000-00000000001' || i)::uuid, 'b4000000-0000-4000-8000-000000000001',
         'b3000000-0000-4000-8000-000000000001', ('b2000000-0000-4000-8000-00000000001' || i)::uuid,
         'terminee', now(), now()
    FROM generate_series(1, 5) i;

-- ===== Garde : les données de ce fichier ont le sens attendu =====
SELECT is((SELECT count(*)::int FROM app.results), 0, 'fixture : aucun résultat avant le test de fréquence (instance jetable)');
SELECT is((SELECT count(*)::int FROM app.relectures_blocs) + (SELECT count(*)::int FROM private.relecteurs_bibliotheque),
  0, 'avant tout appel : aucun verdict, aucun relecteur désigné');

-- ===== Tables : protection =====
SELECT ok((SELECT bool_and(c.relrowsecurity AND c.relforcerowsecurity AND c.relowner = 'tenga_owner'::regrole AND c.relkind = 'r')
             FROM pg_class c WHERE c.oid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)),
  'les deux tables : ordinaires, RLS activée et forcée, propriétaire tenga_owner');
SELECT is((SELECT count(*)::int FROM pg_class c CROSS JOIN unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol)
            WHERE c.oid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)
              AND (has_any_column_privilege(r.rol, c.oid, 'SELECT,INSERT,UPDATE,REFERENCES')
                   OR has_table_privilege(r.rol, c.oid, 'DELETE') OR has_table_privilege(r.rol, c.oid, 'TRUNCATE')
                   OR has_table_privilege(r.rol, c.oid, 'TRIGGER'))),
  0, 'anon, authenticated et service_role n''ont aucun droit sur les deux tables : tout passe par les fonctions');
SELECT is(
  (SELECT string_agg(schemaname || '.' || tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ','),
                     E'\n' ORDER BY schemaname, tablename, policyname)
     FROM pg_policies WHERE tablename IN ('relectures_blocs', 'relecteurs_bibliotheque')),
  $f$app.relectures_blocs|relectures_blocs_insertion_owner|INSERT|tenga_owner
app.relectures_blocs|relectures_blocs_lecture_owner|SELECT|tenga_owner
app.relectures_blocs|relectures_blocs_modification_owner|UPDATE|tenga_owner
app.relectures_blocs|relectures_blocs_suppression_owner|DELETE|tenga_owner
private.relecteurs_bibliotheque|relecteurs_insertion_owner|INSERT|tenga_owner
private.relecteurs_bibliotheque|relecteurs_lecture_owner|SELECT|tenga_owner
private.relecteurs_bibliotheque|relecteurs_suppression_owner|DELETE|tenga_owner$f$,
  'règles réservées à tenga_owner ; la suppression d''historique, bornée par le déclencheur, sert la seule purge');
SELECT is((SELECT count(*)::int FROM pg_trigger t
            WHERE t.tgrelid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)
              AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
              AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) <> 0) OR (t.tgtype & 32) = 32)),
  4, 'refuser_ecriture_api actif sur les deux tables (ligne et vidage)');
SELECT is((SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
            WHERE t.tgrelid = 'app.relectures_blocs'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O'
              AND t.tgname !~ '_sans_(ecriture|vidage)_api$'),
  'relectures_blocs_transition,relectures_blocs_vidage_interdit',
  'deux autres déclencheurs sur l''historique : relectures_blocs_transition (ligne) et relectures_blocs_vidage_interdit (vidage)');
SELECT is(
  (SELECT string_agg(p.proname || '|' || p.prosecdef::text || '|' || p.provolatile::text || '|'
                     || (p.proconfig = ARRAY['search_path=""']::text[])::text || '|' || pg_get_userbyid(p.proowner)::text || '|'
                     || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
                     || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text, E'\n' ORDER BY p.proname)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'app' AND p.proname IN ('suis_relecteur', 'relire_bloc', 'historique_relecture', 'etat_relecture_blocs',
                                               'frequence_facettes', 'designer_relecteur', 'retirer_relecteur', 'lister_relecteurs')),
  $f$designer_relecteur|true|v|true|tenga_owner|false|false|false|true
etat_relecture_blocs|true|s|true|tenga_owner|false|false|true|false
frequence_facettes|true|s|true|tenga_owner|false|false|false|true
historique_relecture|true|v|true|tenga_owner|false|false|false|true
lister_relecteurs|true|v|true|tenga_owner|false|false|false|true
relire_bloc|true|v|true|tenga_owner|false|false|false|true
retirer_relecteur|true|v|true|tenga_owner|false|false|false|true
suis_relecteur|true|s|true|tenga_owner|false|false|false|true$f$,
  'huit fonctions SECURITY DEFINER, search_path vide, tenga_owner ; authenticated seul, sauf l''état servi (service_role seul)');
SELECT is(
  pg_get_function_result('app.historique_relecture()'::regprocedure) || E'\n'
  || pg_get_function_result('app.etat_relecture_blocs()'::regprocedure) || E'\n'
  || pg_get_function_result('app.frequence_facettes()'::regprocedure) || E'\n'
  || pg_get_function_result('app.lister_relecteurs()'::regprocedure) || E'\n'
  || pg_get_function_result('app.designer_relecteur(uuid)'::regprocedure),
  $f$TABLE(relecture_id uuid, bloc text, empreinte text, verdict text, commentaire text, relecteur_nom text, relecteur_adresse text, est_moi boolean, cree_le timestamp with time zone)
TABLE(bloc text, empreinte text, verdict text)
TABLE(facette text, score numeric, effectif integer)
TABLE(user_id uuid, adresse text, ajoute_le timestamp with time zone)
TABLE(ajoute boolean, langue text)$f$,
  'colonnes rendues : l''état servi ne porte ni relecteur, ni commentaire, ni date ; la désignation rend la langue du compte');
SELECT is(
  (SELECT p.prosecdef::text || '|' || p.provolatile::text || '|' || array_to_string(p.proconfig, ',') || '|'
          || pg_get_userbyid(p.proowner)::text || '|'
          || has_function_privilege('anon', p.oid, 'EXECUTE')::text || '|'
          || has_function_privilege('public', p.oid, 'EXECUTE')::text || '|'
          || has_function_privilege('service_role', p.oid, 'EXECUTE')::text || '|'
          || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
     FROM pg_proc p WHERE p.oid = 'private.purger_historique_relecture()'::regprocedure),
  'true|v|search_path=""|tenga_owner|false|false|false|false',
  'private.purger_historique_relecture : SECURITY DEFINER, search_path vide, tenga_owner, exécutable par aucun rôle de l''API');
SELECT matches(pg_get_functiondef('private.purger_quotidien()'::regprocedure), 'PERFORM private\.purger_historique_relecture\(\);',
  'la purge quotidienne appelle la purge de l''historique de relecture');
SELECT is(md5(replace(replace(replace(replace(
         (SELECT p.prosrc FROM pg_proc p WHERE p.oid = 'private.purger_quotidien()'::regprocedure),
         E'  PERFORM private.purger_historique_relecture();\n', ''),
         $blk$  v_reseau_reponses integer;
  v_reseau_membres  integer;
$blk$, ''),
         $blk$  -- Relevé du réseau réel (0023) : réponses, puis lignes de membre échues.
  DELETE FROM app.reseau_reponses
   WHERE repondu_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s));
  GET DIAGNOSTICS v_reseau_reponses = ROW_COUNT;
  DELETE FROM app.reseau_membres
   WHERE maj_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s));
  GET DIAGNOSTICS v_reseau_membres = ROW_COUNT;

$blk$, ''),
         $blk$  PERFORM private.journaliser(NULL, 'purge.reseau_reponses', NULL, NULL, NULL, v_reseau_reponses);
  PERFORM private.journaliser(NULL, 'purge.reseau_membres', NULL, NULL, NULL, v_reseau_membres);
$blk$, '')),
  '0fef778e812a5b2227b95447fc62eff3',
  'le corps de la purge quotidienne est celui de 0018, hors la seule ligne de 0022 et les seuls ajouts du réseau (0023) (md5)');
SELECT is(private.duree_historique_relecture(), interval '30 days', 'conservation de l''historique de relecture : 30 jours (décision d''Amine)');

-- ===== suis_relecteur =====
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text'), 'true', 'un super administrateur est relecteur de droit');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select app.suis_relecteur()::text'), 'false', 'un compte non désigné n''est pas relecteur');
SELECT is(pg_temp.appel(NULL, 'select app.suis_relecteur()::text'), 'false', 'sans identité : faux, sans erreur');
SELECT ok(pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text', 'service_role') LIKE 'ERR:42501:%',
  'anon et service_role ne peuvent pas appeler suis_relecteur');

-- ===== Désigner, lister, retirer : super administrateur seul =====
SELECT is(pg_temp.designer(pg_temp.u_nx(), pg_temp.u_rl()), pg_temp.refus_admin(), 'une personne sans rôle ne désigne pas');
SELECT is(pg_temp.designer(pg_temp.u_rl(), pg_temp.u_rl()), pg_temp.refus_admin(), 'personne ne se désigne soi-même');
SELECT is(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_x9()), 'ERR:22023:Compte inconnu', 'compte inconnu refusé');
SELECT is(pg_temp.designer(pg_temp.u_ad(), NULL), 'ERR:22023:Compte inconnu', 'compte nul refusé');
SELECT is(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_bn()), 'ERR:22023:Compte suspendu', 'compte suspendu refusé');
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque) + (SELECT count(*)::int FROM private.audit_log WHERE action = 'relecture.designer'),
  0, 'aucun refus n''a écrit de relecteur ni de journal');
SELECT is(pg_temp.designer_langue(pg_temp.u_ad(), pg_temp.u_rl()), 'true|fr', 'désignation : vrai, avec la langue du compte (français par défaut)');
SELECT is(pg_temp.designer_langue(pg_temp.u_ad(), pg_temp.u_rl()), 'false|fr', 'désignation rejouée : faux, sans erreur');
SELECT is((SELECT string_agg(acteur::text || '|' || ressource_type || '|' || ressource_id::text, ',') FROM private.audit_log WHERE action = 'relecture.designer'),
  pg_temp.u_ad()::text || '|utilisateur|' || pg_temp.u_rl()::text, 'une seule ligne de journal de désignation, acteur et compte désigné');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select app.suis_relecteur()::text'), 'true', 'la personne désignée est relectrice');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select string_agg(x.user_id::text || ''|'' || x.adresse, '','') from app.lister_relecteurs() x'),
  pg_temp.u_rl()::text || '|rl-relecture@example.test', 'la liste des relecteurs rend le compte et son adresse');
SELECT is((SELECT string_agg(acteur::text || '|' || quantite::text, ',') FROM private.audit_log WHERE action = 'relecture.lister_relecteurs'),
  pg_temp.u_ad()::text || '|1', 'la lecture de la liste est journalisée avec sa quantité');
SELECT ok(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.lister_relecteurs()') = pg_temp.refus_admin()
          AND pg_temp.appel(pg_temp.u_rl(), format('select app.retirer_relecteur(%L)::text', pg_temp.u_rl())) = pg_temp.refus_admin()
          AND pg_temp.appel(NULL, 'select count(*)::text from app.lister_relecteurs()') = 'ERR:42501:Connexion requise',
  'une relectrice ne lit pas la liste et ne retire personne ; sans identité : refus');
SELECT ok(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_nx(), 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.designer(pg_temp.u_ad(), pg_temp.u_nx(), 'service_role') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), format('select app.retirer_relecteur(%L)::text', pg_temp.u_rl()), 'service_role') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from app.lister_relecteurs()', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from app.lister_relecteurs()', 'service_role') LIKE 'ERR:42501:%',
  'anon et service_role ne désignent, ne retirent ni ne listent');

-- ===== Rendre un verdict =====
SELECT is(pg_temp.relire(pg_temp.u_nx(), 'N1/bas', pg_temp.e1(), 'relu'), pg_temp.refus_relecteur(), 'une personne sans rôle ne relit pas');
SELECT is(pg_temp.relire(NULL, 'N1/bas', pg_temp.e1(), 'relu'), 'ERR:42501:Connexion requise', 'sans identité : refus');
SELECT ok(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', NULL, 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', NULL, 'service_role') LIKE 'ERR:42501:%',
  'anon et service_role ne relisent pas');
SELECT is(
  (SELECT string_agg(c.nom || '=' || pg_temp.relire(pg_temp.u_rl(), c.bloc, c.emp, c.verdict, c.com), E'\n' ORDER BY c.nom)
     FROM (VALUES
       ('01 bloc nul',               NULL,         pg_temp.e1(),               'relu',       NULL),
       ('02 facette 7',              'N7/bas',     pg_temp.e1(),               'relu',       NULL),
       ('03 domaine inconnu',        'X1/bas',     pg_temp.e1(),               'relu',       NULL),
       ('04 niveau inconnu',         'N1/moyen',   pg_temp.e1(),               'relu',       NULL),
       ('05 minuscule',              'n1/bas',     pg_temp.e1(),               'relu',       NULL),
       ('06 espace final',           'N1/bas ',    pg_temp.e1(),               'relu',       NULL),
       ('07 empreinte nulle',        'N1/bas',     NULL,                       'relu',       NULL),
       ('08 empreinte courte',       'N1/bas',     repeat('a', 63),            'relu',       NULL),
       ('09 empreinte majuscule',    'N1/bas',     repeat('A', 64),            'relu',       NULL),
       ('10 empreinte non hexa',     'N1/bas',     repeat('g', 64),            'relu',       NULL),
       ('11 verdict nul',            'N1/bas',     pg_temp.e1(),               NULL,         NULL),
       ('12 verdict majuscule',      'N1/bas',     pg_temp.e1(),               'RELU',       NULL),
       ('13 verdict inconnu',        'N1/bas',     pg_temp.e1(),               'valide',     NULL),
       ('14 correction sans texte',  'N1/bas',     pg_temp.e1(),               'a_corriger', NULL),
       ('15 correction en blanc',    'N1/bas',     pg_temp.e1(),               'a_corriger', E'  \n\t '),
       ('16 commentaire trop long',  'N1/bas',     pg_temp.e1(),               'relu',       repeat('x', 2001)),
       ('17 correction en blancs Unicode', 'N1/bas', pg_temp.e1(),             'a_corriger', E'\u00a0\u202f\u3000\u2009\ufeff')
     ) AS c(nom, bloc, emp, verdict, com)),
  (SELECT string_agg(c.nom || '=' || pg_temp.invalide(), E'\n' ORDER BY c.nom)
     FROM unnest(ARRAY['01 bloc nul', '02 facette 7', '03 domaine inconnu', '04 niveau inconnu', '05 minuscule',
                       '06 espace final', '07 empreinte nulle', '08 empreinte courte', '09 empreinte majuscule',
                       '10 empreinte non hexa', '11 verdict nul', '12 verdict majuscule', '13 verdict inconnu',
                       '14 correction sans texte', '15 correction en blanc', '16 commentaire trop long',
                       '17 correction en blancs Unicode']) AS c(nom)),
  'dix-sept entrées invalides (dont un commentaire fait d''espaces Unicode) : 22023, un seul message');
SELECT is((SELECT count(*)::int FROM app.relectures_blocs) + (SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.(relu|a_corriger)$'),
  0, 'aucun refus n''a écrit de verdict ni de journal');

SELECT ok(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', repeat('y', 2000))
            ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  'commentaire de 2 000 caractères accepté');
SELECT is(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', repeat('y', 2000)),
  (SELECT string_agg(r.id::text, ',') FROM app.relectures_blocs r WHERE r.bloc = 'N1/bas'),
  'même verdict rejoué par la même personne sur le même texte : la ligne existante est rendue');
SELECT is((SELECT string_agg(r.bloc || '|' || r.empreinte || '|' || r.verdict || '|' || char_length(r.commentaire)::text || '|' || r.relecteur::text
                             || '|' || r.anonymise::text, ',' ORDER BY r.ordre) FROM app.relectures_blocs r),
  'N1/bas|' || pg_temp.e1() || '|relu|2000|' || pg_temp.u_rl()::text || '|false', 'une seule ligne écrite, rangée telle quelle, non anonymisée');
SELECT is((SELECT string_agg(coalesce(l.acteur::text, '-') || '|' || l.ressource_type || '|' || coalesce(l.ressource_id::text, '-'), ',')
             FROM private.audit_log l WHERE l.action = 'relecture.relu'),
  '-|relecture|-', 'une seule ligne de journal relecture.relu, sans auteur ni identifiant de verdict');

SELECT ok(pg_temp.relire(pg_temp.u_ad(), 'N1/bas', pg_temp.e1(), 'a_corriger', E'\u00a0 À reformuler : « vous » pluriel.\u202f\n\u3000') !~ '^ERR',
  'le super administrateur demande une correction, commentaire à l''appui');
SELECT is((SELECT string_agg(r.commentaire, ' / ') FROM app.relectures_blocs r WHERE r.verdict = 'a_corriger'),
  'À reformuler : « vous » pluriel.', 'le commentaire est rangé sans les blancs qui l''entourent, espaces Unicode comprises');
SELECT is((SELECT count(*)::text || '|' || count(acteur)::text || '|' || count(ressource_id)::text FROM private.audit_log WHERE action = 'relecture.a_corriger'),
  '1|0|0', 'une ligne de journal relecture.a_corriger, sans auteur ni identifiant');
SELECT is(pg_temp.appel(NULL, 'select string_agg(x.bloc || ''|'' || x.verdict, '','') from app.etat_relecture_blocs() x', 'service_role'),
  'N1/bas|a_corriger', 'état servi : le dernier verdict sur ce texte (à corriger)');
SELECT ok(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', repeat('y', 2000)) !~ '^ERR',
  'le même verdict qu''avant, après celui d''un autre, est accepté');
SELECT is((SELECT count(*)::int FROM app.relectures_blocs r WHERE r.empreinte = pg_temp.e1()), 3,
  'il s''écrit de nouveau : trois verdicts sur ce texte');
SELECT is(pg_temp.appel(NULL, 'select string_agg(x.bloc || ''|'' || x.verdict, '','') from app.etat_relecture_blocs() x', 'service_role'),
  'N1/bas|relu', 'état servi : trois verdicts dans la même transaction, le dernier l''emporte (ordre)');
SELECT ok(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e2(), 'a_corriger', 'Nouveau texte : à revoir') !~ '^ERR'
          AND pg_temp.relire(pg_temp.u_rl(), 'E3/haut', pg_temp.e2(), 'relu') !~ '^ERR',
  'verdicts sur un autre texte du même bloc et sur un autre bloc');
SELECT is(pg_temp.appel(NULL, 'select string_agg(x.bloc || ''|'' || left(x.empreinte, 2) || ''|'' || x.verdict, '','' order by x.bloc, x.empreinte) from app.etat_relecture_blocs() x', 'service_role'),
  'E3/haut|e2|relu,N1/bas|e1|relu,N1/bas|e2|a_corriger', 'état servi : un verdict par couple (bloc, empreinte) : un texte modifié n''hérite de rien');
SELECT ok(pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from app.etat_relecture_blocs()') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from app.etat_relecture_blocs()', 'anon') LIKE 'ERR:42501:%',
  'l''état servi est refusé au rôle connecté, administrateur compris, et à l''anonyme');

-- ===== Historique : complet pour un super administrateur, ses seuls verdicts pour un relecteur désigné =====
-- Verdicts écrits : quatre par la relectrice, un par l'administrateur (« À reformuler »).
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()'), '4',
  'la relectrice désignée ne lit que ses quatre verdicts');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select (select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k) from app.historique_relecture() x limit 1'),
  'bloc,commentaire,cree_le,empreinte,est_moi,relecteur_adresse,relecteur_nom,relecture_id,verdict', 'neuf colonnes');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select string_agg(x.bloc || ''|'' || x.verdict, '','') from (select * from app.historique_relecture() limit 2) x'),
  'E3/haut|relu,N1/bas|a_corriger', 'du plus récent au plus ancien');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select string_agg(distinct x.est_moi::text || ''|'' || coalesce(x.relecteur_nom, ''-'') || ''|'' || coalesce(x.relecteur_adresse, ''-''), '','') from app.historique_relecture() x'),
  'true|-|-', 'relecteur désigné : est_moi vrai partout, aucun nom ni aucune adresse, pas même les siens');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture() x where x.commentaire like ''À reformuler%'' or x.relecture_id = (select r.id from app.relectures_blocs r where r.relecteur = ''b2000000-0000-4000-8000-000000000001'')'),
  'ERR:42501:permission denied for table relectures_blocs', 'la relectrice ne contourne pas le filtre par une jointure sur la table');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture() x where x.commentaire like ''À reformuler%'''),
  '0', 'le verdict et le commentaire de l''administrateur sont absents de l''historique de la relectrice');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from app.historique_relecture()'), '5',
  'le super administrateur lit les cinq verdicts');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select string_agg(s.e, '','' order by s.e) from (select distinct x.est_moi::text || ''|'' || coalesce(x.relecteur_nom, ''-'') || ''|'' || x.relecteur_adresse as e from app.historique_relecture() x) s'),
  'false|Relectrice Essai|rl-relecture@example.test,true|-|ad-relecture@example.test', 'super administrateur : nom de profil, adresse, est_moi vrai sur ses seuls verdicts');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select string_agg(x.commentaire, '','') from app.historique_relecture() x where x.verdict = ''a_corriger'' and x.empreinte = repeat(''e1'', 32)'),
  'À reformuler : « vous » pluriel.', 'super administrateur : commentaires de tous les relecteurs');
SELECT is((SELECT string_agg(s.e, ',' ORDER BY s.e) FROM (
             SELECT CASE l.acteur WHEN pg_temp.u_ad() THEN 'ad' WHEN pg_temp.u_rl() THEN 'rl' ELSE 'autre' END
                    || '|' || count(*)::text || '|' || min(l.quantite)::text || '|' || max(l.quantite)::text AS e
               FROM private.audit_log l WHERE l.action = 'relecture.lister' GROUP BY l.acteur) s),
  'ad|3|5|5,rl|5|4|4', 'chaque lecture de l''historique est journalisée, quantité = lignes rendues à l''appelant');
SELECT ok(pg_temp.appel(pg_temp.u_nx(), 'select count(*)::text from app.historique_relecture()') = pg_temp.refus_relecteur()
          AND pg_temp.appel(NULL, 'select count(*)::text from app.historique_relecture()') = 'ERR:42501:Connexion requise'
          AND pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()', 'service_role') LIKE 'ERR:42501:%',
  'historique refusé à une personne sans rôle, sans identité, à l''anonyme et au serveur');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.' AND to_jsonb(audit_log)::text ~ '@'),
  0, 'aucune ligne de journal de relecture ne contient d''adresse');

-- ===== Droit d'accès : app.exporter_mes_donnees gagne la clé « relecture » =====
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select (select string_agg(k, '','' order by k collate "C") from jsonb_object_keys(app.exporter_mes_donnees()) k)'),
  'appartenances,binomes,compte,exporte_le,journal,participations,profil,relecture,reseau,resultats,tentatives',
  'l''export garde ses clés de 0021 et gagne « relecture » (et « reseau », migration 0023)');
SELECT is(pg_temp.appel(pg_temp.u_rl(), $q$select (e -> 'relecture' ->> 'ajoute_le' is not null)::text || '|' || jsonb_array_length(e -> 'relecture' -> 'verdicts')::text
                                          || '|' || (select string_agg(k, ',' order by k) from jsonb_object_keys(e -> 'relecture' -> 'verdicts' -> 0) k)
                                          || '|' || (e::text like '%À reformuler%')::text
                                        from app.exporter_mes_donnees() e$q$),
  'true|4|bloc,commentaire,cree_le,empreinte,verdict|false',
  'export de la relectrice : date de désignation et ses quatre verdicts (cinq clés), jamais le verdict de l''administrateur');
SELECT is(pg_temp.appel(pg_temp.u_ad(), $q$select coalesce(e -> 'relecture' ->> 'ajoute_le', '-') || '|' || jsonb_array_length(e -> 'relecture' -> 'verdicts')::text
                                          || '|' || (e -> 'relecture' -> 'verdicts' -> 0 ->> 'commentaire')
                                        from app.exporter_mes_donnees() e$q$),
  '-|1|À reformuler : « vous » pluriel.', 'export de l''administrateur (non désigné) : pas de date de désignation, son seul verdict');
SELECT is((SELECT md5(replace(replace(p.prosrc, $blk$    'reseau', pg_catalog.jsonb_build_object(
      'membres', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rm.participation_id, 'campagne', c.titre, 'organisation', o.nom,
                 'informe_le', rm.informe_le, 'oppose_le', rm.oppose_le,
                 'accord_repondre_le', rm.accord_repondre_le, 'accord_carte_le', rm.accord_carte_le,
                 'maj_le', rm.maj_le) ORDER BY rm.informe_le, rm.participation_id)
        FROM app.reseau_membres rm
        JOIN app.participations p ON p.id = rm.participation_id
        JOIN app.campaigns c ON c.id = rm.campaign_id
        JOIN app.organizations o ON o.id = rm.organization_id
        WHERE p.user_id = v_uid), '[]'::jsonb),
      'reponses', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rr.repondant, 'personne_citee', pc.nom, 'lien', rr.lien,
                 'valeur', rr.valeur, 'repondu_le', rr.repondu_le) ORDER BY rr.repondu_le, rr.repondant, rr.cite, rr.lien)
        FROM app.reseau_reponses rr
        JOIN app.participations p ON p.id = rr.repondant
        JOIN app.participations pcit ON pcit.id = rr.cite
        LEFT JOIN app.profiles pc ON pc.user_id = pcit.user_id
        WHERE p.user_id = v_uid), '[]'::jsonb)),
$blk$, ''), $blk$    'relecture', pg_catalog.jsonb_build_object(
      'ajoute_le', (SELECT rb.ajoute_le FROM private.relecteurs_bibliotheque rb WHERE rb.user_id = v_uid),
      'verdicts', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'bloc', v.bloc, 'empreinte', v.empreinte, 'verdict', v.verdict,
                 'commentaire', v.commentaire, 'cree_le', v.cree_le) ORDER BY v.ordre)
        FROM app.relectures_blocs v WHERE v.relecteur = v_uid), '[]'::jsonb)),
$blk$, ''))
             FROM pg_proc p WHERE p.oid = 'app.exporter_mes_donnees()'::regprocedure),
  '308646a222566783617d442bf2188be6', 'le corps de l''export est celui de 0021, hors la seule clé « relecture » (0022) et la seule clé « reseau » (0023) (md5)');

-- ===== Accès direct et historique en ajout seul =====
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.relectures_blocs'),
  'ERR:42501:permission denied for table relectures_blocs', 'la relectrice ne lit pas la table directement');
SELECT is(pg_temp.appel(pg_temp.u_ad(),
    format('insert into app.relectures_blocs (bloc, empreinte, verdict) values (%L, %L, %L)', 'N2/bas', pg_temp.e1(), 'relu')),
  'ERR:42501:permission denied for table relectures_blocs', 'l''administrateur n''écrit pas dans la table directement');
SELECT ok(pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from private.relecteurs_bibliotheque') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select count(*)::text from private.relecteurs_bibliotheque', 'service_role') LIKE 'ERR:42501:%',
  'la liste des relecteurs ne se lit pas directement, ni par l''administrateur, ni par le serveur');
SELECT throws_ok($$UPDATE app.relectures_blocs SET verdict = 'relu' WHERE verdict = 'a_corriger'$$,
  '55000', 'Historique de relecture en ajout seul', 'un verdict ne se réécrit pas, même par un superutilisateur');
SELECT throws_ok($$DELETE FROM app.relectures_blocs WHERE bloc = 'E3/haut'$$,
  '55000', 'Historique de relecture en ajout seul', 'un verdict ne s''efface pas, même par un superutilisateur');
SELECT throws_ok($$TRUNCATE app.relectures_blocs$$,
  '55000', 'Historique de relecture en ajout seul', 'l''historique ne se vide pas, même par un superutilisateur');
SELECT throws_ok(format('UPDATE app.relectures_blocs SET relecteur = %L WHERE relecteur = %L', pg_temp.u_ad(), pg_temp.u_rl()),
  '55000', 'Historique de relecture en ajout seul', 'un verdict ne change pas d''auteur');
SELECT throws_ok(format('UPDATE app.relectures_blocs SET relecteur = NULL WHERE relecteur = %L', pg_temp.u_rl()),
  '55000', 'Historique de relecture en ajout seul', 'l''auteur d''un verdict ne s''efface que pendant l''effacement de son compte, même par une écriture directe');
SELECT throws_ok($$UPDATE app.relectures_blocs SET commentaire = NULL, relecteur = NULL, anonymise = true WHERE verdict = 'a_corriger'$$,
  '55000', 'Historique de relecture en ajout seul', 'un verdict récent ne s''anonymise pas hors purge, même par un superutilisateur');
SELECT throws_ok(format('INSERT INTO app.relectures_blocs (bloc, empreinte, verdict) VALUES (%L, %L, %L)', 'N2/bas', pg_temp.e1(), 'a_corriger'),
  '23514', NULL, 'contrainte : une correction exige un commentaire, même par une écriture directe');
SELECT throws_ok(format('INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, commentaire, anonymise) VALUES (%L, %L, %L, %L, true)', 'N2/bas', pg_temp.e1(), 'relu', 'x'),
  '23514', NULL, 'contrainte : un verdict anonymisé ne porte ni commentaire ni relecteur');

-- ===== Fréquence des facettes =====
SELECT is(pg_temp.appel(pg_temp.u_nx(), 'select count(*)::text from app.frequence_facettes()'), pg_temp.refus_relecteur(),
  'fréquence refusée à une personne sans rôle');
SELECT ok(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.frequence_facettes()', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.frequence_facettes()', 'service_role') LIKE 'ERR:42501:%'
          AND pg_temp.appel(NULL, 'select count(*)::text from app.frequence_facettes()') = 'ERR:42501:Connexion requise',
  'fréquence refusée à l''anonyme, au serveur et sans identité');
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
  SELECT ('b5000000-0000-4000-8000-00000000001' || i)::uuid, 'b3000000-0000-4000-8000-000000000001',
         ('b2000000-0000-4000-8000-00000000001' || i)::uuid, '{"1": 3}', pg_temp.sc13(), 'v1', 'c1'
    FROM generate_series(1, 4) i;
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.frequence_facettes()'), '0',
  'quatre résultats, sous le seuil d''anonymat : aucune ligne');
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version)
VALUES ('b5000000-0000-4000-8000-000000000015', 'b3000000-0000-4000-8000-000000000001',
        'b2000000-0000-4000-8000-000000000015', '{"1": 3}', pg_temp.sc13(), 'v1', 'c1');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text || ''|'' || count(distinct x.facette)::text || ''|'' || min(x.score)::text || ''|'' || min(x.effectif)::text || ''|'' || max(x.effectif)::text from app.frequence_facettes() x'),
  '30|30|13|5|5', 'cinq résultats, au seuil : trente facettes, score 13, effectif 5');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select (select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k) from app.frequence_facettes() x limit 1'),
  'effectif,facette,score', 'trois colonnes : ni identifiant, ni organisation, ni date');

-- ===== Retirer, puis effacer des comptes =====
SELECT is(pg_temp.appel(pg_temp.u_nx(), format('select app.retirer_relecteur(%L)::text', pg_temp.u_rl())),
  pg_temp.refus_admin(), 'une personne sans rôle ne retire pas');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.retirer_relecteur(%L)::text', pg_temp.u_rl())), 'true', 'retrait : vrai');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select app.suis_relecteur()::text'), 'false', 'retirée, la personne n''est plus relectrice');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.retirer_relecteur(%L)::text', pg_temp.u_rl())), 'false', 'retrait rejoué : faux, sans erreur');
SELECT is((SELECT string_agg(acteur::text || '|' || ressource_type || '|' || ressource_id::text, ',') FROM private.audit_log WHERE action = 'relecture.retirer'),
  pg_temp.u_ad()::text || '|utilisateur|' || pg_temp.u_rl()::text, 'une seule ligne de journal de retrait');
SELECT is(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu'), pg_temp.refus_relecteur(), 'retirée, elle ne relit plus');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()'), pg_temp.refus_relecteur(),
  'retirée, elle ne lit plus l''historique');
SELECT is(pg_temp.designer_langue(pg_temp.u_ad(), pg_temp.u_nx()), 'true|ar',
  'une autre personne est désignée ; la langue rendue est celle de son compte (arabe)');
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque), 1, 'un seul relecteur désigné');
DELETE FROM auth.users WHERE id = 'b2000000-0000-4000-8000-000000000003';
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque), 0, 'l''effacement du compte retire la désignation (cascade)');
DELETE FROM auth.users WHERE id = 'b2000000-0000-4000-8000-000000000002';
SELECT is((SELECT count(*)::int || '|' || count(*) FILTER (WHERE relecteur IS NULL)::int FROM app.relectures_blocs),
  '5|4', 'l''effacement du compte de la relectrice garde ses verdicts, sans auteur (relecteur à NULL)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.'), 17,
  'journal conservé : 2 désignations, 1 lecture de liste, 5 verdicts, 8 lectures d''historique, 1 retrait ; aucun refus');

-- ===== Plafond des verdicts : 200 par heure et par personne (décision d'Amine) =====
-- L'administrateur a déjà rendu un verdict dans l'heure ; on complète à 199 dans la fenêtre,
-- plus 50 verdicts de plus d'une heure qui ne comptent pas.
INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, relecteur, cree_le)
  SELECT 'C6/haut', pg_temp.hx(i), 'relu', pg_temp.u_ad(), now() - interval '59 minutes'
    FROM generate_series(1, 199 - (SELECT count(*)::int FROM app.relectures_blocs r
                                     WHERE r.relecteur = pg_temp.u_ad() AND r.cree_le > now() - interval '1 hour')) i;
INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, relecteur, cree_le)
  SELECT 'C6/haut', pg_temp.hx(1000 + i), 'relu', pg_temp.u_ad(), now() - interval '61 minutes'
    FROM generate_series(1, 50) i;
SELECT is((SELECT count(*)::int FROM app.relectures_blocs r WHERE r.relecteur = pg_temp.u_ad() AND r.cree_le > now() - interval '1 hour'),
  199, 'fixture : 199 verdicts de l''administrateur dans l''heure, 50 au-delà');
SELECT ok(pg_temp.relire(pg_temp.u_ad(), 'C6/haut', pg_temp.hx(5000), 'relu') ~ '^[0-9a-f]{8}-',
  'plafond des verdicts : le 200e de l''heure est accepté (les verdicts de plus d''une heure ne comptent pas)');
SELECT set_config('zz.journal_relu', (SELECT count(*)::text FROM private.audit_log l WHERE l.action = 'relecture.relu'), true);
SELECT is(pg_temp.relire(pg_temp.u_ad(), 'C6/haut', pg_temp.hx(5001), 'relu'), 'ERR:PT429:Plafond de verdicts atteint',
  'plafond des verdicts : le 201e de l''heure est refusé (PT429)');
SELECT is((SELECT count(*)::text || '|' || (SELECT count(*)::text FROM private.audit_log l WHERE l.action = 'relecture.relu')
             FROM app.relectures_blocs r WHERE r.relecteur = pg_temp.u_ad() AND r.empreinte = pg_temp.hx(5001)),
  '0|' || current_setting('zz.journal_relu'), 'le verdict refusé n''écrit rien, ni verdict ni journal');
SELECT is(pg_temp.relire(pg_temp.u_ad(), 'C6/haut', pg_temp.hx(5000), 'relu'),
  (SELECT string_agg(r.id::text, ',') FROM app.relectures_blocs r WHERE r.empreinte = pg_temp.hx(5000)),
  'au plafond, le verdict rejoué à l''identique rend encore la ligne existante (aucune écriture)');
SELECT ok(pg_temp.relire(pg_temp.u_ad2(), 'C6/haut', pg_temp.hx(5001), 'relu') ~ '^[0-9a-f]{8}-',
  'le plafond est par personne : un autre super administrateur rend son verdict');

-- ===== Plafond des désignations : 5 par heure et par personne (décision d'Amine) =====
-- L'administrateur a déjà désigné deux personnes dans l'heure (rl, nx).
SELECT is(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_q(1)) || ',' || pg_temp.designer(pg_temp.u_ad(), pg_temp.u_q(2))
          || ',' || pg_temp.designer(pg_temp.u_ad(), pg_temp.u_q(3)),
  'true,true,true', 'plafond des désignations : les 3e, 4e et 5e de l''heure sont acceptées');
SELECT is(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_q(4)), 'ERR:PT429:Plafond de désignations atteint',
  'plafond des désignations : la 6e de l''heure est refusée (PT429)');
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque WHERE user_id = pg_temp.u_q(4))
          + (SELECT count(*)::int FROM private.audit_log WHERE action = 'relecture.designer' AND ressource_id = pg_temp.u_q(4)),
  0, 'la désignation refusée n''écrit rien, ni relecteur ni journal');
SELECT is(pg_temp.designer(pg_temp.u_ad(), pg_temp.u_q(1)), 'false', 'au plafond, une désignation rejouée rend encore faux, sans erreur');
-- Second administrateur : 4 désignations dans l'heure et 6 au-delà, inscrites au journal.
INSERT INTO private.audit_log (cree_le, acteur, action, ressource_type, ressource_id)
  SELECT now() - CASE WHEN i <= 4 THEN interval '59 minutes' ELSE interval '61 minutes' END,
         pg_temp.u_ad2(), 'relecture.designer', 'utilisateur', gen_random_uuid()
    FROM generate_series(1, 10) i;
SELECT is(pg_temp.designer(pg_temp.u_ad2(), pg_temp.u_q(4)), 'true',
  'le plafond est par personne et par heure glissante : la 5e désignation du second administrateur est acceptée');
SELECT is(pg_temp.designer(pg_temp.u_ad2(), pg_temp.u_q(5)), 'ERR:PT429:Plafond de désignations atteint',
  'la 6e désignation du second administrateur dans l''heure est refusée');

-- ===== Conservation : 30 jours maximum (décision d'Amine) ; verdict courant conservé et anonymisé : défaut non validé =====
-- Verdicts anciens écrits directement (superutilisateur), du plus ancien au plus récent :
--   A2/milieu : 40 jours (antérieur), 31 jours (courant)        -> le premier purgé, le second anonymisé
--   A3/milieu : 31 jours (antérieur), 29 jours (courant)        -> le premier purgé, le second intact
--   A4/milieu : 29 jours (antérieur), 1 jour (courant)          -> les deux intacts
INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, commentaire, relecteur, cree_le) VALUES
  ('A2/milieu', pg_temp.e3(), 'relu',       'quarante jours',     pg_temp.u_pl(), now() - interval '40 days'),
  ('A2/milieu', pg_temp.e3(), 'a_corriger', 'trente et un jours', pg_temp.u_pl(), now() - interval '31 days'),
  ('A3/milieu', pg_temp.e3(), 'relu',       'purgée',             pg_temp.u_pl(), now() - interval '31 days'),
  ('A3/milieu', pg_temp.e3(), 'relu',       'vingt-neuf jours',   pg_temp.u_pl(), now() - interval '29 days'),
  ('A4/milieu', pg_temp.e3(), 'a_corriger', 'conservée',          pg_temp.u_pl(), now() - interval '29 days'),
  ('A4/milieu', pg_temp.e3(), 'relu',       NULL,                 pg_temp.u_pl(), now() - interval '1 day');
SELECT set_config('zz.autres_avant', (SELECT string_agg(r.id::text || r.verdict || coalesce(r.commentaire, '') || coalesce(r.relecteur::text, ''), ',' ORDER BY r.ordre)
                                        FROM app.relectures_blocs r WHERE r.empreinte <> pg_temp.e3()), true);
SELECT lives_ok('SELECT private.purger_quotidien()', 'la purge quotidienne s''exécute sans erreur');
SELECT is((SELECT count(*)::text || '|' || count(*) FILTER (WHERE r.cree_le < now() - interval '30 days')::text
             FROM app.relectures_blocs r WHERE r.empreinte = pg_temp.e3()),
  '4|1', 'purge : les verdicts antérieurs de 31 et 40 jours sont effacés (reste 4 lignes, dont une seule de plus de 30 jours)');
SELECT is((SELECT string_agg(r.verdict || '|' || coalesce(r.commentaire, '-') || '|' || coalesce(r.relecteur::text, '-') || '|' || r.anonymise::text
                             || '|' || (r.cree_le = now() - interval '31 days')::text, ',' ORDER BY r.ordre)
             FROM app.relectures_blocs r WHERE r.bloc = 'A2/milieu' AND r.empreinte = pg_temp.e3()),
  'a_corriger|-|-|true|true', 'purge : le verdict courant de 31 jours est conservé (bloc, empreinte, verdict, date) et anonymisé (ni relecteur ni commentaire)');
SELECT is((SELECT string_agg(r.bloc || '|' || r.verdict || '|' || coalesce(r.commentaire, '-') || '|' || (r.relecteur = pg_temp.u_pl())::text || '|' || r.anonymise::text,
                             ',' ORDER BY r.ordre)
             FROM app.relectures_blocs r WHERE r.bloc IN ('A3/milieu', 'A4/milieu') AND r.empreinte = pg_temp.e3()),
  'A3/milieu|relu|vingt-neuf jours|true|false,A4/milieu|a_corriger|conservée|true|false,A4/milieu|relu|-|true|false',
  'purge : les verdicts de 29 jours et moins sont intacts, antérieur compris (relecteur et commentaire gardés)');
SELECT is((SELECT string_agg(r.id::text || r.verdict || coalesce(r.commentaire, '') || coalesce(r.relecteur::text, ''), ',' ORDER BY r.ordre)
             FROM app.relectures_blocs r WHERE r.empreinte <> pg_temp.e3()),
  current_setting('zz.autres_avant'), 'purge : aucun autre verdict n''est touché');
SELECT is(pg_temp.appel(NULL, 'select string_agg(x.bloc || ''|'' || x.verdict, '','' order by x.bloc) from app.etat_relecture_blocs() x where x.empreinte = repeat(''e3'', 32)', 'service_role'),
  'A2/milieu|a_corriger,A3/milieu|relu,A4/milieu|relu', 'purge : l''état servi est inchangé (aucun bloc ne redevient masqué ni visible)');
SELECT is((SELECT (SELECT quantite FROM private.audit_log WHERE action = 'purge.relectures' ORDER BY id DESC LIMIT 1)::text || '|'
                  || (SELECT quantite FROM private.audit_log WHERE action = 'purge.relectures_anonymisees' ORDER BY id DESC LIMIT 1)::text),
  '2|1', 'traces chiffrées : 2 verdicts effacés, 1 verdict anonymisé');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l.action LIKE 'purge.relectures%' AND l.acteur IS NOT NULL),
  0, 'les traces de purge de l''historique n''ont pas d''acteur');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select string_agg(coalesce(x.relecteur_nom, ''-'') || ''|'' || coalesce(x.relecteur_adresse, ''-'') || ''|'' || coalesce(x.commentaire, ''-'') || ''|'' || x.est_moi::text, '','') from app.historique_relecture() x where x.bloc = ''A2/milieu'''),
  '-|-|-|false', 'le super administrateur lit le verdict anonymisé sans nom, sans adresse, sans commentaire');
SELECT lives_ok('SELECT private.purger_quotidien()', 'la seconde passe de la purge quotidienne s''exécute sans erreur');
SELECT is((SELECT (SELECT quantite FROM private.audit_log WHERE action = 'purge.relectures' ORDER BY id DESC LIMIT 1)::text || '|'
                  || (SELECT quantite FROM private.audit_log WHERE action = 'purge.relectures_anonymisees' ORDER BY id DESC LIMIT 1)::text
                  || '|' || (SELECT count(*)::text FROM app.relectures_blocs r WHERE r.empreinte = pg_temp.e3())),
  '0|0|4', 'une seconde passe n''efface et n''anonymise plus rien, et le dit (traces à 0)');
SELECT is(coalesce(current_setting('tenga.purge_relecture', true), ''), '', 'après la purge, le réglage de purge est retombé : il ne survit pas à l''appel');
SELECT ok(pg_temp.appel(NULL, 'select private.purger_historique_relecture()::text', 'service_role') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select private.purger_historique_relecture()::text') LIKE 'ERR:42501:%',
  'la purge de l''historique n''est appelable ni par le serveur ni par le rôle connecté');

-- ===== Le déclencheur ne laisse passer que le contexte de la purge =====
-- A5/milieu : 31 jours (antérieur), maintenant (courant).
INSERT INTO app.relectures_blocs (bloc, empreinte, verdict, commentaire, relecteur, cree_le) VALUES
  ('A5/milieu', pg_temp.e3(), 'relu', 'hors purge', pg_temp.u_pl(), now() - interval '31 days'),
  ('A5/milieu', pg_temp.e3(), 'relu', NULL,         pg_temp.u_pl(), now());
SELECT throws_ok($$DELETE FROM app.relectures_blocs WHERE bloc = 'A5/milieu' AND cree_le < now() - interval '30 days'$$,
  '55000', 'Historique de relecture en ajout seul', 'hors purge, un superutilisateur n''efface pas un verdict antérieur de 31 jours');
SELECT is(pg_temp.appel(NULL, $q$delete from app.relectures_blocs r where r.bloc = 'A5/milieu' and r.cree_le < now() - interval '30 days'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'hors purge, tenga_owner n''efface pas non plus un verdict antérieur de 31 jours (réglage de purge absent)');
SELECT set_config('tenga.purge_relecture', 'on', true);
SELECT throws_ok($$DELETE FROM app.relectures_blocs WHERE bloc = 'A5/milieu' AND cree_le < now() - interval '30 days'$$,
  '55000', 'Historique de relecture en ajout seul', 'le réglage de purge posé à la main ne suffit pas à un superutilisateur (rôle autre que tenga_owner)');
SELECT is(pg_temp.appel(NULL, $q$delete from app.relectures_blocs r where r.bloc = 'A4/milieu' and r.verdict = 'a_corriger'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : un verdict antérieur de 29 jours ne s''efface pas');
SELECT is(pg_temp.appel(NULL, $q$delete from app.relectures_blocs r where r.bloc = 'A2/milieu'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : le verdict courant, même échu, ne s''efface pas');
SELECT is(pg_temp.appel(NULL, $q$update app.relectures_blocs r set commentaire = null, relecteur = null, anonymise = true where r.bloc = 'A4/milieu' and r.verdict = 'a_corriger'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : un verdict de 29 jours ne s''anonymise pas');
SELECT is(pg_temp.appel(NULL, $q$update app.relectures_blocs r set commentaire = 'réécrit' where r.bloc = 'A5/milieu' and r.cree_le < now() - interval '30 days'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : un commentaire échu ne se réécrit pas (seule l''anonymisation complète passe)');
SELECT is(pg_temp.appel(NULL, $q$update app.relectures_blocs r set verdict = 'relu' where r.bloc = 'A2/milieu'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : le verdict d''un bloc ne se réécrit pas');
SELECT is(pg_temp.appel(NULL, $q$update app.relectures_blocs r set anonymise = false where r.bloc = 'A2/milieu'$q$, 'tenga_owner'),
  pg_temp.ajout_seul(), 'contexte de purge : une anonymisation ne se défait pas');
SELECT is(pg_temp.appel(NULL, $q$delete from app.relectures_blocs r where r.bloc = 'A5/milieu' and r.cree_le < now() - interval '30 days'$q$, 'tenga_owner'),
  'ok', 'contexte de purge (tenga_owner et réglage) : le verdict antérieur de 31 jours s''efface');
SELECT is((SELECT string_agg(coalesce(r.commentaire, '-'), ',') FROM app.relectures_blocs r WHERE r.bloc = 'A5/milieu'),
  '-', 'et lui seul : le verdict courant du bloc reste');
SELECT set_config('tenga.purge_relecture', '', true);
SELECT is((SELECT count(*)::int FROM private.audit_log l
            WHERE l.action ~ '^relecture\.(relu|a_corriger)$' AND (l.acteur IS NOT NULL OR l.ressource_id IS NOT NULL)),
  0, 'aucune ligne de journal de verdict ne porte d''auteur ni d''identifiant : la table est la seule trace nominative');

SELECT * FROM finish();
