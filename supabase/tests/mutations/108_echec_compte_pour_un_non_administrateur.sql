-- mutation: un essai est admis et compté même pour une adresse qui n'est pas administrateur
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    AND EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = u.id);$a$, $b$    AND true;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
