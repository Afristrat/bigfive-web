-- Migration 0025 : accord au rapport nominatif du relevé du réseau réel.
-- app.reseau_membres.accord_rapport_le ; app.reseau_consentir à QUATRE arguments
-- (p_participation, p_repondre, p_carte, p_rapport) ; l'ancienne signature à trois
-- arguments est supprimée ; une opposition ou un retrait remet les trois accords à
-- NULL ; l'export de la personne porte accord_rapport_le.
-- Le fichier tourne aussi sur la production, qui contient de vraies données : il ne
-- compte que ses propres lignes (identifiants 45…, organisation de test).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(23);

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

-- u(1) Alice, u(2) Bruno : groupe G de la campagne K (organisation O).
CREATE FUNCTION pg_temp.u(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('45000000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.p(n integer) RETURNS uuid LANGUAGE sql AS $$
  SELECT ('45400000-0000-4000-8000-' || lpad(to_hex(n), 12, '0'))::uuid
$$;
CREATE FUNCTION pg_temp.org() RETURNS uuid LANGUAGE sql AS $$ SELECT '45100000-0000-4000-8000-00000000000a'::uuid $$;
CREATE FUNCTION pg_temp.k() RETURNS uuid LANGUAGE sql AS $$ SELECT '45200000-0000-4000-8000-0000000000a1'::uuid $$;
CREATE FUNCTION pg_temp.g() RETURNS uuid LANGUAGE sql AS $$ SELECT '45300000-0000-4000-8000-000000000001'::uuid $$;

CREATE FUNCTION pg_temp.inf(p_uid uuid, p_part uuid, p_opp boolean) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_informer(%L, %L)', p_part, p_opp))
$$;
CREATE FUNCTION pg_temp.cons(p_uid uuid, p_part uuid, p_r boolean, p_c boolean, p_rap boolean) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_consentir(%L, %L, %L, %L)', p_part, p_r, p_c, p_rap))
$$;
CREATE FUNCTION pg_temp.ret(p_uid uuid, p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', format('select app.reseau_retirer(%L)::text', p_part))
$$;
CREATE FUNCTION pg_temp.exp(p_uid uuid) RETURNS jsonb LANGUAGE sql AS $$
  SELECT pg_temp.comme(p_uid, 'authenticated', 'select app.exporter_mes_donnees()::text')::jsonb
$$;
-- Trois accords d'une participation, lus dans la table : « R|C|P » (o = posé, n = NULL).
CREATE FUNCTION pg_temp.accords(p_part uuid) RETURNS text LANGUAGE sql AS $$
  SELECT coalesce((SELECT CASE WHEN m.accord_repondre_le IS NULL THEN 'n' ELSE 'o' END || '|'
                        || CASE WHEN m.accord_carte_le IS NULL THEN 'n' ELSE 'o' END || '|'
                        || CASE WHEN m.accord_rapport_le IS NULL THEN 'n' ELSE 'o' END
                     FROM app.reseau_membres m WHERE m.participation_id = p_part), 'absent')
$$;

-- Fixtures : campagne en brouillon, groupe et composition, puis ouverture (gel de 0005).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (pg_temp.u(1), 'rapport-a@example.test', '{"nom": "Alice"}'),
  (pg_temp.u(2), 'rapport-b@example.test', '{"nom": "Bruno"}');
INSERT INTO app.organizations (id, slug, nom) VALUES (pg_temp.org(), 'rapport-essai', 'Organisation rapport');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  (pg_temp.u(1), pg_temp.org(), 'participant'), (pg_temp.u(2), pg_temp.org(), 'participant');
INSERT INTO app.campaigns (id, organization_id, titre) VALUES (pg_temp.k(), pg_temp.org(), 'Relevé rapport');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id) VALUES
  (pg_temp.p(1), pg_temp.k(), pg_temp.org(), pg_temp.u(1)),
  (pg_temp.p(2), pg_temp.k(), pg_temp.org(), pg_temp.u(2));
INSERT INTO app.groups (id, campaign_id, organization_id, nom, ordre) VALUES (pg_temp.g(), pg_temp.k(), pg_temp.org(), 'Équipe', 1);
INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id) VALUES
  (pg_temp.g(), pg_temp.k(), pg_temp.org(), pg_temp.p(1)),
  (pg_temp.g(), pg_temp.k(), pg_temp.org(), pg_temp.p(2));
UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = pg_temp.k();
UPDATE private.settings SET reseau_releve_ouvert = true;

-- ===== Structure =====
SELECT is((SELECT format_type(a.atttypid, a.atttypmod) || ':' || a.attnotnull::text
             FROM pg_attribute a WHERE a.attrelid = 'app.reseau_membres'::regclass AND a.attname = 'accord_rapport_le' AND NOT a.attisdropped),
  'timestamp with time zone:false', 'accord_rapport_le : timestamptz, nul si pas d''accord');
SELECT is(to_regprocedure('app.reseau_consentir(uuid, boolean, boolean, boolean)') IS NOT NULL
          AND to_regprocedure('app.reseau_consentir(uuid, boolean, boolean)') IS NULL,
  true, 'une seule signature : quatre arguments, l''ancienne à trois est supprimée');
SELECT is(has_function_privilege('authenticated', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
          AND NOT has_function_privilege('anon', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
          AND NOT has_function_privilege('public', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE')
          AND NOT has_function_privilege('service_role', 'app.reseau_consentir(uuid, boolean, boolean, boolean)', 'EXECUTE'),
  true, 'reseau_consentir : EXECUTE pour authenticated seul');
SELECT is((SELECT count(*)::int FROM pg_constraint
            WHERE conrelid = 'app.reseau_membres'::regclass
              AND conname IN ('reseau_membres_opposition_sans_accord', 'reseau_membres_rapport_sans_reponse')),
  2, 'les deux contraintes CHECK existent');

-- ===== Ancienne signature =====
SELECT is(left(pg_temp.comme(pg_temp.u(1), 'authenticated', format('select app.reseau_consentir(%L, true, false)', pg_temp.p(1))), 10),
  'ERR:42883:', 'l''ancienne signature à trois arguments échoue (42883)');

-- ===== Accord au rapport : cas nominal et refus =====
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), false), 'informe', 'Alice lit l''information préalable');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), false, false, true),
  'ERR:22023:Accord de réponse requis pour le rapport', 'rapport sans accord de réponse : refusé (22023)');
