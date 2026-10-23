-- mutation: app.relire_bloc n'inscrit plus le verdict au journal
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(NULL, 'relecture.' || p_verdict, 'relecture', NULL);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
