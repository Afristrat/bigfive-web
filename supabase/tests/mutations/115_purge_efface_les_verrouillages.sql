-- mutation: la purge quotidienne efface aussi les verrouillages
DO $$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE verrouille_le IS NULL AND (bloque_jusqu IS NULL OR bloque_jusqu < now())$a$, $b$WHERE true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
