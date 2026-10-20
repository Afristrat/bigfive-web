-- migrate:superuser
-- 0003_campagnes_passation_resultats : lots 2 et 3 (plan § 3, 4, 5 et 6).
--
-- Contenu : campagnes, invitations, participations, tentatives, résultats ;
-- fonctions contrôlées (créer, ouvrir et clore une campagne, inviter, accepter
-- une invitation, enregistrer la progression, soumettre le résultat, lecture
-- individuelle journalisée, mes résultats, export, suppression de compte,
-- information du responsable) ; extension de la purge quotidienne.
--
-- Exception documentée (première ligne ci-dessus) : comme 0002, cette
-- migration accorde un droit sur le schéma auth (suppression d'un compte, pour
-- l'effacement en cascade). Tout ce qui crée des objets de app et private
-- s'exécute sous SET LOCAL ROLE tenga_owner (section 2) : le garde-fou DDL
-- s'applique (RLS forcée, search_path épinglé).
--
-- Principes inchangés (plan § 3) : aucun droit par défaut ; l'API ne lit que
-- par des règles explicites ; toute écriture passe par une fonction SECURITY
-- DEFINER (propriétaire tenga_owner, search_path vide) ; le responsable
-- d'organisation et le consultant n'ont AUCUNE règle de lecture sur attempts
-- ni sur results ; la lecture individuelle passe par une seule fonction qui
-- journalise avant de renvoyer.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Droit sur le schéma auth (superutilisateur) ----------------------------
-- Suppression d'un compte (demande de la personne, purge des comptes vides) :
-- l'effacement en cascade des clés étrangères vers auth.users fait le reste.
-- C'est, avec la lecture ouverte en 0002, la seule ouverture sur auth.
GRANT DELETE ON auth.users TO tenga_owner;
DROP POLICY IF EXISTS tenga_owner_suppression ON auth.users;
CREATE POLICY tenga_owner_suppression ON auth.users FOR DELETE TO tenga_owner USING (true);

-- 2. Tables, déclencheurs, fonctions, règles (sous tenga_owner) -------------
SET LOCAL ROLE tenga_owner;

-- 2.1 Campagnes. Le statut ne fait qu'avancer : brouillon, ouverte, close
-- (déclencheur ci-dessous). Une campagne close n'accepte plus de passation.
CREATE TABLE app.campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES app.organizations (id) ON DELETE CASCADE,
  titre           text NOT NULL CHECK (titre = btrim(titre) AND char_length(titre) BETWEEN 1 AND 160),
  langue          text NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'ar', 'en')),
  statut          text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'ouverte', 'close')),
  cree_par        uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  ouverte_le      timestamptz,
  cloture_le      timestamptz,
  UNIQUE (id, organization_id),
  CHECK ((statut = 'brouillon') = (ouverte_le IS NULL)),
  CHECK ((statut = 'close') = (cloture_le IS NOT NULL)),
  CHECK (cloture_le IS NULL OR cloture_le >= ouverte_le)
);
CREATE INDEX campaigns_organisation_idx ON app.campaigns (organization_id);

-- 2.2 Invitations. AUCUNE colonne de rôle : une invitation ne produit que le
-- rôle de participant (verrou 4). Le jeton de 32 octets n'est stocké que haché.
-- L'adresse et le prénom sont effacés à l'acceptation (contraintes ci-dessous).
CREATE TABLE app.invitations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  email           text CHECK (email IS NULL OR (email = lower(btrim(email)) AND char_length(email) <= 254
                              AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  prenom          text CHECK (prenom IS NULL OR (prenom = btrim(prenom) AND char_length(prenom) BETWEEN 1 AND 80)),
  invitant_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  message         text CHECK (message IS NULL OR char_length(message) BETWEEN 1 AND 1000),
  langue          text NOT NULL CHECK (langue IN ('fr', 'ar', 'en')),
  jeton_hash      bytea NOT NULL UNIQUE CHECK (octet_length(jeton_hash) = 32),
  cree_le         timestamptz NOT NULL DEFAULT now(),
  expire_le       timestamptz NOT NULL,
  acceptee_le     timestamptz,
  acceptee_par    uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, organization_id) REFERENCES app.campaigns (id, organization_id) ON DELETE CASCADE,
  CHECK (expire_le > cree_le),
  CHECK ((acceptee_le IS NULL) = (acceptee_par IS NULL)),
  -- En attente : l'adresse est présente. Acceptée : l'adresse et le prénom sont effacés.
  CHECK ((acceptee_le IS NULL) = (email IS NOT NULL)),
  CHECK (acceptee_le IS NULL OR prenom IS NULL)
);
-- Une seule invitation en attente par adresse et par campagne : réinviter la
-- même adresse renouvelle le jeton (fonction app.inviter).
CREATE UNIQUE INDEX invitations_en_attente_uniq ON app.invitations (campaign_id, email) WHERE acceptee_le IS NULL;
CREATE INDEX invitations_expiration_idx ON app.invitations (expire_le);
CREATE INDEX invitations_organisation_idx ON app.invitations (organization_id);

