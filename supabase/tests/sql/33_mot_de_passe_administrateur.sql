-- Migration 0018 : mot de passe et TOTP des administrateurs Tenga. Débit
-- préalable atomique de chaque essai (app.mdp_tentative), blocage de 30
-- minutes au 5e échec en moins de 15 minutes, verrouillage au 6e échec dans les
-- 24 heures, remboursement d'un mot de passe juste, connexion réussie liée à
-- l'essai admis, déverrouillage et liste réservés à un autre administrateur
-- Tenga (jamais soi-même, jamais un responsable), réponse identique pour une
-- adresse qui n'est pas administrateur, purge quotidienne.
-- (Enveloppé dans une transaction annulée par scripts/test-sql.sh.)
SET LOCAL search_path TO tests, pg_catalog, public;
SELECT plan(72);

-- Base vivante : séries d'échecs réelles présentes avant les fixtures, retranchées du compte.
SELECT set_config('zz.reel_echecs_mdp', (SELECT count(*) FROM private.echecs_mdp)::text, true) IS NOT NULL AS base_vivante;

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

-- Un essai en service_role : « administrateur état » (ex. « true temporaire »).
CREATE FUNCTION pg_temp.essai(p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role',
    format($q$select concat_ws(' ', admin::text, etat) from app.mdp_tentative(%L)$q$, p_email))
$$;

-- Identifiant rendu par un essai (NULL quand l'essai n'est pas admis).
CREATE FUNCTION pg_temp.id_essai(p_email text) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role',
    format($q$select tentative::text from app.mdp_tentative(%L)$q$, p_email))
$$;

-- État lu dans la table (aucune écriture) : libre, temporaire ou definitif.
CREATE FUNCTION pg_temp.etat(p_uid uuid) RETURNS text
LANGUAGE sql AS $$
  SELECT COALESCE((
    SELECT CASE WHEN e.verrouille_le IS NOT NULL THEN 'definitif'
                WHEN e.bloque_jusqu > now() THEN 'temporaire'
                ELSE 'libre' END
    FROM private.etat_mdp e WHERE e.user_id = p_uid), 'libre')
$$;

CREATE FUNCTION pg_temp.nb(p_uid uuid) RETURNS integer
LANGUAGE sql AS $$
  SELECT count(*)::int FROM private.echecs_mdp WHERE user_id = p_uid
$$;

-- Identifiant du n-ième essai le plus récent (0 : le dernier).
CREATE FUNCTION pg_temp.rang(p_uid uuid, p_rang integer) RETURNS bigint
LANGUAGE sql AS $$
  SELECT id FROM private.echecs_mdp WHERE user_id = p_uid ORDER BY id DESC OFFSET p_rang LIMIT 1
$$;

CREATE FUNCTION pg_temp.succes(p_uid uuid, p_essai bigint) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.mdp_succes(%L, %L)::text$q$, p_uid, p_essai))
$$;

CREATE FUNCTION pg_temp.rembourser(p_essai bigint) RETURNS text
LANGUAGE sql AS $$
  SELECT pg_temp.comme(NULL, 'service_role', format($q$select app.mdp_rembourser(%L)::text$q$, p_essai))
$$;

-- Personnages. ad1 à ad5 : administrateurs Tenga (ad2 est aussi participant de
-- l'organisation A). pa : participant de A. ra : responsable de A. rb :
-- responsable de B.
INSERT INTO auth.users (id, email) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'pa@example.test'),
  ('b0000000-0000-4000-8000-000000000003', 'ra@example.test'),
  ('b0000000-0000-4000-8000-000000000006', 'rb@example.test'),
  ('b0000000-0000-4000-8000-000000000008', 'ad1@example.test'),
  ('b0000000-0000-4000-8000-00000000000a', 'ad2@example.test'),
  ('b0000000-0000-4000-8000-00000000000c', 'ad3@example.test'),
  ('b0000000-0000-4000-8000-00000000000d', 'ad4@example.test'),
  ('b0000000-0000-4000-8000-00000000000e', 'ad5@example.test');
