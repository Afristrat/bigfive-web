-- 0022 : relevé du réseau réel d'une équipe (étape 2 de la structure invisible,
-- cadrage docs/design/cadrage-reseau-reel.md, décisions d'Amine du 23/10/2026).
--
-- Besoin : relever à qui chacun demande conseil, d'où lui vient l'information, à
-- qui il se fie et de qui il dépend, pour comparer le réseau réel à la structure
-- prévue. Chaque réponse NOMME des collègues : base légale en double garde
-- (consentement explicite du répondant, recueilli sans l'employeur, ET
-- information préalable de chaque membre du groupe avec droit d'opposition à être
-- cité, loi 09-08 art. 4 et 5 §3, RGPD art. 14). Objets :
--
--   private.settings.reseau_releve_ouvert (boolean, FAUX par défaut) : l'interrupteur.
--     Le relevé est FERMÉ en production : la déclaration de cette finalité à la
--     CNDP est en cours (loi 09-08, art. 12, déclaration préalable). Il ne s'ouvre
--     que sur ordre d'Amine, après confirmation du dépôt ou du récépissé, par une
--     ligne SQL de tenga_owner ou de supabase_admin :
--       UPDATE private.settings SET reseau_releve_ouvert = true;
--     Aucun rôle de l'API ne lit ni n'écrit private.settings.
--   private.settings.conservation_reseau_mois (36 par défaut, de 1 à 120) : durée
--     de conservation (décision d'Amine : 3 ans, puis suppression automatique).
--
--   app.reseau_membres : une ligne par participation qui a pris connaissance de
--     l'information préalable (art. 5 §3). Opposition datée, accord de réponse et
--     accord de carte datés, distincts. Appartenance au groupe garantie par une
--     clé étrangère composite vers app.group_members (campagne, participation,
--     groupe), organisation garantie par la clé (participation, organisation) vers
--     app.participations ; effacement en cascade avec la composition ou la
--     participation. Une opposition ne coexiste avec aucun accord (contrainte).
--   app.reseau_reponses : un lien déclaré (répondant, personne citée, type de lien,
--     valeur). Fréquence de 0 (jamais) à 4 (chaque jour) pour conseil,
--     information et dépendance ; confiance de 0 (non) à 3 (oui). Le répondant et
--     la personne citée sont des lignes de app.reseau_membres du MÊME groupe (clés
--     composites) ; la suppression d'une ligne de membre efface ses liens entrants
--     et sortants.
--   Les deux tables : RLS forcée, écriture refusée à l'API (déclencheur
--   private.refuser_ecriture_api), règles réservées à tenga_owner, AUCUN droit de
--   table ni règle pour anon, authenticated ou service_role : tout passe par les
--   fonctions.
--
--   app.mes_releves_reseau() : mes participations éligibles (dans un groupe) ; aucune
--     ligne tant que l'interrupteur est fermé.
--   app.reseau_releve(p_participation) : {"ouvert": false} si fermé ; sinon mon état,
--     les autres membres informés et non opposés de mon groupe (vide tant que je ne
--     suis pas informé ou si je suis opposé) et mes seules réponses.
--   app.reseau_informer(p_participation, p_opposition) : information lue ; opposition
--     (efface mes accords et SUPPRIME tous les liens où je suis répondant OU
--     personne citée) ou levée de l'opposition. Campagne ouverte ou close.
--   app.reseau_consentir(p_participation, p_repondre, p_carte) : deux accords
--     indépendants, campagne ouverte ; retirer l'accord de réponse supprime mes
--     réponses.
--   app.reseau_repondre(p_participation, p_reponses) : remplace atomiquement toutes
--     mes réponses, campagne ouverte, accord de réponse posé ; toute personne citée
--     hors de mon groupe, opposée ou non informée refuse TOUT l'envoi (22023).
--   app.reseau_retirer(p_participation) : à tout moment, interrupteur ouvert ou
--     fermé, campagne ouverte ou close.
--   app.reseau_lire(p_campagne) : réponses brutes par groupe, pour le consultant de
--     l'organisation et l'administrateur Tenga seulement ; le responsable ne lit
--     rien. Lecture journalisée avant le renvoi.
--   Refus sans fuite : une participation d'autrui, inexistante ou hors groupe rend
--   P0002 « Participation introuvable » ; une campagne interdite ou inexistante
--   rend 42501, même message.
--
--   app.exporter_mes_donnees() (droit d'accès) : redéfinie à l'identique de 0021,
--     avec une clé de plus, « reseau » (mes lignes de membre, mes réponses avec le
--     nom de la personne citée). Mêmes signature, attributs et droits.
--   private.purger_quotidien() : redéfinie à l'identique de 0018, avec la purge des
--     réponses (repondu_le) puis des lignes de membre (maj_le) plus anciennes que
--     conservation_reseau_mois, et deux traces chiffrées sans acteur.
--
-- Journal : reseau.informer, reseau.opposer, reseau.consentir, reseau.repondre
-- (quantité = lignes enregistrées), reseau.retirer (quantité = lignes
-- supprimées), reseau.lire (quantité = réponses rendues), purge.reseau_reponses,
-- purge.reseau_membres. Ressource de type participation (campagne pour la
-- lecture), organisation de la campagne. Aucun nom, aucune adresse ; aucun refus
-- n'est journalisé.
--
-- Conservation : 3 ans (conservation_reseau_mois = 36), puis suppression par la
-- purge quotidienne ; effacement immédiat en cascade avec le compte, la
-- participation, la composition, la campagne ou l'organisation.
--
-- Contraintes tenues : SECURITY DEFINER, search_path vide, objets qualifiés ;
-- propriétaire tenga_owner (migrate.sh) ; EXECUTE pour authenticated seul. Les
-- colonnes de RETURNS TABLE sont des variables plpgsql : toute référence de
-- colonne du corps est qualifiée par son alias de table.
--
-- Convention : dans un corps plpgsql, « END » sans point-virgule final.

-- 1. Réglages ----------------------------------------------------------------
ALTER TABLE private.settings
  ADD COLUMN reseau_releve_ouvert boolean NOT NULL DEFAULT false,
  ADD COLUMN conservation_reseau_mois integer NOT NULL DEFAULT 36
    CONSTRAINT settings_conservation_reseau_mois_check CHECK (conservation_reseau_mois BETWEEN 1 AND 120);
COMMENT ON COLUMN private.settings.reseau_releve_ouvert IS
  'Interrupteur du relevé du réseau réel. FERMÉ par défaut ; ouverture sur ordre d''Amine seulement, après dépôt de la déclaration CNDP.';
COMMENT ON COLUMN private.settings.conservation_reseau_mois IS
  'Conservation du relevé du réseau réel, en mois (décision d''Amine : 36, soit 3 ans).';

-- 2. Tables ------------------------------------------------------------------
-- Cible de la clé composite de app.reseau_membres : la composition (campagne,
-- participation) porte un seul groupe ; cette unicité redondante avec la clé
-- primaire permet de garantir que la ligne de membre cite le BON groupe.
ALTER TABLE app.group_members
  ADD CONSTRAINT group_members_campagne_participation_groupe_key UNIQUE (campaign_id, participation_id, group_id);

CREATE TABLE app.reseau_membres (
  participation_id   uuid PRIMARY KEY,
  campaign_id        uuid NOT NULL,
  organization_id    uuid NOT NULL,
  group_id           uuid NOT NULL,
  informe_le         timestamptz NOT NULL DEFAULT now(),
  oppose_le          timestamptz,
  accord_repondre_le timestamptz,
  accord_carte_le    timestamptz,
  maj_le             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reseau_membres_composition_fkey
    FOREIGN KEY (campaign_id, participation_id, group_id)
    REFERENCES app.group_members (campaign_id, participation_id, group_id) ON DELETE CASCADE,
  CONSTRAINT reseau_membres_participation_fkey
    FOREIGN KEY (participation_id, organization_id) REFERENCES app.participations (id, organization_id) ON DELETE CASCADE,
  CONSTRAINT reseau_membres_opposition_sans_accord
    CHECK (oppose_le IS NULL OR (accord_repondre_le IS NULL AND accord_carte_le IS NULL)),
  -- Cible des clés composites de app.reseau_reponses (même groupe des deux côtés).
  CONSTRAINT reseau_membres_groupe_key UNIQUE (participation_id, group_id, campaign_id, organization_id)
);
CREATE INDEX reseau_membres_campagne_groupe_idx ON app.reseau_membres (campaign_id, group_id);
CREATE INDEX reseau_membres_maj_le_idx ON app.reseau_membres (maj_le);
COMMENT ON TABLE app.reseau_membres IS
  'Relevé du réseau réel : information préalable (art. 5 §3 de la loi 09-08), opposition, accords de réponse et de carte, par participation. Aucun accès direct par l''API.';

CREATE TABLE app.reseau_reponses (
  repondant       uuid NOT NULL,
  cite            uuid NOT NULL,
  campaign_id     uuid NOT NULL,
  organization_id uuid NOT NULL,
  group_id        uuid NOT NULL,
  lien            text NOT NULL CONSTRAINT reseau_reponses_lien_check
                    CHECK (lien IN ('conseil', 'information', 'confiance', 'dependance')),
  valeur          smallint NOT NULL,
  repondu_le      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (repondant, cite, lien),
  CONSTRAINT reseau_reponses_autrui CHECK (repondant <> cite),
  CONSTRAINT reseau_reponses_valeur_check
    CHECK ((lien = 'confiance' AND valeur BETWEEN 0 AND 3) OR (lien <> 'confiance' AND valeur BETWEEN 0 AND 4)),
  CONSTRAINT reseau_reponses_repondant_fkey
    FOREIGN KEY (repondant, group_id, campaign_id, organization_id)
    REFERENCES app.reseau_membres (participation_id, group_id, campaign_id, organization_id) ON DELETE CASCADE,
  CONSTRAINT reseau_reponses_cite_fkey
    FOREIGN KEY (cite, group_id, campaign_id, organization_id)
    REFERENCES app.reseau_membres (participation_id, group_id, campaign_id, organization_id) ON DELETE CASCADE
);
CREATE INDEX reseau_reponses_cite_idx ON app.reseau_reponses (cite);
CREATE INDEX reseau_reponses_campagne_groupe_idx ON app.reseau_reponses (campaign_id, group_id);
CREATE INDEX reseau_reponses_repondu_le_idx ON app.reseau_reponses (repondu_le);
COMMENT ON TABLE app.reseau_reponses IS
  'Relevé du réseau réel : liens déclarés (conseil, information, confiance, dépendance) entre membres informés d''un même groupe. Aucun accès direct par l''API.';

ALTER TABLE app.reseau_membres ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;
ALTER TABLE app.reseau_reponses ENABLE ROW LEVEL SECURITY, FORCE ROW LEVEL SECURITY;

-- 3. Verrous : toute écriture venant d'un rôle de l'API est refusée (verrou 3).
CREATE TRIGGER reseau_membres_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.reseau_membres
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER reseau_membres_sans_vidage_api
  BEFORE TRUNCATE ON app.reseau_membres
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER reseau_reponses_sans_ecriture_api
  BEFORE INSERT OR UPDATE OR DELETE ON app.reseau_reponses
  FOR EACH ROW EXECUTE FUNCTION private.refuser_ecriture_api();
CREATE TRIGGER reseau_reponses_sans_vidage_api
  BEFORE TRUNCATE ON app.reseau_reponses
  FOR EACH STATEMENT EXECUTE FUNCTION private.refuser_ecriture_api();

-- 4. Règles : tenga_owner seul (les fonctions contrôlées et la purge). Les réponses
-- ne se modifient pas : elles se remplacent (suppression puis insertion).
CREATE POLICY reseau_membres_lecture_owner ON app.reseau_membres FOR SELECT TO tenga_owner USING (true);
CREATE POLICY reseau_membres_insertion_owner ON app.reseau_membres FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY reseau_membres_modification_owner ON app.reseau_membres FOR UPDATE TO tenga_owner USING (true) WITH CHECK (true);
CREATE POLICY reseau_membres_suppression_owner ON app.reseau_membres FOR DELETE TO tenga_owner USING (true);
CREATE POLICY reseau_reponses_lecture_owner ON app.reseau_reponses FOR SELECT TO tenga_owner USING (true);
CREATE POLICY reseau_reponses_insertion_owner ON app.reseau_reponses FOR INSERT TO tenga_owner WITH CHECK (true);
CREATE POLICY reseau_reponses_suppression_owner ON app.reseau_reponses FOR DELETE TO tenga_owner USING (true);

-- 5. Aides internes (schéma private, aucun droit d'exécution pour l'API) ------

-- 5.1 L'interrupteur, lu dans private.settings (faux si la ligne manquait).
CREATE FUNCTION private.reseau_releve_ouvert()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE((SELECT s.reseau_releve_ouvert FROM private.settings s), false)
$$;

-- 5.2 Ma participation éligible : à moi ET dans un groupe de sa campagne. Aucune
-- ligne sinon (l'appelant répond alors P0002, même message qu'inexistante).
CREATE FUNCTION private.reseau_participation(p_participation uuid, p_uid uuid)
RETURNS TABLE (campaign_id uuid, organization_id uuid, group_id uuid, campagne_statut text)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT gm.campaign_id, gm.organization_id, gm.group_id, c.statut
    FROM app.participations pa
    JOIN app.group_members gm ON gm.participation_id = pa.id AND gm.campaign_id = pa.campaign_id
    JOIN app.campaigns c ON c.id = pa.campaign_id
   WHERE pa.id = p_participation AND pa.user_id = p_uid
$$;

REVOKE ALL ON FUNCTION private.reseau_releve_ouvert() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.reseau_participation(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;

-- 6. Fonctions de l'API ---------------------------------------------------------

-- 6.1 Mes relevés : aucune ligne tant que l'interrupteur est fermé.
CREATE FUNCTION app.mes_releves_reseau()
RETURNS TABLE (participation_id uuid, organisation_nom text, campagne_titre text, campagne_statut text)
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
  IF NOT private.reseau_releve_ouvert() THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT pa.id, o.nom, c.titre, c.statut
      FROM app.participations pa
      JOIN app.group_members gm ON gm.participation_id = pa.id AND gm.campaign_id = pa.campaign_id
      JOIN app.campaigns c ON c.id = pa.campaign_id
      JOIN app.organizations o ON o.id = pa.organization_id
     WHERE pa.user_id = v_uid
     ORDER BY c.ouverte_le DESC NULLS LAST, pa.id;
END
$$;

-- 6.2 Mon relevé.
CREATE FUNCTION app.reseau_releve(p_participation uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_groupe uuid;
  v_statut text;
  v_moi    app.reseau_membres%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    RETURN pg_catalog.jsonb_build_object('ouvert', false);
  END IF;
  SELECT r.group_id, r.campagne_statut INTO v_groupe, v_statut
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  SELECT m.* INTO v_moi FROM app.reseau_membres m WHERE m.participation_id = p_participation;
  RETURN pg_catalog.jsonb_build_object(
    'ouvert', true,
    'campagne_ouverte', v_statut = 'ouverte',
    'moi', CASE WHEN v_moi.participation_id IS NULL THEN NULL
                ELSE pg_catalog.jsonb_build_object(
                       'informe_le', v_moi.informe_le, 'oppose_le', v_moi.oppose_le,
                       'accord_repondre_le', v_moi.accord_repondre_le, 'accord_carte_le', v_moi.accord_carte_le) END,
    'membres', CASE WHEN v_moi.participation_id IS NULL OR v_moi.oppose_le IS NOT NULL THEN '[]'::jsonb
                    ELSE COALESCE((
                      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('participation_id', m.participation_id, 'nom', pr.nom)
                                                  ORDER BY pr.nom NULLS LAST, m.participation_id)
                        FROM app.reseau_membres m
                        JOIN app.participations pa ON pa.id = m.participation_id
                        LEFT JOIN app.profiles pr ON pr.user_id = pa.user_id
                       WHERE m.group_id = v_groupe AND m.oppose_le IS NULL AND m.participation_id <> p_participation), '[]'::jsonb) END,
    'reponses', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('cite', r.cite, 'lien', r.lien, 'valeur', r.valeur)
                                  ORDER BY r.cite, r.lien)
        FROM app.reseau_reponses r WHERE r.repondant = p_participation), '[]'::jsonb));
