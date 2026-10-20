-- Connexion par code à 6 chiffres, durcissement de la migration 0004 :
-- plafond d'essais PAR COMPTE qui survit aux nouveaux liens (M1), verrou
-- consultatif par compte (M1), plafond de demandes compté à part et budget
-- d'essais du lien sans effet collatéral (M3), journalisation des échecs et
-- des plafonds sans adresse (F8).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(41);

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

-- Demande de lien en service_role : « envoyer jeton code langue ».
CREATE FUNCTION pg_temp.demander(p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role',
    format($q$select concat_ws(' ', envoyer::text, coalesce(jeton, '-'), coalesce(code, '-'), coalesce(langue, '-')) from app.demander_lien_connexion(%L)$q$, p_email))
$$;

-- Code en service_role ; renvoie l'identifiant du compte ou NULL.
CREATE FUNCTION pg_temp.code(p_email text, p_code text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_code_connexion(%L, %L)::text$q$, p_email, p_code))
$$;

-- Un code à 6 chiffres différent de celui donné.
CREATE FUNCTION pg_temp.faux(p_code text) RETURNS text
LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN p_code = '000000' THEN '000001' ELSE '000000' END $$;

INSERT INTO auth.users (id, email) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'un@example.test'),
  ('b0000000-0000-4000-8000-000000000002', 'deux@example.test'),
  ('b0000000-0000-4000-8000-000000000003', 'trois@example.test'),
  ('b0000000-0000-4000-8000-000000000004', 'quatre@example.test'),
  ('b0000000-0000-4000-8000-000000000005', 'cinq@example.test');

-- ===== Le compteur est par compte : un nouveau lien ne renouvelle pas le budget =====
SELECT matches(set_config('zz.a', pg_temp.demander('un@example.test'), true), '^true ', 'compte un : première demande acceptée');
SELECT is((SELECT count(*)::int FROM generate_series(1, 5) g
            WHERE pg_temp.code('un@example.test', pg_temp.faux(split_part(current_setting('zz.a'), ' ', 3))) IS NULL), 5,
  'compte un : cinq mauvais codes refusés');
SELECT is((SELECT nb::int FROM private.echecs_code WHERE user_id = 'b0000000-0000-4000-8000-000000000001'), 5,
  'le compteur du compte vaut 5');
SELECT matches(set_config('zz.b', pg_temp.demander('un@example.test'), true), '^true ', 'compte un : un nouveau lien est accordé (cette demande n''est pas bloquée)');
SELECT is(pg_temp.code('un@example.test', split_part(current_setting('zz.b'), ' ', 3)), NULL,
  'le code du NOUVEAU lien est refusé : le plafond de 5 échecs survit aux nouveaux liens');
