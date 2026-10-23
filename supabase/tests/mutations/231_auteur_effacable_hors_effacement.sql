-- mutation: le déclencheur laisse effacer l'auteur d'un verdict hors de l'effacement de son compte
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$     AND EXISTS (SELECT 1 FROM auth.users u WHERE u.id = OLD.relecteur) THEN$a$, $b$     AND false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
