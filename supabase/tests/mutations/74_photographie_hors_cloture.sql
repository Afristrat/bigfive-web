-- mutation: le déclencheur de photographie accepte une ligne sur une campagne qui n'est pas close
DO $$
DECLARE
  d text := pg_get_functiondef('private.verifier_photographie()'::regprocedure);
  n text := replace(d, 'WHERE c.id = NEW.campaign_id AND c.statut = ''close''', 'WHERE c.id = NEW.campaign_id');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
