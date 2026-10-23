-- Purge quotidienne étendue aux lots 2 et 3 (plan § 5) : invitations échues,
-- tentatives interrompues depuis plus de 30 jours, résultats de plus de 3 ans,
-- comptes sans résultat inactifs depuis un an (hors administrateurs,
-- responsables et consultants), trace chiffrée pour chaque catégorie. La purge
-- tourne sous tenga_owner : la RLS forcée la contraint (éprouvé en retirant les
-- règles de suppression), et elle lit ses durées dans private.settings.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(29);

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

-- Comptes : u1 inactif depuis 13 mois, u2 jamais connecté et créé il y a 14 mois (tous deux sans résultat),
-- u3 inactif mais avec un résultat récent, u4 responsable inactif, u5 consultant inactif, u6 administrateur inactif,
-- u7 inactif depuis 11 mois, u8 connecté hier, u9 connecté hier avec un résultat de 40 mois,
-- u10 tentative expirée, u11 tentative valide.
INSERT INTO auth.users (id, email) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'u1@example.test'),
  ('a0000000-0000-4000-8000-000000000002', 'u2@example.test'),
  ('a0000000-0000-4000-8000-000000000003', 'u3@example.test'),
  ('a0000000-0000-4000-8000-000000000004', 'u4@example.test'),
  ('a0000000-0000-4000-8000-000000000005', 'u5@example.test'),
  ('a0000000-0000-4000-8000-000000000006', 'u6@example.test'),
  ('a0000000-0000-4000-8000-000000000007', 'u7@example.test'),
  ('a0000000-0000-4000-8000-000000000008', 'u8@example.test'),
  ('a0000000-0000-4000-8000-000000000009', 'u9@example.test'),
  ('a0000000-0000-4000-8000-00000000000a', 'u10@example.test'),
  ('a0000000-0000-4000-8000-00000000000b', 'u11@example.test');
UPDATE app.profiles SET cree_le = now() - interval '20 months', derniere_connexion_le = now() - interval '13 months' WHERE user_id = 'a0000000-0000-4000-8000-000000000001';
UPDATE app.profiles SET cree_le = now() - interval '14 months', derniere_connexion_le = NULL WHERE user_id = 'a0000000-0000-4000-8000-000000000002';
UPDATE app.profiles SET cree_le = now() - interval '20 months', derniere_connexion_le = now() - interval '14 months' WHERE user_id IN
  ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000006');
UPDATE app.profiles SET cree_le = now() - interval '20 months', derniere_connexion_le = now() - interval '11 months' WHERE user_id = 'a0000000-0000-4000-8000-000000000007';
UPDATE app.profiles SET derniere_connexion_le = now() - interval '1 day' WHERE user_id IN
  ('a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000b');
INSERT INTO app.organizations (id, slug, nom) VALUES ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-00000000000b', 'a1000000-0000-4000-8000-00000000000a', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000006');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne 1', 'ouverte', now());
-- Invitations : i1 en attente et échue, i2 en attente et valide, i3 acceptée et échue.
INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, cree_le, expire_le) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'echue@example.test', 'a0000000-0000-4000-8000-000000000004', 'fr', sha256('i1'), now() - interval '15 days', now() - interval '1 day'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'valide@example.test', 'a0000000-0000-4000-8000-000000000004', 'fr', sha256('i2'), now(), now() + interval '14 days');
INSERT INTO app.invitations (id, campaign_id, organization_id, email, invitant_id, langue, jeton_hash, cree_le, expire_le, acceptee_le, acceptee_par) VALUES
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', NULL, 'a0000000-0000-4000-8000-000000000004', 'fr', sha256('i3'), now() - interval '16 days', now() - interval '2 days', now() - interval '10 days', 'a0000000-0000-4000-8000-000000000003');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, invitation_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', NULL, 'ouverte', NULL, NULL),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003', 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009', NULL, 'terminee', now(), now()),
  ('d0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', NULL, 'en_cours', now(), NULL),
  ('d0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000b', NULL, 'en_cours', now(), NULL);