END
$$;

-- 6.3 Information préalable lue ; opposition ou levée de l'opposition.
CREATE FUNCTION app.reseau_informer(p_participation uuid, p_opposition boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_org      uuid;
  v_groupe   uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_opposition IS NULL THEN
    RAISE EXCEPTION 'Choix invalide : vrai ou faux attendu' USING ERRCODE = '22023';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    RAISE EXCEPTION 'Relevé du réseau fermé' USING ERRCODE = '55000';
  END IF;
  SELECT r.campaign_id, r.organization_id, r.group_id INTO v_campagne, v_org, v_groupe
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO app.reseau_membres (participation_id, campaign_id, organization_id, group_id)
  VALUES (p_participation, v_campagne, v_org, v_groupe)
  ON CONFLICT (participation_id) DO NOTHING;
  IF p_opposition THEN
    UPDATE app.reseau_membres m
       SET oppose_le = now(), accord_repondre_le = NULL, accord_carte_le = NULL, maj_le = now()
     WHERE m.participation_id = p_participation;
    DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation OR r.cite = p_participation;
    PERFORM private.journaliser(v_uid, 'reseau.opposer', 'participation', p_participation, v_org);
    RETURN 'oppose';
  END IF;
  UPDATE app.reseau_membres m SET oppose_le = NULL, maj_le = now() WHERE m.participation_id = p_participation;
  PERFORM private.journaliser(v_uid, 'reseau.informer', 'participation', p_participation, v_org);
  RETURN 'informe';
END
$$;

-- 6.4 Accords de réponse et de carte, indépendants.
CREATE FUNCTION app.reseau_consentir(p_participation uuid, p_repondre boolean, p_carte boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_org      uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF p_repondre IS NULL OR p_carte IS NULL THEN
    RAISE EXCEPTION 'Choix invalide : vrai ou faux attendu' USING ERRCODE = '22023';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    RAISE EXCEPTION 'Relevé du réseau fermé' USING ERRCODE = '55000';
  END IF;
  SELECT r.campaign_id, r.organization_id INTO v_campagne, v_org
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  -- Verrou partagé sur la campagne : la clôture attend la fin de ce consentement.
  PERFORM 1 FROM app.campaigns c WHERE c.id = v_campagne AND c.statut = 'ouverte' FOR SHARE OF c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne non ouverte : consentement et réponses fermés' USING ERRCODE = '55000';
  END IF;
  PERFORM 1 FROM app.reseau_membres m
   WHERE m.participation_id = p_participation AND m.oppose_le IS NULL
     FOR UPDATE OF m;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Information préalable requise, sans opposition' USING ERRCODE = '55000';
  END IF;
  UPDATE app.reseau_membres m
     SET accord_repondre_le = CASE WHEN p_repondre THEN COALESCE(m.accord_repondre_le, now()) END,
         accord_carte_le = CASE WHEN p_carte THEN COALESCE(m.accord_carte_le, now()) END,
         maj_le = now()
   WHERE m.participation_id = p_participation;
  IF NOT p_repondre THEN
    DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  END IF;
  PERFORM private.journaliser(v_uid, 'reseau.consentir', 'participation', p_participation, v_org);
  RETURN 'enregistre';
END
$$;

-- 6.5 Mes réponses : remplacement atomique de toutes mes lignes.
CREATE FUNCTION app.reseau_repondre(p_participation uuid, p_reponses jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_campagne uuid;
  v_org      uuid;
  v_groupe   uuid;
  v_effectif integer;
  v_cites    uuid[];
  v_valides  integer;
  v_n        integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  IF NOT private.reseau_releve_ouvert() THEN
    RAISE EXCEPTION 'Relevé du réseau fermé' USING ERRCODE = '55000';
  END IF;
  SELECT r.campaign_id, r.organization_id, r.group_id INTO v_campagne, v_org, v_groupe
    FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  PERFORM 1 FROM app.campaigns c WHERE c.id = v_campagne AND c.statut = 'ouverte' FOR SHARE OF c;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne non ouverte : consentement et réponses fermés' USING ERRCODE = '55000';
  END IF;
  -- Ma ligne verrouillée : deux envois concurrents de la même personne se suivent.
  PERFORM 1 FROM app.reseau_membres m
   WHERE m.participation_id = p_participation AND m.accord_repondre_le IS NOT NULL
     FOR UPDATE OF m;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accord de réponse requis' USING ERRCODE = '55000';
  END IF;

  -- Forme : un tableau d'objets à exactement trois clés, identifiant lisible, lien
  -- connu, valeur entière dans l'échelle du lien. CASE impose l'ordre des contrôles
  -- (aucune conversion n'est tentée sur une valeur non vérifiée).
  SELECT pg_catalog.count(*)::integer INTO v_effectif FROM app.group_members gm WHERE gm.group_id = v_groupe;
  IF p_reponses IS NULL OR pg_catalog.jsonb_typeof(p_reponses) <> 'array'
     OR pg_catalog.jsonb_array_length(p_reponses) > 4 * (v_effectif - 1)
     OR EXISTS (
       SELECT 1 FROM pg_catalog.jsonb_array_elements(p_reponses) x(e)
        WHERE CASE
                WHEN pg_catalog.jsonb_typeof(x.e) <> 'object' THEN true
                WHEN (SELECT pg_catalog.array_agg(k.k ORDER BY k.k) FROM pg_catalog.jsonb_object_keys(x.e) k(k))
                     IS DISTINCT FROM ARRAY['cite', 'lien', 'valeur']::text[] THEN true
                WHEN pg_catalog.jsonb_typeof(x.e -> 'cite') <> 'string'
                     OR NOT ((x.e ->> 'cite') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN true
                WHEN pg_catalog.jsonb_typeof(x.e -> 'lien') <> 'string'
                     OR (x.e ->> 'lien') NOT IN ('conseil', 'information', 'confiance', 'dependance') THEN true
                WHEN pg_catalog.jsonb_typeof(x.e -> 'valeur') <> 'number' OR NOT ((x.e ->> 'valeur') ~ '^[0-4]$') THEN true
                WHEN (x.e ->> 'lien') = 'confiance' AND (x.e ->> 'valeur') = '4' THEN true
                ELSE false
              END) THEN
    RAISE EXCEPTION 'Réponses invalides : une liste de membres du groupe, de liens et de valeurs est attendue' USING ERRCODE = '22023';
  END IF;

  -- Doublon (personne, lien), et personnes citées : autres membres de MON groupe,
  -- informés, non opposés. Verrou partagé sur leurs lignes : une opposition
  -- concurrente attend la fin de cet envoi, puis supprime aussi ses liens entrants.
  SELECT pg_catalog.array_agg(DISTINCT (x.e ->> 'cite')::uuid) INTO v_cites
    FROM pg_catalog.jsonb_array_elements(p_reponses) x(e);
  SELECT pg_catalog.count(*)::integer INTO v_valides
    FROM (SELECT m.participation_id
            FROM app.reseau_membres m
           WHERE m.participation_id = ANY (v_cites) AND m.group_id = v_groupe
             AND m.oppose_le IS NULL AND m.participation_id <> p_participation
             FOR SHARE OF m) v;
  IF v_valides <> COALESCE(pg_catalog.cardinality(v_cites), 0)
     OR (SELECT pg_catalog.count(DISTINCT ((x.e ->> 'cite')::uuid, x.e ->> 'lien')) FROM pg_catalog.jsonb_array_elements(p_reponses) x(e))
        <> pg_catalog.jsonb_array_length(p_reponses) THEN
    RAISE EXCEPTION 'Réponses invalides : une liste de membres du groupe, de liens et de valeurs est attendue' USING ERRCODE = '22023';
  END IF;

  DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  INSERT INTO app.reseau_reponses (repondant, cite, campaign_id, organization_id, group_id, lien, valeur)
  SELECT p_participation, (x.e ->> 'cite')::uuid, v_campagne, v_org, v_groupe, x.e ->> 'lien', (x.e ->> 'valeur')::smallint
    FROM pg_catalog.jsonb_array_elements(p_reponses) x(e);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM private.journaliser(v_uid, 'reseau.repondre', 'participation', p_participation, v_org, v_n);
  RETURN v_n;
END
$$;

-- 6.6 Retirer mes réponses : à tout moment (interrupteur et campagne indifférents).
CREATE FUNCTION app.reseau_retirer(p_participation uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_org uuid;
  v_n   integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT r.organization_id INTO v_org FROM private.reseau_participation(p_participation, v_uid) r;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Participation introuvable' USING ERRCODE = 'P0002';
  END IF;
  DELETE FROM app.reseau_reponses r WHERE r.repondant = p_participation;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  UPDATE app.reseau_membres m
     SET accord_repondre_le = NULL, accord_carte_le = NULL, maj_le = now()
   WHERE m.participation_id = p_participation;
  PERFORM private.journaliser(v_uid, 'reseau.retirer', 'participation', p_participation, v_org, v_n);
  RETURN v_n;
END
$$;

-- 6.7 Lecture du relevé d'une campagne : consultant de l'organisation ou
-- administrateur Tenga. Le responsable ne lit rien.
CREATE FUNCTION app.reseau_lire(p_campagne uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_statut text;
  v_n      integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  SELECT pg_catalog.count(*)::integer INTO v_n FROM app.reseau_reponses r WHERE r.campaign_id = p_campagne;
  PERFORM private.journaliser(v_uid, 'reseau.lire', 'campagne', p_campagne, v_org, v_n);
  RETURN pg_catalog.jsonb_build_object(
    'campagne_id', p_campagne,
    'campagne_statut', v_statut,
    'groupes', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'groupe_id', g.id,
               'nom', g.nom,
               'effectif', (SELECT pg_catalog.count(*) FROM app.group_members gm WHERE gm.group_id = g.id),
               'membres', COALESCE((
                 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                          'participation_id', m.participation_id,
                          'nom', pr.nom,
                          'informe', m.informe_le IS NOT NULL,
                          'oppose', m.oppose_le IS NOT NULL,
                          'accord_repondre', m.accord_repondre_le IS NOT NULL,
                          'accord_carte', m.accord_carte_le IS NOT NULL,
                          'a_repondu', EXISTS (SELECT 1 FROM app.reseau_reponses r WHERE r.repondant = m.participation_id))
                          ORDER BY pr.nom NULLS LAST, m.participation_id)
                   FROM app.reseau_membres m
                   JOIN app.participations pa ON pa.id = m.participation_id
                   LEFT JOIN app.profiles pr ON pr.user_id = pa.user_id
                  WHERE m.group_id = g.id), '[]'::jsonb),
               'reponses', COALESCE((
                 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                          'de', r.repondant, 'vers', r.cite, 'lien', r.lien, 'valeur', r.valeur)
                          ORDER BY r.repondant, r.cite, r.lien)
                   FROM app.reseau_reponses r WHERE r.group_id = g.id), '[]'::jsonb))
               ORDER BY g.ordre, g.nom, g.id)
        FROM app.groups g WHERE g.campaign_id = p_campagne), '[]'::jsonb));