INSERT INTO app.organizations (id, slug, nom) VALUES
  ('b1000000-0000-4000-8000-00000000000a', 'org-a', 'Organisation A'),
  ('b1000000-0000-4000-8000-00000000000b', 'org-b', 'Organisation B');
INSERT INTO app.memberships (user_id, organization_id, role) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-00000000000a', 'participant'),
  ('b0000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-00000000000a', 'responsable'),
  ('b0000000-0000-4000-8000-000000000006', 'b1000000-0000-4000-8000-00000000000b', 'responsable'),
  ('b0000000-0000-4000-8000-00000000000a', 'b1000000-0000-4000-8000-00000000000a', 'participant');
INSERT INTO private.tenga_admins (user_id) VALUES
  ('b0000000-0000-4000-8000-000000000008'),
  ('b0000000-0000-4000-8000-00000000000a'),
  ('b0000000-0000-4000-8000-00000000000c'),
  ('b0000000-0000-4000-8000-00000000000d'),
  ('b0000000-0000-4000-8000-00000000000e');

-- ===== Une adresse qui n'est pas administrateur : « faux libre », rien n'est écrit =====
SELECT is(pg_temp.essai('pa@example.test'), 'false libre', 'participant : réponse « faux libre »');
SELECT is(pg_temp.essai('inconnu@example.test'), 'false libre', 'adresse inconnue : même réponse');
SELECT is(pg_temp.essai(NULL), 'false libre', 'adresse absente : même réponse');
SELECT is(pg_temp.id_essai('pa@example.test'), NULL::text, 'participant : aucun identifiant d''essai');
SELECT is((SELECT count(*)::int FROM private.echecs_mdp) - current_setting('zz.reel_echecs_mdp')::int, 0, 'aucun essai enregistré pour un non-administrateur ni une adresse inconnue');

-- ===== Débit préalable : cinq essais admis en moins de 15 minutes, puis blocage =====
SELECT is(pg_temp.essai('AD1@Example.test '), 'true libre', 'ad1 : essai 1 admis (adresse normalisée)');
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-000000000008'), 1,
  'l''essai admis est compté comme un échec avant toute vérification du mot de passe');
SELECT is(pg_temp.essai('ad1@example.test'), 'true libre', 'ad1 : essai 2 admis');
SELECT is(pg_temp.essai('ad1@example.test'), 'true libre', 'ad1 : essai 3 admis');
SELECT is(pg_temp.essai('ad1@example.test'), 'true libre', 'ad1 : essai 4 admis');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'libre', 'ad1 : quatre essais, encore libre');
SELECT is(pg_temp.essai('ad1@example.test'), 'true libre', 'ad1 : essai 5 admis, il bloque les suivants');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'temporaire', 'ad1 : cinq échecs en moins de 15 minutes, bloqué');
SELECT ok((SELECT bloque_jusqu FROM private.etat_mdp WHERE user_id = 'b0000000-0000-4000-8000-000000000008')
          BETWEEN now() + interval '29 minutes' AND now() + interval '31 minutes',
  'le blocage dure 30 minutes');
SELECT is(pg_temp.essai('ad1@example.test'), 'true temporaire', 'ad1 : essai 6 refusé pendant le blocage');
SELECT is(pg_temp.id_essai('ad1@example.test'), NULL::text, 'un essai refusé ne reçoit aucun identifiant');
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-000000000008'), 5,
  'un essai refusé pendant le blocage n''est pas compté et ne le prolonge pas');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-000000000008', pg_temp.rang('b0000000-0000-4000-8000-000000000008', 1)), 'false',
  'un essai qui n''est pas le plus récent ne conclut aucune connexion');