-- Tentatives : u10 interrompue depuis 40 jours (expirée), u11 sauvegardée hier (valide).
INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, cree_le, mis_a_jour_le, expire_le) VALUES
  ('d0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', 'v1', '{"1": 1}', now() - interval '45 days', now() - interval '40 days', now() - interval '10 days'),
  ('d0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', 'v1', '{"1": 1}', now() - interval '2 days', now() - interval '1 day', now() + interval '29 days');
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, statut, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000008', 'terminee', now(), now());
-- Résultats : u3 récent, u8 vieux de 14 mois, u9 vieux de 40 mois.
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version, soumis_le) VALUES
  ('d0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000003', '{"1": 1}', '{"O": 1}', 'v1', 'c1', now() - interval '1 month'),
  ('d0000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000008', '{"1": 1}', '{"O": 1}', 'v1', 'c1', now() - interval '14 months'),
  ('d0000000-0000-4000-8000-000000000009', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000009', '{"1": 1}', '{"O": 1}', 'v1', 'c1', now() - interval '40 months');

-- ===== Contrôle « vu rouge » : sans leurs règles de suppression, la purge n'efface rien =====
DROP POLICY invitations_suppression_owner ON app.invitations;
DROP POLICY attempts_suppression_owner ON app.attempts;
DROP POLICY results_suppression_owner ON app.results;
DROP POLICY tenga_owner_suppression ON auth.users;
SELECT private.purger_quotidien();
SELECT is((SELECT count(*)::int FROM app.invitations), 3, 'sans règle de suppression, la purge n''efface aucune invitation (la RLS la contraint)');
SELECT is((SELECT count(*)::int FROM app.attempts), 2, 'sans règle de suppression, la purge n''efface aucune tentative');
SELECT is((SELECT count(*)::int FROM app.results), 3, 'sans règle de suppression, la purge n''efface aucun résultat');
SELECT is((SELECT count(*)::int FROM auth.users WHERE email LIKE '%@example.test'), 11, 'sans règle de suppression sur auth.users, la purge n''efface aucun compte');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.comptes' ORDER BY id DESC LIMIT 1), 0, 'la trace chiffrée dit alors 0 compte effacé');
CREATE POLICY invitations_suppression_owner ON app.invitations FOR DELETE TO tenga_owner USING (true);
CREATE POLICY attempts_suppression_owner ON app.attempts FOR DELETE TO tenga_owner USING (true);
CREATE POLICY results_suppression_owner ON app.results FOR DELETE TO tenga_owner USING (true);
CREATE POLICY tenga_owner_suppression ON auth.users FOR DELETE TO tenga_owner USING (true);

-- ===== Purge réelle =====
SELECT private.purger_quotidien();
SELECT is((SELECT string_agg(id::text, ',') FROM app.invitations), 'e0000000-0000-4000-8000-000000000002', 'invitations : les deux échues (en attente et acceptée) sont effacées, la valide reste');
SELECT is((SELECT invitation_id FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000003') IS NULL, true, 'la participation liée à l''invitation effacée garde son existence, sans le lien');
SELECT is((SELECT string_agg(participation_id::text, ',') FROM app.attempts), 'd0000000-0000-4000-8000-00000000000b', 'tentatives : l''interrompue depuis plus de 30 jours est effacée, la récente reste');
SELECT is((SELECT statut || '|' || (commencee_le IS NULL)::text FROM app.participations WHERE id = 'd0000000-0000-4000-8000-00000000000a'), 'ouverte|true', 'la participation dont la tentative est effacée redevient « ouverte »');
SELECT is((SELECT statut FROM app.participations WHERE id = 'd0000000-0000-4000-8000-00000000000b'), 'en_cours', 'la participation à tentative valide reste « en cours »');
SELECT is((SELECT string_agg(participation_id::text, ',' ORDER BY participation_id) FROM app.results),
  'd0000000-0000-4000-8000-000000000003,d0000000-0000-4000-8000-000000000008', 'résultats : celui de 40 mois est effacé, ceux de 1 et 14 mois restent');
SELECT is((SELECT statut FROM app.participations WHERE id = 'd0000000-0000-4000-8000-000000000009'), 'terminee', 'la participation du résultat effacé reste (terminée)');
SELECT is((SELECT string_agg(email, ',' ORDER BY email) FROM auth.users WHERE email LIKE '%@example.test'),
  'u10@example.test,u11@example.test,u3@example.test,u4@example.test,u5@example.test,u6@example.test,u7@example.test,u8@example.test,u9@example.test',
  'comptes : les deux comptes vides inactifs depuis plus d''un an sont effacés, tous les autres restent (résultat, responsable, consultant, administrateur, récents)');
SELECT is((SELECT count(*)::int FROM app.profiles WHERE user_id IN ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'))
        + (SELECT count(*)::int FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*)::int FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000001'), 0, 'les comptes purgés disparaissent avec profil, appartenances et participations (cascade)');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.invitations' ORDER BY id DESC LIMIT 1), 2, 'trace chiffrée : 2 invitations');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.tentatives' ORDER BY id DESC LIMIT 1), 1, 'trace chiffrée : 1 tentative');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.resultats' ORDER BY id DESC LIMIT 1), 1, 'trace chiffrée : 1 résultat');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.comptes' ORDER BY id DESC LIMIT 1), 2, 'trace chiffrée : 2 comptes');
SELECT is((SELECT string_agg(acteur::text, ',' ORDER BY acteur) FROM pg_temp.journal_test audit_log WHERE action = 'compte.supprimer'),
  'a0000000-0000-4000-8000-000000000001,a0000000-0000-4000-8000-000000000002', 'un effacement de compte est journalisé par identifiant seul');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l.action LIKE 'purge.%' AND l.acteur IS NOT NULL), 0, 'les traces de purge n''ont pas d''acteur');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal');

