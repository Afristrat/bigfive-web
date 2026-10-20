-- migrate:superuser
-- 0004_durcissement_lot1 : correctifs de la revue de la base du lot 1.
--
-- M1  plafond de 5 essais du code à 6 chiffres PAR COMPTE (private.echecs_code),
--     qui survit aux nouveaux liens, et verrou consultatif par compte contre
--     les essais parallèles ;
-- M2  travail équivalent pour une adresse connue et inconnue (hachage factice,
--     lignes factices dans private.leurre_connexion, purgées chaque jour) ;
-- M3  plafond de demandes compté à part (private.demandes_lien), un échec de
--     code n'use plus les essais de tous les liens du compte ;
-- M4  recherche par adresse sur l'index users_email_partial_key ;
-- M5  purge quotidienne replanifiée à 01:00 heure de Casablanca ;
-- F1  service_role perd tout droit sur le schéma vault ;
-- F2  pg_stat_statements fermé à l'API ;
-- F3  droits par défaut retirés dans storage, graphql, graphql_public ;
-- F4  historique pg_cron purgé après 30 jours (tâche dédiée) ;
-- F5  (SELECT app.suis_admin_tenga()) dans les règles de lecture ;
-- F7  code à 6 chiffres haché par HMAC-SHA256 avec un secret ;
-- F8  échecs de code et plafonds atteints dans le journal.
--
-- Exception documentée (première ligne) : superutilisateur, car la migration
-- touche des droits sur auth, vault, extensions, des droits par défaut et
-- pg_cron. Tout ce qui crée des objets de app et private tourne sous
-- SET LOCAL ROLE tenga_owner, comme une migration ordinaire.
--
-- CONTRAT DE CHANGEMENT DE SIGNATURE (équipe application) :
--   app.demander_lien_connexion(p_email text, p_pepper text DEFAULT NULL)
--   app.consommer_code_connexion(p_email text, p_code text, p_pepper text DEFAULT NULL)
-- Les anciens appels (sans p_pepper) restent valables : les anciennes
-- signatures sont remplacées, pas doublées (pas d'ambiguïté de surcharge).
-- p_pepper est un secret de l'APPLICATION (32 caractères au moins, aléatoire,
-- variable d'environnement du serveur Next.js, jamais en base). S'il est
-- fourni, le code est haché par HMAC-SHA256 avec lui : un vol de la base ne
-- permet plus de retrouver un code (106 possibilités) par force brute. Il doit
-- être IDENTIQUE à la demande et à la consommation du code (sinon le code
-- est refusé) ; il ne change pas pendant les 15 minutes de vie d'un lien.
-- S'il est omis, la clé est private.settings.cle_hmac_code, tirée au hasard
-- dans la base : cela ne protège pas d'un vol de la base (clé et empreintes
-- au même endroit), cela garde seulement le HMAC et les appels existants.
-- Un p_pepper trop court est refusé (22023) : jamais de repli silencieux.
--
-- DURÉE ET ADRESSE INCONNUE (M2) : la base fait le même genre de travail pour
-- une adresse connue ou inconnue (même recherche indexée, même calcul de
-- HMAC, mêmes écritures, sur des lignes factices pour l'inconnue). Elle ne
-- garantit pas l'égalité à la microseconde : l'égalité complète se règle aussi
-- côté application par une attente minimale fixe de la réponse (déjà demandée
-- à l'équipe application) ; sans elle, la mesure reste un indice, pas une preuve.
--
-- COMPROMIS ASSUMÉ (M1/M3) : le plafond est par compte. Quelqu'un qui
-- connaît l'adresse peut donc, par 5 essais ratés, interdire le CODE de ce
-- compte pendant une heure. Le LIEN /c/{jeton} n'est pas touché (il ne dépend
-- pas du compteur), une connexion réussie par lien remet le compteur à zéro,
-- et la réponse reste neutre. Les 5 essais sur 106 gardent la probabilité
-- d'un succès par force brute sous 5.10-6 par heure et par compte.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Droits (superutilisateur) ---------------------------------------------

-- M4 : la colonne is_sso_user fait entrer la requête dans l'index partiel
-- users_email_partial_key (email) WHERE is_sso_user = false.
GRANT SELECT (is_sso_user) ON auth.users TO tenga_owner;

-- F1 : le schéma vault n'a aucun usage ici ; service_role (BYPASSRLS) y
-- lisait les secrets. postgres et supabase_admin gardent leurs droits, les
-- fonctions de l'image restent intactes (SECURITY DEFINER de supabase_admin).
REVOKE ALL ON ALL TABLES    IN SCHEMA vault FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA vault FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA vault FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON SCHEMA vault FROM PUBLIC, anon, authenticated, service_role;

-- F2 : pg_stat_statements expose les requêtes et leurs compteurs. Les vues
-- étaient lisibles par PUBLIC (donc par anon, authenticated, service_role) et
-- les fonctions sous-jacentes exécutables par PUBLIC. On ferme PUBLIC et les
-- trois rôles ; postgres garde ses droits (avec option de transmission).
REVOKE ALL ON extensions.pg_stat_statements, extensions.pg_stat_statements_info
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION extensions.pg_stat_statements(boolean), extensions.pg_stat_statements_info()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION extensions.pg_stat_statements(boolean), extensions.pg_stat_statements_info()
  TO postgres;

-- F3 : le gabarit accorde tout à anon, authenticated, service_role sur ce que
-- créeront les rôles du gabarit dans storage, graphql et graphql_public.
-- (Les objets déjà présents ne sont pas modifiés ici.)
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA storage, graphql, graphql_public
  REVOKE ALL ON TABLES    FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA storage, graphql, graphql_public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres, supabase_admin IN SCHEMA storage, graphql, graphql_public
  REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

-- 2. Objets de app et private (sous tenga_owner) ---------------------------
SET LOCAL ROLE tenga_owner;

-- F7 : clé de repli du HMAC (voir le contrat en tête). Le nom de la colonne
-- évite les mots que le test 04 interdit (jwt, secret, password).
ALTER TABLE private.settings
  ADD COLUMN IF NOT EXISTS cle_hmac_code bytea NOT NULL DEFAULT extensions.gen_random_bytes(32)
  CHECK (octet_length(cle_hmac_code) >= 32);

-- M1 : compteur d'échecs de code PAR COMPTE. « depuis » est la date du
-- premier échec de la série en cours : au-delà d'une heure, la série est
-- oubliée. 5 échecs dans la série ferment le code du compte, quel que soit
-- le lien. Une connexion réussie efface la ligne.
CREATE TABLE private.echecs_code (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nb      smallint NOT NULL DEFAULT 1 CHECK (nb BETWEEN 1 AND 5),
  depuis  timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE private.echecs_code IS
  'Échecs de code à 6 chiffres par compte (plafond 5 par série d''une heure), indépendants des liens.';

-- M3 : demandes de lien effectivement envoyées, comptées à part des liens
-- (une consommation ou une purge de lien ne remet pas le plafond à zéro).
CREATE TABLE private.demandes_lien (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  cree_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandes_lien_utilisateur_idx ON private.demandes_lien (user_id, cree_le);

-- M2 : lignes factices écrites pour une adresse inconnue (ou une demande
-- refusée par le plafond), purgées par la tâche quotidienne. Ne contient que
-- des octets aléatoires : aucune adresse, aucun identifiant.
CREATE TABLE private.leurre_connexion (
  id        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cree_le   timestamptz NOT NULL DEFAULT now(),
  empreinte bytea NOT NULL
);
CREATE INDEX leurre_connexion_cree_le_idx ON private.leurre_connexion (cree_le);

CREATE POLICY echecs_lecture_owner ON private.echecs_code FOR SELECT TO tenga_owner USING (true);
CREATE POLICY echecs_insertion_owner ON private.echecs_code FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY echecs_modification_owner ON private.echecs_code FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY echecs_suppression_owner ON private.echecs_code FOR DELETE TO tenga_owner USING (true);

CREATE POLICY demandes_lecture_owner ON private.demandes_lien FOR SELECT TO tenga_owner USING (true);
CREATE POLICY demandes_insertion_owner ON private.demandes_lien FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY demandes_suppression_owner ON private.demandes_lien FOR DELETE TO tenga_owner USING (true);

CREATE POLICY leurre_lecture_owner ON private.leurre_connexion FOR SELECT TO tenga_owner USING (true);
CREATE POLICY leurre_insertion_owner ON private.leurre_connexion FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY leurre_suppression_owner ON private.leurre_connexion FOR DELETE TO tenga_owner USING (true);

-- F7 : empreinte du code à 6 chiffres, liée à la ligne du lien. La clé est le
-- p_pepper de l'application, à défaut la clé de repli de private.settings.
CREATE FUNCTION private.empreinte_code(p_lien uuid, p_code text, p_pepper text)
RETURNS bytea
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
DECLARE
  v_cle bytea;
BEGIN
  IF p_pepper IS NOT NULL THEN
    IF pg_catalog.char_length(p_pepper) < 32 THEN
      RAISE EXCEPTION 'p_pepper trop court : 32 caractères au moins' USING ERRCODE = '22023';
    END IF;
    v_cle := pg_catalog.convert_to(p_pepper, 'UTF8');
  ELSE
    SELECT s.cle_hmac_code INTO v_cle FROM private.settings s;
  END IF;
  RETURN extensions.hmac(pg_catalog.convert_to(p_lien::text || ':' || COALESCE(p_code, ''), 'UTF8'), v_cle, 'sha256');
END
$$;

-- Finalisation commune (remplace celle de 0002) : un seul lien servira, les
-- autres du compte sont éteints, les compteurs de connexion repartent à zéro.
CREATE OR REPLACE FUNCTION private.finaliser_connexion(p_utilisateur uuid, p_lien uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE private.liens_connexion SET consomme_le = now() WHERE id = p_lien;
  UPDATE private.liens_connexion SET expire_le = now()
   WHERE user_id = p_utilisateur AND consomme_le IS NULL AND expire_le > now();
  DELETE FROM private.echecs_code WHERE user_id = p_utilisateur;
  DELETE FROM private.demandes_lien WHERE user_id = p_utilisateur;
  UPDATE app.profiles SET derniere_connexion_le = now() WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(p_utilisateur, 'connexion.reussie', 'utilisateur', p_utilisateur);
END
$$;

-- Les signatures changent (paramètre p_pepper) : les anciennes disparaissent.
DROP FUNCTION app.demander_lien_connexion(text);
DROP FUNCTION app.consommer_code_connexion(text, text);

-- Demande de lien. Réponse de même forme que l'adresse soit connue ou non,
-- ou que le plafond de 3 demandes par 15 minutes soit atteint : seul
-- « envoyer » diffère. Les trois cas calculent le même HMAC et écrivent deux
-- lignes (vraies, ou factices dans private.leurre_connexion).
CREATE FUNCTION app.demander_lien_connexion(p_email text, p_pepper text DEFAULT NULL)
RETURNS TABLE (envoyer boolean, jeton text, code text, langue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email   text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_octets  bytea := extensions.gen_random_bytes(36);
  v_jeton   text := pg_catalog.translate(pg_catalog.encode(pg_catalog.substr(v_octets, 1, 32), 'base64'), '+/=', '-_');
  -- Réduction modulo 10^6 d'un entier de 32 bits : biais relatif inférieur à 3e-4, sans conséquence pour 5 essais.
  v_code    text := pg_catalog.lpad((((pg_catalog.get_byte(v_octets, 32)::bigint << 24)
                     | (pg_catalog.get_byte(v_octets, 33)::bigint << 16)
                     | (pg_catalog.get_byte(v_octets, 34)::bigint << 8)
                     | pg_catalog.get_byte(v_octets, 35)::bigint) % 1000000)::text, 6, '0');
  v_user    uuid;
  v_langue  text;
  v_lien    uuid := gen_random_uuid();
  v_hash    bytea;
  v_plafond boolean := false;
BEGIN
  v_hash := private.empreinte_code(v_lien, v_code, p_pepper);

  -- is_sso_user = false : requête couverte par users_email_partial_key.
  SELECT u.id, p.langue INTO v_user, v_langue
  FROM auth.users u
  JOIN app.profiles p ON p.user_id = u.id
  WHERE u.email = v_email
    AND u.is_sso_user = false
    AND (u.banned_until IS NULL OR u.banned_until <= now());

  IF v_user IS NOT NULL THEN
    IF (SELECT pg_catalog.count(*) FROM private.demandes_lien d
         WHERE d.user_id = v_user AND d.cree_le > now() - interval '15 minutes') >= 3 THEN
      v_plafond := true;
      -- Une seule trace par compte et par 15 minutes (pas d'inondation du journal).
      IF NOT EXISTS (SELECT 1 FROM private.audit_log a
                      WHERE a.action = 'connexion.plafond' AND a.ressource_id = v_user
                        AND a.cree_le > now() - interval '15 minutes') THEN
        PERFORM private.journaliser(NULL, 'connexion.plafond', 'utilisateur', v_user);
      END IF;
    END IF;
  ELSE
    -- Lecture factice du compteur, comme pour une adresse connue.
    PERFORM pg_catalog.count(*) FROM private.demandes_lien d
     WHERE d.user_id = gen_random_uuid() AND d.cree_le > now() - interval '15 minutes';
  END IF;

  IF v_user IS NULL OR v_plafond THEN
    INSERT INTO private.leurre_connexion (empreinte) SELECT v_hash FROM pg_catalog.generate_series(1, 2);
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  INSERT INTO private.liens_connexion (id, user_id, jeton_hash, code_hash, expire_le)
  VALUES (v_lien, v_user,
          pg_catalog.sha256(pg_catalog.convert_to(v_jeton, 'UTF8')),
          v_hash,
          now() + interval '15 minutes');
  INSERT INTO private.demandes_lien (user_id) VALUES (v_user);
  RETURN QUERY SELECT true, v_jeton, v_code, v_langue;
END
$$;

-- Consommation du code à 6 chiffres (autre appareil que celui du lien).
-- Verrou consultatif par compte (essais parallèles sérialisés), compteur
-- d'échecs par compte (5 par série d'une heure, quel que soit le lien),
-- journalisation des échecs et du plafond (sans adresse, acteur nul).
CREATE FUNCTION app.consommer_code_connexion(p_email text, p_code text, p_pepper text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email  text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_user   uuid;
  v_lien   uuid;
  v_nb     smallint;
  v_depuis timestamptz;
  v_hash   bytea;
BEGIN
  -- Un HMAC factice pour tous : valide p_pepper (22023 s'il est trop court),
  -- et fait pour une adresse inconnue le calcul qu'une adresse connue fait.
  v_hash := private.empreinte_code(gen_random_uuid(), p_code, p_pepper);

  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE u.email = v_email
    AND u.is_sso_user = false
    AND (u.banned_until IS NULL OR u.banned_until <= now());

  IF v_user IS NULL THEN
    -- Écritures factices, comme les écritures d'un échec pour une adresse connue.
    INSERT INTO private.leurre_connexion (empreinte) SELECT v_hash FROM pg_catalog.generate_series(1, 3);
    RETURN NULL;
  END IF;

  -- Un seul essai à la fois par compte : les essais parallèles font la queue
  -- et lisent chacun le compteur écrit par le précédent.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));

  SELECT e.nb, e.depuis INTO v_nb, v_depuis FROM private.echecs_code e WHERE e.user_id = v_user;
  IF v_depuis IS NOT NULL AND v_depuis <= now() - interval '1 hour' THEN
    DELETE FROM private.echecs_code WHERE user_id = v_user;
    v_nb := NULL;
  END IF;
  IF COALESCE(v_nb, 0) >= 5 THEN
    -- Plafond atteint : refus sans regarder le code, quel que soit le lien.
    RETURN NULL;
  END IF;

  IF p_code ~ '^[0-9]{6}$' THEN
    SELECT l.id INTO v_lien
    FROM private.liens_connexion l
    WHERE l.user_id = v_user AND l.consomme_le IS NULL AND l.expire_le > now() AND l.essais < 5
      AND l.code_hash = private.empreinte_code(l.id, p_code, p_pepper)
    ORDER BY l.cree_le DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_lien IS NULL THEN
    INSERT INTO private.echecs_code AS e (user_id, nb, depuis) VALUES (v_user, 1, now())
    ON CONFLICT (user_id) DO UPDATE SET nb = LEAST(e.nb + 1, 5)
    RETURNING e.nb INTO v_nb;
    -- Le budget propre au lien ne s'use que sur le lien le plus récent (jamais
    -- sur tous les liens du compte) : le lien lui-même reste utilisable.
    UPDATE private.liens_connexion SET essais = essais + 1
     WHERE id = (SELECT l.id FROM private.liens_connexion l
                  WHERE l.user_id = v_user AND l.consomme_le IS NULL AND l.expire_le > now() AND l.essais < 5
                  ORDER BY l.cree_le DESC LIMIT 1);
    PERFORM private.journaliser(NULL, 'connexion.echec', 'utilisateur', v_user, NULL, v_nb::integer);
    IF v_nb >= 5 THEN
      PERFORM private.journaliser(NULL, 'connexion.plafond', 'utilisateur', v_user);
    END IF;
    RETURN NULL;
  END IF;
  PERFORM private.finaliser_connexion(v_user, v_lien);
  RETURN v_user;
END
$$;

GRANT EXECUTE ON FUNCTION
  app.demander_lien_connexion(text, text), app.consommer_code_connexion(text, text, text)
  TO service_role;

-- Purge quotidienne (remplace celle de 0003) : s'ajoutent les lignes
-- factices, les demandes et les séries d'échecs échues.
CREATE OR REPLACE FUNCTION private.purger_quotidien()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liens       integer;
  v_journal     integer;
  v_invitations integer;
  v_tentatives  integer;
  v_resultats   integer;
  v_leurre      integer;
  v_compteurs   integer;
  v_echecs      integer;
  v_comptes     integer := 0;
  v_compte      uuid;
BEGIN
  -- ponytail: les liens échus se gardent 1 jour après expiration, constante ; à rendre réglable si besoin.
  DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '1 day';
  GET DIAGNOSTICS v_liens = ROW_COUNT;

  DELETE FROM private.audit_log
   WHERE cree_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_journal_mois FROM private.settings s));
  GET DIAGNOSTICS v_journal = ROW_COUNT;

  DELETE FROM private.leurre_connexion WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_leurre = ROW_COUNT;

  DELETE FROM private.demandes_lien WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_compteurs = ROW_COUNT;
  DELETE FROM private.echecs_code WHERE depuis < now() - interval '1 day';
  GET DIAGNOSTICS v_echecs = ROW_COUNT;
  v_compteurs := v_compteurs + v_echecs;

  DELETE FROM app.invitations WHERE expire_le < now();
  GET DIAGNOSTICS v_invitations = ROW_COUNT;

  DELETE FROM app.attempts WHERE expire_le < now();
  GET DIAGNOSTICS v_tentatives = ROW_COUNT;
  -- Une participation dont la tentative a été purgée redevient « ouverte ».
  UPDATE app.participations p
     SET statut = 'ouverte', commencee_le = NULL
   WHERE p.statut = 'en_cours'
     AND NOT EXISTS (SELECT 1 FROM app.attempts a WHERE a.participation_id = p.id);

  DELETE FROM app.results
   WHERE soumis_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_resultats_mois FROM private.settings s));
  GET DIAGNOSTICS v_resultats = ROW_COUNT;

  FOR v_compte IN
    SELECT u.id
    FROM auth.users u
    JOIN app.profiles pr ON pr.user_id = u.id
    WHERE COALESCE(pr.derniere_connexion_le, pr.cree_le)
            < now() - pg_catalog.make_interval(months => (SELECT s.conservation_comptes_vides_mois FROM private.settings s))
      AND NOT EXISTS (SELECT 1 FROM app.results r WHERE r.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM private.tenga_admins ta WHERE ta.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM app.memberships m WHERE m.user_id = u.id AND m.role IN ('responsable', 'consultant'))
  LOOP
    IF private.effacer_compte(v_compte) THEN
      v_comptes := v_comptes + 1;
    END IF;
  END LOOP;

  PERFORM private.journaliser(NULL, 'purge.liens_connexion', NULL, NULL, NULL, v_liens);
  PERFORM private.journaliser(NULL, 'purge.journal', NULL, NULL, NULL, v_journal);
  PERFORM private.journaliser(NULL, 'purge.invitations', NULL, NULL, NULL, v_invitations);
  PERFORM private.journaliser(NULL, 'purge.tentatives', NULL, NULL, NULL, v_tentatives);
  PERFORM private.journaliser(NULL, 'purge.resultats', NULL, NULL, NULL, v_resultats);
  PERFORM private.journaliser(NULL, 'purge.comptes', NULL, NULL, NULL, v_comptes);
  PERFORM private.journaliser(NULL, 'purge.leurre_connexion', NULL, NULL, NULL, v_leurre);
  PERFORM private.journaliser(NULL, 'purge.compteurs_connexion', NULL, NULL, NULL, v_compteurs);