-- ===== Fin du blocage, puis sixième échec dans la journée : verrouillage =====
UPDATE private.etat_mdp SET bloque_jusqu = now() - interval '1 minute'
 WHERE user_id = 'b0000000-0000-4000-8000-000000000008';
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'libre', 'ad1 : blocage échu');
SELECT is(pg_temp.essai('ad1@example.test'), 'true libre', 'ad1 : essai admis après le blocage');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'definitif', 'ad1 : sixième échec dans les 24 heures, verrouillé');
SELECT is(pg_temp.essai('ad1@example.test'), 'true definitif', 'ad1 : essai suivant refusé, verrouillé');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'connexion.mdp.verrouillage' AND ressource_id = 'b0000000-0000-4000-8000-000000000008'), 1,
  'le verrouillage est journalisé une fois');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'connexion.mdp.blocage' AND ressource_id = 'b0000000-0000-4000-8000-000000000008'), 1,
  'le blocage est journalisé une fois');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'connexion.mdp.essai' AND ressource_id = 'b0000000-0000-4000-8000-000000000008'), 6,
  'chaque essai admis est journalisé, aucun essai refusé');
-- Un essai admis en même temps que celui qui a verrouillé (rafale) : simulé par une ligne plus récente.
INSERT INTO private.echecs_mdp (user_id) VALUES ('b0000000-0000-4000-8000-000000000008');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-000000000008', pg_temp.rang('b0000000-0000-4000-8000-000000000008', 0)), 'false',
  'un verrouillage posé par un autre essai ne s''efface jamais par une connexion');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'definitif', 'le verrouillage survit à la tentative de connexion');

-- ===== Six échecs espacés (aucune série de 15 minutes) : verrouillage aussi =====
INSERT INTO private.echecs_mdp (user_id, cree_le)
SELECT 'b0000000-0000-4000-8000-00000000000a', now() - (n || ' hours')::interval FROM generate_series(2, 6) AS n;
SELECT is(pg_temp.essai('ad2@example.test'), 'true libre', 'ad2 : sixième essai dans la journée admis');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000a'), 'definitif', 'ad2 : six échecs en 24 heures, verrouillé');

-- ===== Les échecs de plus de 24 heures ne comptent pas =====
INSERT INTO private.echecs_mdp (user_id, cree_le)
SELECT 'b0000000-0000-4000-8000-00000000000c', now() - interval '30 hours' FROM generate_series(1, 5);
SELECT is(pg_temp.essai('ad3@example.test'), 'true libre', 'ad3 : un essai après cinq échecs vieux de 30 heures');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000c'), 'libre', 'ad3 : les échecs de plus de 24 heures ne comptent pas, libre');

-- ===== Quatre échecs anciens de 20 minutes : pas de blocage =====
INSERT INTO private.echecs_mdp (user_id, cree_le)
SELECT 'b0000000-0000-4000-8000-00000000000d', now() - interval '20 minutes' FROM generate_series(1, 4);
SELECT is(pg_temp.essai('ad4@example.test'), 'true libre', 'ad4 : cinquième essai, les quatre précédents ont 20 minutes');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000d'), 'libre', 'ad4 : cinq échecs mais pas en moins de 15 minutes, libre');

-- ===== Mot de passe juste : remboursement, puis code TOTP juste : connexion =====
SELECT is(pg_temp.rembourser(pg_temp.rang('b0000000-0000-4000-8000-00000000000d', 0)), 'true', 'ad4 : mot de passe juste, l''essai est remboursé');
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-00000000000d'), 4, 'ad4 : le remboursement retire ce seul débit');
SELECT is(pg_temp.rembourser(-1), 'false', 'remboursement d''un essai inconnu : faux');
SELECT is(pg_temp.essai('ad4@example.test'), 'true libre', 'ad4 : essai du code TOTP admis');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-00000000000d', pg_temp.rang('b0000000-0000-4000-8000-00000000000d', 0)), 'true', 'ad4 : connexion réussie');
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-00000000000d'), 0, 'ad4 : échecs effacés');
SELECT ok((SELECT derniere_connexion_le FROM app.profiles WHERE user_id = 'b0000000-0000-4000-8000-00000000000d') IS NOT NULL, 'ad4 : dernière connexion renseignée');
-- Une ligne d'essai fabriquée pour un participant : seule la qualité d'administrateur le refuse.
INSERT INTO private.echecs_mdp (user_id) VALUES ('b0000000-0000-4000-8000-000000000001');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-000000000001', pg_temp.rang('b0000000-0000-4000-8000-000000000001', 0)), 'false',
  'un non-administrateur ne peut pas se connecter par mot de passe');

