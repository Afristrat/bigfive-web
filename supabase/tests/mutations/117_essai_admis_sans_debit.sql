-- mutation: un essai admis n'est pas compté avant la vérification du mot de passe (contrôle et débit séparés)
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_tentative(text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$INSERT INTO private.echecs_mdp (user_id) VALUES (v_user) RETURNING id INTO v_id;$a$, $b$v_id := 0;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
