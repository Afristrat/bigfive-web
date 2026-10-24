-- Migration 0024 : corrections de revue du relevé du réseau réel (0023) et de
-- l'atelier de relecture (0022).
--   private.purger_quotidien : une ligne de membre échue n'est supprimée que si
--     aucune réponse ne la cite ni ne vient d'elle (la cascade effaçait les
--     réponses récentes des autres) ; verrou consultatif de chaque groupe concerné
--     pris avant les suppressions (même clé que reseau_repondre et l'opposition).
--   app.reseau_lire : « informe » dit l'état réel (informé et non opposé) ; le
--     consultant ne voit des personnes opposées que leur nombre par groupe
--     (« oppositions »), l'administrateur Tenga garde leur nom (décision d'Amine
--     du 24/10/2026).
--   app.reseau_exporter : même rendu, journalisé reseau.exporter (l'affichage
--     reste reseau.lire).
--   app.relire_bloc : longueur brute du commentaire bornée (4 000 caractères)
--     avant l'expression régulière, après les contrôles de connexion et de rôle.
-- Le fichier tourne aussi sur la production, qui contient de vraies données : il
-- ne compte que ses propres lignes (identifiants 44…, organisation de test).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(19);

-- Base vivante : lectures du journal par pg_temp.journal_test (lignes écrites pendant
-- ce test, hors celles d'un compte présent avant lui).
CREATE TEMP TABLE journal_avant AS SELECT id FROM private.audit_log;
CREATE TEMP TABLE comptes_avant AS SELECT id FROM auth.users;
CREATE TEMP VIEW journal_test AS
  SELECT j.* FROM private.audit_log j
   WHERE NOT EXISTS (SELECT 1 FROM pg_temp.journal_avant a WHERE a.id = j.id)
     AND (j.acteur IS NULL OR NOT EXISTS (SELECT 1 FROM pg_temp.comptes_avant c WHERE c.id = j.acteur));

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

-- Identités : u(1) Alice, u(3) Camille, u(4) Driss, u(5) Élise : groupe G de la
-- campagne K ; u(6) Farid, u(7) Omar : groupe H de K ; u(8) consultant ; u(9)
-- participant sans relecture ; u(10) administrateur Tenga (relecteur de droit) ;
-- u(11) responsable.
CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('44000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.p(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('44400000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.org() RETURNS uuid LANGUAGE sql AS $$ SELECT '44100000-0000-4000-8000-00000000000a'::uuid $$;
CREATE FUNCTION pg_temp.k() RETURNS uuid LANGUAGE sql AS $$ SELECT '44200000-0000-4000-8000-0000000000a1'::uuid $$;
CREATE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT '44300000-0000-4000-8000-000000000001'::uuid $$;
CREATE FUNCTION pg_temp.h() RETURNS uuid LANGUAGE sql AS $$ SELECT '44300000-0000-4000-8000-000000000002'::uuid $$;
CREATE FUNCTION pg_temp.code(x uuid) RETURNS text LANGUAGE sql AS $$
  SELECT CASE x WHEN pg_temp.p(1) THEN 'A' WHEN pg_temp.p(3) THEN 'C' WHEN pg_temp.p(4) THEN 'D'
                WHEN pg_temp.p(5) THEN 'E' WHEN pg_temp.p(6) THEN 'F' WHEN pg_temp.p(7) THEN 'O'
                ELSE coalesce(x::text, 'NULL') END
$$;
-- Lignes de membre et réponses de la campagne K (lettres), lues dans les tables.
CREATE FUNCTION pg_temp.membres() RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(pg_temp.code(m.participation_id), ',' ORDER BY pg_temp.code(m.participation_id)), '')
    FROM app.reseau_membres m WHERE m.campaign_id = pg_temp.k()
$$;
CREATE FUNCTION pg_temp.reponses() RETURNS text LANGUAGE sql AS $$
  SELECT coalesce(string_agg(pg_temp.code(r.repondant) || '>' || pg_temp.code(r.cite) || ':' || r.lien,
                             ',' ORDER BY pg_temp.code(r.repondant), pg_temp.code(r.cite), r.lien), '')
    FROM app.reseau_reponses r WHERE r.campaign_id = pg_temp.k()
$$;
-- Verrou consultatif transactionnel d'un groupe tenu par cette session (clé
-- hashtextextended(group_id::text, 0), celle de reseau_repondre et de l'opposition).
CREATE FUNCTION pg_temp.verrou(p_groupe uuid) RETURNS integer LANGUAGE sql AS $$
  SELECT count(*)::integer FROM pg_locks l
   WHERE l.locktype = 'advisory' AND l.pid = pg_backend_pid() AND l.objsubid = 1 AND l.granted
     AND ((l.classid::bigint << 32) | l.objid::bigint) = hashtextextended(p_groupe::text, 0)
$$;
-- Rendu d'une fonction de lecture (reseau_lire ou reseau_exporter) de la campagne K ;
-- un refus devient une chaîne JSON (aucun arrêt du fichier).
CREATE FUNCTION pg_temp.lecture(p_uid uuid, p_fn text) RETURNS jsonb LANGUAGE sql AS $$
  SELECT CASE WHEN x.t LIKE 'ERR:%' THEN to_jsonb(x.t) ELSE x.t::jsonb END
    FROM (SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.%I(%L)::text', p_fn, pg_temp.k())) AS t) x
$$;
CREATE FUNCTION pg_temp.relire(p_uid uuid, p_commentaire text) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated',
    format('select app.relire_bloc(%L, %L, %L, %L)::text', 'N1/bas', repeat('44', 32), 'relu', p_commentaire))
$$;

-- Fixtures : campagne en brouillon, groupes et composition, puis ouverture (gel de 0005).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (pg_temp.u(1), 'purge44-a@example.test', '{"nom": "Alice"}'),
  (pg_temp.u(3), 'purge44-c@example.test', '{"nom": "Camille"}'),
  (pg_temp.u(4), 'purge44-d@example.test', '{"nom": "Driss"}'),
  (pg_temp.u(5), 'purge44-e@example.test', '{"nom": "Élise"}'),
  (pg_temp.u(6), 'purge44-f@example.test', '{"nom": "Farid"}'),
  (pg_temp.u(7), 'purge44-o@example.test', '{"nom": "Omar"}'),
  (pg_temp.u(8), 'purge44-ca@example.test', '{}'),
  (pg_temp.u(9), 'purge44-x@example.test', '{}'),
  (pg_temp.u(10), 'purge44-ad@example.test', '{}'),
  (pg_temp.u(11), 'purge44-ra@example.test', '{}');
INSERT INTO app.organizations (id, slug, nom) VALUES (pg_temp.org(), 'purge44-essai', 'Organisation purge 44');
INSERT INTO app.memberships (user_id, organization_id, role)
SELECT pg_temp.u(n), pg_temp.org(), 'participant' FROM unnest(ARRAY[1, 3, 4, 5, 6, 7, 9]) n;
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  (pg_temp.u(8), pg_temp.org(), 'consultant'),
  (pg_temp.u(11), pg_temp.org(), 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES (pg_temp.u(10));
INSERT INTO app.campaigns (id, organization_id, titre) VALUES (pg_temp.k(), pg_temp.org(), 'Purge 44');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id)
SELECT pg_temp.p(n), pg_temp.k(), pg_temp.org(), pg_temp.u(n) FROM unnest(ARRAY[1, 3, 4, 5, 6, 7]) n;
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES
  (pg_temp.g(), pg_temp.k(), pg_temp.org(), 'Équipe G', 1),
  (pg_temp.h(), pg_temp.k(), pg_temp.org(), 'Équipe H', 2);
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
SELECT pg_temp.g(), pg_temp.k(), pg_temp.org(), pg_temp.p(n) FROM unnest(ARRAY[1, 3, 4, 5]) n;
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
SELECT pg_temp.h(), pg_temp.k(), pg_temp.org(), pg_temp.p(n) FROM unnest(ARRAY[6, 7]) n;
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = pg_temp.k();

-- Relevé (écriture directe du superutilisateur, dates posées) : dans G, Alice active
-- (un mois), Camille inactive depuis 36 mois et un jour, Driss et Élise depuis
-- 37 mois ; Alice a cité Camille il y a un mois (au mois 35) et Driss il y a 37 mois ;
-- Élise a cité Alice il y a un mois. Dans H, Farid informé et Omar opposé, récents.
INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id, accord_repondre_le, maj_le) VALUES
  (pg_temp.p(1), pg_temp.k(), pg_temp.org(), pg_temp.g(), now() - interval '1 month', now() - interval '1 month'),
  (pg_temp.p(3), pg_temp.k(), pg_temp.org(), pg_temp.g(), NULL, now() - interval '36 months 1 day'),
  (pg_temp.p(4), pg_temp.k(), pg_temp.org(), pg_temp.g(), NULL, now() - interval '37 months'),
  (pg_temp.p(5), pg_temp.k(), pg_temp.org(), pg_temp.g(), now() - interval '37 months', now() - interval '37 months'),
  (pg_temp.p(6), pg_temp.k(), pg_temp.org(), pg_temp.h(), NULL, now());
INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id, oppose_le, maj_le) VALUES
  (pg_temp.p(7), pg_temp.k(), pg_temp.org(), pg_temp.h(), now(), now());
INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur, repondu_le) VALUES
  (pg_temp.p(1), pg_temp.p(3), pg_temp.k(), pg_temp.org(), pg_temp.g(), 'conseil', 2, now() - interval '1 month'),
  (pg_temp.p(1), pg_temp.p(4), pg_temp.k(), pg_temp.org(), pg_temp.g(), 'conseil', 1, now() - interval '37 months'),
  (pg_temp.p(5), pg_temp.p(1), pg_temp.k(), pg_temp.org(), pg_temp.g(), 'information', 3, now() - interval '1 month');

-- ===== Garde : les données de ce fichier ont le sens attendu =====
SELECT is(pg_temp.membres() || '/' || pg_temp.reponses(), 'A,C,D,E,F,O/A>C:conseil,A>D:conseil,E>A:information',
  'fixture : six lignes de membre et trois réponses dans la campagne K');
SELECT is(
  (SELECT string_agg(p.oid::regprocedure::text || '|' || p.prosecdef::text || '|' || (p.proconfig = ARRAY['search_path=""']::text[])::text
                     || '|' || pg_get_userbyid(p.proowner)::text || '|' || has_function_privilege('anon', p.oid, 'EXECUTE')::text
                     || '|' || has_function_privilege('public', p.oid, 'EXECUTE')::text
                     || '|' || has_function_privilege('service_role', p.oid, 'EXECUTE')::text
                     || '|' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text, E'\n' ORDER BY p.oid::regprocedure::text)
     FROM pg_proc p
    WHERE p.oid IN ('private.purger_quotidien()'::regprocedure, 'app.reseau_lire(uuid)'::regprocedure,
                    'app.relire_bloc(text, text, text, text)'::regprocedure)
       OR (p.pronamespace IN ('app'::regnamespace, 'private'::regnamespace) AND p.proname IN ('reseau_exporter', 'reseau_rendu'))),
  $f$app.relire_bloc(text,text,text,text)|true|true|tenga_owner|false|false|false|true
app.reseau_exporter(uuid)|true|true|tenga_owner|false|false|false|true
app.reseau_lire(uuid)|true|true|tenga_owner|false|false|false|true
private.purger_quotidien()|true|true|tenga_owner|false|false|false|false
private.reseau_rendu(uuid,text,boolean)|false|true|tenga_owner|false|false|false|false$f$,
  'trois fonctions redéfinies, droits inchangés ; app.reseau_exporter (une signature) comme app.reseau_lire ; le rendu partagé, sans SECURITY DEFINER, fermé à l''API');