-- ===== Le 5e essai juste ne s'enferme pas dehors =====
INSERT INTO private.echecs_mdp (user_id) SELECT 'b0000000-0000-4000-8000-00000000000e' FROM generate_series(1, 4);
SELECT is(pg_temp.essai('ad5@example.test'), 'true libre', 'ad5 : essai 5 admis, il pose le blocage');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000e'), 'temporaire', 'ad5 : bloqué par ce débit');
SELECT is(pg_temp.rembourser(pg_temp.rang('b0000000-0000-4000-8000-00000000000e', 0)), 'true', 'ad5 : mot de passe juste, remboursé');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000e'), 'libre', 'ad5 : le blocage posé par ce débit est levé avec lui');
SELECT is(pg_temp.essai('ad5@example.test'), 'true libre', 'ad5 : essai du code TOTP admis (il pose de nouveau le blocage)');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-00000000000e', pg_temp.rang('b0000000-0000-4000-8000-00000000000e', 0)), 'true',
  'ad5 : code juste, la connexion réussit malgré le blocage posé par son propre essai');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000e'), 'libre', 'ad5 : compteurs remis à zéro');
INSERT INTO private.echecs_mdp (user_id, cree_le) VALUES ('b0000000-0000-4000-8000-00000000000e', now() - interval '11 minutes');
SELECT is(pg_temp.succes('b0000000-0000-4000-8000-00000000000e', pg_temp.rang('b0000000-0000-4000-8000-00000000000e', 0)), 'false',
  'un essai de plus de 10 minutes ne conclut aucune connexion');

-- ===== Déverrouillage : un autre administrateur Tenga seulement =====
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-000000000008')::text$q$),
  'ERR:42501:Interdit', 'un participant ne déverrouille personne');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-000000000008')::text$q$),
  'ERR:42501:Interdit', 'nul ne se déverrouille lui-même, administrateur compris');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-00000000000a')::text$q$),
  'ERR:42501:Interdit', 'le responsable de A ne déverrouille pas ad2, administrateur Tenga membre de A');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-000000000001')::text$q$),
  'ERR:42501:Interdit', 'le responsable de A ne déverrouille pas non plus un participant de A');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000006', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-00000000000a')::text$q$),
  'ERR:42501:Interdit', 'le responsable d''une autre organisation ne déverrouille pas');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000a'), 'definitif', 'ad2 : toujours verrouillé après les refus');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-0000000000ff')::text$q$),
  '', 'un administrateur Tenga peut viser un compte sans verrou : sans effet, sans erreur');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-00000000000a')::text$q$),
  '', 'ad1 (administrateur Tenga) déverrouille ad2');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-00000000000a'), 'libre', 'ad2 : de nouveau libre après le déverrouillage');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-00000000000a', 'authenticated',
  $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-000000000008')::text$q$),
  '', 'un autre administrateur Tenga déverrouille ad1');
SELECT is(pg_temp.etat('b0000000-0000-4000-8000-000000000008'), 'libre', 'ad1 : de nouveau libre');
SELECT is((SELECT count(*)::int FROM pg_temp.journal_test audit_log WHERE action = 'connexion.mdp.deverrouillage' AND acteur IS NOT NULL), 3,
  'chaque déverrouillage est journalisé avec son acteur (le ciblage d''un compte sans verrou aussi)');

