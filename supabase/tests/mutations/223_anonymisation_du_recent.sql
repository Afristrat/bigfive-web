-- mutation: le déclencheur laisse anonymiser un verdict de moins de 30 jours
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND NOT (v_purge AND v_echu AND NOT OLD.anonymise$a$, $b$AND NOT (v_purge AND NOT OLD.anonymise$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
