-- Connexion, durcissement de la migration 0004 : code à 6 chiffres haché par
-- HMAC-SHA256 avec un secret de l'application (p_pepper) ou, à défaut, la clé
-- de repli de private.settings (F7) ; travail équivalent pour une adresse
-- inconnue (hachage factice et lignes de leurre, M2) ; purge des leurres et
-- des compteurs ; signatures et droits des fonctions.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(35);

-- Base vivante : la purge compte TOUTES les demandes et séries d'échecs échues ; comme
-- pour les leurres plus bas, l'état de départ réel des compteurs est vidé dans cette
-- transaction annulée (rien n'est effacé durablement).
DELETE FROM private.demandes_lien;
DELETE FROM private.echecs_code;
DELETE FROM private.echecs_mdp;

-- Base vivante : private.audit_log porte déjà des lignes réelles (ajout seul, jamais
-- effacées). Les lectures du journal de ce fichier passent par pg_temp.journal_test :
-- seules les lignes écrites pendant ce test, hors celles d'un compte présent avant lui
-- (activité réelle concurrente). Sur une base vide, la vue rend le journal entier.
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

-- Demande en service_role, avec ou sans secret d'application (NULL = absent).
CREATE FUNCTION pg_temp.demander(p_email text, p_pepper text DEFAULT NULL) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role',
    format($q$select concat_ws(' ', envoyer::text, coalesce(jeton, '-'), coalesce(code, '-'), coalesce(langue, '-')) from app.demander_lien_connexion(%L, %L)$q$, p_email, p_pepper))
$$;
CREATE FUNCTION pg_temp.code(p_email text, p_code text, p_pepper text DEFAULT NULL) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion(%L, %L, %L)::text$q$, p_email, p_code, p_pepper))
$$;

INSERT INTO auth.users (id, email) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('c0000000-0000-4000-8000-000000000002', 'deux@example.test'),
  ('c0000000-0000-4000-8000-000000000003', 'trois@example.test');

-- ===== Signatures et droits =====
SELECT is(to_regprocedure('app.demander_lien_connexion(text)')::text, NULL, 'l''ancienne signature demander(text) a disparu (pas de surcharge ambiguë)');
SELECT is(to_regprocedure('app.consommer_code_connexion(text, text)')::text, NULL, 'l''ancienne signature consommer_code(text, text) a disparu');
SELECT is(pg_get_function_arguments('app.demander_lien_connexion(text, text)'::regprocedure), 'p_email text, p_pepper text DEFAULT NULL::text',
  'demander : p_pepper est facultatif');
SELECT is(pg_get_function_arguments('app.consommer_code_connexion(text, text, text)'::regprocedure), 'p_email text, p_code text, p_pepper text DEFAULT NULL::text',
  'consommer code : p_pepper est facultatif');
SELECT is(
  (SELECT string_agg(r.rol, ',' ORDER BY r.rol)
     FROM unnest(ARRAY['anon', 'authenticated', 'service_role']) AS r(rol),
          unnest(ARRAY['app.demander_lien_connexion(text, text)'::regprocedure, 'app.consommer_code_connexion(text, text, text)'::regprocedure]) AS f(oid)
    WHERE has_function_privilege(r.rol, f.oid, 'EXECUTE')),
  'service_role,service_role', 'les nouvelles signatures sont réservées au serveur (service_role)');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select private.empreinte_code(gen_random_uuid(), '123456', NULL)::text$q$),
  'ERR:42501:permission denied for schema private', 'private.empreinte_code n''est pas appelable par l''API');

