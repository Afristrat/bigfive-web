-- mutation: app.relire_bloc écrit une nouvelle ligne pour un verdict rejoué (double clic)
DO $$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF FOUND THEN
    RETURN v_id;
  END IF;$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
