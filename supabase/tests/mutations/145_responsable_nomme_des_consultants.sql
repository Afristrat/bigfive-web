-- mutation: un responsable peut de nouveau nommer des consultants (règle de la migration 0007, décision I2 annulée)
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$p_role = 'participant'$a$, $b$p_role IN ('consultant', 'participant')$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
