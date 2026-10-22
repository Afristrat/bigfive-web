-- mutation: la liste des comptes à surveiller ignore le droit de l'appelant
DO $$
DECLARE
  d text := pg_get_functiondef('app.mdp_comptes_a_surveiller()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    AND private.peut_deverrouiller(e.user_id)$a$, $b$    AND true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
