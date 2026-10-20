-- mutation: attribuer_role laisse chacun modifier son propre rôle
DO $$
DECLARE
  d text := pg_get_functiondef('app.attribuer_role(uuid,uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$p_utilisateur IS NOT DISTINCT FROM v_uid$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
