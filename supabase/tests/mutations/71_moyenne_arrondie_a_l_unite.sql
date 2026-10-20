-- mutation: la moyenne du groupe est arrondie à l'unité
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'pg_catalog.round(pg_catalog.avg(g.v), 2)', 'pg_catalog.round(pg_catalog.avg(g.v), 0)');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
