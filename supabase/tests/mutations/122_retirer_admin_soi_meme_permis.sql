-- mutation: retirer_admin_tenga laisse un administrateur se retirer lui-même
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF p_utilisateur IS NOT DISTINCT FROM v_uid THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