-- 2.3 Participations : le droit de passer le test pour une campagne, une par
-- personne et par campagne. L'organisation est celle de la campagne (clé
-- étrangère composite).
CREATE TABLE app.participations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  invitation_id   uuid REFERENCES app.invitations (id) ON DELETE SET NULL,
  statut          text NOT NULL DEFAULT 'ouverte' CHECK (statut IN ('ouverte', 'en_cours', 'terminee')),
  ouverte_le      timestamptz NOT NULL DEFAULT now(),
  commencee_le    timestamptz,
  terminee_le     timestamptz,
  FOREIGN KEY (campaign_id, organization_id) REFERENCES app.campaigns (id, organization_id) ON DELETE CASCADE,
  UNIQUE (campaign_id, user_id),
  UNIQUE (id, organization_id),
  UNIQUE (id, user_id),
  CHECK ((statut = 'ouverte') = (commencee_le IS NULL)),
  CHECK ((statut = 'terminee') = (terminee_le IS NOT NULL))
);
CREATE INDEX participations_utilisateur_idx ON app.participations (user_id);
CREATE INDEX participations_organisation_idx ON app.participations (organization_id);
CREATE INDEX participations_invitation_idx ON app.participations (invitation_id);

-- 2.4 Tentatives : progression en cours, une par participation, avec numéro de
-- révision (accès concurrent) et expiration à 30 jours après la dernière
-- sauvegarde.
CREATE TABLE app.attempts (
  participation_id      uuid PRIMARY KEY,
  user_id               uuid NOT NULL,
  questionnaire_version text NOT NULL CHECK (questionnaire_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  reponses              jsonb NOT NULL DEFAULT '{}'::jsonb
                        CHECK (jsonb_typeof(reponses) = 'object' AND octet_length(reponses::text) <= 65536),
  revision              integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
  cree_le               timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le         timestamptz NOT NULL DEFAULT now(),
  expire_le             timestamptz NOT NULL,
  FOREIGN KEY (participation_id, user_id) REFERENCES app.participations (id, user_id) ON DELETE CASCADE,
  CHECK (expire_le > mis_a_jour_le)
);
CREATE INDEX attempts_utilisateur_idx ON app.attempts (user_id);
CREATE INDEX attempts_expiration_idx ON app.attempts (expire_le);

-- 2.5 Résultats : réponses, scores précalculés par l'application, versions du
-- questionnaire et du calcul. Un par participation ; l'organisation est celle
-- de la campagne (clé étrangère composite). Jamais modifié après coup.
CREATE TABLE app.results (
  participation_id      uuid PRIMARY KEY,
  organization_id       uuid NOT NULL,
  user_id               uuid NOT NULL,
  reponses              jsonb NOT NULL CHECK (jsonb_typeof(reponses) = 'object' AND octet_length(reponses::text) <= 65536),
  scores                jsonb NOT NULL CHECK (jsonb_typeof(scores) = 'object' AND octet_length(scores::text) <= 65536),
  questionnaire_version text NOT NULL CHECK (questionnaire_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  calcul_version        text NOT NULL CHECK (calcul_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  soumis_le             timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (participation_id, organization_id) REFERENCES app.participations (id, organization_id) ON DELETE CASCADE,
  FOREIGN KEY (participation_id, user_id) REFERENCES app.participations (id, user_id) ON DELETE CASCADE
);
CREATE INDEX results_utilisateur_idx ON app.results (user_id);
CREATE INDEX results_organisation_idx ON app.results (organization_id);
CREATE INDEX results_soumis_idx ON app.results (soumis_le);

-- 2.6 Verrou 3 (plan § 3.3) sur les cinq tables : toute écriture venant d'un
-- rôle de l'API est refusée par un déclencheur, quels que soient droits et règles.
CREATE TRIGGER campaigns_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.campaigns
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER campaigns_sans_vidage_api
  BEFORE TRUNCATE ON app.campaigns
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER invitations_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.invitations
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER invitations_sans_vidage_api
  BEFORE TRUNCATE ON app.invitations
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER participations_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.participations
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER participations_sans_vidage_api
  BEFORE TRUNCATE ON app.participations
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER attempts_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.attempts
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER attempts_sans_vidage_api
  BEFORE TRUNCATE ON app.attempts
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER results_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.results
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER results_sans_vidage_api
  BEFORE TRUNCATE ON app.results
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- 2.7 Le statut d'une campagne ne fait qu'avancer, et sa propriétaire ne change
-- jamais. La clôture est irréversible : les agrégats du lot 4 en dépendent.
CREATE FUNCTION private.verifier_transition_campagne()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
    RAISE EXCEPTION 'Une campagne ne change pas d''organisation' USING ERRCODE = '55000';
  END IF;
  IF NEW.statut IS DISTINCT FROM OLD.statut
     AND NOT ((OLD.statut = 'brouillon' AND NEW.statut = 'ouverte')
              OR (OLD.statut = 'ouverte' AND NEW.statut = 'close')) THEN
    RAISE EXCEPTION 'Transition de campagne interdite : % vers %', OLD.statut, NEW.statut
      USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER campaigns_transition
  BEFORE UPDATE ON app.campaigns
  FOR EACH ROW EXECUTE FUNCTION private.verifier_transition_campagne();

-- 2.8 Une campagne non ouverte (brouillon ou close) n'accepte aucune passation,
-- même par une écriture directe : seconde barrière derrière les fonctions.
CREATE FUNCTION private.exiger_campagne_ouverte()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
       SELECT 1
       FROM app.participations p
       JOIN app.campaigns c ON c.id = p.campaign_id
       WHERE p.id = NEW.participation_id AND c.statut = 'ouverte') THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER attempts_campagne_ouverte
  BEFORE INSERT OR UPDATE ON app.attempts
  FOR EACH ROW EXECUTE FUNCTION private.exiger_campagne_ouverte();
CREATE TRIGGER results_campagne_ouverte
  BEFORE INSERT ON app.results
  FOR EACH ROW EXECUTE FUNCTION private.exiger_campagne_ouverte();

-- 2.9 Un résultat soumis ne se modifie plus (il s'efface, par la suppression
-- de compte ou la purge).
CREATE FUNCTION private.refuser_modification_resultat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Un résultat soumis ne se modifie pas' USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER results_immuables
  BEFORE UPDATE ON app.results
  FOR EACH ROW EXECUTE FUNCTION private.refuser_modification_resultat();

-- 2.10 Aides d'accès (rôle connecté). Elles ne répondent que sur l'identité de
-- l'appelant.
CREATE FUNCTION app.mon_role(p_organisation uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT m.role FROM app.memberships m
  WHERE m.user_id = auth.uid() AND m.organization_id = p_organisation
$$;

-- Gestion d'une organisation : son responsable ou un administrateur Tenga.
-- Non exposée : appelée seulement par les fonctions ci-dessous. Le COALESCE est
-- essentiel : sans appartenance, mon_role renvoie NULL, et « faux OU NULL » vaut
-- NULL, que « NOT » laisserait passer.
CREATE FUNCTION private.peut_gerer(p_organisation uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT app.suis_admin_tenga() OR COALESCE(app.mon_role(p_organisation) = 'responsable', false)
$$;

-- 2.11 Campagnes : créer, ouvrir, clore (responsable de l'organisation ou
-- administrateur Tenga). Un refus ne distingue pas « inexistant » de « interdit ».
CREATE FUNCTION app.creer_campagne(p_organisation uuid, p_titre text, p_langue text DEFAULT 'fr')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_statut text;
  v_id     uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT o.statut INTO v_statut FROM app.organizations o WHERE o.id = p_organisation;
  IF NOT FOUND OR NOT private.peut_gerer(p_organisation) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'active' THEN
    RAISE EXCEPTION 'Organisation archivée : aucune campagne possible' USING ERRCODE = '55000';
  END IF;
  IF p_langue IS NULL OR p_langue NOT IN ('fr', 'ar', 'en') THEN
    RAISE EXCEPTION 'Langue inconnue : fr, ar ou en' USING ERRCODE = '22023';
  END IF;
  INSERT INTO app.campaigns (organization_id, titre, langue, cree_par)
  VALUES (p_organisation, pg_catalog.btrim(COALESCE(p_titre, '')), p_langue, v_uid)
  RETURNING id INTO v_id;
  PERFORM private.journaliser(v_uid, 'campagne.creer', 'campagne', v_id, p_organisation);
  RETURN v_id;
END
$$;

CREATE FUNCTION app.ouvrir_campagne(p_campagne uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org    uuid;
  v_statut text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut
  FROM app.campaigns c WHERE c.id = p_campagne FOR UPDATE;
  IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'brouillon' THEN
    RAISE EXCEPTION 'Seule une campagne en brouillon s''ouvre' USING ERRCODE = '55000';
  END IF;
  UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = p_campagne;
  PERFORM private.journaliser(auth.uid(), 'campagne.ouvrir', 'campagne', p_campagne, v_org);
END
$$;

CREATE FUNCTION app.clore_campagne(p_campagne uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org     uuid;
  v_statut  text;
  v_termine integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut
  FROM app.campaigns c WHERE c.id = p_campagne FOR UPDATE;
  IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'ouverte' THEN
    RAISE EXCEPTION 'Seule une campagne ouverte se clôt' USING ERRCODE = '55000';
  END IF;
  UPDATE app.campaigns SET statut = 'close', cloture_le = now() WHERE id = p_campagne;
  -- Minimisation : les invitations restées sans réponse ne serviront plus
  -- (aucune acceptation sur une campagne close), leurs adresses sont effacées.
  DELETE FROM app.invitations WHERE campaign_id = p_campagne AND acceptee_le IS NULL;
  SELECT pg_catalog.count(*) INTO v_termine
  FROM app.participations p WHERE p.campaign_id = p_campagne AND p.statut = 'terminee';
  PERFORM private.journaliser(auth.uid(), 'campagne.clore', 'campagne', p_campagne, v_org, v_termine);
END
$$;

-- 2.12 Invitations. Inviter crée une invitation hachée (jeton de 32 octets en
-- base64url, renvoyé une seule fois à l'appelant, qui l'envoie par e-mail).
-- Réinviter une adresse déjà en attente renouvelle le jeton et l'expiration.
-- La durée de validité est celle de private.settings (14 jours par défaut).
CREATE FUNCTION app.inviter(p_campagne uuid, p_email text, p_prenom text DEFAULT NULL,
                            p_message text DEFAULT NULL, p_langue text DEFAULT NULL)
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

  INSERT INTO app.invitations (campaign_id, organization_id, email, prenom, invitant_id, message, langue, jeton_hash, expire_le)
  VALUES (p_campagne, v_org, v_email, v_prenom, v_uid, v_message, v_langue,
          pg_catalog.sha256(pg_catalog.convert_to(v_jeton, 'UTF8')),
          now() + pg_catalog.make_interval(days => (SELECT s.conservation_invitations_jours FROM private.settings s)))
  ON CONFLICT (campaign_id, email) WHERE acceptee_le IS NULL DO UPDATE
    SET prenom = EXCLUDED.prenom, invitant_id = EXCLUDED.invitant_id, message = EXCLUDED.message,
        langue = EXCLUDED.langue, jeton_hash = EXCLUDED.jeton_hash,
        cree_le = now(), expire_le = EXCLUDED.expire_le
  RETURNING id, app.invitations.expire_le INTO v_id, v_expire;

  PERFORM private.journaliser(v_uid, 'invitation.creer', 'invitation', v_id, v_org);
  RETURN QUERY SELECT v_id, v_jeton, v_expire;
END
$$;

-- Consultation d'une invitation avant acceptation (page /i/{jeton}) : le serveur
-- a besoin de l'adresse pour créer le compte. Aucune ligne si le jeton est
-- inconnu, expiré, déjà utilisé ou si la campagne n'est plus ouverte.
CREATE FUNCTION app.consulter_invitation(p_jeton text)
RETURNS TABLE (email text, prenom text, langue text, message text, campagne_titre text,
               organisation_nom text, expire timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_jeton IS NULL OR p_jeton !~ '^[A-Za-z0-9_-]{43}$' THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT i.email, i.prenom, i.langue, i.message, c.titre, o.nom, i.expire_le
    FROM app.invitations i
    JOIN app.campaigns c ON c.id = i.campaign_id
    JOIN app.organizations o ON o.id = i.organization_id
    WHERE i.jeton_hash = pg_catalog.sha256(pg_catalog.convert_to(p_jeton, 'UTF8'))
      AND i.acceptee_le IS NULL AND i.expire_le > now() AND c.statut = 'ouverte';
END
$$;

-- Acceptation (service_role seul), en une transaction : le compte a déjà été
-- créé côté application par l'API d'administration, la fonction reçoit son
-- identifiant. Verrou 4 : elle ne crée que le rôle de participant. Elle ouvre
-- la participation, efface l'adresse et le prénom de l'invitation, journalise.
CREATE FUNCTION app.accepter_invitation(p_jeton text, p_utilisateur uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_inv    uuid;
  v_camp   uuid;
  v_org    uuid;
  v_email  text;
  v_statut text;
  v_compte text;
  v_role   text;
  v_part   uuid;
BEGIN
  IF p_jeton IS NULL OR p_jeton !~ '^[A-Za-z0-9_-]{43}$' OR p_utilisateur IS NULL THEN
    RAISE EXCEPTION 'Invitation invalide, expirée ou déjà utilisée' USING ERRCODE = 'P0002';
  END IF;

  SELECT i.id, i.campaign_id, i.organization_id, i.email INTO v_inv, v_camp, v_org, v_email
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
  IF v_part IS NULL THEN
    SELECT p.id INTO v_part
    FROM app.participations p WHERE p.campaign_id = v_camp AND p.user_id = p_utilisateur;
  END IF;

  UPDATE app.invitations
     SET email = NULL, prenom = NULL, acceptee_le = now(), acceptee_par = p_utilisateur
   WHERE id = v_inv;
  UPDATE app.profiles SET derniere_connexion_le = now() WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(p_utilisateur, 'invitation.accepter', 'participation', v_part, v_org);
  RETURN v_part;
END
$$;

-- 2.13 Passation. Point d'API stable : enregistrer_progression(participation,
-- révision attendue, réponses complètes, version du questionnaire) renvoie la
-- nouvelle révision. La révision attendue est 0 tant qu'aucune sauvegarde
-- n'existe. Une révision périmée lève 40001 (le détail donne la révision
-- actuelle). Les réponses remplacent l'état précédent.
-- ponytail: réponses validées comme un objet d'au plus 500 nombres ; resserrer
-- (bornes par question) quand le questionnaire final est figé.
CREATE FUNCTION app.enregistrer_progression(p_participation uuid, p_revision integer,
                                            p_reponses jsonb, p_questionnaire_version text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_camp    uuid;
  v_statut  text;
  v_cstatut text;
  v_rev     integer;
  v_nouvelle integer;
  v_jours   integer := (SELECT s.conservation_tentatives_jours FROM private.settings s);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT p.organization_id, p.campaign_id, p.statut INTO v_org, v_camp, v_statut
  FROM app.participations p WHERE p.id = p_participation AND p.user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_statut = 'terminee' THEN
    RAISE EXCEPTION 'Résultat déjà soumis' USING ERRCODE = '23505';
  END IF;
  SELECT c.statut INTO v_cstatut FROM app.campaigns c WHERE c.id = v_camp;
  IF v_cstatut <> 'ouverte' THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;
  IF app.mon_role(v_org) IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Rôle de participant requis' USING ERRCODE = '42501';
  END IF;
  IF p_revision IS NULL OR p_revision < 0 THEN
    RAISE EXCEPTION 'Révision attendue invalide' USING ERRCODE = '22023';
  END IF;
  IF p_questionnaire_version IS NULL OR p_questionnaire_version !~ '^[A-Za-z0-9._-]{1,40}$' THEN
    RAISE EXCEPTION 'Version du questionnaire invalide' USING ERRCODE = '22023';
  END IF;
  IF p_reponses IS NULL OR pg_catalog.jsonb_typeof(p_reponses) <> 'object'
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_reponses)) > 500
     OR pg_catalog.jsonb_path_exists(p_reponses, '$.* ? (@.type() != "number")') THEN
    RAISE EXCEPTION 'Réponses invalides : un objet de nombres, 500 au plus' USING ERRCODE = '22023';
  END IF;

  SELECT a.revision INTO v_rev FROM app.attempts a WHERE a.participation_id = p_participation FOR UPDATE;
  IF NOT FOUND THEN
    IF p_revision <> 0 THEN
      RAISE EXCEPTION 'Conflit de révision' USING ERRCODE = '40001', DETAIL = 'revision_actuelle=0';
    END IF;
    v_nouvelle := 1;
    INSERT INTO app.attempts (participation_id, user_id, questionnaire_version, reponses, revision, expire_le)
    VALUES (p_participation, v_uid, p_questionnaire_version, p_reponses, v_nouvelle,
            now() + pg_catalog.make_interval(days => v_jours));
    UPDATE app.participations SET statut = 'en_cours', commencee_le = now() WHERE id = p_participation;
  ELSE
    IF p_revision <> v_rev THEN
      RAISE EXCEPTION 'Conflit de révision' USING ERRCODE = '40001', DETAIL = 'revision_actuelle=' || v_rev;
    END IF;
    v_nouvelle := v_rev + 1;
    UPDATE app.attempts
       SET questionnaire_version = p_questionnaire_version, reponses = p_reponses, revision = v_nouvelle,
           mis_a_jour_le = now(), expire_le = now() + pg_catalog.make_interval(days => v_jours)
     WHERE participation_id = p_participation;
  END IF;
  RETURN v_nouvelle;
END
$$;

-- Soumission : les scores sont calculés par l'application ; la fonction vérifie
-- participation ouverte, campagne ouverte, une seule soumission. Elle range le
-- résultat, efface la tentative, journalise.
CREATE FUNCTION app.soumettre_resultat(p_participation uuid, p_reponses jsonb, p_scores jsonb,
                                       p_questionnaire_version text, p_calcul_version text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_org     uuid;
  v_camp    uuid;
  v_statut  text;
  v_cstatut text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT p.organization_id, p.campaign_id, p.statut INTO v_org, v_camp, v_statut
  FROM app.participations p WHERE p.id = p_participation AND p.user_id = v_uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  IF v_statut = 'terminee' THEN
    RAISE EXCEPTION 'Résultat déjà soumis' USING ERRCODE = '23505';
  END IF;
  SELECT c.statut INTO v_cstatut FROM app.campaigns c WHERE c.id = v_camp;
  IF v_cstatut <> 'ouverte' THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;
  IF app.mon_role(v_org) IS DISTINCT FROM 'participant' THEN
    RAISE EXCEPTION 'Rôle de participant requis' USING ERRCODE = '42501';
  END IF;
  IF p_questionnaire_version IS NULL OR p_questionnaire_version !~ '^[A-Za-z0-9._-]{1,40}$'
     OR p_calcul_version IS NULL OR p_calcul_version !~ '^[A-Za-z0-9._-]{1,40}$' THEN
    RAISE EXCEPTION 'Version du questionnaire ou du calcul invalide' USING ERRCODE = '22023';
  END IF;
  IF p_reponses IS NULL OR pg_catalog.jsonb_typeof(p_reponses) <> 'object'
     OR (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(p_reponses)) > 500
     OR pg_catalog.jsonb_path_exists(p_reponses, '$.* ? (@.type() != "number")') THEN
    RAISE EXCEPTION 'Réponses invalides : un objet de nombres, 500 au plus' USING ERRCODE = '22023';
  END IF;
  IF p_scores IS NULL OR pg_catalog.jsonb_typeof(p_scores) <> 'object' THEN
    RAISE EXCEPTION 'Scores invalides : un objet est attendu' USING ERRCODE = '22023';
  END IF;

  INSERT INTO app.results (participation_id, organization_id, user_id, reponses, scores,
                           questionnaire_version, calcul_version)
  VALUES (p_participation, v_org, v_uid, p_reponses, p_scores, p_questionnaire_version, p_calcul_version);
  DELETE FROM app.attempts WHERE participation_id = p_participation;
  UPDATE app.participations
     SET statut = 'terminee', terminee_le = now(), commencee_le = COALESCE(commencee_le, now())
   WHERE id = p_participation;
  PERFORM private.journaliser(v_uid, 'resultat.soumettre', 'participation', p_participation, v_org);
  RETURN p_participation;
END
$$;

-- 2.14 Lecture individuelle d'un résultat (consultant affecté à l'organisation
-- ou administrateur Tenga) : UNE fonction, qui vérifie le droit, écrit la ligne
-- de journal PUIS renvoie le résultat. L'identité de la personne n'est pas
-- renvoyée. Un refus ne distingue pas « inexistant » de « interdit ».
CREATE FUNCTION app.lire_resultat_individuel(p_participation uuid)
RETURNS TABLE (participation_id uuid, campaign_id uuid, organization_id uuid, reponses jsonb,
               scores jsonb, questionnaire_version text, calcul_version text, soumis_le timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT r.organization_id INTO v_org FROM app.results r WHERE r.participation_id = p_participation;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  PERFORM private.journaliser(v_uid, 'resultat.lire', 'participation', p_participation, v_org);
  RETURN QUERY
    SELECT r.participation_id, pa.campaign_id, r.organization_id, r.reponses, r.scores,
           r.questionnaire_version, r.calcul_version, r.soumis_le
    FROM app.results r
    JOIN app.participations pa ON pa.id = r.participation_id
    WHERE r.participation_id = p_participation;
END
$$;

-- 2.15 Lot 3 : mes résultats, export, suppression, information du responsable.

-- Historique du participant : une ligne par participation, du plus récent au
-- plus ancien (scores seulement ; les réponses sont dans l'export).
CREATE FUNCTION app.mes_resultats()
RETURNS TABLE (participation_id uuid, campagne_id uuid, campagne_titre text, organisation_nom text,
               organisation_slug text, statut text, ouverte_le timestamptz, terminee_le timestamptz,
               scores jsonb, questionnaire_version text, calcul_version text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT p.id, p.campaign_id, c.titre, o.nom, o.slug, p.statut, p.ouverte_le, p.terminee_le,
           r.scores, r.questionnaire_version, r.calcul_version
    FROM app.participations p
    JOIN app.campaigns c ON c.id = p.campaign_id
    JOIN app.organizations o ON o.id = p.organization_id
    LEFT JOIN app.results r ON r.participation_id = p.id
    WHERE p.user_id = v_uid
    ORDER BY p.ouverte_le DESC, p.id;
END
$$;

-- Export de toutes les données de la personne, en JSON (droit d'accès et de
-- portabilité). Journalisé, sans adresse dans le journal.
CREATE FUNCTION app.exporter_mes_donnees()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_export jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.jsonb_build_object(
    'exporte_le', now(),
    'compte', pg_catalog.jsonb_build_object(
      'id', v_uid,
      'email', (SELECT u.email FROM auth.users u WHERE u.id = v_uid),
      'administrateur_tenga', app.suis_admin_tenga()),
    'profil', (SELECT pg_catalog.to_jsonb(p) - 'user_id' FROM app.profiles p WHERE p.user_id = v_uid),
    'appartenances', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'organisation', o.nom, 'identifiant', o.slug, 'role', m.role, 'depuis', m.cree_le) ORDER BY m.cree_le, o.slug)
      FROM app.memberships m JOIN app.organizations o ON o.id = m.organization_id
      WHERE m.user_id = v_uid), '[]'::jsonb),
    'participations', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', p.id, 'campagne', c.titre, 'organisation', o.nom, 'statut', p.statut,
               'ouverte_le', p.ouverte_le, 'commencee_le', p.commencee_le, 'terminee_le', p.terminee_le)
               ORDER BY p.ouverte_le, p.id)
      FROM app.participations p
      JOIN app.campaigns c ON c.id = p.campaign_id
      JOIN app.organizations o ON o.id = p.organization_id
      WHERE p.user_id = v_uid), '[]'::jsonb),
    'tentatives', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', a.participation_id, 'questionnaire_version', a.questionnaire_version,
               'reponses', a.reponses, 'revision', a.revision, 'mis_a_jour_le', a.mis_a_jour_le,
               'expire_le', a.expire_le) ORDER BY a.cree_le, a.participation_id)
      FROM app.attempts a WHERE a.user_id = v_uid), '[]'::jsonb),
    'resultats', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'participation', r.participation_id, 'reponses', r.reponses, 'scores', r.scores,
               'questionnaire_version', r.questionnaire_version, 'calcul_version', r.calcul_version,
               'soumis_le', r.soumis_le) ORDER BY r.soumis_le, r.participation_id)
      FROM app.results r WHERE r.user_id = v_uid), '[]'::jsonb),
    'journal', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('action', l.action, 'date', l.cree_le) ORDER BY l.id)
      FROM private.audit_log l WHERE l.acteur = v_uid), '[]'::jsonb)
  ) INTO v_export;
  PERFORM private.journaliser(v_uid, 'compte.exporter', 'utilisateur', v_uid);
  RETURN v_export;
