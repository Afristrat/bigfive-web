-- mutation: app.mes_resultats renvoie de nouveau le statut de la participation dans campagne_statut au lieu de celui de la campagne (écart X10)
DO $$
DECLARE
  d text := pg_get_functiondef('app.mes_resultats()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$r.calcul_version, c.statut$a$, $b$r.calcul_version, p.statut$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
