-- mutation: private.journaliser ignore les lignes de purge (plus de trace chiffrée)
CREATE OR REPLACE FUNCTION private.journaliser(
  p_acteur uuid, p_action text, p_type text DEFAULT NULL, p_ressource uuid DEFAULT NULL,
  p_organisation uuid DEFAULT NULL, p_quantite integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF p_action LIKE 'purge.%' THEN
    RETURN;
  END IF;
  INSERT INTO private.audit_log (acteur, action, ressource_type, ressource_id, organization_id, quantite)
  VALUES (p_acteur, p_action, p_type, p_ressource, p_organisation, p_quantite);
END
$$;
