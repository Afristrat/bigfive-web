-- mutation: la redéfinition de la purge quotidienne change autre chose que l'appel ajouté (liens gardés 2 jours)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '1 day';$a$, $b$DELETE FROM private.liens_connexion WHERE expire_le < now() - interval '2 days';$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
