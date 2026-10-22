-- mutation: une connexion par mot de passe réussit pour un compte non administrateur
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_succes(uuid,bigint)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$OR NOT EXISTS (SELECT 1 FROM private.tenga_admins a WHERE a.user_id = p_utilisateur) THEN$a$, $b$THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
