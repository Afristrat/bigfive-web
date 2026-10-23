-- mutation: la purge de l'historique laisse le réglage de purge posé après elle, pour le reste de la transaction
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$  PERFORM pg_catalog.set_config('tenga.purge_relecture', '', true);
$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