SELECT is(pg_temp.accords(pg_temp.p(1)), 'n|n|n', 'le refus n''a rien écrit');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, false, true), 'enregistre', 'réponse et rapport accordés ensemble');
SELECT is(pg_temp.accords(pg_temp.p(1)), 'o|n|o', 'accord de réponse et accord au rapport datés, carte non accordée');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, true, false), 'enregistre', 'retrait du seul accord au rapport');
SELECT is(pg_temp.accords(pg_temp.p(1)), 'o|o|n', 'le rapport est retiré, réponse et carte restent');

-- ===== Retirer la réponse efface le rapport =====
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, true, true), 'enregistre', 'les trois accords posés');
SELECT is(pg_temp.accords(pg_temp.p(1)), 'o|o|o', 'trois accords datés');
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), false, true, false), 'enregistre', 'retrait de l''accord de réponse');
SELECT is(pg_temp.accords(pg_temp.p(1)), 'n|o|n', 'réponse ET rapport effacés, carte conservée');

-- ===== Opposition efface les trois =====
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(1), true, true, true), 'enregistre', 'les trois accords reposés');
SELECT is(pg_temp.inf(pg_temp.u(1), pg_temp.p(1), true) || '/' || pg_temp.accords(pg_temp.p(1)),
  'oppose/n|n|n', 'l''opposition remet les trois accords à NULL');

-- ===== Retrait efface les trois =====
SELECT pg_temp.inf(pg_temp.u(2), pg_temp.p(2), false);
SELECT pg_temp.cons(pg_temp.u(2), pg_temp.p(2), true, true, true);
SELECT is(pg_temp.ret(pg_temp.u(2), pg_temp.p(2)) || '/' || pg_temp.accords(pg_temp.p(2)),
  '0/n|n|n', 'le retrait remet les trois accords à NULL');

-- ===== Autrui et export =====
SELECT pg_temp.cons(pg_temp.u(2), pg_temp.p(2), true, false, true);
SELECT is(pg_temp.cons(pg_temp.u(1), pg_temp.p(2), true, false, true),
  'ERR:P0002:Participation introuvable', 'un autre utilisateur ne pose pas l''accord d''autrui (P0002)');
SELECT is(jsonb_typeof(pg_temp.exp(pg_temp.u(2)) -> 'reseau' -> 'membres' -> 0 -> 'accord_rapport_le'),
  'string', 'l''export de la personne contient accord_rapport_le daté');

-- ===== Contraintes CHECK, hors API =====
SELECT throws_ok(format('UPDATE app.reseau_membres SET accord_repondre_le = NULL WHERE participation_id = %L', pg_temp.p(2)),
  '23514', NULL, 'accord au rapport sans accord de réponse : refusé par la contrainte');
SELECT throws_ok(format('UPDATE app.reseau_membres SET oppose_le = now() WHERE participation_id = %L', pg_temp.p(2)),
  '23514', NULL, 'opposition coexistant avec l''accord au rapport : refusée par la contrainte');

SELECT * FROM finish();
