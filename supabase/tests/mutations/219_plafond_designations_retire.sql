-- mutation: app.designer_relecteur n'applique plus le plafond de 5 désignations par heure
DO $m$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$RAISE EXCEPTION 'Plafond de désignations atteint' USING ERRCODE = 'PT429';$a$, $b$NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