-- ===== Liste des comptes à surveiller : administrateur Tenga seulement =====
INSERT INTO private.etat_mdp (user_id, verrouille_le) VALUES
  ('b0000000-0000-4000-8000-00000000000a', now()),
  ('b0000000-0000-4000-8000-00000000000c', now())
ON CONFLICT (user_id) DO UPDATE SET verrouille_le = now();
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated',
  $q$select string_agg(email, ',' order by email) from app.mdp_comptes_a_surveiller()$q$),
  'ad2@example.test,ad3@example.test', 'l''administrateur Tenga voit tous les comptes verrouillés, avec leur adresse');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000003', 'authenticated',
  $q$select count(*)::text from app.mdp_comptes_a_surveiller()$q$),
  '0', 'le responsable ne voit rien, pas même les membres de son organisation');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000001', 'authenticated',
  $q$select count(*)::text from app.mdp_comptes_a_surveiller()$q$),
  '0', 'un participant ne voit rien');

-- ===== Droits d'exécution =====
SELECT is(pg_temp.comme(NULL, 'anon', $q$select concat_ws(' ', admin::text, etat) from app.mdp_tentative('ad1@example.test')$q$),
  'ERR:42501:permission denied for schema app', 'anonyme : le schéma app est fermé, mdp_tentative inaccessible');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated', $q$select concat_ws(' ', admin::text, etat) from app.mdp_tentative('ad1@example.test')$q$),
  'ERR:42501:permission denied for function mdp_tentative', 'authenticated : mdp_tentative fermée');
SELECT is(pg_temp.comme('b0000000-0000-4000-8000-000000000008', 'authenticated', $q$select app.mdp_rembourser(1)::text$q$),
  'ERR:42501:permission denied for function mdp_rembourser', 'authenticated : mdp_rembourser fermée');
SELECT is(pg_temp.comme(NULL, 'service_role', $q$select app.deverrouiller_mot_de_passe('b0000000-0000-4000-8000-000000000008')::text$q$),
  'ERR:42501:permission denied for function deverrouiller_mot_de_passe', 'service_role : le déverrouillage exige une identité');

-- ===== Purge quotidienne =====
DELETE FROM private.etat_mdp;
DELETE FROM private.echecs_mdp WHERE user_id = 'b0000000-0000-4000-8000-00000000000d';
INSERT INTO private.echecs_mdp (user_id, cree_le) VALUES
  ('b0000000-0000-4000-8000-00000000000d', now() - interval '2 days'),
  ('b0000000-0000-4000-8000-00000000000d', now());
INSERT INTO private.etat_mdp (user_id, bloque_jusqu) VALUES ('b0000000-0000-4000-8000-00000000000d', now() - interval '1 hour');
INSERT INTO private.etat_mdp (user_id, verrouille_le) VALUES ('b0000000-0000-4000-8000-00000000000c', now() - interval '3 days');
SELECT private.purger_quotidien();
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-00000000000d'), 1,
  'la purge retire les échecs de plus d''un jour et garde les récents');
SELECT is((SELECT count(*)::int FROM private.etat_mdp WHERE user_id = 'b0000000-0000-4000-8000-00000000000d'), 0,
  'la purge retire un blocage échu');
SELECT is((SELECT count(*)::int FROM private.etat_mdp WHERE user_id = 'b0000000-0000-4000-8000-00000000000c'), 1,
  'la purge ne retire jamais un verrouillage');

-- ===== Cascade : supprimer un compte efface ses compteurs =====
DELETE FROM auth.users WHERE id = 'b0000000-0000-4000-8000-00000000000d';
SELECT is(pg_temp.nb('b0000000-0000-4000-8000-00000000000d'), 0, 'cascade : échecs effacés avec le compte');

SELECT * FROM finish();