SELECT is((SELECT essais::int FROM private.liens_connexion WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.b'), ' ', 2), 'UTF8'))), 0,
  'le nouveau lien n''a rien perdu : son propre budget est intact');
SELECT is(pg_temp.comme(NULL, 'service_role', format($q$select app.consommer_lien_connexion(%L)::text$q$, split_part(current_setting('zz.b'), ' ', 2))),
  'b0000000-0000-4000-8000-000000000001', 'le lien lui-même reste utilisable pendant que le code est fermé');
SELECT is((SELECT count(*)::int FROM private.echecs_code WHERE user_id = 'b0000000-0000-4000-8000-000000000001'), 0,
  'une connexion réussie remet le compteur à zéro');
SELECT matches(set_config('zz.c', pg_temp.demander('un@example.test'), true), '^true ', 'après la connexion, une nouvelle demande est acceptée');
SELECT is(pg_temp.code('un@example.test', split_part(current_setting('zz.c'), ' ', 3)), 'b0000000-0000-4000-8000-000000000001',
  'et son code fonctionne de nouveau (compteur remis à zéro)');

-- ===== Fenêtre d'une heure =====
SELECT matches(set_config('zz.d', pg_temp.demander('deux@example.test'), true), '^true ', 'compte deux : demande acceptée');
INSERT INTO private.echecs_code (user_id, nb, depuis) VALUES ('b0000000-0000-4000-8000-000000000002', 5, now() - interval '59 minutes');
SELECT is(pg_temp.code('deux@example.test', split_part(current_setting('zz.d'), ' ', 3)), NULL,
  'série de 5 échecs commencée il y a 59 minutes : le bon code est encore refusé');
UPDATE private.echecs_code SET depuis = now() - interval '61 minutes' WHERE user_id = 'b0000000-0000-4000-8000-000000000002';
SELECT is(pg_temp.code('deux@example.test', split_part(current_setting('zz.d'), ' ', 3)), 'b0000000-0000-4000-8000-000000000002',
  'série commencée il y a 61 minutes : oubliée, le bon code est accepté');

SELECT matches(set_config('zz.e', pg_temp.demander('trois@example.test'), true), '^true ', 'compte trois : demande acceptée');
INSERT INTO private.echecs_code (user_id, nb, depuis) VALUES ('b0000000-0000-4000-8000-000000000003', 4, now() - interval '2 hours');
SELECT is(pg_temp.code('trois@example.test', pg_temp.faux(split_part(current_setting('zz.e'), ' ', 3))), NULL, 'série ancienne : un échec est refusé');
SELECT is((SELECT nb::int FROM private.echecs_code WHERE user_id = 'b0000000-0000-4000-8000-000000000003'), 1,
  'la série ancienne repart à 1 (et non à 5)');
SELECT ok((SELECT depuis > now() - interval '1 minute' FROM private.echecs_code WHERE user_id = 'b0000000-0000-4000-8000-000000000003'),
  'la nouvelle série commence maintenant');

-- ===== Verrou consultatif par compte =====
-- Verrou tenu par cette session sur la clé hashtextextended(<compte>, 0).
CREATE FUNCTION pg_temp.verrous(p_compte uuid) RETURNS integer
LANGUAGE sql AS $$
  SELECT count(*)::int FROM pg_locks l
   WHERE l.locktype = 'advisory' AND l.pid = pg_backend_pid() AND l.granted
     AND l.classid::bigint = (hashtextextended(p_compte::text, 0) >> 32) & 4294967295
     AND l.objid::bigint = hashtextextended(p_compte::text, 0) & 4294967295
$$;
SELECT is(pg_temp.verrous('b0000000-0000-4000-8000-000000000004'), 0, 'avant l''appel : aucun verrou consultatif sur le compte quatre');
SELECT is((SELECT count(*)::int FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()), 3,
  'avant l''appel : trois verrous tenus (les comptes déjà essayés, tenus jusqu''à la fin de la transaction)');
SELECT is(pg_temp.code('unknown@example.test', '123456'), NULL, 'adresse inconnue : refusée');
SELECT is((SELECT count(*)::int FROM pg_locks WHERE locktype = 'advisory' AND pid = pg_backend_pid()), 3,
  'adresse inconnue : aucun verrou de plus');
SELECT is(pg_temp.code('quatre@example.test', '123456'), NULL, 'compte quatre : code refusé (aucun lien)');
SELECT is(pg_temp.verrous('b0000000-0000-4000-8000-000000000004'), 1,
  'le verrou consultatif du compte est tenu jusqu''à la fin de la transaction (essais parallèles sérialisés)');

-- ===== M3 : le budget du lien ne s'use pas sur tous les liens du compte =====
SELECT matches(set_config('zz.f1', pg_temp.demander('cinq@example.test'), true), '^true ', 'compte cinq : premier lien');
SELECT matches(set_config('zz.f2', pg_temp.demander('cinq@example.test'), true), '^true ', 'compte cinq : second lien');
UPDATE private.liens_connexion SET cree_le = now() - interval '5 minutes'
 WHERE jeton_hash = sha256(convert_to(split_part(current_setting('zz.f1'), ' ', 2), 'UTF8'));
SELECT is(pg_temp.code('cinq@example.test', pg_temp.faux(split_part(current_setting('zz.f2'), ' ', 3))), NULL, 'compte cinq : un échec');
SELECT is(pg_temp.code('cinq@example.test', pg_temp.faux(split_part(current_setting('zz.f2'), ' ', 3))), NULL, 'compte cinq : un deuxième échec');
SELECT is(
  (SELECT string_agg(essais::text, ',' ORDER BY cree_le) FROM private.liens_connexion WHERE user_id = 'b0000000-0000-4000-8000-000000000005'),
  '0,2', 'les échecs usent le lien le plus récent seulement ; le lien plus ancien garde son budget entier');

-- ===== M3 : le plafond de demandes se compte à part des liens =====
INSERT INTO auth.users (id, email) VALUES ('b0000000-0000-4000-8000-000000000006', 'six@example.test');
SELECT matches(pg_temp.demander('six@example.test'), '^true ', 'demandes : première acceptée');
SELECT matches(pg_temp.demander('six@example.test'), '^true ', 'demandes : deuxième acceptée');
SELECT matches(pg_temp.demander('six@example.test'), '^true ', 'demandes : troisième acceptée');
DELETE FROM private.liens_connexion WHERE user_id = 'b0000000-0000-4000-8000-000000000006';
SELECT is(pg_temp.demander('six@example.test'), 'false - - -',
  'demandes : la quatrième est refusée même si les liens ont disparu (compte à part), réponse neutre');
SELECT is((SELECT count(*)::int FROM private.liens_connexion WHERE user_id = 'b0000000-0000-4000-8000-000000000006'), 0,
  'une demande refusée ne crée aucun lien');
SELECT is((SELECT count(*)::int FROM private.demandes_lien WHERE user_id = 'b0000000-0000-4000-8000-000000000006'), 3,
  'une demande refusée n''est pas comptée : trois demandes effectives');

-- ===== F8 : journal des échecs et des plafonds =====
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'connexion.echec' AND ressource_id = 'b0000000-0000-4000-8000-000000000001'), 5,
  'cinq échecs de code journalisés pour le compte un');
SELECT is((SELECT string_agg(quantite::text, ',' ORDER BY id) FROM private.audit_log WHERE action = 'connexion.echec' AND ressource_id = 'b0000000-0000-4000-8000-000000000001'),
  '1,2,3,4,5', 'la quantité journalisée est le rang de l''échec dans la série');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'connexion.plafond' AND ressource_id = 'b0000000-0000-4000-8000-000000000001'), 1,
  'le plafond de 5 échecs est journalisé une fois (les refus suivants n''inondent pas le journal)');
SELECT is(pg_temp.demander('six@example.test'), 'false - - -', 'demandes : la cinquième est refusée aussi');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'connexion.plafond' AND ressource_id = 'b0000000-0000-4000-8000-000000000006'), 1,
  'le plafond de demandes est journalisé une fois pour le compte six, pas à chaque refus');
SELECT is((SELECT count(*)::int FROM private.audit_log
            WHERE action IN ('connexion.echec', 'connexion.plafond') AND (acteur IS NOT NULL OR ressource_type <> 'utilisateur' OR ressource_id IS NULL)), 0,
  'ces lignes n''ont pas d''acteur et portent l''identifiant du compte');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l::text LIKE '%@%'), 0, 'le journal de connexion ne contient aucune adresse e-mail');

SELECT * FROM finish();
