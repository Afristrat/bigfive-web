-- Réglages de conservation, protections de la ligne unique, et absence de tout
-- secret JWT en réglage de base.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(21);

SELECT is((SELECT count(*)::int FROM private.settings), 1, 'private.settings contient une seule ligne');
SELECT is((SELECT conservation_resultats_mois FROM private.settings), 36, 'résultats : 36 mois (3 ans)');
SELECT is((SELECT conservation_invitations_jours FROM private.settings), 14, 'invitations : 14 jours');
SELECT is((SELECT conservation_tentatives_jours FROM private.settings), 30, 'tentatives : 30 jours');
SELECT is((SELECT conservation_sessions_jours FROM private.settings), 30, 'sessions : 30 jours');
SELECT is((SELECT conservation_journal_mois FROM private.settings), 12, 'journal : 12 mois (1 an)');
SELECT is((SELECT conservation_comptes_vides_mois FROM private.settings), 12, 'comptes sans résultat : 12 mois (1 an)');
SELECT is((SELECT seuil_anonymat FROM private.settings), 5, 'seuil d''anonymat : 5');

SELECT throws_ok('UPDATE private.settings SET seuil_anonymat = 4', '23514', NULL,
  'le seuil d''anonymat ne peut pas descendre sous 5');
SELECT throws_ok('UPDATE private.settings SET conservation_invitations_jours = 0', '23514', NULL,
  'une durée nulle est refusée');
SELECT throws_ok('INSERT INTO private.settings (singleton) VALUES (false)', '23514', NULL,
  'une seconde ligne de réglages est refusée');

-- La ligne unique ne se supprime ni ne se vide, même en superutilisateur.
SELECT throws_ok('DELETE FROM private.settings', '23001',
  'Suppression interdite dans private.settings : la ligne unique se modifie, elle ne se supprime pas',
  'DELETE sur private.settings est refusé');
SELECT throws_ok('TRUNCATE private.settings', '23001',
  'Suppression interdite dans private.settings : la ligne unique se modifie, elle ne se supprime pas',
  'TRUNCATE sur private.settings est refusé');

-- Accès par rôle réel : tenga_owner lit et modifie (règles explicites) ;
-- anon n'entre même pas dans le schéma private.
SET LOCAL ROLE tenga_owner;
DO $$ BEGIN
  PERFORM set_config('zz.lecture', (SELECT seuil_anonymat::text FROM private.settings), true);
  UPDATE private.settings SET seuil_anonymat = 6;
  PERFORM set_config('zz.maj', (SELECT seuil_anonymat::text FROM private.settings), true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.lecture'), '5', 'tenga_owner lit private.settings par sa règle de lecture');
SELECT is(current_setting('zz.maj'), '6', 'tenga_owner peut relever le seuil d''anonymat par sa règle de modification');

SET LOCAL ROLE anon;
DO $$ BEGIN
  PERFORM 1 FROM private.settings;
  PERFORM set_config('zz.anon', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.anon', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.anon'), '42501', 'anon ne peut pas lire private.settings (42501)');

-- Aucun secret JWT en réglage de base de données (ancien gabarit : app.settings.jwt_secret).
SELECT is(
  (SELECT count(*)::int FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) AS c
    WHERE c LIKE 'app.settings.jwt_secret%'),
  0, 'app.settings.jwt_secret n''est posé ni sur la base ni sur un rôle');
SELECT ok(coalesce(current_setting('app.settings.jwt_secret', true), '') = '',
  'app.settings.jwt_secret est vide dans la session');
SELECT is(
  (SELECT count(*)::int FROM information_schema.columns
    WHERE table_schema IN ('app', 'private') AND column_name ~* 'jwt|secret|password|passwd'),
  0, 'aucune colonne de secret dans app et private');

-- Extensions attendues.
SELECT ok(EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'), 'pg_cron est installée');
SELECT is((SELECT n.nspname::text FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'pgtap'),
  'tests', 'pgTAP est installée dans le schéma tests');

SELECT * FROM finish();
