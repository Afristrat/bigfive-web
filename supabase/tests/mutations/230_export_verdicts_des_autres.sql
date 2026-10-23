-- mutation: l'export de la personne contient les verdicts des autres relecteurs
DO $m$
DECLARE
  d text := pg_get_functiondef('app.exporter_mes_donnees()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$FROM app.relectures_blocs v WHERE v.relecteur = v_uid)$a$, $b$FROM app.relectures_blocs v WHERE true)$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
