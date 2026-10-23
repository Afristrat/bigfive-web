-- mutation: le plafond des désignations compte les désignations de tous les administrateurs
DO $m$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE l.action = 'relecture.designer' AND l.acteur = v_uid$a$, $b$WHERE l.action = 'relecture.designer'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
