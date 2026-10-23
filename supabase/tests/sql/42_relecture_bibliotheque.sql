-- Migration 0022 : atelier de relecture de la bibliothèque de textes.
-- private.relecteurs_bibliotheque et app.relectures_blocs (RLS forcée, aucun droit de
-- table pour l'API, écriture refusée à l'API, historique en ajout seul) et huit
-- fonctions contrôlées : app.suis_relecteur, app.relire_bloc (super administrateur ou
-- relecteur désigné ; entrées invalides refusées en 22023 de même message ; verdict
-- rejoué sans écriture), app.historique_relecture (lecture journalisée),
-- app.etat_relecture_blocs (service_role seul : dernier verdict par bloc et empreinte),
-- app.frequence_facettes (histogramme, rien sous le seuil d'anonymat),
-- app.designer_relecteur, app.retirer_relecteur, app.lister_relecteurs (super
-- administrateur seul). Exécution à l'épreuve de déploiement, jamais sur le poste ;
-- épreuve en transaction annulée : scripts/epreuve-relecture.sql.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(77);

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

-- Personnages : ad administrateur Tenga, rl relectrice (désignée en cours de fichier),
-- nx sans aucun rôle, bn compte suspendu, p1 à p5 participants (résultats de fréquence).
CREATE FUNCTION pg_temp.u_ad() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.u_rl() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.u_nx() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000003'::uuid $$;
CREATE FUNCTION pg_temp.u_bn() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-000000000004'::uuid $$;
CREATE FUNCTION pg_temp.u_x9() RETURNS uuid LANGUAGE sql AS $$ SELECT 'b2000000-0000-4000-8000-0000000000ff'::uuid $$;
-- Deux empreintes de texte (64 caractères hexadécimaux).
CREATE FUNCTION pg_temp.e1() RETURNS text LANGUAGE sql AS $$ SELECT repeat('e1', 32) $$;
CREATE FUNCTION pg_temp.e2() RETURNS text LANGUAGE sql AS $$ SELECT repeat('e2', 32) $$;

CREATE FUNCTION pg_temp.relire(p_uid uuid, p_bloc text, p_emp text, p_verdict text, p_com text DEFAULT NULL,
                               p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, format('select app.relire_bloc(%L, %L, %L, %L)::text', p_bloc, p_emp, p_verdict, p_com))
$$;
CREATE FUNCTION pg_temp.appel(p_uid uuid, p_sql text, p_role text DEFAULT 'authenticated') RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, p_role, p_sql)
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
  ('b2000000-0000-4000-8000-000000000003', 'nx-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000004', 'bn-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000011', 'p1-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000012', 'p2-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000013', 'p3-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000014', 'p4-relecture@example.test', '{}'),
  ('b2000000-0000-4000-8000-000000000015', 'p5-relecture@example.test', '{}');
UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = 'b2000000-0000-4000-8000-000000000004';
INSERT INTO private.tenga_admins (user_id) VALUES ('b2000000-0000-4000-8000-000000000001');
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
private.relecteurs_bibliotheque|relecteurs_insertion_owner|INSERT|tenga_owner
private.relecteurs_bibliotheque|relecteurs_lecture_owner|SELECT|tenga_owner
private.relecteurs_bibliotheque|relecteurs_suppression_owner|DELETE|tenga_owner$f$,
  'règles réservées à tenga_owner ; aucune suppression d''historique');
SELECT is((SELECT count(*)::int FROM pg_trigger t
            WHERE t.tgrelid IN ('app.relectures_blocs'::regclass, 'private.relecteurs_bibliotheque'::regclass)
              AND t.tgfoid = 'private.refuser_ecriture_api'::regproc AND t.tgenabled = 'O'
              AND (((t.tgtype & 1) = 1 AND (t.tgtype & 28) <> 0) OR (t.tgtype & 32) = 32)),
  4, 'refuser_ecriture_api actif sur les deux tables (ligne et vidage)');
SELECT is((SELECT string_agg(t.tgname, ',' ORDER BY t.tgname COLLATE "C") FROM pg_trigger t
            WHERE t.tgrelid = 'app.relectures_blocs'::regclass AND NOT t.tgisinternal AND t.tgenabled = 'O'
              AND t.tgname !~ '_sans_(ecriture|vidage)_api$'),
  'relectures_blocs_transition', 'un seul autre déclencheur sur l''historique : relectures_blocs_transition');
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
  || pg_get_function_result('app.lister_relecteurs()'::regprocedure),
  $f$TABLE(relecture_id uuid, bloc text, empreinte text, verdict text, commentaire text, relecteur_nom text, relecteur_adresse text, est_moi boolean, cree_le timestamp with time zone)
