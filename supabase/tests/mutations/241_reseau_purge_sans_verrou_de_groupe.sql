-- mutation: la purge du relevé ne prend plus le verrou consultatif des groupes concernés avant de supprimer (interblocage possible avec reseau_repondre)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_reseau_groupe::text, 0));$a$, $b$    NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
