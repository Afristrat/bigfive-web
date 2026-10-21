-- mutation: la recherche par adresse retrouve aussi un compte SSO (prédicat is_sso_user retiré)
DO $$
DECLARE
  d text := pg_get_functiondef('app.compte_par_adresse(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND u.is_sso_user = false$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
