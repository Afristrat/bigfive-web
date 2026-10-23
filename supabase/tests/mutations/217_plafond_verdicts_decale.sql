-- mutation: app.relire_bloc accepte un 201e verdict dans l'heure
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'1 hour') >= 200 THEN$a$, $b$'1 hour') > 200 THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
