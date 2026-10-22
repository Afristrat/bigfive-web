-- mutation: le verrouillage n'arrive qu'au septième échec
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_jour >= 6 THEN$a$, $b$IF v_jour >= 7 THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
