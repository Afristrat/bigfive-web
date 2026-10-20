-- Lot 3 : mes résultats (historique du participant), export de mes données
-- (JSON), suppression de mon compte (effacement en cascade, journal
-- pseudonymisé sans adresse), rejeu d'un effacement par le serveur,
-- information du responsable sans identité.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(64);

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

-- Personnages : pa (deux participations, une terminée), pb (une terminée), ra responsable A,
-- ca consultant A, rb responsable B, ad administrateur Tenga.
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'pa@example.test', '{"nom":"Amal","langue":"ar"}'),
  ('a0000000-0000-4000-8000-000000000002', 'pb@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000003', 'ra@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000004', 'ca@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000006', 'rb@example.test', '{}'),
  ('a0000000-0000-4000-8000-000000000008', 'ad@example.test', '{}');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('a1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('a1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'participant'),
  ('a0000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('a0000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-00000000000a', 'consultant'),
  ('a0000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-00000000000b', 'responsable');
INSERT INTO private.tenga_admins (user_id) VALUES ('a0000000-0000-4000-8000-000000000008');
INSERT INTO app.campaigns (id, organization_id, titre, statut, ouverte_le, cree_par) VALUES
  ('c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'Campagne 1', 'ouverte', now(), 'a0000000-0000-4000-8000-000000000003'),
  ('c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'Campagne 2', 'ouverte', now(), 'a0000000-0000-4000-8000-000000000003');
INSERT INTO app.invitations (id, campaign_id, organization_id, email, prenom, invitant_id, langue, jeton_hash, expire_le) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'attente@example.test', 'Karim', 'a0000000-0000-4000-8000-000000000003', 'fr', sha256('i1'), now() + interval '14 days'),
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'pa@example.test', NULL, 'a0000000-0000-4000-8000-000000000003', 'ar', sha256('i2'), now() + interval '14 days');
UPDATE app.invitations SET email = NULL, acceptee_le = now(), acceptee_par = 'a0000000-0000-4000-8000-000000000001' WHERE id = 'e0000000-0000-4000-8000-000000000002';
INSERT INTO app.participations (id, campaign_id, organization_id, user_id, invitation_id, statut, ouverte_le, commencee_le, terminee_le) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'terminee', now() - interval '2 days', now() - interval '2 days', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-0000000000a1', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', NULL, 'terminee', now() - interval '2 days', now() - interval '2 days', now() - interval '1 day'),
  ('d0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-0000000000a2', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', NULL, 'en_cours', now(), now(), NULL);
INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, expire_le)
VALUES ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'v1', '{"1": 5}', now() + interval '30 days');
INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores, questionnaire_version, calcul_version) VALUES
  ('d0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', '{"1": 3}', '{"O": 62}', 'v1', 'c1'),
  ('d0000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000002', '{"1": 2}', '{"O": 31}', 'v1', 'c1');
INSERT INTO private.audit_log (acteur, action, ressource_type, ressource_id) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'resultat.soumettre', 'participation', 'd0000000-0000-4000-8000-000000000001'),
  ('a0000000-0000-4000-8000-000000000002', 'resultat.soumettre', 'participation', 'd0000000-0000-4000-8000-000000000002');

-- ===== Mes résultats =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select count(*) from app.mes_resultats()'), 'ERR:42501:permission denied for schema app', 'mes_resultats, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select count(*) from app.mes_resultats()'), 'ERR:42501:permission denied for function mes_resultats', 'mes_resultats, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select count(*) from app.mes_resultats()'), 'ERR:42501:Connexion requise', 'mes_resultats, rôle connecté sans identité : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.mes_resultats()'), '2', 'mes_resultats : deux participations pour pa');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select campagne_titre from app.mes_resultats() limit 1'), 'Campagne 2', 'mes_resultats : la plus récente d''abord');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select concat_ws('|', campagne_titre, organisation_nom, organisation_slug, statut, scores, questionnaire_version, calcul_version) from app.mes_resultats() where statut = 'terminee'$q$),
  'Campagne 1|Organisation A|org-a|terminee|{"O": 62}|v1|c1', 'mes_resultats : la participation terminée porte campagne, organisation, scores et versions');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select (scores is null)::text from app.mes_resultats() where statut = 'en_cours'$q$), 'true', 'mes_resultats : la participation en cours n''a pas encore de scores');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select count(*) from app.mes_resultats()'), '1', 'mes_resultats : pb ne voit que sa participation');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000002', 'authenticated', 'select scores::text from app.mes_resultats()'), '{"O": 31}', 'mes_resultats : pb voit ses scores, pas ceux de pa');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select count(*) from app.mes_resultats()'), '0', 'mes_resultats : le responsable n''a aucune participation, donc aucune ligne');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select count(*) from app.mes_resultats()'), '0', 'mes_resultats : l''administrateur Tenga ne voit que les siens (aucun)');

