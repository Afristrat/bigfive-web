-- mutation: app.lister_relecteurs s'ouvre aux relecteurs désignés (au lieu des seuls super administrateurs)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lister_relecteurs()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT app.suis_admin_tenga() THEN$a$, $b$IF NOT app.suis_relecteur() THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
