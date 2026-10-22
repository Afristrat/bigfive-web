-- mutation: app.lire_binome s'ouvre aussi au responsable de l'organisation (au lieu du seul consultant)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lire_binome(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$COALESCE(app.mon_role(v_org) = 'consultant', false)$a$, $b$COALESCE(app.mon_role(v_org) IN ('consultant', 'responsable'), false)$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
