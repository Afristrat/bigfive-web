-- mutation: le blocage dure 10 minutes au lieu de 30
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$now() + interval '30 minutes'$a$, $b$now() + interval '10 minutes'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
