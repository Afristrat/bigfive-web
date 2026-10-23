-- mutation: app.historique_relecture n'inscrit plus la lecture (adresses des relecteurs) au journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'relecture.lister', NULL, NULL, NULL, v_n);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
