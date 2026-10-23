-- mutation: le déclencheur laisse défaire une anonymisation dans le contexte de purge
DO $m$
DECLARE
  d text := pg_get_functiondef('private.verifier_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$ AND NOT OLD.anonymise AND NEW.anonymise
$a$, $b$
$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