END
$$;

-- Effacement d'un compte : cascade par les clés étrangères (profil,
-- appartenances, participations, tentatives, résultats, invitations liées).
-- Le journal garde l'identifiant devenu pseudonyme, jamais d'adresse. Renvoie
-- faux si le compte n'existe plus (rejeu idempotent d'un registre d'effacements).
CREATE FUNCTION private.effacer_compte(p_utilisateur uuid)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  DELETE FROM auth.users WHERE id = p_utilisateur;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(p_utilisateur, 'compte.supprimer', 'utilisateur', p_utilisateur);
  RETURN true;
END
$$;

-- Suppression de mon compte. L'application ajoute d'abord la ligne au registre
-- des effacements (hors base), puis appelle cette fonction : un échec de
-- l'effacement laisse une ligne de registre inoffensive (rejeu idempotent).
CREATE FUNCTION app.supprimer_mon_compte()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  PERFORM private.effacer_compte(auth.uid());
END
$$;

-- Même effacement pour le rejeu du registre après une restauration (serveur).
CREATE FUNCTION app.effacer_compte(p_utilisateur uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT private.effacer_compte(p_utilisateur)
$$;

-- Information du responsable, sans identité : effectifs d'une campagne.
CREATE FUNCTION app.informer_responsable(p_campagne uuid)
RETURNS TABLE (statut_campagne text, participants integer, en_cours integer, termines integer,
               invitations_en_attente integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org    uuid;
  v_statut text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT v_statut,
           (SELECT pg_catalog.count(*)::integer FROM app.participations p WHERE p.campaign_id = p_campagne),
           (SELECT pg_catalog.count(*)::integer FROM app.participations p WHERE p.campaign_id = p_campagne AND p.statut = 'en_cours'),
           (SELECT pg_catalog.count(*)::integer FROM app.participations p WHERE p.campaign_id = p_campagne AND p.statut = 'terminee'),
           (SELECT pg_catalog.count(*)::integer FROM app.invitations i
             WHERE i.campaign_id = p_campagne AND i.acceptee_le IS NULL AND i.expire_le > now());
END
$$;

-- 2.16 Purge quotidienne étendue (plan § 5) : s'ajoutent aux liens de connexion
-- et au journal de 0002 les invitations échues, les tentatives interrompues
-- depuis plus de 30 jours, les résultats de plus de 3 ans et les comptes sans
-- résultat inactifs depuis un an (hors administrateurs, responsables et
-- consultants). Une ligne de journal chiffrée par catégorie.
-- ponytail: les sessions inactives (plan § 5) relèvent de GoTrue, pas de cette
-- fonction ; à traiter côté connexion si l'exploitation l'exige.
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
  v_comptes     integer := 0;
  v_compte      uuid;
BEGIN
  -- ponytail: les liens échus se gardent 1 jour après expiration, constante ; à rendre réglable si besoin.
  DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '1 day';
  GET DIAGNOSTICS v_liens = ROW_COUNT;

  DELETE FROM private.audit_log
   WHERE cree_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_journal_mois FROM private.settings s));
  GET DIAGNOSTICS v_journal = ROW_COUNT;

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
END
$$;

