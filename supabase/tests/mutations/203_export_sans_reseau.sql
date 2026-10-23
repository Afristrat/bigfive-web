-- mutation: app.exporter_mes_donnees n'exporte plus le relevé du réseau de la personne (droit d'accès)
DO $$
DECLARE
  d text := pg_get_functiondef('app.exporter_mes_donnees()'::regprocedure);
  n text;
BEGIN
  n := regexp_replace(d, $a$'reseau', pg_catalog\.jsonb_build_object\(.*?WHERE p\.user_id = v_uid\), '\[\]'::jsonb\)\),\s*'binomes'$a$, $b$'binomes'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
