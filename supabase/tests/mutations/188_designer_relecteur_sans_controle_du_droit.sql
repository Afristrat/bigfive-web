-- mutation: app.designer_relecteur ne vérifie plus que l'appelant est super administrateur
DO $$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT app.suis_admin_tenga() THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
