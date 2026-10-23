-- mutation: app.exporter_mes_donnees n'exporte plus les binômes de la personne (droit d'accès)
DO $$
DECLARE
  d text := pg_get_functiondef('app.exporter_mes_donnees()'::regprocedure);
  n text;
BEGIN
  -- Depuis 0022, la clé « binomes » est suivie de « relecture ».
  n := regexp_replace(d, $a$'binomes', COALESCE\(\(.*?\), '\[\]'::jsonb\),\s*'relecture'$a$, $b$'relecture'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
