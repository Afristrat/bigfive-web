-- 0005_groupes_agregats : lot 4 (plan § 3.2, 3.3 et 6).
--
-- Contenu : groupes d'une campagne (app.groups, app.group_members), composition
-- gelée dès l'ouverture de la campagne, photographie des agrégats posée UNE
-- SEULE FOIS à la clôture (app.group_aggregates, private.agregats_poses),
-- fonctions contrôlées de gestion des groupes, clôture qui pose la
-- photographie dans sa transaction.
--
-- Migration ordinaire : elle tourne sous tenga_owner (imposé par migrate.sh),
-- sans exception superutilisateur. Le garde-fou DDL s'applique.
--
-- Principes inchangés (plan § 3) : aucun droit par défaut ; l'API ne lit que
-- par des règles explicites ; toute écriture passe par une fonction SECURITY
-- DEFINER (propriétaire tenga_owner, search_path vide) ; le responsable
-- d'organisation et le consultant n'ont toujours AUCUNE règle de lecture sur
-- attempts ni sur results. Ils lisent les agrégats photographiés, jamais un
-- résultat individuel sans passer par app.lire_resultat_individuel.
--
-- RÈGLES DE PUBLICATION des agrégats (plan § 3.3), par groupe et par domaine :
--   - le groupe n'est publié que si son effectif atteint private.settings.
--     seuil_anonymat (5 au moins, imposé par une contrainte) ; sinon aucune ligne ;
--   - aucune valeur minimale ni maximale n'est stockée (elles désigneraient
--     une personne) : effectif, moyenne, écart type seulement ;
--   - le complément d'un groupe (les participants hors du groupe) n'est publié
--     que s'il compte 0 ou au moins le seuil ;
--   - DURCISSEMENT par rapport au plan (attaque par différence) : le complément
--     n'est publié que si ce qui reste hors de TOUS les groupes publiés
--     (personnes sans groupe, petits groupes non publiés) compte lui aussi 0 ou
--     au moins le seuil. Sans cela, complément du groupe A, moyenne du groupe B
--     et effectifs permettent de retrouver le score d'une personne sans groupe.
--     Cette condition ne publie jamais plus que le plan, elle retient plus.
--   - écart type de POPULATION (le groupe est l'ensemble de ses membres), moyenne
--     et écart type arrondis à 2 décimales.
-- Format de scores lu dans app.results.scores : pour chaque domaine du Big Five
-- (O, C, E, A, N), un nombre, ou un objet portant un nombre dans « score ». Un
-- domaine absent ou non numérique n'entre pas dans le calcul de ce domaine.
--
-- COMPOSITION : app.group_members référence une participation. Une
-- participation naît à l'acceptation d'une invitation, possible seulement
-- campagne ouverte (lot 2) ; or la composition se gèle à l'ouverture. Tant que
-- le lot 2 ne change pas, l'affectation par fonction n'est donc possible que
-- pour des participations existant déjà en brouillon. Voir le rapport de
-- livraison (point de décision).
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Tables ----------------------------------------------------------------

-- Une participation appartient à une seule campagne : la clé (id, campagne)
-- permet à group_members de relier groupe et participation de la MÊME campagne.
ALTER TABLE app.participations ADD CONSTRAINT participations_id_campagne_key UNIQUE (id, campaign_id);

-- 1.1 Groupes d'une campagne.
CREATE TABLE app.groups (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  nom             text NOT NULL CHECK (nom = btrim(nom) AND char_length(nom) BETWEEN 1 AND 80),
  ordre           integer NOT NULL DEFAULT 0 CHECK (ordre BETWEEN 0 AND 1000),
  cree_le         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (campaign_id, organization_id) REFERENCES app.campaigns (id, organization_id) ON DELETE CASCADE,
  UNIQUE (id, campaign_id),
  UNIQUE (campaign_id, nom)
);
CREATE INDEX groups_organisation_idx ON app.groups (organization_id);

-- 1.2 Membres : UNE personne dans un seul groupe par campagne (clé primaire sur
-- campagne et participation). Groupes exclusifs, donc.
CREATE TABLE app.group_members (
  group_id         uuid NOT NULL,
  campaign_id      uuid NOT NULL,
  organization_id  uuid NOT NULL,
  participation_id uuid NOT NULL,
  cree_le          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, participation_id),
  FOREIGN KEY (group_id, campaign_id) REFERENCES app.groups (id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (participation_id, campaign_id) REFERENCES app.participations (id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, organization_id) REFERENCES app.campaigns (id, organization_id) ON DELETE CASCADE
);
CREATE INDEX group_members_groupe_idx ON app.group_members (group_id);
CREATE INDEX group_members_participation_idx ON app.group_members (participation_id);
CREATE INDEX group_members_organisation_idx ON app.group_members (organization_id);

-- 1.3 Photographie des agrégats. Lecture seule pour tous : une ligne naît
-- pendant la clôture et ne change plus. L'effectif d'une ligne publiée atteint
-- toujours 5 (plancher inscrit dans la table, indépendant des réglages) ; seul
-- un complément vide (effectif 0, sans moyenne) échappe à ce plancher.
CREATE TABLE app.group_aggregates (
  campaign_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  group_id        uuid NOT NULL,
  portee          text NOT NULL CHECK (portee IN ('groupe', 'complement')),
  domaine         text NOT NULL CHECK (domaine IN ('O', 'C', 'E', 'A', 'N')),
  effectif        integer NOT NULL,
  moyenne         numeric,
  ecart_type      numeric CHECK (ecart_type IS NULL OR ecart_type >= 0),
  pose_le         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, group_id, portee, domaine),
  FOREIGN KEY (group_id, campaign_id) REFERENCES app.groups (id, campaign_id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id, organization_id) REFERENCES app.campaigns (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT effectif_publie_plancher CHECK (
    (portee = 'groupe' AND effectif >= 5) OR (portee = 'complement' AND (effectif = 0 OR effectif >= 5))),
  CONSTRAINT statistiques_si_effectif CHECK ((effectif = 0) = (moyenne IS NULL) AND (effectif = 0) = (ecart_type IS NULL))
);
CREATE INDEX group_aggregates_organisation_idx ON app.group_aggregates (organization_id);

-- 1.4 Marqueur « photographie posée » : sa clé primaire garantit UNE SEULE
-- pose par campagne, y compris quand aucune ligne n'a été publiée (tous les
-- groupes sous le seuil). Dans private : l'API n'y touche jamais.
CREATE TABLE private.agregats_poses (
  campaign_id uuid PRIMARY KEY REFERENCES app.campaigns (id) ON DELETE CASCADE,
  pose_le     timestamptz NOT NULL DEFAULT now()
);

