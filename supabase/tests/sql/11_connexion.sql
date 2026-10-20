-- Connexion par lien /c/{jeton} et code à 6 chiffres (plan § 4) : seules les
-- empreintes sont stockées, usage unique, expiration, plafond de demandes et
-- d'essais, réponse de même forme pour une adresse inconnue.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(45);

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

-- Demande de lien en service_role : « envoyer jeton code langue », champs absents remplacés par « - ».
CREATE FUNCTION pg_temp.demander(p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role',
    format($q$select concat_ws(' ', envoyer::text, coalesce(jeton, '-'), coalesce(code, '-'), coalesce(langue, '-')) from app.demander_lien_connexion(%L)$q$, p_email))
$$;

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'deux@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'quatre@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'cinq@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'six@example.test');
INSERT INTO auth.users (id, email, banned_until) VALUES
  ('a0000000-0000-4000-8000-000000000003', 'banni@example.test', now() + interval '1 day');
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000007', 'arabe@example.test', '{"langue":"ar"}');

-- ===== Droits d'exécution =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select count(*) from app.demander_lien_connexion('un@example.test')$q$), 'ERR:42501:permission denied for schema app', 'demander : anonyme refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select count(*) from app.demander_lien_connexion('un@example.test')$q$), 'ERR:42501:permission denied for function demander_lien_connexion', 'demander : un compte connecté ne peut pas forger de lien');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.consommer_lien_connexion('x')::text$q$), 'ERR:42501:permission denied for function consommer_lien_connexion', 'consommer lien : réservé au serveur');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.consommer_code_connexion('un@example.test', '123456')::text$q$), 'ERR:42501:permission denied for function consommer_code_connexion', 'consommer code : réservé au serveur');

-- ===== Demande =====
-- L'instance peut porter de vrais liens (sessions d'essai sur la préproduction) : l'état de départ est vidé dans cette transaction annulée.
DELETE FROM private.liens_connexion;
SELECT matches(set_config('zz.l1', pg_temp.demander('un@example.test'), true), '^true [A-Za-z0-9_-]{43} [0-9]{6} fr$', 'demander : adresse connue, jeton de 43 caractères base64url, code à 6 chiffres, langue du profil');
SELECT matches(set_config('zz.l1b', pg_temp.demander('  UN@Example.TEST '), true), '^true [A-Za-z0-9_-]{43} [0-9]{6} fr$', 'demander : adresse normalisée (casse et espaces)');
SELECT isnt(split_part(current_setting('zz.l1'), ' ', 2), split_part(current_setting('zz.l1b'), ' ', 2), 'deux demandes donnent deux jetons différents');
SELECT matches(pg_temp.demander('arabe@example.test'), '^true .* ar$', 'demander : la langue du profil accompagne le lien');
SELECT is(pg_temp.demander('inconnu@example.test'), 'false - - -', 'demander : adresse inconnue, même forme de réponse, rien d''envoyé');
SELECT is(pg_temp.demander('banni@example.test'), 'false - - -', 'demander : compte banni, rien d''envoyé');
SELECT is(pg_temp.demander(NULL), 'false - - -', 'demander : adresse absente, rien d''envoyé');
SELECT is((SELECT count(*)::int FROM private.liens_connexion), 3, 'seules les demandes éligibles créent un lien (les trois : un ×2, arabe ×1)');

-- Seules les empreintes sont stockées
SELECT is((SELECT count(*)::int FROM private.liens_connexion
            WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.l1'), ' ', 2), 'UTF8'))), 1,
  'la ligne stocke l''empreinte SHA-256 du jeton');
SELECT is((SELECT count(*)::int FROM private.liens_connexion l
            WHERE l::text LIKE '%' || split_part(current_setting('zz.l1'), ' ', 2) || '%'
               OR l::text LIKE '%' || split_part(current_setting('zz.l1'), ' ', 3) || '%'), 0,
  'ni le jeton ni le code ne figurent en clair dans la table');
SELECT is((SELECT count(*)::int FROM private.liens_connexion WHERE expire_le - cree_le = interval '15 minutes'), 3, 'chaque lien expire 15 minutes après sa création');

-- ===== Plafond de demandes : 3 par compte et par 15 minutes =====
SELECT matches(pg_temp.demander('deux@example.test'), '^true ', 'plafond : première demande acceptée');
SELECT matches(pg_temp.demander('deux@example.test'), '^true ', 'plafond : deuxième demande acceptée');
SELECT matches(pg_temp.demander('deux@example.test'), '^true ', 'plafond : troisième demande acceptée');
SELECT is(pg_temp.demander('deux@example.test'), 'false - - -', 'plafond : la quatrième est refusée, même forme de réponse');

-- ===== Consommation du lien =====
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_lien_connexion('zzz')::text$q$), NULL, 'lien : jeton mal formé refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_lien_connexion(NULL)::text$q$), NULL, 'lien : jeton absent refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_lien_connexion(repeat('A', 43))::text$q$), NULL, 'lien : jeton inconnu refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l1'), ' ', 2))),
  'a0000000-0000-4000-8000-000000000001', 'lien : le bon jeton renvoie le compte');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l1'), ' ', 2))),
  NULL, 'lien : usage unique, le même jeton ne sert qu''une fois');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l1b'), ' ', 2))),
  NULL, 'lien : l''autre lien du même compte est éteint par la première connexion');