-- 2.17 Droits explicites
GRANT SELECT ON app.campaigns, app.invitations, app.participations, app.attempts, app.results TO authenticated;

GRANT EXECUTE ON FUNCTION
  app.mon_role(uuid),
  app.creer_campagne(uuid, text, text), app.ouvrir_campagne(uuid), app.clore_campagne(uuid),
  app.inviter(uuid, text, text, text, text),
  app.enregistrer_progression(uuid, integer, jsonb, text),
  app.soumettre_resultat(uuid, jsonb, jsonb, text, text),
  app.lire_resultat_individuel(uuid),
  app.mes_resultats(), app.exporter_mes_donnees(), app.supprimer_mon_compte(),
  app.informer_responsable(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION
  app.consulter_invitation(text), app.accepter_invitation(text, uuid), app.effacer_compte(uuid)
  TO service_role;

-- 2.18 Règles. Rôle connecté : lecture seule. Aucune règle d'écriture pour
-- l'API (verrou 2). AUCUNE règle de lecture sur attempts ni results pour le
-- responsable, le consultant ou l'administrateur : seul le titulaire lit ses
-- lignes ; les autres passent par la fonction journalisée.
CREATE POLICY campaigns_lecture ON app.campaigns
  FOR SELECT TO authenticated USING (
    app.suis_admin_tenga()
    OR app.mon_role(organization_id) IN ('responsable', 'consultant')
    OR EXISTS (SELECT 1 FROM app.participations p
               WHERE p.campaign_id = campaigns.id AND p.user_id = (SELECT auth.uid())));
CREATE POLICY invitations_lecture_responsable ON app.invitations
  FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'responsable');
