-- mutation: la purge quotidienne n'appelle plus la purge de l'historique de relecture
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$  PERFORM private.purger_historique_relecture();
$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
