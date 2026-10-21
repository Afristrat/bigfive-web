-- mutation: les paramètres invalides ne sont plus refusés
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$RAISE EXCEPTION 'paramètres de plafond invalides' USING ERRCODE = '22023';$a$, $b$RETURN 'accepte';$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