END
$$;

-- 6.8 Droit d'accès : l'export de la personne (dernière définition : 0021) gagne la
-- clé « reseau ». Mêmes signature, attributs et droits, mêmes clés et même forme
-- qu'en 0021 ; une clé en plus, un objet à deux tableaux (vides si la personne n'a
-- pris part à aucun relevé) : « membres » (ma ligne par participation : campagne,
-- organisation, dates d'information, d'opposition, des deux accords, de mise à
-- jour) et « reponses » (mes réponses, avec le nom de profil de la personne citée,
-- jamais son identifiant ; jamais les réponses des autres).
CREATE OR REPLACE FUNCTION app.exporter_mes_donnees()
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
    'reseau', pg_catalog.jsonb_build_object(
      'membres', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rm.participation_id, 'campagne', c.titre, 'organisation', o.nom,
                 'informe_le', rm.informe_le, 'oppose_le', rm.oppose_le,
                 'accord_repondre_le', rm.accord_repondre_le, 'accord_carte_le', rm.accord_carte_le,
                 'maj_le', rm.maj_le) ORDER BY rm.informe_le, rm.participation_id)
        FROM app.reseau_membres rm
        JOIN app.participations p ON p.id = rm.participation_id
        JOIN app.campaigns c ON c.id = rm.campaign_id
        JOIN app.organizations o ON o.id = rm.organization_id
        WHERE p.user_id = v_uid), '[]'::jsonb),
      'reponses', COALESCE((
        SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
                 'participation', rr.repondant, 'personne_citee', pc.nom, 'lien', rr.lien,
                 'valeur', rr.valeur, 'repondu_le', rr.repondu_le) ORDER BY rr.repondu_le, rr.repondant, rr.cite, rr.lien)
        FROM app.reseau_reponses rr
        JOIN app.participations p ON p.id = rr.repondant
        JOIN app.participations pcit ON pcit.id = rr.cite
        LEFT JOIN app.profiles pc ON pc.user_id = pcit.user_id
        WHERE p.user_id = v_uid), '[]'::jsonb)),
    'binomes', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
               'binome', b.id, 'organisation', o.nom, 'ma_participation', mine.id,
               'propose_le', b.propose_le,
               'mon_accord_le', CASE WHEN mine.id = b.participation_a THEN b.accord_a_le ELSE b.accord_b_le END,
               'statut', CASE WHEN b.retire_le IS NOT NULL THEN 'retire'
                              WHEN b.accord_a_le IS NOT NULL AND b.accord_b_le IS NOT NULL THEN 'actif'
                              ELSE 'en_attente' END,
               'retire_le', b.retire_le) ORDER BY b.propose_le, b.id)
      FROM app.binomes b
      JOIN app.participations mine ON mine.user_id = v_uid AND mine.id IN (b.participation_a, b.participation_b)
      JOIN app.organizations o ON o.id = b.organization_id), '[]'::jsonb),
    'journal', COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('action', l.action, 'date', l.cree_le) ORDER BY l.id)
      FROM private.audit_log l WHERE l.acteur = v_uid), '[]'::jsonb)
  ) INTO v_export;
  PERFORM private.journaliser(v_uid, 'compte.exporter', 'utilisateur', v_uid);
  RETURN v_export;
