-- mutation: la purge des événements de plus de 48 heures est retirée
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$DELETE FROM private.plafonds_invitations WHERE cree_le < now() - interval '48 hours';$a$, $b$NULL;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
