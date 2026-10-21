-- mutation: ajouter_admin_tenga n'exige plus un compte existant
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF p_utilisateur IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_utilisateur) THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
