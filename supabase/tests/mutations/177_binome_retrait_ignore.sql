-- mutation: app.lire_binome ignore le retrait d'une proposition (lecture possible tant que les deux accords existent)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lire_binome(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_retire IS NOT NULL OR v_acc_a IS NULL OR v_acc_b IS NULL THEN$a$, $b$IF v_acc_a IS NULL OR v_acc_b IS NULL THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
