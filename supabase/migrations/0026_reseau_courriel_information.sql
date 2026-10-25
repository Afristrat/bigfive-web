-- 0026 : courriel d'information aux membres d'un groupe qui n'ont pas pris
-- connaissance de l'information préalable dans l'application (art. 5 de la loi
-- 09-08, art. 14 du RGPD). Décision d'Amine du 25/10/2026.
--
-- Le consultant de l'organisation (ou un administrateur Tenga) envoie le courriel,
-- relevé OUVERT, depuis la page du relevé. Deux fonctions, aucune table nouvelle :
--
--   app.reseau_a_informer(p_campagne)
--     Les membres d'un groupe de la campagne (ouverte) qui n'ont encore aucune ligne
--     dans app.reseau_membres (ils n'ont donc ni vu l'information ni refusé) et qui
--     n'ont pas déjà reçu le courriel : participation et langue, JAMAIS l'adresse.
--     Relevé fermé : refus 55000. Réservée au consultant de l'organisation et à
--     l'administrateur Tenga (appel avec l'identité de la personne).
--
--   app.reseau_courriels(p_acteur, p_campagne, p_participations)
--     Les adresses de ces seules participations, parmi celles encore à informer.
--     Réservée au serveur de l'application (service_role, aucun droit pour
--     authenticated) : l'API publique ne rend donc jamais une adresse. La fonction
--     revérifie elle-même que p_acteur est consultant de l'organisation ou
--     administrateur Tenga, et que le relevé est ouvert.
--
--   app.reseau_marquer_informes(p_campagne, p_participations)
--     Inscrit au journal d'audit (action reseau.courriel_information, ressource =
--     participation) les envois réussis, une fois chacun. Seules les participations
--     encore à informer sont retenues (aucun doublon, aucune participation étrangère).
--     Le journal d'audit est en ajout seul et suit sa propre purge : la trace de
--     l'envoi ne survit donc pas plus longtemps que lui, sans table ni purge à part.
--
-- Limite connue : deux envois simultanés de deux consultants pourraient écrire deux
-- courriels à la même personne avant que l'un d'eux ne soit inscrit au journal (le
-- verrou de la base ne couvre pas l'appel HTTP à l'expéditeur). Réexamen : une
-- équipe de plusieurs consultants par organisation.

-- 1. Membres à informer ----------------------------------------------------
CREATE FUNCTION app.reseau_a_informer(p_campagne uuid)
RETURNS TABLE (participation_id uuid, langue text)
LANGUAGE plpgsql
VOLATILE
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
  IF NOT private.reseau_releve_ouvert() OR v_statut <> 'ouverte' THEN
    RAISE EXCEPTION 'Relevé fermé' USING ERRCODE = '55000';
  END IF;
  RETURN QUERY
    SELECT gm.participation_id, COALESCE(pr.langue, 'fr')::text
      FROM app.group_members gm
      JOIN app.participations pa ON pa.id = gm.participation_id
      LEFT JOIN app.profiles pr ON pr.user_id = pa.user_id
     WHERE gm.campaign_id = p_campagne
       AND NOT EXISTS (SELECT 1 FROM app.reseau_membres m WHERE m.participation_id = gm.participation_id)
       AND NOT EXISTS (SELECT 1 FROM private.audit_log l
                        WHERE l.action = 'reseau.courriel_information' AND l.ressource_id = gm.participation_id)
     ORDER BY gm.participation_id;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  PERFORM private.journaliser(v_uid, 'reseau.a_informer', 'campagne', p_campagne, v_org, v_n);
END
$$;

-- 2. Envois réussis --------------------------------------------------------
CREATE FUNCTION app.reseau_marquer_informes(p_campagne uuid, p_participations uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_org    uuid;
  v_statut text;
  v_p      uuid;
  v_n      integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Connexion requise' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND OR NOT (app.suis_admin_tenga() OR COALESCE(app.mon_role(v_org) = 'consultant', false)) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF p_participations IS NULL OR pg_catalog.cardinality(p_participations) > 5000 THEN
    RAISE EXCEPTION 'Liste invalide' USING ERRCODE = '22023';
  END IF;
  FOR v_p IN
    SELECT DISTINCT gm.participation_id
      FROM app.group_members gm
     WHERE gm.campaign_id = p_campagne
       AND gm.participation_id = ANY (p_participations)
       AND NOT EXISTS (SELECT 1 FROM app.reseau_membres m WHERE m.participation_id = gm.participation_id)
       AND NOT EXISTS (SELECT 1 FROM private.audit_log l
                        WHERE l.action = 'reseau.courriel_information' AND l.ressource_id = gm.participation_id)
  LOOP
    PERFORM private.journaliser(v_uid, 'reseau.courriel_information', 'participation', v_p, v_org, 1);
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END
$$;

-- 3. Adresses, pour le serveur de l'application seulement ----------------------
CREATE FUNCTION app.reseau_courriels(p_acteur uuid, p_campagne uuid, p_participations uuid[])
RETURNS TABLE (participation_id uuid, courriel text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org    uuid;
  v_statut text;
BEGIN
  IF p_acteur IS NULL THEN
    RAISE EXCEPTION 'Acteur requis' USING ERRCODE = '42501';
  END IF;
  SELECT c.organization_id, c.statut INTO v_org, v_statut FROM app.campaigns c WHERE c.id = p_campagne;
  IF NOT FOUND
     OR NOT (EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = p_acteur)
             OR EXISTS (SELECT 1 FROM app.memberships m
                         WHERE m.user_id = p_acteur AND m.organization_id = v_org AND m.role = 'consultant')) THEN
    RAISE EXCEPTION 'Réservé au consultant affecté ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF NOT private.reseau_releve_ouvert() OR v_statut <> 'ouverte' THEN
    RAISE EXCEPTION 'Relevé fermé' USING ERRCODE = '55000';
  END IF;
  IF p_participations IS NULL OR pg_catalog.cardinality(p_participations) > 5000 THEN
    RAISE EXCEPTION 'Liste invalide' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
    SELECT gm.participation_id, u.email::text
      FROM app.group_members gm
      JOIN app.participations pa ON pa.id = gm.participation_id
      JOIN auth.users u ON u.id = pa.user_id
     WHERE gm.campaign_id = p_campagne
       AND gm.participation_id = ANY (p_participations)
       AND NOT EXISTS (SELECT 1 FROM app.reseau_membres m WHERE m.participation_id = gm.participation_id)
       AND NOT EXISTS (SELECT 1 FROM private.audit_log l
                        WHERE l.action = 'reseau.courriel_information' AND l.ressource_id = gm.participation_id)
     ORDER BY gm.participation_id;
END
$$;

-- 4. Droits --------------------------------------------------------------------
-- Les deux fonctions du consultant : authenticated seul. Les adresses : service_role seul.
REVOKE ALL ON FUNCTION app.reseau_a_informer(uuid) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_marquer_informes(uuid, uuid[]) FROM PUBLIC, anon, service_role;
REVOKE ALL ON FUNCTION app.reseau_courriels(uuid, uuid, uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_a_informer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_marquer_informes(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION app.reseau_courriels(uuid, uuid, uuid[]) TO service_role;
