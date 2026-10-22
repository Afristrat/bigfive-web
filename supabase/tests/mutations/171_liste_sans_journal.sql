-- mutation: app.lister_resultats_campagne n'inscrit plus la consultation au journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_resultats_campagne(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'resultat.lister', 'campagne', p_campagne, v_org, v_n);$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