-- ===== Purge : garde des réponses récentes =====
SELECT set_config('zz.repere', (SELECT coalesce(max(l.id), 0)::text FROM pg_temp.journal_test l), true);
UPDATE private.settings SET conservation_reseau_mois = 36;
SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::text FROM app.reseau_reponses r
            WHERE r.repondant = pg_temp.p(1) AND r.cite = pg_temp.p(3) AND r.repondu_le = now() - interval '1 month'), '1',
  'Camille, inactive depuis 36 mois, citée il y a un mois par Alice : la réponse d''Alice (un mois) SUBSISTE');
SELECT is((SELECT count(*)::int FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(3)), 1,
  'la ligne de Camille, échue mais encore citée par une réponse récente, est gardée');
SELECT is((SELECT count(*)::int FROM app.reseau_membres m WHERE m.participation_id = pg_temp.p(5))
          || '/' || (SELECT count(*)::int FROM app.reseau_reponses r WHERE r.repondant = pg_temp.p(5)), '1/1',
  'la ligne d''Élise, échue mais auteur d''une réponse récente, est gardée avec sa réponse');
SELECT is(pg_temp.membres() || '/' || pg_temp.reponses(), 'A,C,E,F,O/A>C:conseil,E>A:information',
  'la réponse échue d''Alice vers Driss est purgée, puis la ligne échue et libre de Driss ; rien d''autre');
