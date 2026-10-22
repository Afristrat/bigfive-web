-- mutation: un essai pendant un blocage est admis, compté, et prolonge le blocage
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$ELSIF FOUND AND v_etat.bloque_jusqu IS NOT NULL AND v_etat.bloque_jusqu > now() THEN$a$, $b$ELSIF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
