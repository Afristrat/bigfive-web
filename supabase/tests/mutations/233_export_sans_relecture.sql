-- mutation: l'export de la personne ne porte plus la clé « relecture »
DO $m$
DECLARE
  d text := pg_get_functiondef('app.exporter_mes_donnees()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    'relecture', pg_catalog.jsonb_build_object($a$, $b$    'relecture_absente', pg_catalog.jsonb_build_object($b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