SELECT ok((SELECT derniere_connexion_le IS NOT NULL FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 'la dernière connexion est posée sur le profil');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'connexion.reussie' AND acteur = 'a0000000-0000-4000-8000-000000000001'), 1, 'une connexion réussie est journalisée une fois');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l::text LIKE '%@%'), 0, 'le journal de connexion ne contient aucune adresse e-mail');

-- Expiré
SELECT matches(set_config('zz.l1c', pg_temp.demander('un@example.test'), true), '^true ', 'lien expiré : nouvelle demande acceptée');
UPDATE private.liens_connexion SET cree_le = now() - interval '1 hour', expire_le = now() - interval '45 minutes'
 WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.l1c'), ' ', 2), 'UTF8'));
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l1c'), ' ', 2))),
  NULL, 'lien : expiré, refusé');

-- Banni après l'envoi
SELECT matches(set_config('zz.l5', pg_temp.demander('cinq@example.test'), true), '^true ', 'banni après envoi : demande acceptée');
UPDATE auth.users SET banned_until = now() + interval '1 day' WHERE id = 'a0000000-0000-4000-8000-000000000005';
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l5'), ' ', 2))),
  NULL, 'lien : un compte banni après l''envoi ne se connecte pas');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion('cinq@example.test', %L)::text$q$, split_part(current_setting('zz.l5'), ' ', 3))),
  NULL, 'code : un compte banni après l''envoi ne se connecte pas');

-- ===== Consommation du code =====
SELECT matches(set_config('zz.l4', pg_temp.demander('quatre@example.test'), true), '^true ', 'code : demande acceptée');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_code_connexion('inconnu@example.test', '123456')::text$q$), NULL, 'code : adresse inconnue refusée');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.consommer_code_connexion('quatre@example.test', 'abcdef')::text$q$), NULL, 'code : format invalide refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion('quatre@example.test', %L)::text$q$,
  CASE WHEN split_part(current_setting('zz.l4'), ' ', 3) = '000000' THEN '000001' ELSE '000000' END)), NULL, 'code : mauvais code refusé');
SELECT is((SELECT essais::int FROM private.liens_connexion WHERE user_id = 'a0000000-0000-4000-8000-000000000004'), 2, 'chaque échec use un essai (le code mal formé et le mauvais code comptent)');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion(' QUATRE@example.test', %L)::text$q$, split_part(current_setting('zz.l4'), ' ', 3))),
  'a0000000-0000-4000-8000-000000000004', 'code : le bon code, adresse normalisée, renvoie le compte');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion('quatre@example.test', %L)::text$q$, split_part(current_setting('zz.l4'), ' ', 3))),
  NULL, 'code : usage unique');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l4'), ' ', 2))),
  NULL, 'code : le lien correspondant est consommé en même temps');

-- Plafond d'essais : 5 échecs éteignent les codes des liens actifs du compte
SELECT matches(set_config('zz.l6', pg_temp.demander('six@example.test'), true), '^true ', 'essais : demande acceptée');
SELECT is((SELECT count(*)::int FROM generate_series(1, 5) g
            WHERE pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion('six@example.test', %L)::text$q$,
              CASE WHEN split_part(current_setting('zz.l6'), ' ', 3) = '000000' THEN '000001' ELSE '000000' END)) IS NULL), 5, 'essais : cinq mauvais codes refusés');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion('six@example.test', %L)::text$q$, split_part(current_setting('zz.l6'), ' ', 3))),
  NULL, 'essais : après cinq échecs, même le bon code est refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.l6'), ' ', 2))),
  'a0000000-0000-4000-8000-000000000006', 'essais : le lien du même mail reste valable (le code seul est bloqué)');

SELECT * FROM finish();