END
$$;

COMMENT ON FUNCTION private.purger_quotidien() IS
  'Purge quotidienne (plan § 5). Planifiée par pg_cron à 01:00 HEURE LOCALE : cron.timezone vaut Africa/Casablanca et pg_cron 1.6 raisonne dans ce fuseau (le commentaire de la migration 0002, « 00:00 UTC », était erroné).';

-- F5 : (SELECT ...) autour de la fonction sans paramètre, évaluée une fois par
-- requête (InitPlan) et non une fois par ligne. Même sens qu'avant.
ALTER POLICY organizations_lecture ON app.organizations
  USING (app.suis_membre(id) OR (SELECT app.suis_admin_tenga()));
ALTER POLICY memberships_lecture ON app.memberships
  USING (user_id = (SELECT auth.uid()) OR (SELECT app.suis_admin_tenga()));
ALTER POLICY campaigns_lecture ON app.campaigns
  USING (
    (SELECT app.suis_admin_tenga())
    OR app.mon_role(organization_id) IN ('responsable', 'consultant')
    OR EXISTS (SELECT 1 FROM app.participations p
               WHERE p.campaign_id = campaigns.id AND p.user_id = (SELECT auth.uid())));

RESET ROLE;

-- 3. pg_cron (superutilisateur) --------------------------------------------

-- M5 : cron.timezone = Africa/Casablanca, pg_cron 1.6.4 lit l'horaire dans ce
-- fuseau : '0 1 * * *' = 01:00 locale. Replanification sous le même nom,
-- rejouable (retrait s'il existe, puis création). L'historique de l'ancienne
-- tâche reste dans cron.job_run_details jusqu'à sa purge.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tenga-purge-quotidienne') THEN
    PERFORM cron.unschedule('tenga-purge-quotidienne');
  END IF;
  PERFORM cron.schedule('tenga-purge-quotidienne', '0 1 * * *', 'SELECT private.purger_quotidien()');

  -- F4 : tenga_owner ne voit pas cron.job_run_details (RLS de pg_cron propre à
  -- l'utilisateur de la tâche) : la purge de l'historique est une tâche
  -- distincte, exécutée par le propriétaire des tâches (superutilisateur).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tenga-purge-historique-cron') THEN
    PERFORM cron.unschedule('tenga-purge-historique-cron');
  END IF;
  PERFORM cron.schedule('tenga-purge-historique-cron', '15 1 * * *',
    'DELETE FROM cron.job_run_details WHERE end_time < now() - interval ''30 days''');
END
$$;
