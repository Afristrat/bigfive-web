-- mutation: la consultation de la liste des administrateurs inscrit au journal une quantité fausse (assertion jamais jouée sur base vivante avant que le test 35 aille jusqu'au bout)
DO $m$
DECLARE
  d text := pg_get_functiondef('app.lister_administrateurs_tenga()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n);$a$,
                  $b$PERFORM private.journaliser(v_uid, 'admin.lister', NULL, NULL, NULL, v_n + 1);$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
