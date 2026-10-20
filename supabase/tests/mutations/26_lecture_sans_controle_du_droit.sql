-- mutation: la lecture individuelle d'un résultat ne vérifie plus le droit (toute personne connectée lit, avec journal)
CREATE OR REPLACE FUNCTION app.lire_resultat_individuel(p_participation uuid)
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
  IF NOT FOUND THEN
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
