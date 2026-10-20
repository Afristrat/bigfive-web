-- mutation: un responsable peut nommer un autre responsable
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$p_role IN ('consultant', 'participant')$a$, $b$p_role IN ('responsable', 'consultant', 'participant')$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
