-- 0006_groupe_porte_par_invitation : le groupe d'une personne est PORTÉ PAR
-- L'INVITATION et écrit UNE SEULE FOIS, à l'acceptation (décision du client).
--
-- Problème résolu. Une participation naît à l'acceptation d'une invitation,
-- possible seulement campagne ouverte (lot 2), alors que la composition des
-- groupes est gelée dès l'ouverture (0005) : le responsable ne pouvait donc
-- affecter personne. Désormais il choisit le groupe en invitant, et
-- app.accepter_invitation écrit la ligne de composition dans la transaction de
-- la participation.
--
-- Migration ordinaire : elle tourne sous tenga_owner (imposé par migrate.sh),
-- sans exception superutilisateur. Le garde-fou DDL s'applique.
--
-- CONTRAT DE SIGNATURE (équipe application)
--   app.inviter(p_campagne uuid, p_email text, p_prenom text DEFAULT NULL,
--               p_message text DEFAULT NULL, p_langue text DEFAULT NULL,
--               p_groupe uuid DEFAULT NULL)
--     RETURNS TABLE (invitation uuid, jeton text, expire timestamptz)
--   Les appels à cinq arguments restent valables (p_groupe vaut NULL : aucun
--   groupe). L'ancienne signature à cinq paramètres est REMPLACÉE, pas doublée
--   (pas d'ambiguïté de surcharge). Le groupe doit appartenir à la campagne ;
--   l'appelant est le responsable de l'organisation ou un administrateur Tenga
--   (contrôle inchangé, fait AVANT toute lecture du groupe : un refus ne dit pas
--   si le groupe existe). Aucun groupe ne se crée par l'invitation : les groupes
--   se créent en brouillon (app.creer_groupe) et sont gelés à l'ouverture.
--   Réinviter une adresse DÉJÀ en attente : le groupe ne change pas ; passer le
--   même p_groupe (sinon refus 55000), le jeton et l'expiration sont renouvelés.
--   app.accepter_invitation(p_jeton text, p_utilisateur uuid) RETURNS uuid
--   Signature INCHANGÉE (serveur seul). Elle écrit en plus la ligne de
--   app.group_members quand l'invitation porte un groupe.
--
-- RÈGLES
--   - app.invitations.group_id : clé étrangère composite (group_id, campaign_id)
--     vers app.groups, donc un groupe d'une autre campagne est impossible ;
--     nullable (une campagne peut n'avoir aucun groupe). IMMUABLE : un
--     déclencheur refuse toute modification, sauf l'effacement à l'acceptation
--     (de non-NULL vers NULL, dans la même écriture qui date l'acceptation).
--     À l'acceptation, group_id est EFFACÉ comme l'adresse et le prénom : plus
--     aucun lien invitation (acceptee_par) vers groupe. Le groupe ne subsiste
--     que dans app.group_members, par l'identifiant de participation.
--   - Gel de la composition : app.group_members n'accepte, hors brouillon, que
--     l'INSERTION de la composition portée par l'invitation en cours
--     d'acceptation : campagne ouverte, participation reliée à une invitation
--     encore en attente qui porte exactement ce groupe. Pas d'affectation libre,
--     pas de modification, pas de retrait. Cette condition est lue dans les
--     données (jamais un drapeau de session qu'un appelant pourrait poser).
--   - Une seule écriture : la clé primaire (campagne, participation) refuse un
--     second groupe. Si la participation existait déjà (personne réinvitée à la
--     même campagne), le groupe de la nouvelle invitation est ignoré et effacé :
--     la composition ne bouge jamais après la première acceptation.
--   - LECTURE : le responsable ne doit voir NI quel membre est dans quel groupe
--     NI les résultats individuels. La règle de lecture de app.group_members
--     (0005) l'ouvrait au responsable : or app.participations (user_id) lui est
--     lisible, la composition reliait donc une personne identifiable à un groupe.
--     Elle est RESSERRÉE à l'administrateur Tenga seul. Le responsable lit les
--     effectifs par groupe uniquement dans app.group_aggregates (règles de 0005 :
--     seuil d'anonymat, complément, une seule pose à la clôture). Avant
--     l'acceptation, la ligne d'invitation en attente porte à la fois l'adresse
--     et le groupe : le responsable les a lui-même saisis, la base n'ajoute
--     aucune information ; à l'acceptation les deux sont effacés de la ligne.
--   - Le journal ne contient pas le groupe (invitation.creer, invitation.accepter
--     inchangés) : l'identifiant de l'invitation mène à la participation.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Colonne portée par l'invitation -----------------------------------------
ALTER TABLE app.invitations ADD COLUMN group_id uuid;
ALTER TABLE app.invitations ADD CONSTRAINT invitations_groupe_fkey
  FOREIGN KEY (group_id, campaign_id) REFERENCES app.groups (id, campaign_id);
-- Acceptée : le groupe est effacé de l'invitation (il reste dans app.group_members).
ALTER TABLE app.invitations ADD CONSTRAINT invitations_groupe_efface_check
  CHECK (acceptee_le IS NULL OR group_id IS NULL);
CREATE INDEX invitations_groupe_idx ON app.invitations (group_id) WHERE group_id IS NOT NULL;

-- 2. Immutabilité du groupe de l'invitation -----------------------------------
CREATE FUNCTION private.verrouiller_groupe_invitation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.group_id IS NOT DISTINCT FROM OLD.group_id THEN
    RETURN NEW;
  END IF;
  -- Seule exception : l'acceptation efface le groupe de l'invitation.
  IF OLD.group_id IS NOT NULL AND NEW.group_id IS NULL AND OLD.acceptee_le IS NULL AND NEW.acceptee_le IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Le groupe d''une invitation ne change pas' USING ERRCODE = '55000';
END
$$;

-- Nommé « verrou » pour se déclencher APRÈS refuser_ecriture_api (ordre alphabétique).
CREATE TRIGGER invitations_verrou_groupe
  BEFORE UPDATE ON app.invitations
  FOR EACH ROW EXECUTE FUNCTION private.verrouiller_groupe_invitation();

-- 3. Gel de la composition : seul passage, la composition portée par l'invitation ----
-- Remplace la fonction de 0005 : mêmes contrôles, plus un passage unique pour
-- l'INSERTION d'un membre dans une campagne OUVERTE quand la participation est
-- reliée à une invitation encore en attente qui porte exactement ce groupe.
CREATE OR REPLACE FUNCTION private.geler_composition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_campagne uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.campaign_id ELSE NEW.campaign_id END;
  v_statut   text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.campaign_id IS DISTINCT FROM OLD.campaign_id THEN
    RAISE EXCEPTION 'Une composition ne change pas de campagne' USING ERRCODE = '55000';
  END IF;
  SELECT c.statut INTO v_statut FROM app.campaigns c WHERE c.id = v_campagne;
  IF NOT FOUND THEN
    -- Campagne disparue (effacement en cascade) ou inexistante (la clé étrangère refusera l'ajout).
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'group_members' THEN
    -- Effacement en cascade d'une participation (suppression de compte) : jamais bloqué.
    IF NOT EXISTS (SELECT 1 FROM app.participations p WHERE p.id = OLD.participation_id) THEN
      RETURN OLD;
    END IF;
  END IF;
  IF v_statut <> 'brouillon' THEN
    -- Seul passage : la composition PORTÉE PAR L'INVITATION en cours d'acceptation
    -- (app.accepter_invitation). Aucune affectation libre, aucune modification.
    -- (Imbriqué : sur app.groups, NEW n'a pas de colonne participation_id.)
    IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'group_members' AND v_statut = 'ouverte' THEN
      IF EXISTS (SELECT 1
                 FROM app.participations p
                 JOIN app.invitations i ON i.id = p.invitation_id
                 WHERE p.id = NEW.participation_id AND p.campaign_id = NEW.campaign_id
                   AND i.campaign_id = NEW.campaign_id AND i.group_id = NEW.group_id
                   AND i.acceptee_le IS NULL) THEN
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'Composition gelée : la campagne n''est plus en brouillon' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

-- 4. Inviter, avec un groupe facultatif ---------------------------------------
DROP FUNCTION app.inviter(uuid, text, text, text, text);

CREATE FUNCTION app.inviter(p_campagne uuid, p_email text, p_prenom text DEFAULT NULL,
                            p_message text DEFAULT NULL, p_langue text DEFAULT NULL,
                            p_groupe uuid DEFAULT NULL)
RETURNS TABLE (invitation uuid, jeton text, expire timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_statut  text;
  v_langue  text;
  v_email   text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_prenom  text := NULLIF(pg_catalog.btrim(COALESCE(p_prenom, '')), '');
  v_message text := NULLIF(pg_catalog.btrim(COALESCE(p_message, '')), '');
  v_jeton   text := pg_catalog.translate(pg_catalog.encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_id      uuid;
  v_expire  timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut, c.langue INTO v_org, v_statut, v_langue
  FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'ouverte' THEN
    RAISE EXCEPTION 'Campagne non ouverte : invitation impossible' USING ERRCODE = '55000';
  END IF;
  v_langue := COALESCE(p_langue, v_langue);
  IF v_langue NOT IN ('fr', 'ar', 'en') THEN
    RAISE EXCEPTION 'Langue inconnue : fr, ar ou en' USING ERRCODE = '22023';
  END IF;
  -- Le groupe existe déjà (créé en brouillon, gelé à l'ouverture) et appartient à CETTE campagne.
  IF p_groupe IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM app.groups g WHERE g.id = p_groupe AND g.campaign_id = p_campagne) THEN
    RAISE EXCEPTION 'Groupe introuvable dans cette campagne' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO app.invitations (campaign_id, organization_id, email, prenom, invitant_id, message, langue, jeton_hash, expire_le, group_id)
  VALUES (p_campagne, v_org, v_email, v_prenom, v_uid, v_message, v_langue,
          pg_catalog.sha256(pg_catalog.convert_to(v_jeton, 'UTF8')),
          now() + pg_catalog.make_interval(days => (SELECT s.conservation_invitations_jours FROM private.settings s)),
          p_groupe)
  ON CONFLICT (campaign_id, email) WHERE acceptee_le IS NULL DO UPDATE
    SET prenom = EXCLUDED.prenom, invitant_id = EXCLUDED.invitant_id, message = EXCLUDED.message,
        langue = EXCLUDED.langue, jeton_hash = EXCLUDED.jeton_hash,
        cree_le = now(), expire_le = EXCLUDED.expire_le
    -- Le groupe d'une invitation en attente ne change pas : renouveler avec le même groupe.
    WHERE app.invitations.group_id IS NOT DISTINCT FROM EXCLUDED.group_id
  RETURNING id, app.invitations.expire_le INTO v_id, v_expire;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Une invitation en attente existe pour cette adresse avec un autre groupe : le groupe ne change pas'
      USING ERRCODE = '55000';
  END IF;

  PERFORM private.journaliser(v_uid, 'invitation.creer', 'invitation', v_id, v_org);
  RETURN QUERY SELECT v_id, v_jeton, v_expire;
END
$$;

GRANT EXECUTE ON FUNCTION app.inviter(uuid, text, text, text, text, uuid) TO authenticated;

-- 5. Acceptation : la participation ET la composition, dans la même transaction ----
-- Signature inchangée. Si une moitié échoue, l'autre est annulée avec elle (une
-- seule transaction, aucun bloc d'exception qui avale l'erreur).
CREATE OR REPLACE FUNCTION app.accepter_invitation(p_jeton text, p_utilisateur uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inv     uuid;
  v_camp    uuid;
  v_org     uuid;
  v_email   text;
  v_groupe  uuid;
  v_statut  text;
  v_compte  text;
  v_role    text;
  v_part    uuid;
  v_nouvelle boolean;
BEGIN
  IF p_jeton IS NULL OR p_jeton !~ '^[A-Za-z0-9_-]{43}$' OR p_utilisateur IS NULL THEN
    RAISE EXCEPTION 'Invitation invalide, expirée ou déjà utilisée' USING ERRCODE = 'P0002';
  END IF;

  SELECT i.id, i.campaign_id, i.organization_id, i.email, i.group_id INTO v_inv, v_camp, v_org, v_email, v_groupe
  FROM app.invitations i
  WHERE i.jeton_hash = pg_catalog.sha256(pg_catalog.convert_to(p_jeton, 'UTF8'))
    AND i.acceptee_le IS NULL AND i.expire_le > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide, expirée ou déjà utilisée' USING ERRCODE = 'P0002';
  END IF;

  SELECT c.statut INTO v_statut FROM app.campaigns c WHERE c.id = v_camp FOR SHARE;
  IF v_statut <> 'ouverte' THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;

  -- Le compte est celui de l'adresse invitée, et il est actif.
  SELECT pg_catalog.lower(u.email) INTO v_compte
  FROM auth.users u
  WHERE u.id = p_utilisateur AND (u.banned_until IS NULL OR u.banned_until <= now());
  IF NOT FOUND OR v_compte IS DISTINCT FROM v_email THEN
    RAISE EXCEPTION 'Le compte ne correspond pas à l''adresse invitée' USING ERRCODE = '22023';
  END IF;

  -- Un seul rôle par organisation (arbitrage 6) : un responsable ou un
  -- consultant de l'organisation ne devient pas participant par invitation.
  SELECT m.role INTO v_role
  FROM app.memberships m WHERE m.user_id = p_utilisateur AND m.organization_id = v_org;
  IF v_role IS NOT NULL AND v_role <> 'participant' THEN
    RAISE EXCEPTION 'Ce compte a déjà un autre rôle dans l''organisation' USING ERRCODE = '55000';
  END IF;
  IF v_role IS NULL THEN
    INSERT INTO app.memberships (user_id, organization_id, role)
    VALUES (p_utilisateur, v_org, 'participant');
  END IF;

  INSERT INTO app.participations (campaign_id, organization_id, user_id, invitation_id)
  VALUES (v_camp, v_org, p_utilisateur, v_inv)
  ON CONFLICT (campaign_id, user_id) DO NOTHING
  RETURNING id INTO v_part;
  v_nouvelle := v_part IS NOT NULL;
  IF NOT v_nouvelle THEN
    SELECT p.id INTO v_part
    FROM app.participations p WHERE p.campaign_id = v_camp AND p.user_id = p_utilisateur;
  END IF;

  -- Composition portée par l'invitation, écrite UNE seule fois, avec la participation
  -- qui vient de naître. Une participation déjà existante garde sa composition (ou son
  -- absence de groupe) : le groupe de cette nouvelle invitation est ignoré.
  IF v_nouvelle AND v_groupe IS NOT NULL THEN
    INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
    VALUES (v_groupe, v_camp, v_org, v_part);
  END IF;

  UPDATE app.invitations
     SET email = NULL, prenom = NULL, group_id = NULL, acceptee_le = now(), acceptee_par = p_utilisateur
   WHERE id = v_inv;
  UPDATE app.profiles SET derniere_connexion_le = now() WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(p_utilisateur, 'invitation.accepter', 'participation', v_part, v_org);
  RETURN v_part;
END
$$;

-- 6. Lecture : la composition nominative n'est plus lisible par le responsable ----
-- (le consultant et le participant ne la lisaient déjà pas). Même nom de règle :
-- seule la condition change. Le responsable lit les effectifs dans group_aggregates.
ALTER POLICY group_members_lecture ON app.group_members USING ((SELECT app.suis_admin_tenga()));
