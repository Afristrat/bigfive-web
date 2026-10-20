-- mutation: l'ouverture d'une campagne ne vérifie plus le droit de l'appelant
CREATE OR REPLACE FUNCTION app.ouvrir_campagne(p_campagne uuid)
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Réservé au responsable de l''organisation ou à un administrateur Tenga' USING ERRCODE = '42501';
  END IF;
  IF v_statut <> 'brouillon' THEN
    RAISE EXCEPTION 'Seule une campagne en brouillon s''ouvre' USING ERRCODE = '55000';
  END IF;
  UPDATE app.campaigns SET statut = 'ouverte', ouverte_le = now() WHERE id = p_campagne;
  PERFORM private.journaliser(auth.uid(), 'campagne.ouvrir', 'campagne', p_campagne, v_org);
END
$$;