TABLE(bloc text, empreinte text, verdict text)
TABLE(facette text, score numeric, effectif integer)
TABLE(user_id uuid, adresse text, ajoute_le timestamp with time zone)$f$,
  'colonnes rendues : l''état servi ne porte ni relecteur, ni commentaire, ni date');

-- ===== suis_relecteur =====
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text'), 'true', 'un super administrateur est relecteur de droit');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select app.suis_relecteur()::text'), 'false', 'un compte non désigné n''est pas relecteur');
SELECT is(pg_temp.appel(NULL, 'select app.suis_relecteur()::text'), 'false', 'sans identité : faux, sans erreur');
SELECT ok(pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), 'select app.suis_relecteur()::text', 'service_role') LIKE 'ERR:42501:%',
  'anon et service_role ne peuvent pas appeler suis_relecteur');

-- ===== Désigner, lister, retirer : super administrateur seul =====
SELECT is(pg_temp.appel(pg_temp.u_nx(), format('select app.designer_relecteur(%L)::text', pg_temp.u_rl())),
  pg_temp.refus_admin(), 'une personne sans rôle ne désigne pas');
SELECT is(pg_temp.appel(pg_temp.u_rl(), format('select app.designer_relecteur(%L)::text', pg_temp.u_rl())),
  pg_temp.refus_admin(), 'personne ne se désigne soi-même');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_x9())),
  'ERR:22023:Compte inconnu', 'compte inconnu refusé');
SELECT is(pg_temp.appel(pg_temp.u_ad(), 'select app.designer_relecteur(NULL)::text'),
  'ERR:22023:Compte inconnu', 'compte nul refusé');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_bn())),
  'ERR:22023:Compte suspendu', 'compte suspendu refusé');
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque) + (SELECT count(*)::int FROM private.audit_log WHERE action = 'relecture.designer'),
  0, 'aucun refus n''a écrit de relecteur ni de journal');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_rl())), 'true', 'désignation : vrai');
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_rl())), 'false', 'désignation rejouée : faux, sans erreur');
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
SELECT ok(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_nx()), 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_nx()), 'service_role') LIKE 'ERR:42501:%'
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
       ('16 commentaire trop long',  'N1/bas',     pg_temp.e1(),               'relu',       repeat('x', 2001))
     ) AS c(nom, bloc, emp, verdict, com)),
  (SELECT string_agg(c.nom || '=' || pg_temp.invalide(), E'\n' ORDER BY c.nom)
     FROM unnest(ARRAY['01 bloc nul', '02 facette 7', '03 domaine inconnu', '04 niveau inconnu', '05 minuscule',
                       '06 espace final', '07 empreinte nulle', '08 empreinte courte', '09 empreinte majuscule',
                       '10 empreinte non hexa', '11 verdict nul', '12 verdict majuscule', '13 verdict inconnu',
                       '14 correction sans texte', '15 correction en blanc', '16 commentaire trop long']) AS c(nom)),
  'seize entrées invalides : 22023, un seul message');
SELECT is((SELECT count(*)::int FROM app.relectures_blocs) + (SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.(relu|a_corriger)$'),
  0, 'aucun refus n''a écrit de verdict ni de journal');

SELECT ok(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', repeat('y', 2000))
            ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
  'commentaire de 2 000 caractères accepté');
SELECT is(pg_temp.relire(pg_temp.u_rl(), 'N1/bas', pg_temp.e1(), 'relu', repeat('y', 2000)),
  (SELECT r.id::text FROM app.relectures_blocs r WHERE r.bloc = 'N1/bas'),
  'même verdict rejoué par la même personne sur le même texte : la ligne existante est rendue');
SELECT is((SELECT string_agg(r.bloc || '|' || r.empreinte || '|' || r.verdict || '|' || char_length(r.commentaire)::text || '|' || r.relecteur::text, ','
                             ORDER BY r.ordre) FROM app.relectures_blocs r),
  'N1/bas|' || pg_temp.e1() || '|relu|2000|' || pg_temp.u_rl()::text, 'une seule ligne écrite, rangée telle quelle');
SELECT is((SELECT string_agg(l.acteur::text || '|' || l.ressource_type || '|' || (l.ressource_id = r.id)::text, ',')
             FROM private.audit_log l CROSS JOIN app.relectures_blocs r WHERE l.action = 'relecture.relu'),
  pg_temp.u_rl()::text || '|relecture|true', 'une seule ligne de journal relecture.relu, liée au verdict');

SELECT ok(pg_temp.relire(pg_temp.u_ad(), 'N1/bas', pg_temp.e1(), 'a_corriger', E'  À reformuler : « vous » pluriel.\n ') !~ '^ERR',
  'le super administrateur demande une correction, commentaire à l''appui');
SELECT is((SELECT r.commentaire FROM app.relectures_blocs r WHERE r.verdict = 'a_corriger'),
  'À reformuler : « vous » pluriel.', 'le commentaire est rangé sans les blancs qui l''entourent');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'relecture.a_corriger' AND acteur = pg_temp.u_ad()),
  1, 'une ligne de journal relecture.a_corriger');
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