-- ===== Information du responsable, sans identité =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select count(*) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$), 'ERR:42501:permission denied for schema app', 'informer_responsable, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select count(*) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$), 'ERR:42501:permission denied for function informer_responsable', 'informer_responsable, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select concat_ws('|', statut_campagne, participants, en_cours, termines, invitations_en_attente) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$),
  'ouverte|2|0|2|1', 'informer_responsable, campagne 1 : 2 participants, 2 terminés, 1 invitation en attente');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', $q$select concat_ws('|', participants, en_cours, termines, invitations_en_attente) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a2')$q$),
  '1|1|0|0', 'informer_responsable, campagne 2 : 1 participant en cours');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', $q$select termines::text from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$), '2', 'informer_responsable, administrateur Tenga : autorisé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', $q$select count(*) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'informer_responsable, participant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select count(*) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'informer_responsable, consultant : refusé');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000006', 'authenticated', $q$select count(*) from app.informer_responsable('c0000000-0000-4000-8000-0000000000a1')$q$),
  'ERR:42501:Réservé au responsable de l''organisation ou à un administrateur Tenga', 'informer_responsable, responsable d''une autre organisation : refusé');
SELECT is(
  (SELECT string_agg(n.attname, ',' ORDER BY n.attnum) FROM pg_proc p, LATERAL unnest(p.proargnames) WITH ORDINALITY AS n(attname, attnum)
    WHERE p.oid = 'app.informer_responsable(uuid)'::regprocedure),
  'p_campagne,statut_campagne,participants,en_cours,termines,invitations_en_attente',
  'informer_responsable : effectifs seulement, aucune colonne d''identité (ni nom, ni compte, ni adresse)');

-- ===== Export de mes données =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select app.exporter_mes_donnees()::text'), 'ERR:42501:permission denied for schema app', 'exporter_mes_donnees, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select app.exporter_mes_donnees()::text'), 'ERR:42501:permission denied for function exporter_mes_donnees', 'exporter_mes_donnees, service_role : aucun droit d''exécution');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select app.exporter_mes_donnees()::text'), 'ERR:42501:Connexion requise', 'exporter_mes_donnees, rôle connecté sans identité : refusé');
SELECT is(set_config('zz.export', pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select app.exporter_mes_donnees()::text'), true) IS NOT NULL, true, 'exporter_mes_donnees : pa obtient son export');
SELECT is((current_setting('zz.export')::jsonb) -> 'compte' ->> 'email', 'pa@example.test', 'l''export contient l''adresse du compte');
SELECT is((current_setting('zz.export')::jsonb) -> 'profil' ->> 'nom', 'Amal', 'l''export contient le profil');
SELECT is((current_setting('zz.export')::jsonb) -> 'profil' ->> 'langue', 'ar', 'l''export contient la langue du profil');
SELECT is(jsonb_array_length((current_setting('zz.export')::jsonb) -> 'appartenances'), 1, 'l''export contient l''appartenance');
SELECT is(jsonb_array_length((current_setting('zz.export')::jsonb) -> 'participations'), 2, 'l''export contient les deux participations');
SELECT is(jsonb_array_length((current_setting('zz.export')::jsonb) -> 'tentatives'), 1, 'l''export contient la tentative en cours');
SELECT is((current_setting('zz.export')::jsonb) -> 'tentatives' -> 0 -> 'reponses', '{"1": 5}'::jsonb, 'l''export contient les réponses de la tentative');
SELECT is(jsonb_array_length((current_setting('zz.export')::jsonb) -> 'resultats'), 1, 'l''export contient le résultat');
SELECT is((current_setting('zz.export')::jsonb) -> 'resultats' -> 0 -> 'scores', '{"O": 62}'::jsonb, 'l''export contient les scores');
SELECT is((current_setting('zz.export')::jsonb) -> 'resultats' -> 0 -> 'reponses', '{"1": 3}'::jsonb, 'l''export contient les réponses du résultat');
SELECT is((current_setting('zz.export')::jsonb) -> 'compte' ->> 'administrateur_tenga', 'false', 'l''export dit si le compte administre Tenga');
SELECT is(jsonb_array_length((current_setting('zz.export')::jsonb) -> 'journal'), 1, 'l''export contient les actions journalisées au nom de la personne');
SELECT is(position('pb@example.test' IN current_setting('zz.export')) + position('d0000000-0000-4000-8000-000000000002' IN current_setting('zz.export')) + position('"O": 31' IN current_setting('zz.export')), 0,
  'l''export ne contient rien d''une autre personne');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'compte.exporter' AND acteur = 'a0000000-0000-4000-8000-000000000001'), 1, 'l''export est journalisé');
