-- mutation: app.designer_relecteur accepte une 6e désignation dans l'heure
DO $m$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'1 hour') >= 5 THEN$a$, $b$'1 hour') > 5 THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
