-- mutation: le déclencheur de l'historique ne lit plus le réglage de purge : tenga_owner efface hors purge
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$
             AND COALESCE(pg_catalog.current_setting('tenga.purge_relecture', true), '') = 'on'$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
