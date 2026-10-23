-- mutation: la purge n'anonymise plus le verdict courant échu (relecteur et commentaire gardés au-delà de 30 jours)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.purger_historique_relecture()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$  UPDATE app.relectures_blocs r
     SET commentaire = NULL, relecteur = NULL, anonymise = true
   WHERE r.cree_le < v_limite AND NOT r.anonymise;
  GET DIAGNOSTICS v_anonymises = ROW_COUNT;$a$, $b$  v_anonymises := 0;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
