-- mutation: l'écart type est calculé sur l'échantillon (n-1) au lieu de la population
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'stddev_pop', 'stddev_samp');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
