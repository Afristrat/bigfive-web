-- mutation: la recherche par adresse ne normalise plus la casse
DO $$
DECLARE
  d text := pg_get_functiondef('app.compte_par_adresse(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$pg_catalog.lower(pg_catalog.btrim(COALESCE(p_email, '')))$a$, $b$COALESCE(p_email, '')$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
