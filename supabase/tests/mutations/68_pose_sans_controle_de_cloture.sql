-- mutation: la photographie peut être posée sur une campagne qui n'est pas close
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'IF NOT FOUND OR v_statut <> ''close'' THEN', 'IF NOT FOUND THEN');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
