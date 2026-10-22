-- mutation: la purge garde les échecs de mot de passe 30 jours
DO $$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM private.echecs_mdp WHERE cree_le < now() - interval '1 day'$a$, $b$DELETE FROM private.echecs_mdp WHERE cree_le < now() - interval '30 days'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