CREATE POLICY participations_lecture_proprietaire ON app.participations
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY participations_lecture_responsable ON app.participations
  FOR SELECT TO authenticated USING (app.mon_role(organization_id) = 'responsable');
CREATE POLICY attempts_lecture_proprietaire ON app.attempts
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY results_lecture_proprietaire ON app.results
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

-- tenga_owner (fonctions contrôlées) : les seules opérations nécessaires, table par table.
CREATE POLICY campaigns_lecture_owner ON app.campaigns FOR SELECT TO tenga_owner USING (true);
CREATE POLICY campaigns_insertion_owner ON app.campaigns FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY campaigns_modification_owner ON app.campaigns FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

CREATE POLICY invitations_lecture_owner ON app.invitations FOR SELECT TO tenga_owner USING (true);
CREATE POLICY invitations_insertion_owner ON app.invitations FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY invitations_modification_owner ON app.invitations FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY invitations_suppression_owner ON app.invitations FOR DELETE TO tenga_owner USING (true);

CREATE POLICY participations_lecture_owner ON app.participations FOR SELECT TO tenga_owner USING (true);
CREATE POLICY participations_insertion_owner ON app.participations FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY participations_modification_owner ON app.participations FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

CREATE POLICY attempts_lecture_owner ON app.attempts FOR SELECT TO tenga_owner USING (true);
CREATE POLICY attempts_insertion_owner ON app.attempts FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY attempts_modification_owner ON app.attempts FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY attempts_suppression_owner ON app.attempts FOR DELETE TO tenga_owner USING (true);

CREATE POLICY results_lecture_owner ON app.results FOR SELECT TO tenga_owner USING (true);
CREATE POLICY results_insertion_owner ON app.results FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY results_suppression_owner ON app.results FOR DELETE TO tenga_owner USING (true);

-- 3. Retour au superutilisateur ---------------------------------------------
RESET ROLE;
