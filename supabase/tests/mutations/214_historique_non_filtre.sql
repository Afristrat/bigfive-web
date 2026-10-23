-- mutation: l'historique n'est plus filtré : un relecteur désigné lit les verdicts des autres
DO $m$
DECLARE
  d text := pg_get_functiondef('app.historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$     WHERE v_admin OR r.relecteur = v_uid
     ORDER BY r.ordre DESC;$a$, $b$     ORDER BY r.ordre DESC;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
