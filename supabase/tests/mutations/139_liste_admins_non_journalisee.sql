-- mutation: lister_administrateurs_tenga n'inscrit plus la consultation au journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_administrateurs_tenga()'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n);$a$, '')) <> length($a$PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n);$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
