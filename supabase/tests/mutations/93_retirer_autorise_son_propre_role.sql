-- mutation: retirer_role laisse chacun retirer son propre rôle
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_role(uuid,uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$p_utilisateur IS NOT DISTINCT FROM v_uid$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
