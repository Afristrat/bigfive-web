-- mutation: un responsable attribue dans les organisations où il n'est pas responsable
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_attribuer(uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$app.mon_role(p_organisation) = 'responsable'$a$, $b$EXISTS (SELECT 1 FROM app.memberships m WHERE m.user_id = auth.uid() AND m.role = 'responsable')$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