SELECT is(jsonb_array_length((pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select app.exporter_mes_donnees()::text')::jsonb) -> 'resultats'), 0, 'l''export du responsable ne contient aucun résultat');
SELECT is((pg_temp.comme('a0000000-0000-4000-8000-000000000008', 'authenticated', 'select app.exporter_mes_donnees()::text')::jsonb) -> 'compte' ->> 'administrateur_tenga', 'true', 'l''export de l''administrateur le dit');

-- ===== Suppression de mon compte =====
SELECT is(pg_temp.comme(NULL, 'anon', 'select app.supprimer_mon_compte()::text'), 'ERR:42501:permission denied for schema app', 'supprimer_mon_compte, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', 'select app.supprimer_mon_compte()::text'), 'ERR:42501:permission denied for function supprimer_mon_compte', 'supprimer_mon_compte, service_role : aucun droit d''exécution (le serveur passe par effacer_compte)');
SELECT is(pg_temp.comme(NULL, 'authenticated', 'select app.supprimer_mon_compte()::text'), 'ERR:42501:Connexion requise', 'supprimer_mon_compte, rôle connecté sans identité : refusé');
SELECT is((SELECT count(*)::int FROM auth.users WHERE email LIKE '%@example.test'), 6, 'ces refus n''ont supprimé aucun compte');

SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select app.supprimer_mon_compte()::text'), '', 'supprimer_mon_compte : pa supprime son compte');
SELECT is((SELECT count(*)::int FROM auth.users WHERE id = 'a0000000-0000-4000-8000-000000000001'), 0, 'le compte n''existe plus');
SELECT is(
  (SELECT (SELECT count(*) FROM app.profiles WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.memberships WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.attempts WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.results WHERE user_id = 'a0000000-0000-4000-8000-000000000001')
        + (SELECT count(*) FROM app.invitations WHERE acceptee_par = 'a0000000-0000-4000-8000-000000000001'))::int,
  0, 'profil, appartenances, participations, tentatives, résultats et invitation acceptée sont effacés en cascade');
SELECT is((SELECT count(*)::int FROM app.results WHERE user_id = 'a0000000-0000-4000-8000-000000000002'), 1, 'le résultat de l''autre participant est intact');
SELECT is((SELECT count(*)::int FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000002'), 1, 'la participation de l''autre participant est intacte');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE email = 'attente@example.test'), 1, 'l''invitation en attente d''un tiers est intacte');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'compte.supprimer' AND acteur = 'a0000000-0000-4000-8000-000000000001' AND ressource_id = 'a0000000-0000-4000-8000-000000000001'), 1,
  'la suppression est journalisée avec l''identifiant devenu pseudonyme');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE acteur = 'a0000000-0000-4000-8000-000000000001'), 3, 'le journal garde les lignes antérieures de la personne (identifiant seul), plus la suppression');
SELECT is((SELECT count(*)::int FROM private.audit_log l WHERE l::text LIKE '%@%'), 0, 'aucune adresse e-mail dans le journal, suppression comprise');
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000001', 'authenticated', 'select count(*) from app.mes_resultats()'), '0', 'après suppression, plus rien ne se lit au nom de cette identité');

-- Un responsable supprime son compte : ses invitations disparaissent, ses campagnes restent
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000003', 'authenticated', 'select app.supprimer_mon_compte()::text'), '', 'supprimer_mon_compte : le responsable supprime son compte');
SELECT is((SELECT count(*)::int FROM app.invitations WHERE invitant_id = 'a0000000-0000-4000-8000-000000000003'), 0, 'les invitations qu''il avait envoyées sont effacées (adresses comprises)');
SELECT is((SELECT count(*)::int FROM app.campaigns WHERE cree_par IS NULL), 2, 'ses campagnes restent, sans créateur');
SELECT is((SELECT count(*)::int FROM app.participations WHERE user_id = 'a0000000-0000-4000-8000-000000000002'), 1, 'les participations des participants restent');

-- ===== Rejeu d'un effacement par le serveur (registre des effacements) =====
SELECT is(pg_temp.comme('a0000000-0000-4000-8000-000000000004', 'authenticated', $q$select app.effacer_compte('a0000000-0000-4000-8000-000000000002')::text$q$), 'ERR:42501:permission denied for function effacer_compte', 'effacer_compte, rôle connecté : refusé');
SELECT is(pg_temp.comme(NULL, 'anon', $q$select app.effacer_compte('a0000000-0000-4000-8000-000000000002')::text$q$), 'ERR:42501:permission denied for schema app', 'effacer_compte, anonyme : refusé');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.effacer_compte('a0000000-0000-4000-8000-000000000002')::text$q$), 'true', 'effacer_compte, serveur : efface le compte et renvoie vrai');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.effacer_compte('a0000000-0000-4000-8000-000000000002')::text$q$), 'false', 'effacer_compte, rejeu : le compte n''existe plus, faux, sans erreur');
SELECT is((SELECT count(*)::int FROM app.results), 0, 'plus aucun résultat après les deux effacements');
SELECT is((SELECT count(*)::int FROM private.audit_log WHERE action = 'compte.supprimer'), 3, 'une ligne de journal par effacement réel, aucune pour le rejeu');

SELECT * FROM finish();
