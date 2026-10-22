-- mutation: un mot de passe juste rembourse son débit mais laisse le blocage que ce débit a posé
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_rembourser(bigint)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM private.etat_mdp e WHERE e.user_id = v_essai.user_id AND e.cause = v_essai.id;$a$, $b$PERFORM 1;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