-- 2. Verrous ---------------------------------------------------------------

-- 2.1 Verrou 3 du plan § 3.3 : aucune écriture venant de l'API sur ces trois tables.
CREATE TRIGGER groups_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.groups
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER groups_sans_vidage_api
  BEFORE TRUNCATE ON app.groups
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER group_members_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.group_members
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER group_members_sans_vidage_api
  BEFORE TRUNCATE ON app.group_members
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER group_aggregates_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.group_aggregates
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER group_aggregates_sans_vidage_api
  BEFORE TRUNCATE ON app.group_aggregates
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- 2.2 Composition GELÉE dès l'ouverture : groupes et membres ne s'écrivent que
-- tant que la campagne est en brouillon, même pour le superutilisateur. Seul
-- l'effacement en cascade passe (suppression de compte, d'organisation ou de
-- campagne : la ligne parente a disparu) : un effacement RGPD n'est jamais bloqué.
-- Nommé « verrou » pour se déclencher APRÈS refuser_ecriture_api (ordre alphabétique).
CREATE FUNCTION private.geler_composition()
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
    RAISE EXCEPTION 'Composition gelée : la campagne n''est plus en brouillon' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER groups_verrou_composition
  BEFORE INSERT OR UPDATE OR DELETE ON app.groups
  FOR EACH ROW EXECUTE FUNCTION private.geler_composition();
CREATE TRIGGER group_members_verrou_composition
  BEFORE INSERT OR UPDATE OR DELETE ON app.group_members
  FOR EACH ROW EXECUTE FUNCTION private.geler_composition();

-- 2.3 Photographie : une ligne ne naît qu'à la clôture, dans la transaction qui
-- a posé le marqueur ; elle ne se modifie ni ne s'efface (hors disparition de
-- sa campagne), même pour le superutilisateur.
CREATE FUNCTION private.verifier_photographie()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'TRUNCATE' THEN
    RAISE EXCEPTION 'Une photographie d''agrégats ne se vide pas' USING ERRCODE = 'restrict_violation';
  ELSIF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Une photographie d''agrégats ne se modifie pas' USING ERRCODE = 'restrict_violation';
  ELSIF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM app.campaigns c WHERE c.id = OLD.campaign_id) THEN
      RAISE EXCEPTION 'Une photographie d''agrégats ne s''efface pas' USING ERRCODE = 'restrict_violation';
    END IF;
    RETURN OLD;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.campaigns c WHERE c.id = NEW.campaign_id AND c.statut = 'close') THEN
    RAISE EXCEPTION 'Agrégats posés à la clôture d''une campagne seulement' USING ERRCODE = '55000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM private.agregats_poses a WHERE a.campaign_id = NEW.campaign_id AND a.pose_le = now()) THEN
    RAISE EXCEPTION 'Agrégats : une seule pose, par la clôture' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER group_aggregates_verrou_photographie
  BEFORE INSERT OR UPDATE OR DELETE ON app.group_aggregates
  FOR EACH ROW EXECUTE FUNCTION private.verifier_photographie();
