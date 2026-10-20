-- migrate:superuser
-- 0002_socle_organisations_acces : socle du lot 1 (plan § 3 et 4).
--
-- Contenu : profils, organisations, appartenances à rôle unique par
-- organisation, administrateurs Tenga, jetons de lien de connexion /c/{jeton}
-- et codes à 6 chiffres, journal en ajout seul, purge quotidienne pg_cron.
--
-- Exception documentée (première ligne ci-dessus) : cette migration tourne en
-- supabase_admin, car elle accorde des droits sur le schéma auth (clés
-- étrangères vers auth.users, lecture de l'adresse), pose un déclencheur sur
-- auth.users et planifie une tâche pg_cron. Tout ce qui crée des objets de
-- app et private s'exécute sous SET LOCAL ROLE tenga_owner (section 2), comme
-- une migration ordinaire : les objets appartiennent donc à tenga_owner et le
-- garde-fou DDL s'applique.
--
-- Principes (plan § 3.1) : aucun droit par défaut ; l'API ne lit que par des
-- règles explicites ; toute écriture passe par une fonction SECURITY DEFINER
-- (propriétaire tenga_owner, search_path vide). Les règles « TO tenga_owner »
-- n'ouvrent à ces fonctions que les opérations dont elles ont besoin, table
-- par table : tenga_owner reste soumis à la RLS forcée.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Droits sur le schéma auth (superutilisateur) ---------------------------
-- tenga_owner a besoin de : référencer auth.users (clés étrangères), lire
-- id, adresse et date de bannissement (éligibilité à la connexion). La table a
-- la RLS activée sans aucune règle (gabarit GoTrue) : une règle de lecture
-- restreinte à tenga_owner, sans effet sur les autres rôles, est ajoutée.
GRANT USAGE ON SCHEMA auth TO tenga_owner;
GRANT REFERENCES (id) ON auth.users TO tenga_owner;
GRANT SELECT (id, email, banned_until) ON auth.users TO tenga_owner;
DROP POLICY IF EXISTS tenga_owner_lecture ON auth.users;
CREATE POLICY tenga_owner_lecture ON auth.users FOR SELECT TO tenga_owner USING (true);

-- 2. Tables, déclencheurs, fonctions, règles (sous tenga_owner) -------------
SET LOCAL ROLE tenga_owner;

-- 2.1 Administrateurs Tenga : amorcés une seule fois par script en SSH
-- (superutilisateur), jamais écrits par l'API (schéma private).
CREATE TABLE private.tenga_admins (
  user_id   uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  ajoute_le timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE private.tenga_admins IS
  'Administrateurs Tenga. Amorcée par script en SSH ; aucune écriture possible par l''API (plan § 4).';

-- 2.2 Profils (un par compte, créé par déclencheur sur auth.users)
CREATE TABLE app.profiles (
  user_id               uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  nom                   text CHECK (nom IS NULL OR (nom = btrim(nom) AND char_length(nom) BETWEEN 1 AND 120)),
  langue                text NOT NULL DEFAULT 'fr' CHECK (langue IN ('fr', 'ar', 'en')),
  derniere_connexion_le timestamptz,
  cree_le               timestamptz NOT NULL DEFAULT now()
);

-- 2.3 Organisations
CREATE TABLE app.organizations (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug    text NOT NULL UNIQUE
          CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$' AND position('--' IN slug) = 0),
  nom     text NOT NULL CHECK (nom = btrim(nom) AND char_length(nom) BETWEEN 1 AND 160),
  statut  text NOT NULL DEFAULT 'active' CHECK (statut IN ('active', 'archivee')),
  cree_le timestamptz NOT NULL DEFAULT now()
);

-- 2.4 Appartenances : la clé primaire garantit UN SEUL rôle par personne et
-- par organisation (arbitrage 6 du plan).
CREATE TABLE app.memberships (
  user_id         uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES app.organizations (id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('responsable', 'consultant', 'participant')),
  cree_le         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id)
);
CREATE INDEX memberships_organisation_idx ON app.memberships (organization_id);

-- 2.5 Liens de connexion : seules les empreintes sont stockées (jeton de
-- 32 octets, code à 6 chiffres lié à la ligne). Aucune adresse e-mail ici.
CREATE TABLE private.liens_connexion (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  jeton_hash  bytea NOT NULL UNIQUE CHECK (octet_length(jeton_hash) = 32),
  code_hash   bytea NOT NULL CHECK (octet_length(code_hash) = 32),
  essais      smallint NOT NULL DEFAULT 0 CHECK (essais BETWEEN 0 AND 5),
  cree_le     timestamptz NOT NULL DEFAULT now(),
  expire_le   timestamptz NOT NULL,
  consomme_le timestamptz,
  CHECK (expire_le >= cree_le)
);
CREATE INDEX liens_connexion_utilisateur_idx ON private.liens_connexion (user_id, cree_le);

-- 2.6 Journal en ajout seul : aucune adresse e-mail, aucune clé étrangère
-- (une suppression de compte laisse un identifiant devenu pseudonyme).
CREATE TABLE private.audit_log (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  acteur          uuid,
  action          text NOT NULL CHECK (action ~ '^[a-z][a-z0-9_.]{2,63}$'),
  ressource_type  text CHECK (ressource_type IS NULL OR ressource_type ~ '^[a-z][a-z0-9_]{1,31}$'),
  ressource_id    uuid,
  organization_id uuid,
  quantite        integer CHECK (quantite IS NULL OR quantite >= 0)
);
CREATE INDEX audit_log_cree_le_idx ON private.audit_log (cree_le);
COMMENT ON TABLE private.audit_log IS
  'Journal en ajout seul. Pas d''adresse e-mail. Une ligne ne se supprime qu''une fois la durée de conservation échue.';

-- 2.7 Verrou 3 du plan § 3.3 : toute écriture venant d'un rôle de l'API est
-- refusée par un déclencheur, indépendamment des droits et des règles. Seuls
-- tenga_owner (fonctions contrôlées) et les superutilisateurs (amorçage,
-- migrations) écrivent.
CREATE FUNCTION private.refuser_ecriture_api()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user = 'tenga_owner'
     OR COALESCE((SELECT r.rolsuper FROM pg_catalog.pg_roles r WHERE r.rolname = current_user), false) THEN
    IF TG_LEVEL = 'ROW' THEN
      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END IF;
    RETURN NULL;
  END IF;
  RAISE EXCEPTION 'Écriture refusée sur % : seules les fonctions contrôlées modifient cette table', TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER profiles_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.profiles
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER profiles_sans_vidage_api
  BEFORE TRUNCATE ON app.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER organizations_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.organizations
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER organizations_sans_vidage_api
  BEFORE TRUNCATE ON app.organizations
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER memberships_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.memberships
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER memberships_sans_vidage_api
  BEFORE TRUNCATE ON app.memberships
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER tenga_admins_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON private.tenga_admins
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER tenga_admins_sans_vidage_api
  BEFORE TRUNCATE ON private.tenga_admins
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- 2.8 Journal : ajout seul. UPDATE et TRUNCATE sont toujours refusés ; DELETE
-- seulement pour une ligne plus ancienne que la durée de conservation lue dans
-- private.settings (c'est ce que fait la purge, et rien d'autre).
CREATE FUNCTION private.proteger_journal()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND OLD.cree_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_journal_mois FROM private.settings s)) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Journal en ajout seul : % refusé', TG_OP
    USING ERRCODE = 'restrict_violation';
