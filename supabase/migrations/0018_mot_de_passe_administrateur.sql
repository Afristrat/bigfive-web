-- 0018_mot_de_passe_administrateur : connexion par mot de passe et TOTP pour les
-- administrateurs Tenga (décisions d'Amine du 21/10/2026, PASSATION.md
-- [NEXT] 000-bis ; corrections de la revue de sécurité du 21/10 : I1, I3, I4).
--
--   1. Le mot de passe est réservé aux administrateurs Tenga
--      (private.tenga_admins). Le lien et le code restent la voie de secours et
--      de première connexion. Toute autre adresse reçoit la réponse d'un compte
--      libre : aucune fonction ne dit si une adresse est administrateur.
--   2. Blocage : le 5e échec en moins de 15 minutes bloque le mot de passe 30
--      minutes ; le 6e échec dans les 24 dernières heures le verrouille jusqu'à
--      l'intervention d'un AUTRE administrateur Tenga (nul ne se déverrouille
--      lui-même ; un responsable d'organisation ne déverrouille personne, I4).
--      Un échec de code TOTP compte comme un échec de mot de passe.
--   3. Débit préalable (I1) : chaque essai (mot de passe ou code TOTP) est
--      compté comme un échec AVANT d'interroger GoTrue, dans la même opération
--      atomique que le contrôle du blocage (app.mdp_tentative, verrou
--      consultatif par compte). Une rafale parallèle ne franchit donc jamais le
--      plafond : au-delà du 5e essai admis, tous sont refusés sans atteindre
--      GoTrue. Un mot de passe juste rembourse son débit
--      (app.mdp_rembourser) ; une connexion complète (code TOTP juste) remet
--      les compteurs à zéro (app.mdp_succes).
--   4. Purge quotidienne étendue aux nouveaux compteurs.
--
-- Le plafond de demandes de lien de connexion (3 par 15 minutes et par compte,
-- migration 0004) est INCHANGÉ (I3) : l'abaisser ferait de la demande de lien
-- le déni de service le moins cher contre un administrateur dont le mot de
-- passe serait verrouillé. Un tiers qui connaît l'adresse peut toujours épuiser
-- ce plafond pendant 15 minutes ; le verrouillage du mot de passe n'interdit
-- donc pas l'accès au compte par le lien, sauf pendant ces fenêtres.
--
-- CONTRAT DE SIGNATURE (équipe application)
--   app.mdp_tentative(p_email text)
--       RETURNS TABLE (admin boolean, etat text, jusqu timestamptz, tentative bigint)
--       service_role. etat : 'libre' | 'temporaire' | 'definitif'. 'libre' avec
--       admin = true : l'essai est admis et déjà compté comme un échec, son
--       identifiant est « tentative ». admin = false : adresse qui n'est pas
--       administrateur (rien n'est écrit, tentative NULL).
--   app.mdp_rembourser(p_tentative bigint) RETURNS boolean          service_role
--       Mot de passe juste : retire le débit et le blocage qu'il a causé.
--   app.mdp_succes(p_utilisateur uuid, p_tentative bigint) RETURNS boolean
--       service_role. false : essai inconnu, périmé, dépassé par un autre, ou
--       compte bloqué ou verrouillé par un autre essai (rien n'est effacé).
--   app.deverrouiller_mot_de_passe(p_utilisateur uuid) RETURNS void authenticated
--       administrateur Tenga seul, jamais soi-même.
--   app.mdp_comptes_a_surveiller() RETURNS TABLE (...)              authenticated
--       administrateur Tenga seul (tout autre appelant : aucune ligne).

-- 1. Compteurs --------------------------------------------------------------
CREATE TABLE private.echecs_mdp (
  id      bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  cree_le timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX echecs_mdp_utilisateur_idx ON private.echecs_mdp (user_id, cree_le DESC);
COMMENT ON TABLE private.echecs_mdp IS
  'Essais de mot de passe ou de code TOTP des administrateurs Tenga, comptés comme échecs dès leur admission (une ligne par essai, remboursée si le mot de passe est juste, purgée au bout d''un jour).';

CREATE TABLE private.etat_mdp (
  user_id       uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  bloque_jusqu  timestamptz,
  verrouille_le timestamptz,
  -- Essai (private.echecs_mdp.id) dont le débit a posé l'état courant : son
  -- remboursement ou sa connexion réussie lève cet état, et lui seul.
  cause         bigint
);
COMMENT ON TABLE private.etat_mdp IS
  'Blocage temporaire (30 minutes) et verrouillage du mot de passe d''un administrateur Tenga ; le verrouillage ne se lève que par app.deverrouiller_mot_de_passe.';

CREATE POLICY echecs_mdp_lecture_owner ON private.echecs_mdp FOR SELECT TO tenga_owner USING (true);
CREATE POLICY echecs_mdp_insertion_owner ON private.echecs_mdp FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY echecs_mdp_suppression_owner ON private.echecs_mdp FOR DELETE TO tenga_owner USING (true);

CREATE POLICY etat_mdp_lecture_owner ON private.etat_mdp FOR SELECT TO tenga_owner USING (true);
CREATE POLICY etat_mdp_insertion_owner ON private.etat_mdp FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY etat_mdp_modification_owner ON private.etat_mdp FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY etat_mdp_suppression_owner ON private.etat_mdp FOR DELETE TO tenga_owner USING (true);

-- 2. Fonctions du serveur ---------------------------------------------------

-- Contrôle et débit en une seule opération. Une adresse inconnue, non
-- administrateur, suspendue ou SSO répond « faux libre » sans rien écrire : la
-- réponse ne révèle pas le statut. Un compte bloqué ou verrouillé est refusé
-- sans débit (les essais faits pendant un blocage ne le prolongent pas).
-- Sinon l'essai est inscrit comme un échec, les seuils sont évalués (le
-- blocage ou le verrouillage qu'il déclenche vaut pour les essais SUIVANTS) et
-- l'essai est admis.
CREATE FUNCTION app.mdp_tentative(p_email text)
RETURNS TABLE (admin boolean, etat text, jusqu timestamptz, tentative bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_user  uuid;
  v_etat  private.etat_mdp;
  v_id    bigint;
  v_jour  integer;
  v_cinq  timestamptz;
BEGIN
  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE u.email = v_email
    AND u.is_sso_user = false
    AND (u.banned_until IS NULL OR u.banned_until <= now())
    AND EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = u.id);
  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, 'libre'::text, NULL::timestamptz, NULL::bigint;
    RETURN;
  END IF;

  -- Verrou consultatif par compte : deux essais simultanés se comptent l'un
  -- après l'autre, le contrôle et le débit ne sont jamais séparés.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mdp:' || v_user::text, 0));

  SELECT * INTO v_etat FROM private.etat_mdp e WHERE e.user_id = v_user;
  IF FOUND AND v_etat.verrouille_le IS NOT NULL THEN
    RETURN QUERY SELECT true, 'definitif'::text, NULL::timestamptz, NULL::bigint;
    RETURN;
  ELSIF FOUND AND v_etat.bloque_jusqu IS NOT NULL AND v_etat.bloque_jusqu > now() THEN
    RETURN QUERY SELECT true, 'temporaire'::text, v_etat.bloque_jusqu, NULL::bigint;
    RETURN;
  END IF;

  INSERT INTO private.echecs_mdp (user_id) VALUES (v_user) RETURNING id INTO v_id;
  PERFORM private.journaliser(NULL, 'connexion.mdp.essai', 'utilisateur', v_user);

  SELECT pg_catalog.count(*)::integer INTO v_jour
  FROM private.echecs_mdp f
  WHERE f.user_id = v_user AND f.cree_le > now() - interval '24 hours';

  IF v_jour >= 6 THEN
    -- Sixième échec dans les 24 heures : verrouillage jusqu'à intervention.
    INSERT INTO private.etat_mdp (user_id, verrouille_le, cause) VALUES (v_user, now(), v_id)
    ON CONFLICT (user_id) DO UPDATE SET verrouille_le = now(), cause = v_id;
    PERFORM private.journaliser(NULL, 'connexion.mdp.verrouillage', 'utilisateur', v_user);
  ELSE
    -- Cinq échecs en moins de 15 minutes : blocage de 30 minutes. La date du
    -- 5e échec le plus récent borne la fenêtre.
    SELECT f.cree_le INTO v_cinq
    FROM private.echecs_mdp f
    WHERE f.user_id = v_user
    ORDER BY f.cree_le DESC, f.id DESC
    OFFSET 4 LIMIT 1;
    IF v_cinq IS NOT NULL AND v_cinq > now() - interval '15 minutes' THEN
      INSERT INTO private.etat_mdp (user_id, bloque_jusqu, cause) VALUES (v_user, now() + interval '30 minutes', v_id)
      ON CONFLICT (user_id) DO UPDATE SET bloque_jusqu = now() + interval '30 minutes', cause = v_id;
      PERFORM private.journaliser(NULL, 'connexion.mdp.blocage', 'utilisateur', v_user);
    END IF;
  END IF;

  RETURN QUERY SELECT true, 'libre'::text, NULL::timestamptz, v_id;
END
$$;

-- Mot de passe juste (avant le code TOTP) : le débit de l'essai est retiré,
-- ainsi que le blocage ou le verrouillage que CE débit a déclenché (colonne
-- cause). Un état posé par un autre essai reste. false : essai inconnu ou déjà
-- retiré.
CREATE FUNCTION app.mdp_rembourser(p_tentative bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_essai private.echecs_mdp;
BEGIN
  SELECT * INTO v_essai FROM private.echecs_mdp f WHERE f.id = p_tentative;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mdp:' || v_essai.user_id::text, 0));

  DELETE FROM private.echecs_mdp f WHERE f.id = v_essai.id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  DELETE FROM private.etat_mdp e WHERE e.user_id = v_essai.user_id AND e.cause = v_essai.id;
  RETURN true;
END
$$;

-- Connexion réussie (code TOTP juste) : remet les compteurs à zéro. L'essai
-- doit être celui que app.mdp_tentative vient d'admettre pour ce compte : le
-- plus récent, de moins de 10 minutes. Refuse (false) si le compte n'est pas
-- administrateur, si l'essai ne convient pas, ou si un blocage ou un
-- verrouillage posé par un AUTRE essai existe : un verrouillage antérieur ne
-- s'efface jamais par une connexion.
CREATE FUNCTION app.mdp_succes(p_utilisateur uuid, p_tentative bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_etat  private.etat_mdp;
  v_essai private.echecs_mdp;
BEGIN
  IF p_utilisateur IS NULL OR p_tentative IS NULL
     OR NOT EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = p_utilisateur) THEN
    RETURN false;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mdp:' || p_utilisateur::text, 0));

  SELECT * INTO v_essai
  FROM private.echecs_mdp f
  WHERE f.user_id = p_utilisateur
  ORDER BY f.cree_le DESC, f.id DESC
  LIMIT 1;
  IF NOT FOUND OR v_essai.id <> p_tentative OR v_essai.cree_le <= now() - interval '10 minutes' THEN
    RETURN false;
  END IF;

  SELECT * INTO v_etat FROM private.etat_mdp e WHERE e.user_id = p_utilisateur;
  IF FOUND AND v_etat.cause IS DISTINCT FROM v_essai.id
     AND (v_etat.verrouille_le IS NOT NULL
          OR (v_etat.bloque_jusqu IS NOT NULL AND v_etat.bloque_jusqu > now())) THEN
    RETURN false;
  END IF;

  DELETE FROM private.echecs_mdp WHERE user_id = p_utilisateur;
  DELETE FROM private.etat_mdp WHERE user_id = p_utilisateur;
  UPDATE app.profiles SET derniere_connexion_le = now() WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(p_utilisateur, 'connexion.reussie', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

-- 3. Fonctions de l'interface ------------------------------------------------

-- Qui peut lever le verrouillage d'un compte : un administrateur Tenga, jamais
-- pour lui-même. Un responsable d'organisation ne déverrouille personne (I4 :
-- app.attribuer_role peut placer un administrateur Tenga dans l'organisation
-- d'un responsable, qui pourrait sinon le déverrouiller à volonté).
CREATE FUNCTION private.peut_deverrouiller(p_utilisateur uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    auth.uid() IS NOT NULL
    AND p_utilisateur IS NOT NULL
    AND p_utilisateur <> auth.uid()
    AND app.suis_admin_tenga(),
    false)
$$;

CREATE FUNCTION app.deverrouiller_mot_de_passe(p_utilisateur uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Refus unique : ni « compte inexistant », ni « pas administrateur », ni « soi-même ».
  IF NOT private.peut_deverrouiller(p_utilisateur) THEN
    RAISE EXCEPTION 'Interdit' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('mdp:' || p_utilisateur::text, 0));
  DELETE FROM private.echecs_mdp WHERE user_id = p_utilisateur;
  DELETE FROM private.etat_mdp WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(auth.uid(), 'connexion.mdp.deverrouillage', 'utilisateur', p_utilisateur);
END
$$;

-- Comptes dont le mot de passe est bloqué ou verrouillé, avec leur adresse :
-- réservé à l'administrateur Tenga (son propre compte excepté, qu'il ne peut
-- pas déverrouiller). Tout autre appelant n'obtient aucune ligne : la liste ne
-- révèle pas à un responsable quels membres sont administrateurs.
CREATE FUNCTION app.mdp_comptes_a_surveiller()
RETURNS TABLE (utilisateur uuid, nom text, email text, etat text, jusqu timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT e.user_id,
         p.nom,
         u.email::text,
         CASE WHEN e.verrouille_le IS NOT NULL THEN 'definitif' ELSE 'temporaire' END,
         e.bloque_jusqu
  FROM private.etat_mdp e
  JOIN auth.users u ON u.id = e.user_id
  LEFT JOIN app.profiles p ON p.user_id = e.user_id
  WHERE (e.verrouille_le IS NOT NULL OR (e.bloque_jusqu IS NOT NULL AND e.bloque_jusqu > now()))
    AND private.peut_deverrouiller(e.user_id)
  ORDER BY e.verrouille_le DESC NULLS LAST, e.bloque_jusqu DESC
$$;

-- Défense en profondeur : les privilèges par défaut de tenga_owner (0001) retirent déjà
-- EXECUTE à PUBLIC (le test 08 compte 0 fonction exécutable par PUBLIC) ; le REVOKE
-- explicite évite de dépendre de ce réglage, comme dans la migration 0008.
REVOKE ALL ON FUNCTION
  app.mdp_tentative(text), app.mdp_rembourser(bigint), app.mdp_succes(uuid, bigint),
  app.deverrouiller_mot_de_passe(uuid), app.mdp_comptes_a_surveiller()
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION
  app.mdp_tentative(text), app.mdp_rembourser(bigint), app.mdp_succes(uuid, bigint)
  TO service_role;
GRANT EXECUTE ON FUNCTION
  app.deverrouiller_mot_de_passe(uuid), app.mdp_comptes_a_surveiller()
  TO authenticated;

-- 4. Purge quotidienne (remplace celle de 0004) : s'ajoutent les échecs de mot
-- de passe de plus d'un jour et les blocages échus.
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
  DELETE FROM private.echecs_mdp WHERE cree_le < now() - interval '1 day';
  GET DIAGNOSTICS v_echecs = ROW_COUNT;
  v_compteurs := v_compteurs + v_echecs;
  -- Un verrouillage ne s'efface jamais seul ; un blocage échu n'a plus d'objet.
  DELETE FROM private.etat_mdp WHERE verrouille_le IS NULL AND (bloque_jusqu IS NULL OR bloque_jusqu < now());

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
