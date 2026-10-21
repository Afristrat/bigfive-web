-- mutation: retirer_admin_tenga n'exige plus d'être administrateur Tenga
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT app.suis_admin_tenga() THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
