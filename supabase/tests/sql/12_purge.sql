-- Purge quotidienne (plan § 5) : tâche pg_cron, effacement des liens échus et
-- du journal échu, trace chiffrée dans le journal, point de santé. La purge
-- tourne sous tenga_owner : la RLS forcée s'applique à elle (éprouvé ci-dessous
-- en retirant la règle de suppression).
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(17);

-- Tâche planifiée
SELECT is(
  (SELECT schedule || '|' || command || '|' || active::text FROM cron.job WHERE jobname = 'tenga-purge-quotidienne'),
  '0 1 * * *|SELECT private.purger_quotidien()|true', 'la tâche tenga-purge-quotidienne est planifiée à 01:00 (heure locale de cron.timezone) et active');
-- pg_cron 1.6 lit l'horaire dans cron.timezone : « 0 1 » ne vaut 01:00 à Casablanca que dans ce fuseau.
SELECT is(current_setting('cron.timezone'), 'Africa/Casablanca', 'cron.timezone vaut Africa/Casablanca : l''horaire de la tâche est en heure locale');
SELECT is((SELECT schedule FROM cron.job WHERE jobname = 'tenga-purge-quotidienne'), '0 1 * * *', 'le champ schedule vaut 0 1 * * * (01:00 locale, pas 00:00)');
SELECT is((SELECT count(*)::int FROM cron.job WHERE jobname = 'tenga-purge-quotidienne'), 1, 'une seule tâche de purge');
SELECT ok(
  (SELECT p.prosecdef AND p.proowner = 'tenga_owner'::regrole FROM pg_proc p WHERE p.oid = 'private.purger_quotidien()'::regprocedure),
  'private.purger_quotidien est SECURITY DEFINER et appartient à tenga_owner (RLS forcée appliquée à la purge)');

-- Données
INSERT INTO auth.users (id, email) VALUES ('a0000000-0000-4000-8000-000000000001', 'un@example.test');
-- trois liens : échu depuis 2 jours (à purger), échu depuis 1 heure (gardé), actif (gardé)
INSERT INTO private.liens_connexion (user_id, jeton_hash, code_hash, cree_le, expire_le) VALUES
  ('a0000000-0000-4000-8000-000000000001', sha256('a'), sha256('a'), now() - interval '2 days 15 minutes', now() - interval '2 days'),
  ('a0000000-0000-4000-8000-000000000001', sha256('b'), sha256('b'), now() - interval '1 hour 15 minutes', now() - interval '1 hour'),
  ('a0000000-0000-4000-8000-000000000001', sha256('c'), sha256('c'), now(), now() + interval '15 minutes');
-- journal : deux lignes échues (40 mois), une récente
INSERT INTO private.audit_log (id, cree_le, action) OVERRIDING SYSTEM VALUE VALUES
  (-2, now() - interval '40 months', 'test.ancien'),
  (-3, now() - interval '37 months', 'test.ancien'),
  (-4, now() - interval '2 months', 'test.recent');

-- Contrôle « vu rouge » : sans sa règle de suppression, tenga_owner ne purge rien
DROP POLICY liens_suppression_owner ON private.liens_connexion;
DROP POLICY audit_suppression_owner ON private.audit_log;
SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::int FROM private.liens_connexion WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 3,
  'sans règle de suppression, la purge n''efface aucun lien (la RLS la contraint)');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE id IN (-2, -3, -4)), 3,
  'sans règle de suppression, la purge n''efface aucune ligne de journal');
CREATE POLICY liens_suppression_owner ON private.liens_connexion FOR DELETE TO tenga_owner USING (true);
CREATE POLICY audit_suppression_owner ON private.audit_log FOR DELETE TO tenga_owner USING (true);

-- Purge réelle
SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::int FROM private.liens_connexion WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 2,
  'la purge efface le lien échu depuis plus d''un jour, garde les deux autres');
SELECT is((SELECT count(*)::int FROM private.liens_connexion WHERE user_id = 'a0000000-0000-4000-8000-000000000001' AND consomme_le IS NULL AND expire_le > now()), 1,
  'le lien actif est intact');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE id IN (-2, -3)), 0, 'la purge efface les lignes de journal échues');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE id = -4), 1, 'la purge garde la ligne de journal récente');
SELECT ok((SELECT quantite >= 1 FROM private.audit_log WHERE action = 'purge.liens_connexion' ORDER BY id DESC LIMIT 1),
  'trace chiffrée des liens effacés dans le journal');
SELECT ok((SELECT quantite >= 2 FROM private.audit_log WHERE action = 'purge.journal' ORDER BY id DESC LIMIT 1),
  'trace chiffrée des lignes de journal effacées dans le journal');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l.action LIKE 'purge.%' AND l.acteur IS NOT NULL), 0, 'les traces de purge n''ont pas d''acteur');

-- Point de santé
SET LOCAL ROLE service_role;
DO $$ BEGIN
  PERFORM set_config('zz.derniere_purge', COALESCE(app.derniere_purge() >= now() - interval '1 minute', false)::text, true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.derniere_purge', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.derniere_purge'), 'true', 'app.derniere_purge renvoie la date de la purge, appelable par service_role');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM app.derniere_purge();
  PERFORM set_config('zz.derniere_purge_a', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.derniere_purge_a', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.derniere_purge_a'), '42501', 'app.derniere_purge n''est pas appelable par le rôle connecté');

-- La purge n'est pas appelable par l'API
SET LOCAL ROLE service_role;
DO $$ BEGIN
  PERFORM private.purger_quotidien();
  PERFORM set_config('zz.purge_api', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.purge_api', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.purge_api'), '42501', 'service_role ne peut pas lancer la purge');

SELECT * FROM finish();