-- ===== Seconde passe immédiate : rien de plus à effacer =====
SELECT private.purger_quotidien();
SELECT is((SELECT quantite || ',' FROM pg_temp.journal_test audit_log WHERE action = 'purge.invitations' ORDER BY id DESC LIMIT 1)
       || (SELECT quantite || ',' FROM pg_temp.journal_test audit_log WHERE action = 'purge.tentatives' ORDER BY id DESC LIMIT 1)
       || (SELECT quantite || ',' FROM pg_temp.journal_test audit_log WHERE action = 'purge.resultats' ORDER BY id DESC LIMIT 1)
       || (SELECT quantite::text FROM pg_temp.journal_test audit_log WHERE action = 'purge.comptes' ORDER BY id DESC LIMIT 1), '0,0,0,0', 'une seconde passe n''efface plus rien et le dit (traces à 0)');
SELECT is((SELECT count(*)::int FROM auth.users WHERE email LIKE '%@example.test'), 9, 'la seconde passe garde les neuf comptes');

-- ===== Les durées viennent de private.settings =====
UPDATE private.settings SET conservation_resultats_mois = 12, conservation_comptes_vides_mois = 6;
SELECT private.purger_quotidien();
SELECT is((SELECT string_agg(participation_id::text, ',') FROM app.results), 'd0000000-0000-4000-8000-000000000003', 'avec 12 mois de conservation, le résultat de 14 mois est effacé, celui de 1 mois reste');
SELECT is((SELECT quantite FROM pg_temp.journal_test audit_log WHERE action = 'purge.resultats' ORDER BY id DESC LIMIT 1), 1, 'trace chiffrée : 1 résultat');
SELECT is((SELECT count(*)::int FROM auth.users WHERE email = 'u7@example.test'), 0, 'avec 6 mois d''inactivité, le compte inactif depuis 11 mois est effacé');
SELECT is((SELECT count(*)::int FROM auth.users WHERE email IN ('u3@example.test', 'u4@example.test', 'u5@example.test', 'u6@example.test', 'u8@example.test', 'u9@example.test', 'u10@example.test', 'u11@example.test')), 8,
  'les comptes protégés (résultat, responsable, consultant, administrateur) ou récents restent');

-- ===== La purge et l'effacement ne sont pas appelables par l'API =====
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM private.purger_quotidien();
  PERFORM set_config('zz.purge_api', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.purge_api', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.purge_api'), '42501', 'le rôle connecté ne peut pas lancer la purge');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  PERFORM private.effacer_compte('a0000000-0000-4000-8000-000000000004');
  PERFORM set_config('zz.efface_api', 'ok', true);
EXCEPTION WHEN others THEN
  PERFORM set_config('zz.efface_api', SQLSTATE, true);
END $$;
RESET ROLE;
SELECT is(current_setting('zz.efface_api'), '42501', 'le rôle connecté ne peut pas appeler directement l''effacement de compte');

SELECT * FROM finish();