END
$$;

-- 7. Purge quotidienne (remplace celle de 0018, à l'identique) : s'ajoutent les
-- réponses du relevé puis les lignes de membre plus anciennes que
-- conservation_reseau_mois (la suppression d'une ligne de membre efface en
-- cascade ses liens restants), et deux traces chiffrées sans acteur.
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
  v_reseau_reponses integer;
  v_reseau_membres  integer;
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

  -- Relevé du réseau réel (0022) : réponses, puis lignes de membre échues.
  DELETE FROM app.reseau_reponses
   WHERE repondu_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s));
  GET DIAGNOSTICS v_reseau_reponses = ROW_COUNT;
  DELETE FROM app.reseau_membres
   WHERE maj_le < now() - pg_catalog.make_interval(months => (SELECT s.conservation_reseau_mois FROM private.settings s));
  GET DIAGNOSTICS v_reseau_membres = ROW_COUNT;

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
  PERFORM private.journaliser(NULL, 'purge.reseau_reponses', NULL, NULL, NULL, v_reseau_reponses);
  PERFORM private.journaliser(NULL, 'purge.reseau_membres', NULL, NULL, NULL, v_reseau_membres);
END
$$;

-- 8. Droits : défense en profondeur (comme 0021), puis EXECUTE pour authenticated
-- seul. La purge n'est exécutable par aucun rôle de l'API (inchangé).
REVOKE ALL ON FUNCTION app.mes_releves_reseau() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_releve(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_informer(uuid, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_consentir(uuid, boolean, boolean) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_repondre(uuid, jsonb) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_retirer(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_lire(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.exporter_mes_donnees() FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION private.purger_quotidien() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION app.mes_releves_reseau() TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_releve(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_informer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_consentir(uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_repondre(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_retirer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_lire(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.exporter_mes_donnees() TO authenticated;
