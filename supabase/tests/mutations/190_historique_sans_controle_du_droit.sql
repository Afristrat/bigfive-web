-- mutation: app.historique_relecture s'ouvre à toute personne connectée
DO $$
DECLARE
  d text := pg_get_functiondef('app.historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT app.suis_relecteur() THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
