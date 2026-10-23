-- mutation: la purge tente d'effacer tout verdict échu, verdict courant compris (le déclencheur la refuse : la purge quotidienne échoue)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$
     AND EXISTS (SELECT 1 FROM app.relectures_blocs d
                  WHERE d.bloc = r.bloc AND d.empreinte = r.empreinte AND d.ordre > r.ordre);$a$, $b$;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
