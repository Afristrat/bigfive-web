-- 0007_roles_qui_invite_attribue : règle d'Amine du 20/10/2026 (docs/design/roles-et-invitations.md).
--
--   1. Amine est super administrateur (table private.tenga_admins, inchangé).
--   2. Qui invite attribue les rôles : l'administrateur Tenga (tous les rôles,
--      toutes les organisations) et le responsable d'une organisation (consultant
--      et participant, dans SON organisation seulement). Le droit d'inviter
--      (app.inviter, private.peut_gerer, migration 0003) est inchangé : mêmes
--      deux acteurs.
--   3. Nul ne modifie ni ne retire son propre rôle, administrateur Tenga compris.
--   4. Un responsable ne touche jamais au rôle d'un autre responsable, même si ce
--      rôle change pendant l'opération (verrous de ligne, voir plus bas).
--   5. Il reste toujours au moins un administrateur Tenga, y compris sous
--      concurrence.
--
-- Migration ordinaire : elle tourne sous tenga_owner (imposé par migrate.sh).
-- Revue de sécurité indépendante du 20/10/2026 : un défaut de concurrence (écart
-- entre la lecture du rôle de la cible et l'écriture), un oracle d'existence de
-- compte, le vidage de la table des administrateurs et le niveau d'isolation
-- ont été corrigés ci-dessous.
--
-- CONTRAT DE SIGNATURE (équipe application)
--   app.attribuer_role(p_utilisateur uuid, p_organisation uuid, p_role text) RETURNS void
--   app.retirer_role(p_utilisateur uuid, p_organisation uuid) RETURNS boolean
--   Signatures INCHANGÉES, droits d'exécution inchangés (authenticated). Ce qui
--   change : l'appelant peut être le responsable de l'organisation, et deux
--   nouveaux refus (42501) : cible = soi-même, cible = un responsable (sauf
--   administrateur Tenga). Le message de refus est unique et ne distingue pas
--   « organisation inexistante », « compte inexistant » ni « interdit » pour un
--   responsable. Une rétrogradation journalise aussi l'ancien rôle
--   (role.ancien.<rôle>).

-- 1. Qui peut attribuer ce rôle dans cette organisation. Non exposée.
--    Le COALESCE est essentiel (même piège que private.peut_gerer, 0003) : sans
--    appartenance mon_role renvoie NULL, et « faux OU NULL » vaut NULL.
CREATE FUNCTION private.peut_attribuer(p_organisation uuid, p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    app.suis_admin_tenga()
    OR (p_role IN ('consultant', 'participant') AND app.mon_role(p_organisation) = 'responsable'),
    false)
$$;

-- 2. Attribution.
--    Concurrence : le responsable appelant est verrouillé en partage (on ne peut
--    pas le rétrograder entre le contrôle et l'écriture), la ligne de la cible
--    est verrouillée en écriture (on ne peut pas la promouvoir responsable entre
--    la lecture et l'écriture), et l'écriture elle-même refuse d'écraser un
--    responsable pour un non-administrateur (ON CONFLICT ... WHERE).
CREATE OR REPLACE FUNCTION app.attribuer_role(p_utilisateur uuid, p_organisation uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_actuel text;
  v_admin  boolean;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('responsable', 'consultant', 'participant') THEN
    RAISE EXCEPTION 'Rôle inconnu : responsable, consultant ou participant' USING ERRCODE = '22023';
  END IF;
  IF p_utilisateur IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Nul ne modifie son propre rôle' USING ERRCODE = '42501';
  END IF;
  v_admin := app.suis_admin_tenga();
  IF NOT v_admin THEN
    PERFORM 1 FROM app.memberships m
     WHERE m.user_id = v_uid AND m.organization_id = p_organisation AND m.role = 'responsable'
       FOR SHARE;
  END IF;
  SELECT m.role INTO v_actuel FROM app.memberships m
   WHERE m.user_id = p_utilisateur AND m.organization_id = p_organisation
     FOR UPDATE;
  IF NOT private.peut_attribuer(p_organisation, p_role)
     OR (v_actuel = 'responsable' AND NOT v_admin)
     OR (NOT v_admin AND NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur)) THEN
    RAISE EXCEPTION 'Réservé à un administrateur Tenga ou au responsable de l''organisation' USING ERRCODE = '42501';
  END IF;
  INSERT INTO app.memberships (user_id, organization_id, role)
  VALUES (p_utilisateur, p_organisation, p_role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role
    WHERE app.memberships.role <> 'responsable' OR v_admin;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Réservé à un administrateur Tenga ou au responsable de l''organisation' USING ERRCODE = '42501';
  END IF;
  IF v_actuel IS NOT NULL AND v_actuel <> p_role THEN
    PERFORM private.journaliser(v_uid, 'role.ancien.' || v_actuel, 'utilisateur', p_utilisateur, p_organisation);
  END IF;
  PERFORM private.journaliser(v_uid, 'role.attribuer.' || p_role, 'utilisateur', p_utilisateur, p_organisation);
END
$$;

-- 3. Retrait. Mêmes verrous qu'à l'attribution ; le DELETE refuse lui aussi
--    d'emporter un responsable pour un non-administrateur.
CREATE OR REPLACE FUNCTION app.retirer_role(p_utilisateur uuid, p_organisation uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_actuel text;
  v_admin  boolean;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_utilisateur IS NOT DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Nul ne modifie son propre rôle' USING ERRCODE = '42501';
  END IF;
  v_admin := app.suis_admin_tenga();
  IF NOT v_admin THEN
    PERFORM 1 FROM app.memberships m
     WHERE m.user_id = v_uid AND m.organization_id = p_organisation AND m.role = 'responsable'
       FOR SHARE;
  END IF;
  -- Sans droit sur l'organisation (ni administrateur ni responsable), refus
  -- AVANT toute lecture de la cible : on ne révèle pas qui y a un rôle.
  IF NOT private.peut_attribuer(p_organisation, 'participant') THEN
    RAISE EXCEPTION 'Réservé à un administrateur Tenga ou au responsable de l''organisation' USING ERRCODE = '42501';
  END IF;
  SELECT m.role INTO v_actuel FROM app.memberships m
   WHERE m.user_id = p_utilisateur AND m.organization_id = p_organisation
     FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_actuel = 'responsable' AND NOT v_admin THEN
    RAISE EXCEPTION 'Réservé à un administrateur Tenga ou au responsable de l''organisation' USING ERRCODE = '42501';
  END IF;
  DELETE FROM app.memberships
   WHERE user_id = p_utilisateur AND organization_id = p_organisation
     AND (role <> 'responsable' OR v_admin);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n = 0 THEN
    RAISE EXCEPTION 'Réservé à un administrateur Tenga ou au responsable de l''organisation' USING ERRCODE = '42501';
  END IF;
  PERFORM private.journaliser(v_uid, 'role.ancien.' || v_actuel, 'utilisateur', p_utilisateur, p_organisation);
  PERFORM private.journaliser(v_uid, 'role.retirer', 'utilisateur', p_utilisateur, p_organisation);
  RETURN true;
END
$$;

-- 4. Au moins un administrateur Tenga en permanence. Contrôle d'instruction
--    (après coup, sur l'état final) : un contrôle par ligne ne verrait pas la
--    suppression simultanée de deux lignes sur deux. La table de transition
--    écarte les suppressions à vide (aucune ligne supprimée = rien à garder).
--    Verrou consultatif de transaction AVANT la relecture : deux sessions qui
--    suppriment chacune un administrateur différent se sérialisent, la seconde
--    relit l'état validé par la première (nouveau cliché à chaque requête en
--    READ COMMITTED) et voit zéro administrateur. Sans lui, chacune verrait
--    encore l'autre et les deux réussiraient. Ce raisonnement suppose READ
--    COMMITTED : sous REPEATABLE READ ou SERIALIZABLE (cas d'un opérateur, jamais
--    de l'API), le garde refuse tout net plutôt que de se tromper.
CREATE FUNCTION private.garder_dernier_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF pg_catalog.current_setting('transaction_isolation') <> 'read committed' THEN
    RAISE EXCEPTION 'La suppression d''un administrateur Tenga exige le niveau d''isolation READ COMMITTED' USING ERRCODE = '25000';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('tenga.dernier_administrateur', 0));
  IF EXISTS (SELECT 1 FROM supprimes) AND NOT EXISTS (SELECT 1 FROM private.tenga_admins) THEN
    RAISE EXCEPTION 'Il doit toujours rester un administrateur Tenga' USING ERRCODE = '23000';
  END IF;
  RETURN NULL;
END
$$;

CREATE TRIGGER tenga_admins_dernier
  AFTER DELETE ON private.tenga_admins
  REFERENCING OLD TABLE AS supprimes
  FOR EACH STATEMENT EXECUTE FUNCTION private.garder_dernier_admin();

-- Vider la table (TRUNCATE) contournerait le garde : refusé, y compris pour le
-- propriétaire. (Les rôles de l'API sont déjà refusés par la migration 0002.)
CREATE FUNCTION private.refuser_vidage_administrateurs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Il doit toujours rester un administrateur Tenga' USING ERRCODE = '23000';
END
$$;

CREATE TRIGGER tenga_admins_vidage_interdit
  BEFORE TRUNCATE ON private.tenga_admins
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_vidage_administrateurs();
