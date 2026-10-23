-- mutation: la durée de conservation passe à 28 jours : un verdict antérieur de 29 jours est effacé
DO $m$
DECLARE
  d text := pg_get_functiondef('private.duree_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$interval '30 days'$a$, $b$interval '28 days'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
