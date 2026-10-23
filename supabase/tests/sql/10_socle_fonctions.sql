-- Socle du lot 1 : fonctions d'administration Tenga et de profil, journal en
-- ajout seul. Identités simulées comme dans 09 (rôle réel + jeton simulé).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(37);

-- Base vivante : organisations réelles présentes avant les fixtures, retranchées du compte.
SELECT set_config('zz.reel_organizations', (SELECT count(*) FROM app.organizations)::text, true) IS NOT NULL AS base_vivante;

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

INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'ra@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');

-- ===== Création d'organisation =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', $q$select app.creer_organisation('org-pirate', 'Pirate')::text$q$),
  'ERR:42501:Réservé aux administrateurs Tenga', 'creer_organisation, non administrateur : refusé');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select app.creer_organisation('org-pirate', 'Pirate')::text$q$),
  'ERR:42501:Réservé aux administrateurs Tenga', 'creer_organisation, rôle connecté sans identité : refusé');
SELECT is((SELECT count(*)::int FROM app.organizations) - current_setting('zz.reel_organizations')::int, 0, 'aucune organisation créée par ces refus');

SELECT matches(
  set_config('zz.org', pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.creer_organisation('org-test', '  Organisation Test  ')::text$q$), true),
  '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', 'creer_organisation, administrateur : renvoie l''identifiant');
SELECT is((SELECT nom FROM app.organizations WHERE slug = 'org-test'), 'Organisation Test', 'le nom est nettoyé des espaces');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.creer_organisation('Org Mauvaise', 'X')::text$q$),
  '^ERR:23514:', 'creer_organisation : identifiant d''URL invalide refusé par la base');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.creer_organisation('org-test', 'Doublon')::text$q$),
  '^ERR:23505:', 'creer_organisation : identifiant d''URL déjà pris refusé');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'organisation.creer' AND acteur = 'a0000000-0000-4000-8000-000000000008'), 1,
  'la création d''organisation est journalisée, une fois (les refus ne laissent pas de trace)');

-- ===== Attribution et retrait de rôle =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.attribuer_role('a0000000-0000-4000-8000-000000000001', %L, 'participant')::text$q$, current_setting('zz.org'))),
  '', 'attribuer_role : l''administrateur pose un rôle de participant');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.attribuer_role('a0000000-0000-4000-8000-000000000001', %L, 'consultant')::text$q$, current_setting('zz.org'))),
  '', 'attribuer_role : rejouée avec un autre rôle, elle change le rôle');
SELECT is((SELECT count(*)::int FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 1, 'toujours une seule ligne (un seul rôle par organisation)');
SELECT is((SELECT role FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 'consultant', 'le rôle est devenu consultant');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.attribuer_role('a0000000-0000-4000-8000-000000000001', %L, 'administrateur')::text$q$, current_setting('zz.org'))),
  '^ERR:22023:', 'attribuer_role : rôle inconnu refusé');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.attribuer_role('a0000000-0000-4000-8000-0000000000ff', %L, 'participant')::text$q$, current_setting('zz.org'))),
  '^ERR:23503:', 'attribuer_role : compte inexistant refusé');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.attribuer_role('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-0000000000ff', 'participant')::text$q$),
  '^ERR:23503:', 'attribuer_role : organisation inexistante refusée');
SELECT is((SELECT string_agg(action, ',' ORDER BY id) FROM pg_temp.journal_test audit_log WHERE action LIKE 'role.attribuer.%'),
  'role.attribuer.participant,role.attribuer.consultant', 'les attributions sont journalisées avec le rôle posé, les refus non');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated',
  format($q$select app.retirer_role('a0000000-0000-4000-8000-000000000001', %L)::text$q$, current_setting('zz.org'))),
  'ERR:42501:Réservé à un administrateur Tenga ou au responsable de l''organisation', 'retirer_role, ni administrateur ni responsable : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.retirer_role('a0000000-0000-4000-8000-000000000001', %L)::text$q$, current_setting('zz.org'))),
  'true', 'retirer_role : l''administrateur retire le rôle');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated',
  format($q$select app.retirer_role('a0000000-0000-4000-8000-000000000001', %L)::text$q$, current_setting('zz.org'))),
  'false', 'retirer_role : rien à retirer renvoie faux');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'role.retirer'), 1, 'un seul retrait journalisé');

-- ===== Journal : lecture par l'administrateur seul =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.lire_journal(10)'),
  'ERR:42501:Réservé aux administrateurs Tenga', 'lire_journal, non administrateur : refusé');
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.lire_journal(10)'),
  'ERR:42501:permission denied for schema app', 'lire_journal, anonyme : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.lire_journal(2)'),
  '2', 'lire_journal : la limite est respectée');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select action from app.lire_journal(1)'),
  'role.retirer', 'lire_journal : le plus récent d''abord');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l::text LIKE '%@%'), 0,
  'aucune ligne du journal ne contient d''arobase (pas d''adresse e-mail)');

-- ===== Journal en ajout seul =====
INSERT INTO private.audit_log (id, cree_le, action) OVERRIDING SYSTEM VALUE VALUES (-1, now() - interval '40 months', 'test.ancien');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$update private.audit_log set action = 'test.pirate'$q$), 'ERR:42501:permission denied for schema private', 'journal : service_role ne modifie rien (aucun droit)');
SELECT throws_ok($$UPDATE private.audit_log SET action = 'test.pirate' WHERE id = -1$$, '23001', 'Journal en ajout seul : UPDATE refusé', 'journal : UPDATE refusé même pour le superutilisateur');
SELECT throws_ok($$TRUNCATE private.audit_log$$, '23001', 'Journal en ajout seul : TRUNCATE refusé', 'journal : TRUNCATE refusé même pour le superutilisateur');
SELECT throws_ok($$DELETE FROM private.audit_log WHERE action = 'organisation.creer'$$, '23001', 'Journal en ajout seul : DELETE refusé', 'journal : une ligne récente ne se supprime pas');
SELECT lives_ok($$DELETE FROM private.audit_log WHERE id = -1$$, 'journal : une ligne plus ancienne que la conservation (36 mois ici, 12 par défaut) se supprime');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE id = -1), 0, 'la ligne échue est bien partie');

-- ===== Profil =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.mettre_a_jour_profil('  Amal  ', 'ar')::text$q$), '', 'mettre_a_jour_profil : le titulaire met à jour nom et langue');
SELECT is((SELECT nom || '|' || langue FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 'Amal|ar', 'nom nettoyé, langue posée');
SELECT is((SELECT coalesce(nom, 'sans nom') || '|' || langue FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000002'), 'sans nom|fr', 'le profil d''une autre personne n''a pas bougé');
SELECT matches(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select app.mettre_a_jour_profil('Amal', 'de')::text$q$), '^ERR:22023:', 'mettre_a_jour_profil : langue inconnue refusée');
SELECT is(pg_temp.comme(NULL, 'authenticated', $q$select app.mettre_a_jour_profil('Amal', 'fr')::text$q$), 'ERR:42501:Connexion requise', 'mettre_a_jour_profil : sans identité refusé');
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.mettre_a_jour_profil('Amal', 'fr')::text$q$), 'ERR:42501:permission denied for schema app', 'mettre_a_jour_profil : anonyme refusé');

SELECT * FROM finish();