END
$$;

CREATE TRIGGER audit_log_sans_modification
  BEFORE UPDATE OR DELETE ON private.audit_log
  FOR EACH ROW EXECUTE FUNCTION private.proteger_journal();
CREATE TRIGGER audit_log_sans_vidage
  BEFORE TRUNCATE ON private.audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION private.proteger_journal();

-- 2.9 Écriture dans le journal (appelée par les fonctions ci-dessous).
CREATE FUNCTION private.journaliser(
  p_acteur uuid, p_action text, p_type text DEFAULT NULL, p_ressource uuid DEFAULT NULL,
  p_organisation uuid DEFAULT NULL, p_quantite integer DEFAULT NULL)
RETURNS void
LANGUAGE sql
SET search_path = ''
AS $$
  INSERT INTO private.audit_log (acteur, action, ressource_type, ressource_id, organization_id, quantite)
  VALUES (p_acteur, p_action, p_type, p_ressource, p_organisation, p_quantite)
$$;

-- 2.10 Aides de règles et d'interface (exécutables par le rôle connecté).
-- Elles ne répondent que sur l'identité de l'appelant (jamais sur un tiers).
CREATE FUNCTION app.suis_admin_tenga()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = auth.uid())
$$;

CREATE FUNCTION app.suis_membre(p_organisation uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.memberships m
    WHERE m.user_id = auth.uid() AND m.organization_id = p_organisation)
