-- mutation: une connexion réussie accepte un essai qui n'est pas le dernier admis
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_succes(uuid,bigint)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$v_essai.id <> p_tentative OR v_essai.cree_le <= now() - interval '10 minutes'$a$, $b$false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
