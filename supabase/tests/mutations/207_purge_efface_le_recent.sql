-- mutation: le déclencheur laisse la purge effacer un verdict antérieur de moins de 30 jours
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_purge AND v_echu
       AND EXISTS$a$, $b$IF v_purge
       AND EXISTS$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
