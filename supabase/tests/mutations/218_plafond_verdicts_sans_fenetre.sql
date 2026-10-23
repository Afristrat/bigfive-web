-- mutation: le plafond des verdicts compte aussi les verdicts de plus d'une heure
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE r.relecteur = v_uid AND r.cree_le > pg_catalog.now() - interval '1 hour') >= 200$a$, $b$WHERE r.relecteur = v_uid) >= 200$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
