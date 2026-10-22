-- mutation: une connexion réussie accepte un essai de plus de 10 minutes
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_succes(uuid,bigint)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$ OR v_essai.cree_le <= now() - interval '10 minutes'$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