SELECT is(pg_temp.verrou(pg_temp.g()) || '/' || pg_temp.verrou(pg_temp.h()), '1/0',
  'la purge a pris le verrou de groupe de G (lignes échues), pas celui de H (rien d''échu)');
SELECT private.purger_quotidien();
SELECT is(pg_temp.membres() || '/' || pg_temp.reponses(), 'A,C,E,F,O/A>C:conseil,E>A:information',
  'seconde passe : rien ne change');
UPDATE app.reseau_reponses SET repondu_le = now() - interval '37 months'
 WHERE repondant = pg_temp.p(1) AND cite = pg_temp.p(3);
SELECT private.purger_quotidien();
SELECT is(pg_temp.membres() || '/' || pg_temp.reponses(), 'A,E,F,O/E>A:information',
  'une fois la réponse d''Alice échue, elle est purgée, puis la ligne de Camille ; Élise reste (réponse récente)');
SELECT is((SELECT count(*)::text || '/' || count(*) FILTER (WHERE l.acteur IS NOT NULL OR l.ressource_id IS NOT NULL OR l.organization_id IS NOT NULL)
             || '/' || bool_and(l.quantite >= 0)::text
             FROM pg_temp.journal_test l WHERE l.action IN ('purge.reseau_reponses', 'purge.reseau_membres') AND l.id > current_setting('zz.repere')::bigint),
  '6/0/true', 'trois passes, six traces chiffrées, aucune avec acteur, ressource ni organisation');

-- ===== Lecture : « informe » dit l'état réel ; personnes opposées comptées pour le consultant =====
SELECT is((SELECT string_agg((g ->> 'nom') || '=' || (g ->> 'oppositions') || ':' || coalesce((
                     SELECT string_agg((m ->> 'nom') || ':' || (m ->> 'informe') || ':' || (m ->> 'oppose'), ',' ORDER BY m ->> 'nom')
                       FROM jsonb_array_elements(g -> 'membres') m), ''), ' | ' ORDER BY i)
             FROM jsonb_array_elements(pg_temp.lecture(pg_temp.u(8), 'reseau_lire') -> 'groupes') WITH ORDINALITY x(g, i)),
  'Équipe G=0:Alice:true:false,Élise:true:false | Équipe H=1:Farid:true:false',
  'le consultant ne voit ni le nom ni la ligne d''Omar (opposé), seulement « oppositions » = 1 ; « informe » vrai pour les membres citables');
SELECT is((SELECT string_agg((g ->> 'nom') || '=' || (g ->> 'oppositions') || ':' || coalesce((
                     SELECT string_agg((m ->> 'nom') || ':' || (m ->> 'informe') || ':' || (m ->> 'oppose'), ',' ORDER BY m ->> 'nom')
                       FROM jsonb_array_elements(g -> 'membres') m), ''), ' | ' ORDER BY i)
             FROM jsonb_array_elements(pg_temp.lecture(pg_temp.u(10), 'reseau_lire') -> 'groupes') WITH ORDINALITY x(g, i)),
  'Équipe G=0:Alice:true:false,Élise:true:false | Équipe H=1:Farid:true:false,Omar:false:true',
  'l''administrateur Tenga garde le nom d''Omar : informé faux, opposé vrai, et le même nombre d''oppositions');