CREATE TRIGGER group_aggregates_verrou_vidage
  BEFORE TRUNCATE ON app.group_aggregates
  FOR EACH STATEMENT EXECUTE FUNCTION private.verifier_photographie();

-- 2.4 Une campagne close n'accepte plus de passation, sans course possible :
-- la clôture tient un verrou sur la ligne de campagne ; ce contrôle prend un
-- verrou partagé sur la même ligne, attend la fin de la clôture, puis constate
-- qu'elle est close. Sans lui, un résultat soumis pendant la clôture pourrait
-- naître hors de la photographie. (Fonction déjà posée en 0003 ; définie
-- SECURITY DEFINER pour que le verrou ne dépende pas des droits de l'appelant.)
CREATE OR REPLACE FUNCTION private.exiger_campagne_ouverte()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM 1
  FROM app.participations p
  JOIN app.campaigns c ON c.id = p.campaign_id
  WHERE p.id = NEW.participation_id AND c.statut = 'ouverte'
  FOR SHARE OF c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne non ouverte : passation refusée' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END
$$;

-- 3. Photographie des agrégats ----------------------------------------------

-- Appelée par app.clore_campagne, dans sa transaction, une seule fois par
-- campagne. Renvoie le nombre de lignes publiées.
CREATE FUNCTION private.poser_agregats(p_campagne uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_org    uuid;
  v_statut text;
  v_seuil  integer := (SELECT s.seuil_anonymat FROM private.settings s);
  v_lignes integer;
BEGIN
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR v_statut <> 'close' THEN
    RAISE EXCEPTION 'Agrégats posés à la clôture d''une campagne seulement' USING ERRCODE = '55000';
  END IF;
  IF EXISTS (SELECT 1 FROM private.agregats_poses a WHERE a.campaign_id = p_campagne) THEN
    RAISE EXCEPTION 'Agrégats déjà posés pour cette campagne : une seule photographie' USING ERRCODE = '55000';
  END IF;
  INSERT INTO private.agregats_poses (campaign_id) VALUES (p_campagne);

  WITH valides AS (
    -- Une ligne par résultat de la campagne et par domaine à valeur numérique.
    SELECT d.domaine, gm.group_id, x.v
    FROM app.results r
    JOIN app.participations p ON p.id = r.participation_id
    LEFT JOIN app.group_members gm ON gm.participation_id = p.id AND gm.campaign_id = p.campaign_id
    CROSS JOIN (VALUES ('O'), ('C'), ('E'), ('A'), ('N')) AS d(domaine)
    CROSS JOIN LATERAL (
      SELECT CASE pg_catalog.jsonb_typeof(r.scores -> d.domaine)
               WHEN 'number' THEN (r.scores ->> d.domaine)::numeric
               WHEN 'object' THEN CASE WHEN pg_catalog.jsonb_typeof(r.scores -> d.domaine -> 'score') = 'number'
                                       THEN (r.scores -> d.domaine ->> 'score')::numeric END
             END AS v) x
    WHERE p.campaign_id = p_campagne AND x.v IS NOT NULL
  ),
  stats AS (
    SELECT g.group_id, g.domaine, pg_catalog.count(*) AS n,
           pg_catalog.round(pg_catalog.avg(g.v), 2) AS moyenne,
           pg_catalog.round(pg_catalog.stddev_pop(g.v), 2) AS ecart_type
    FROM valides g
    WHERE g.group_id IS NOT NULL
    GROUP BY g.group_id, g.domaine
  ),
  publies AS (
    SELECT s.* FROM stats s WHERE s.n >= v_seuil
  ),
  reste AS (
    -- Ce qui reste hors de tous les groupes publiés, par domaine.
    SELECT v.domaine, pg_catalog.count(*) AS n
    FROM valides v
    WHERE NOT EXISTS (SELECT 1 FROM publies pu WHERE pu.group_id = v.group_id AND pu.domaine = v.domaine)
    GROUP BY v.domaine
  ),
  ins_groupes AS (
    INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type)
    SELECT p_campagne, v_org, pu.group_id, 'groupe', pu.domaine, pu.n, pu.moyenne, pu.ecart_type
    FROM publies pu
    RETURNING 1
  ),
  ins_complements AS (
    INSERT INTO app.group_aggregates (campaign_id, organization_id, group_id, portee, domaine, effectif, moyenne, ecart_type)
    SELECT p_campagne, v_org, pu.group_id, 'complement', pu.domaine, c.n, c.moyenne, c.ecart_type
    FROM publies pu
    CROSS JOIN LATERAL (
      SELECT pg_catalog.count(*) AS n,
             pg_catalog.round(pg_catalog.avg(x.v), 2) AS moyenne,
             pg_catalog.round(pg_catalog.stddev_pop(x.v), 2) AS ecart_type
      FROM valides x
      WHERE x.domaine = pu.domaine AND x.group_id IS DISTINCT FROM pu.group_id
    ) c
    -- Première condition : la règle du plan (complément de 0 ou d'au moins le seuil). Seconde : ce qui
    -- reste hors des groupes publiés. Quand un groupe publié existe, la seconde implique la première ;
    -- la première est gardée parce qu'elle est la règle du plan et se lit seule.
    WHERE (c.n = 0 OR c.n >= v_seuil)
      AND (COALESCE((SELECT r.n FROM reste r WHERE r.domaine = pu.domaine), 0) = 0
           OR (SELECT r.n FROM reste r WHERE r.domaine = pu.domaine) >= v_seuil)
    RETURNING 1
  )
  SELECT (SELECT pg_catalog.count(*) FROM ins_groupes) + (SELECT pg_catalog.count(*) FROM ins_complements)
  INTO v_lignes;

  PERFORM private.journaliser(auth.uid(), 'agregats.poser', 'campagne', p_campagne, v_org, v_lignes);
  RETURN v_lignes;
END
$$;

-- Clôture : signature inchangée. La photographie se pose dans la même
-- transaction ; si elle échoue, la campagne reste ouverte.
CREATE OR REPLACE FUNCTION app.clore_campagne(p_campagne uuid)
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
  PERFORM private.poser_agregats(p_campagne);
END
$$;

-- 4. Gestion des groupes (responsable de l'organisation ou administrateur Tenga) ----
-- Un refus ne distingue pas « inexistant » de « interdit ». Tout se passe tant
-- que la campagne est en brouillon : le verrou de la section 2.2 le garantit
-- aussi, mais la fonction répond par un message précis.

-- Verrouille la campagne en partage (une ouverture concurrente attend) et
-- contrôle le droit et le statut. Renvoie l'organisation.
CREATE FUNCTION private.autoriser_composition(p_campagne uuid)
RETURNS uuid
LANGUAGE plpgsql
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
  FROM app.campaigns c WHERE c.id = p_campagne FOR SHARE;
  IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'brouillon' THEN
    RAISE EXCEPTION 'Groupes modifiables en brouillon seulement : composition gelée dès l''ouverture' USING ERRCODE = '55000';
  END IF;
  RETURN v_org;
END
$$;

CREATE FUNCTION app.creer_groupe(p_campagne uuid, p_nom text, p_ordre integer DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org uuid := private.autoriser_composition(p_campagne);
  v_id  uuid;
BEGIN
  INSERT INTO app.groups (campaign_id, organization_id, nom, ordre)
  VALUES (p_campagne, v_org, pg_catalog.btrim(COALESCE(p_nom, '')),
          COALESCE(p_ordre, (SELECT COALESCE(pg_catalog.max(g.ordre), -1) + 1 FROM app.groups g WHERE g.campaign_id = p_campagne)))
  RETURNING id INTO v_id;
  PERFORM private.journaliser(auth.uid(), 'groupe.creer', 'groupe', v_id, v_org);
  RETURN v_id;
END
$$;

CREATE FUNCTION app.renommer_groupe(p_groupe uuid, p_nom text, p_ordre integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camp uuid;
  v_org  uuid;
BEGIN
  SELECT g.campaign_id INTO v_camp FROM app.groups g WHERE g.id = p_groupe;
  v_org := private.autoriser_composition(v_camp);
  UPDATE app.groups
     SET nom = pg_catalog.btrim(COALESCE(p_nom, '')), ordre = COALESCE(p_ordre, ordre)
   WHERE id = p_groupe;
  PERFORM private.journaliser(auth.uid(), 'groupe.renommer', 'groupe', p_groupe, v_org);
END
$$;

CREATE FUNCTION app.supprimer_groupe(p_groupe uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camp uuid;
  v_org  uuid;
BEGIN
  SELECT g.campaign_id INTO v_camp FROM app.groups g WHERE g.id = p_groupe;
  v_org := private.autoriser_composition(v_camp);
  DELETE FROM app.groups WHERE id = p_groupe;
  PERFORM private.journaliser(auth.uid(), 'groupe.supprimer', 'groupe', p_groupe, v_org);
END
$$;

CREATE FUNCTION app.affecter_membre(p_groupe uuid, p_participation uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camp uuid;
  v_org  uuid;
BEGIN
  SELECT g.campaign_id INTO v_camp FROM app.groups g WHERE g.id = p_groupe;
  v_org := private.autoriser_composition(v_camp);
  IF NOT EXISTS (SELECT 1 FROM app.participations p WHERE p.id = p_participation AND p.campaign_id = v_camp) THEN
    RAISE EXCEPTION 'Participation introuvable dans cette campagne' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM app.group_members m WHERE m.campaign_id = v_camp AND m.participation_id = p_participation) THEN
    RAISE EXCEPTION 'Cette personne est déjà dans un groupe de la campagne : la retirer d''abord' USING ERRCODE = '23505';
  END IF;
  INSERT INTO app.group_members (group_id, campaign_id, organization_id, participation_id)
  VALUES (p_groupe, v_camp, v_org, p_participation);
  PERFORM private.journaliser(auth.uid(), 'groupe.affecter', 'participation', p_participation, v_org);
END
$$;

CREATE FUNCTION app.retirer_membre(p_participation uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_camp uuid;
  v_org  uuid;
BEGIN
  SELECT p.campaign_id INTO v_camp FROM app.participations p WHERE p.id = p_participation;
  v_org := private.autoriser_composition(v_camp);
  DELETE FROM app.group_members WHERE campaign_id = v_camp AND participation_id = p_participation;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM private.journaliser(auth.uid(), 'groupe.retirer', 'participation', p_participation, v_org);
  RETURN true;
END
$$;

-- 5. Droits explicites -------------------------------------------------------
GRANT SELECT ON app.groups, app.group_members, app.group_aggregates TO authenticated;

GRANT EXECUTE ON FUNCTION
  app.creer_groupe(uuid, text, integer), app.renommer_groupe(uuid, text, integer),
  app.supprimer_groupe(uuid), app.affecter_membre(uuid, uuid), app.retirer_membre(uuid)
  TO authenticated;

-- 6. Règles -----------------------------------------------------------------
-- Rôle connecté : lecture seule, aucune règle d'écriture (verrou 2). Les groupes
-- et les agrégats se lisent par le responsable et le consultant de
-- l'organisation et par l'administrateur Tenga ; la composition (qui est dans
-- quel groupe) par le responsable et l'administrateur seulement. Un participant
-- ne lit rien ici. Rien ne donne accès à results ni à attempts.
CREATE POLICY groups_lecture ON app.groups
  FOR SELECT TO authenticated
  USING ((SELECT app.suis_admin_tenga()) OR app.mon_role(organization_id) IN ('responsable', 'consultant'));
CREATE POLICY group_members_lecture ON app.group_members
  FOR SELECT TO authenticated
  USING ((SELECT app.suis_admin_tenga()) OR app.mon_role(organization_id) = 'responsable');
CREATE POLICY group_aggregates_lecture ON app.group_aggregates
  FOR SELECT TO authenticated
  USING ((SELECT app.suis_admin_tenga()) OR app.mon_role(organization_id) IN ('responsable', 'consultant'));

-- tenga_owner (fonctions contrôlées) : les seules opérations nécessaires, table par table.
CREATE POLICY groups_lecture_owner ON app.groups FOR SELECT TO tenga_owner USING (true);
CREATE POLICY groups_insertion_owner ON app.groups FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY groups_modification_owner ON app.groups FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY groups_suppression_owner ON app.groups FOR DELETE TO tenga_owner USING (true);

CREATE POLICY group_members_lecture_owner ON app.group_members FOR SELECT TO tenga_owner USING (true);
CREATE POLICY group_members_insertion_owner ON app.group_members FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY group_members_suppression_owner ON app.group_members FOR DELETE TO tenga_owner USING (true);

CREATE POLICY group_aggregates_lecture_owner ON app.group_aggregates FOR SELECT TO tenga_owner USING (true);
CREATE POLICY group_aggregates_insertion_owner ON app.group_aggregates FOR INSERT TO tenga_owner WITH CHECK (true);

CREATE POLICY agregats_poses_lecture_owner ON private.agregats_poses FOR SELECT TO tenga_owner USING (true);
CREATE POLICY agregats_poses_insertion_owner ON private.agregats_poses FOR INSERT TO tenga_owner WITH CHECK (true);
