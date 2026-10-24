-- mutation: la purge du relevé supprime une ligne de membre échue même encore citée ou citante (la cascade efface des réponses récentes)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$     AND NOT EXISTS (SELECT 1 FROM app.reseau_reponses r
                      WHERE r.cite = reseau_membres.participation_id OR r.repondant = reseau_membres.participation_id);$a$, $b$;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