-- ===== Export : même rendu, action de journal distincte =====
SELECT is(pg_temp.lecture(pg_temp.u(8), 'reseau_exporter') = pg_temp.lecture(pg_temp.u(8), 'reseau_lire')
          AND pg_temp.lecture(pg_temp.u(10), 'reseau_exporter') = pg_temp.lecture(pg_temp.u(10), 'reseau_lire'), true,
  'app.reseau_exporter rend exactement le rendu de app.reseau_lire, pour le consultant comme pour l''administrateur Tenga');
SELECT is(
  (SELECT string_agg(DISTINCT x, '|') FROM unnest(ARRAY[
     pg_temp.comme(pg_temp.u(11), 'authenticated', format('select app.reseau_exporter(%L)::text', pg_temp.k())),
     pg_temp.comme(pg_temp.u(9), 'authenticated', format('select app.reseau_exporter(%L)::text', pg_temp.k())),
     pg_temp.comme(pg_temp.u(8), 'authenticated', format('select app.reseau_exporter(%L)::text', '44200000-0000-4000-8000-0000000000ff'))]) x)
  || ' / ' || pg_temp.comme(NULL, 'authenticated', format('select app.reseau_exporter(%L)::text', pg_temp.k()))
  || ' / ' || pg_temp.comme(pg_temp.u(8), 'service_role', format('select app.reseau_exporter(%L)::text', pg_temp.k())),
  'ERR:42501:Réservé au consultant affecté ou à un administrateur Tenga / ERR:42501:Connexion requise / ERR:42501:permission denied for function reseau_exporter',
  'export refusé au responsable, au participant, pour une campagne inexistante (même message), sans identité, à service_role');
SELECT is((SELECT string_agg(x.s, ',' ORDER BY x.s)
             FROM (SELECT l.action || '>' || CASE l.acteur WHEN pg_temp.u(8) THEN 'consultant' WHEN pg_temp.u(10) THEN 'admin' ELSE 'autre' END
                          || ':' || l.ressource_type || ':' || (l.ressource_id = pg_temp.k())::text || ':' || l.quantite::text AS s
                     FROM pg_temp.journal_test l WHERE l.action IN ('reseau.lire', 'reseau.exporter') AND l.organization_id = pg_temp.org()) x),
  'reseau.exporter>admin:campagne:true:1,reseau.exporter>consultant:campagne:true:1,reseau.lire>admin:campagne:true:1,reseau.lire>admin:campagne:true:1,reseau.lire>consultant:campagne:true:1,reseau.lire>consultant:campagne:true:1',
  'journal : l''affichage écrit reseau.lire, l''export reseau.exporter (acteur réel, campagne, quantité = réponses) ; aucun refus n''est journalisé');

-- ===== Relecture : commentaire borné avant l'expression régulière =====
SELECT is(pg_temp.relire(pg_temp.u(9), repeat('x', 5000)), 'ERR:42501:Réservé aux relecteurs de la bibliothèque',
  'un non-relecteur est refusé sur son rôle (42501), quel que soit le commentaire');
SELECT is(pg_temp.relire(pg_temp.u(10), repeat(' ', 3999) || 'ok'), 'ERR:22023:Relecture invalide : bloc, empreinte, verdict ou commentaire',
  'commentaire brut de 4 001 caractères (blancs compris) : refusé (22023) avant tout retrait des blancs');
SELECT is((SELECT count(*)::int FROM app.relectures_blocs r WHERE r.relecteur = pg_temp.u(10)), 0, 'le refus n''a rien écrit');
SELECT set_config('zz.verdict', pg_temp.relire(pg_temp.u(10), 'ok' || repeat(' ', 3998)), true);
SELECT is((SELECT r.commentaire FROM app.relectures_blocs r
            WHERE r.id::text = current_setting('zz.verdict') AND r.relecteur = pg_temp.u(10)), 'ok',
  'commentaire brut de 4 000 caractères : accepté, rangé sans ses blancs');

SELECT * FROM finish();
