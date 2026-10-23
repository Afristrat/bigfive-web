-- mutation: la réponse à une adresse qui n'est pas administrateur se distingue d'un compte libre
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$SELECT false, 'libre'::text, NULL::timestamptz, NULL::bigint$a$, $b$SELECT false, 'inconnu'::text, NULL::timestamptz, NULL::bigint$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
