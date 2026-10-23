-- mutation: l'historique rend l'adresse du relecteur à un relecteur désigné
DO $m$
DECLARE
  d text := pg_get_functiondef('app.historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$LEFT JOIN auth.users u ON v_admin AND u.id = r.relecteur$a$, $b$LEFT JOIN auth.users u ON u.id = r.relecteur$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
