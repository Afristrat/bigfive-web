-- mutation: un consultant attribue les rôles comme un responsable
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$app.mon_role(p_organisation) = 'responsable'$a$, $b$app.mon_role(p_organisation) IN ('responsable', 'consultant')$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