-- ===== Historique =====
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()'), '5', 'la relectrice lit les cinq verdicts');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select (select string_agg(k, '','' order by k) from jsonb_object_keys(to_jsonb(x)) k) from app.historique_relecture() x limit 1'),
  'bloc,commentaire,cree_le,empreinte,est_moi,relecteur_adresse,relecteur_nom,relecture_id,verdict', 'neuf colonnes');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select string_agg(x.bloc || ''|'' || x.verdict, '','') from (select * from app.historique_relecture() limit 2) x'),
  'E3/haut|relu,N1/bas|a_corriger', 'du plus récent au plus ancien');
SELECT is(pg_temp.appel(pg_temp.u_rl(), 'select string_agg(s.e, '','' order by s.e) from (select distinct x.est_moi::text || ''|'' || coalesce(x.relecteur_nom, ''-'') || ''|'' || x.relecteur_adresse as e from app.historique_relecture() x) s'),
  'false|-|ad-relecture@example.test,true|Relectrice Essai|rl-relecture@example.test', 'nom de profil, adresse, est_moi vrai sur ses seuls verdicts');
SELECT is((SELECT count(*)::text || '|' || min(acteur::text) || '|' || max(acteur::text) || '|' || min(quantite)::text || '|' || max(quantite)::text
             FROM private.audit_log WHERE action = 'relecture.lister'),
  '4|' || pg_temp.u_rl()::text || '|' || pg_temp.u_rl()::text || '|5|5', 'chaque lecture de l''historique est journalisée avec sa quantité');
SELECT ok(pg_temp.appel(pg_temp.u_nx(), 'select count(*)::text from app.historique_relecture()') = pg_temp.refus_relecteur()
          AND pg_temp.appel(NULL, 'select count(*)::text from app.historique_relecture()') = 'ERR:42501:Connexion requise'
          AND pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()', 'anon') LIKE 'ERR:42501:%'
          AND pg_temp.appel(pg_temp.u_rl(), 'select count(*)::text from app.historique_relecture()', 'service_role') LIKE 'ERR:42501:%',
  'historique refusé à une personne sans rôle, sans identité, à l''anonyme et au serveur');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.' AND to_jsonb(audit_log)::text ~ '@'),
  0, 'aucune ligne de journal de relecture ne contient d''adresse');

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
SELECT throws_ok(format('UPDATE app.relectures_blocs SET relecteur = %L WHERE relecteur = %L', pg_temp.u_ad(), pg_temp.u_rl()),
  '55000', 'Historique de relecture en ajout seul', 'un verdict ne change pas d''auteur');
SELECT throws_ok(format('INSERT INTO app.relectures_blocs (bloc, empreinte, verdict) VALUES (%L, %L, %L)', 'N2/bas', pg_temp.e1(), 'a_corriger'),
  '23514', NULL, 'contrainte : une correction exige un commentaire, même en écriture directe');

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
SELECT is(pg_temp.appel(pg_temp.u_ad(), format('select app.designer_relecteur(%L)::text', pg_temp.u_nx())), 'true',
  'une autre personne est désignée');
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque), 1, 'un seul relecteur désigné');
DELETE FROM auth.users WHERE id = 'b2000000-0000-4000-8000-000000000003';
SELECT is((SELECT count(*)::int FROM private.relecteurs_bibliotheque), 0, 'l''effacement du compte retire la désignation (cascade)');
DELETE FROM auth.users WHERE id = 'b2000000-0000-4000-8000-000000000002';
SELECT is((SELECT count(*)::int || '|' || count(*) FILTER (WHERE relecteur IS NULL)::int FROM app.relectures_blocs),
  '5|4', 'l''effacement du compte de la relectrice garde ses verdicts, sans auteur (relecteur à NULL)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action ~ '^relecture\.'), 13,
  'journal conservé : 2 désignations, 1 lecture de liste, 5 verdicts, 4 lectures d''historique, 1 retrait ; aucun refus');

SELECT * FROM finish();
