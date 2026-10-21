-- mutation: lister_administrateurs_tenga n'exige plus d'être administrateur Tenga
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_administrateurs_tenga()'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$IF NOT app.suis_admin_tenga() THEN$a$, '')) <> length($a$IF NOT app.suis_admin_tenga() THEN$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$IF NOT app.suis_admin_tenga() THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