-- ===== F7 : HMAC avec la clé de repli =====
SELECT cmp_ok((SELECT octet_length(cle_hmac_code) FROM private.settings), '>=', 32, 'la clé de repli fait 32 octets au moins');
SELECT matches(set_config('zz.a', pg_temp.demander('un@example.test'), true), '^true [A-Za-z0-9_-]{43} [0-9]{6} fr$', 'demande sans p_pepper : acceptée, même forme qu''avant');
SELECT is(
  (SELECT code_hash FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000001'),
  extensions.hmac(convert_to((SELECT id FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000001')::text
                             || ':' || split_part(current_setting('zz.a'), ' ', 3), 'UTF8'),
                  (SELECT cle_hmac_code FROM private.settings), 'sha256'),
  'l''empreinte du code est un HMAC-SHA256 (lien:code) avec la clé de repli');
SELECT isnt(
  (SELECT code_hash FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000001'),
  sha256(convert_to((SELECT id FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000001')::text
                    || ':' || split_part(current_setting('zz.a'), ' ', 3), 'UTF8')),
  'ce n''est plus le SHA-256 simple d''avant (retrouvable par force brute sans secret)');
SELECT is(pg_temp.code('un@example.test', split_part(current_setting('zz.a'), ' ', 3)), 'c0000000-0000-4000-8000-000000000001',
  'le bon code, sans p_pepper des deux côtés, est accepté');

-- Une empreinte à l'ancienne (SHA-256 simple) n'est plus acceptée
SELECT matches(set_config('zz.b', pg_temp.demander('un@example.test'), true), '^true ', 'compte un : nouvelle demande');
UPDATE private.liens_connexion
   SET code_hash = sha256(convert_to(id::text || ':' || split_part(current_setting('zz.b'), ' ', 3), 'UTF8'))
 WHERE user_id = 'c0000000-0000-4000-8000-000000000001' AND consomme_le IS NULL;
SELECT is(pg_temp.code('un@example.test', split_part(current_setting('zz.b'), ' ', 3)), NULL, 'une empreinte SHA-256 simple n''ouvre plus rien');

-- ===== F7 : secret fourni par l'application =====
SELECT matches(set_config('zz.c', pg_temp.demander('deux@example.test', 'poivre-de-test-0123456789-abcdefghij'), true), '^true ', 'demande avec p_pepper : acceptée');
SELECT is(
  (SELECT code_hash FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000002'),
  extensions.hmac(convert_to((SELECT id FROM private.liens_connexion WHERE user_id = 'c0000000-0000-4000-8000-000000000002')::text
                             || ':' || split_part(current_setting('zz.c'), ' ', 3), 'UTF8'),
                  convert_to('poivre-de-test-0123456789-abcdefghij', 'UTF8'), 'sha256'),
  'avec p_pepper, la clé du HMAC est ce secret (et non la clé de repli)');
SELECT is(pg_temp.code('deux@example.test', split_part(current_setting('zz.c'), ' ', 3)), NULL,
  'le bon code sans p_pepper (clé de repli) est refusé : le secret fait partie du contrat');
SELECT is(pg_temp.code('deux@example.test', split_part(current_setting('zz.c'), ' ', 3), 'un-autre-poivre-0123456789-abcdefghijkl'), NULL,
  'le bon code avec un autre secret est refusé');
SELECT is(pg_temp.code('deux@example.test', split_part(current_setting('zz.c'), ' ', 3), 'poivre-de-test-0123456789-abcdefghij'), 'c0000000-0000-4000-8000-000000000002',
  'le bon code avec le même secret est accepté');
SELECT matches(pg_temp.demander('deux@example.test', 'trop-court'), '^ERR:22023:', 'un p_pepper de moins de 32 caractères est refusé (22023), jamais de repli silencieux');
SELECT matches(pg_temp.demander('inconnu@example.test', 'trop-court'), '^ERR:22023:', 'même refus pour une adresse inconnue (la validation précède la recherche)');
SELECT matches(pg_temp.code('deux@example.test', '123456', ''), '^ERR:22023:', 'un p_pepper vide est refusé aussi');

-- ===== M2 : travail équivalent pour une adresse inconnue =====
-- L'instance peut porter de vraies lignes de leurre : l'état de départ est vidé dans cette transaction annulée.
DELETE FROM private.leurre_connexion;
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 0, 'avant : aucune ligne de leurre');
SELECT is(pg_temp.demander('inconnu@example.test'), 'false - - -', 'demande, adresse inconnue : réponse neutre');
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 2, 'demande, adresse inconnue : deux lignes factices écrites');
SELECT is((SELECT count(*)::int FROM private.liens_connexion l WHERE l.user_id NOT IN (SELECT id FROM auth.users)), 0, 'et aucun vrai lien');
SELECT is(pg_temp.code('inconnu@example.test', '123456'), NULL, 'code, adresse inconnue : refusé');
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 5, 'code, adresse inconnue : trois lignes factices de plus');
SELECT is((SELECT count(*)::int FROM private.leurre_connexion WHERE octet_length(empreinte) <> 32), 0, 'les lignes de leurre ne portent que des empreintes de 32 octets');
SELECT is((SELECT count(*)::int FROM private.leurre_connexion l WHERE l::text LIKE '%@%' OR l::text LIKE '%inconnu%'), 0, 'aucune adresse dans le leurre');
SELECT matches(pg_temp.demander('trois@example.test'), '^true ', 'demande, adresse connue : acceptée');
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 5, 'adresse connue : aucune ligne de leurre (le vrai travail remplace le factice)');

-- ===== Purge : leurres, demandes et séries d'échecs échus =====
UPDATE private.leurre_connexion SET cree_le = now() - interval '2 days' WHERE id IN (SELECT id FROM private.leurre_connexion ORDER BY id LIMIT 3);
INSERT INTO private.demandes_lien (user_id, cree_le) VALUES ('c0000000-0000-4000-8000-000000000003', now() - interval '2 days');
INSERT INTO private.echecs_code (user_id, nb, depuis) VALUES ('c0000000-0000-4000-8000-000000000003', 3, now() - interval '2 days');

-- Vu rouge : sans règle de suppression, la RLS contraint la purge
DROP POLICY leurre_suppression_owner ON private.leurre_connexion;
SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 5, 'sans règle de suppression, la purge n''efface aucun leurre (la RLS la contraint)');
CREATE POLICY leurre_suppression_owner ON private.leurre_connexion FOR DELETE TO tenga_owner USING (true);

SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::int FROM private.leurre_connexion), 2, 'la purge efface les leurres de plus d''un jour et garde les récents');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.leurre_connexion' ORDER BY id DESC LIMIT 1), 3, 'trace chiffrée : 3 leurres effacés');
SELECT is((SELECT max(quantite) FROM pg_temp.journal_test audit_log WHERE action = 'purge.compteurs_connexion'), 2,
  'trace chiffrée : 2 compteurs effacés (une demande échue, une série d''échecs échue), dès la première passe');

SELECT * FROM finish();