$$;

-- 2.11 Profil : création automatique (déclencheur posé en section 3) et mise
-- à jour par son titulaire.
CREATE FUNCTION private.creer_profil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_langue text := NEW.raw_user_meta_data ->> 'langue';
  v_nom    text := NULLIF(pg_catalog.btrim(pg_catalog.left(COALESCE(NEW.raw_user_meta_data ->> 'nom', ''), 120)), '');
BEGIN
  IF v_langue IS NULL OR v_langue NOT IN ('fr', 'ar', 'en') THEN
    v_langue := 'fr';
  END IF;
  INSERT INTO app.profiles (user_id, nom, langue) VALUES (NEW.id, v_nom, v_langue);
  RETURN NEW;
END
$$;

CREATE FUNCTION app.mettre_a_jour_profil(p_nom text, p_langue text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_langue IS NULL OR p_langue NOT IN ('fr', 'ar', 'en') THEN
    RAISE EXCEPTION 'Langue inconnue : fr, ar ou en' USING ERRCODE = '22023';
  END IF;
  UPDATE app.profiles
     SET nom = NULLIF(pg_catalog.btrim(p_nom), ''), langue = p_langue
   WHERE user_id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profil introuvable' USING ERRCODE = 'P0002';
  END IF;
END
$$;

-- 2.12 Administration Tenga : seules fonctions qui créent des organisations
-- et des rôles (verrou 4, avec l'acceptation d'invitation du lot 2).
CREATE FUNCTION app.creer_organisation(p_slug text, p_nom text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  INSERT INTO app.organizations (slug, nom) VALUES (p_slug, pg_catalog.btrim(p_nom))
  RETURNING id INTO v_id;
  PERFORM private.journaliser(auth.uid(), 'organisation.creer', 'organisation', v_id, v_id);
  RETURN v_id;
END
$$;

CREATE FUNCTION app.attribuer_role(p_utilisateur uuid, p_organisation uuid, p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('responsable', 'consultant', 'participant') THEN
    RAISE EXCEPTION 'Rôle inconnu : responsable, consultant ou participant' USING ERRCODE = '22023';
  END IF;
  INSERT INTO app.memberships (user_id, organization_id, role)
  VALUES (p_utilisateur, p_organisation, p_role)
  ON CONFLICT (user_id, organization_id) DO UPDATE SET role = EXCLUDED.role;
  PERFORM private.journaliser(auth.uid(), 'role.attribuer.' || p_role, 'utilisateur', p_utilisateur, p_organisation);
END
$$;

CREATE FUNCTION app.retirer_role(p_utilisateur uuid, p_organisation uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  DELETE FROM app.memberships WHERE user_id = p_utilisateur AND organization_id = p_organisation;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(auth.uid(), 'role.retirer', 'utilisateur', p_utilisateur, p_organisation);
  RETURN true;
END
$$;

CREATE FUNCTION app.lire_journal(p_limite integer DEFAULT 100)
RETURNS TABLE (id bigint, cree_le timestamptz, acteur uuid, action text,
               ressource_type text, ressource_id uuid, organization_id uuid, quantite integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT app.suis_admin_tenga() THEN
    RAISE EXCEPTION 'Réservé aux administrateurs Tenga' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
    SELECT l.id, l.cree_le, l.acteur, l.action, l.ressource_type, l.ressource_id, l.organization_id, l.quantite
    FROM private.audit_log l
    ORDER BY l.id DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limite, 100), 1), 500);
END
$$;

-- 2.13 Connexion par lien /c/{jeton} et code à 6 chiffres (plan § 4).
-- Le serveur Next.js (service_role) est seul appelant : il envoie l'e-mail
-- (Resend), puis ouvre la session GoTrue pour l'identifiant renvoyé.
-- ponytail: 15 minutes de validité, 3 demandes par 15 minutes et par compte,
-- 5 essais de code, constantes dans le code ; à rendre réglables dans
-- private.settings si l'exploitation l'exige.

-- Finalisation commune : un seul lien servira, les autres du compte sont éteints.
CREATE FUNCTION private.finaliser_connexion(p_utilisateur uuid, p_lien uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE private.liens_connexion SET consomme_le = now() WHERE id = p_lien;
  UPDATE private.liens_connexion SET expire_le = now()
   WHERE user_id = p_utilisateur AND consomme_le IS NULL AND expire_le > now();
  UPDATE app.profiles SET derniere_connexion_le = now() WHERE user_id = p_utilisateur;
  PERFORM private.journaliser(p_utilisateur, 'connexion.reussie', 'utilisateur', p_utilisateur);
END
$$;

-- Demande de lien. Réponse de même forme que l'adresse soit connue ou non :
-- seul « envoyer » diffère, et le travail de génération est le même.
CREATE FUNCTION app.demander_lien_connexion(p_email text)
RETURNS TABLE (envoyer boolean, jeton text, code text, langue text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email  text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_octets bytea := extensions.gen_random_bytes(36);
  v_jeton  text := pg_catalog.translate(pg_catalog.encode(pg_catalog.substr(v_octets, 1, 32), 'base64'), '+/=', '-_');
  -- Réduction modulo 10^6 d'un entier de 32 bits : biais relatif inférieur à 3e-4, sans conséquence pour 5 essais.
  v_code   text := pg_catalog.lpad((((pg_catalog.get_byte(v_octets, 32)::bigint << 24)
                    | (pg_catalog.get_byte(v_octets, 33)::bigint << 16)
                    | (pg_catalog.get_byte(v_octets, 34)::bigint << 8)
                    | pg_catalog.get_byte(v_octets, 35)::bigint) % 1000000)::text, 6, '0');
  v_user   uuid;
  v_langue text;
  v_lien   uuid := gen_random_uuid();
BEGIN
  SELECT u.id, p.langue INTO v_user, v_langue
  FROM auth.users u
  JOIN app.profiles p ON p.user_id = u.id
  WHERE u.email = v_email
    AND (u.banned_until IS NULL OR u.banned_until <= now());

  IF v_user IS NOT NULL
     AND (SELECT pg_catalog.count(*) FROM private.liens_connexion l
           WHERE l.user_id = v_user AND l.cree_le > now() - interval '15 minutes') >= 3 THEN
    v_user := NULL;
  END IF;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  INSERT INTO private.liens_connexion (id, user_id, jeton_hash, code_hash, expire_le)
  VALUES (v_lien, v_user,
          pg_catalog.sha256(pg_catalog.convert_to(v_jeton, 'UTF8')),
          pg_catalog.sha256(pg_catalog.convert_to(v_lien::text || ':' || v_code, 'UTF8')),
          now() + interval '15 minutes');
  RETURN QUERY SELECT true, v_jeton, v_code, v_langue;
END
$$;

-- Consommation du lien au clic : renvoie l'identifiant du compte, ou NULL
-- (jeton inconnu, expiré, déjà utilisé ou compte banni, sans distinction).
CREATE FUNCTION app.consommer_lien_connexion(p_jeton text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user uuid;
  v_lien uuid;
BEGIN
  IF p_jeton IS NULL OR p_jeton !~ '^[A-Za-z0-9_-]{43}$' THEN
    RETURN NULL;
  END IF;
  UPDATE private.liens_connexion l SET consomme_le = now()
   WHERE l.jeton_hash = pg_catalog.sha256(pg_catalog.convert_to(p_jeton, 'UTF8'))
     AND l.consomme_le IS NULL AND l.expire_le > now()
     AND EXISTS (SELECT 1 FROM auth.users u
                  WHERE u.id = l.user_id AND (u.banned_until IS NULL OR u.banned_until <= now()))
  RETURNING l.user_id, l.id INTO v_user, v_lien;
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;
  PERFORM private.finaliser_connexion(v_user, v_lien);
  RETURN v_user;
END
$$;

-- Consommation du code à 6 chiffres (autre appareil que celui du lien). Un
-- échec use un essai sur tous les liens actifs du compte (5 au plus).
CREATE FUNCTION app.consommer_code_connexion(p_email text, p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_email text := pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')));
  v_user  uuid;
  v_lien  uuid;
BEGIN
  SELECT u.id INTO v_user
  FROM auth.users u
  WHERE u.email = v_email AND (u.banned_until IS NULL OR u.banned_until <= now());
  IF v_user IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_code ~ '^[0-9]{6}$' THEN
    SELECT l.id INTO v_lien
    FROM private.liens_connexion l
    WHERE l.user_id = v_user AND l.consomme_le IS NULL AND l.expire_le > now() AND l.essais < 5
      AND l.code_hash = pg_catalog.sha256(pg_catalog.convert_to(l.id::text || ':' || p_code, 'UTF8'))
    ORDER BY l.cree_le DESC
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_lien IS NULL THEN
    UPDATE private.liens_connexion SET essais = essais + 1
     WHERE user_id = v_user AND consomme_le IS NULL AND expire_le > now() AND essais < 5;
    RETURN NULL;
  END IF;
  PERFORM private.finaliser_connexion(v_user, v_lien);
  RETURN v_user;
END
$$;

-- 2.14 Purge quotidienne (plan § 5). Au lot 1 : liens de connexion échus et
-- journal échu. Les purges des tables des lots suivants (invitations,
-- passations, résultats, sessions, comptes vides) s'ajoutent avec elles.
-- Une ligne de journal par catégorie porte le nombre de lignes effacées.
CREATE FUNCTION private.purger_quotidien()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_liens   integer;
  v_journal integer;
BEGIN
  -- ponytail: les liens échus se gardent 1 jour après expiration, constante ; à rendre réglable si besoin.
  DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '1 day';
  GET DIAGNOSTICS v_liens = ROW_COUNT;

  DELETE FROM private.audit_log
   WHERE cree_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_journal_mois FROM private.settings s));
  GET DIAGNOSTICS v_journal = ROW_COUNT;

  PERFORM private.journaliser(NULL, 'purge.liens_connexion', NULL, NULL, NULL, v_liens);
  PERFORM private.journaliser(NULL, 'purge.journal', NULL, NULL, NULL, v_journal);
END
$$;

-- Point de santé : date de la dernière purge (NULL si jamais exécutée).
CREATE FUNCTION app.derniere_purge()
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT pg_catalog.max(l.cree_le) FROM private.audit_log l WHERE l.action LIKE 'purge.%'
$$;

-- 2.15 Droits explicites
GRANT SELECT ON app.profiles, app.organizations, app.memberships TO authenticated;

GRANT EXECUTE ON FUNCTION
  app.suis_admin_tenga(), app.suis_membre(uuid), app.mettre_a_jour_profil(text, text),
  app.creer_organisation(text, text), app.attribuer_role(uuid, uuid, text),
  app.retirer_role(uuid, uuid), app.lire_journal(integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION
  app.demander_lien_connexion(text), app.consommer_lien_connexion(text),
  app.consommer_code_connexion(text, text), app.derniere_purge()
  TO service_role;

-- 2.16 Règles. Rôle connecté : lecture seule, ses propres lignes (administrateur
-- Tenga : toutes les organisations et appartenances). Aucune règle d'écriture
-- pour l'API (verrou 2).
CREATE POLICY profiles_lecture_proprietaire ON app.profiles
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY organizations_lecture ON app.organizations
  FOR SELECT TO authenticated USING (app.suis_membre(id) OR app.suis_admin_tenga());
CREATE POLICY memberships_lecture ON app.memberships
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR app.suis_admin_tenga());

-- tenga_owner (fonctions contrôlées) : les seules opérations nécessaires.
CREATE POLICY tenga_admins_lecture_owner ON private.tenga_admins FOR SELECT TO tenga_owner USING (true);

CREATE POLICY profiles_lecture_owner ON app.profiles FOR SELECT TO tenga_owner USING (true);
CREATE POLICY profiles_insertion_owner ON app.profiles FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY profiles_modification_owner ON app.profiles FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

CREATE POLICY organizations_lecture_owner ON app.organizations FOR SELECT TO tenga_owner USING (true);
CREATE POLICY organizations_insertion_owner ON app.organizations FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY organizations_modification_owner ON app.organizations FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);

CREATE POLICY memberships_lecture_owner ON app.memberships FOR SELECT TO tenga_owner USING (true);
CREATE POLICY memberships_insertion_owner ON app.memberships FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY memberships_modification_owner ON app.memberships FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY memberships_suppression_owner ON app.memberships FOR DELETE TO tenga_owner USING (true);

CREATE POLICY liens_lecture_owner ON private.liens_connexion FOR SELECT TO tenga_owner USING (true);
CREATE POLICY liens_insertion_owner ON private.liens_connexion FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY liens_modification_owner ON private.liens_connexion FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY liens_suppression_owner ON private.liens_connexion FOR DELETE TO tenga_owner USING (true);

CREATE POLICY audit_lecture_owner ON private.audit_log FOR SELECT TO tenga_owner USING (true);
CREATE POLICY audit_insertion_owner ON private.audit_log FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY audit_suppression_owner ON private.audit_log FOR DELETE TO tenga_owner USING (true);

-- 3. Éléments qui exigent le superutilisateur ------------------------------
RESET ROLE;

-- Profil créé avec chaque compte (l'inscription étant fermée, un compte naît
-- par l'API d'administration ou l'acceptation d'invitation).
DROP TRIGGER IF EXISTS tenga_creer_profil ON auth.users;
CREATE TRIGGER tenga_creer_profil
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.creer_profil();

-- Comptes déjà présents (aucun à ce jour sur les instances Tenga).
INSERT INTO app.profiles (user_id) SELECT u.id FROM auth.users u ON CONFLICT (user_id) DO NOTHING;

-- Purge quotidienne, à 00:00 UTC (01:00 à Casablanca hors Ramadan ; pg_cron
-- raisonne en UTC). Le travail s'exécute dans une fonction SECURITY DEFINER
-- de tenga_owner : la RLS forcée s'applique à la purge.
SELECT cron.schedule('tenga-purge-quotidienne', '0 0 * * *', 'SELECT private.purger_quotidien()');
