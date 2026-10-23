-- mutation: app.lire_binome se contente d'UN seul des deux accords (au lieu des deux)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lire_binome(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$OR v_acc_a IS NULL OR v_acc_b IS NULL THEN$a$, $b$OR (v_acc_a IS NULL AND v_acc_b IS NULL) THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
