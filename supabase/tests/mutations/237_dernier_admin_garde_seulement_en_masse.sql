-- mutation: le garde du dernier administrateur ne refuse plus que les suppressions en masse ; supprimer seul le dernier administrateur passe (rougit sur base vivante grâce à la mise hors jeu des administrateurs réels)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.garder_dernier_admin()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF EXISTS (SELECT 1 FROM supprimes) AND NOT EXISTS (SELECT 1 FROM private.tenga_admins) THEN$a$,
                  $b$IF (SELECT count(*) FROM supprimes) > 1 AND NOT EXISTS (SELECT 1 FROM private.tenga_admins) THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
