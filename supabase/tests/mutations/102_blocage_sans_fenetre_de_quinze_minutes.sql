-- mutation: le blocage de 30 minutes s'applique aux cinq échecs même espacés de plus de 15 minutes
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_cinq IS NOT NULL AND v_cinq > now() - interval '15 minutes' THEN$a$, $b$IF v_cinq IS NOT NULL THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
