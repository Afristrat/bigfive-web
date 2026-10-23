-- mutation: l'opposition ne supprime que les liens sortants : les liens entrants vers la personne opposée restent
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_informer(uuid, boolean)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE r.repondant = p_participation OR r.cite = p_participation$a$, $b$WHERE r.repondant = p_participation$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
