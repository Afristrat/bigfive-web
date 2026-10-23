-- mutation: app.relire_bloc n'applique plus le plafond de 200 verdicts par heure
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$RAISE EXCEPTION 'Plafond de verdicts atteint' USING ERRCODE = 'PT429';$a$, $b$NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
