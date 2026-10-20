-- mutation: réinviter une adresse en attente n'exige plus le même groupe (le jeton est renouvelé quel que soit le groupe demandé)
DO $$
DECLARE
  d text := pg_get_functiondef('app.inviter(uuid, text, text, text, text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE app.invitations.group_id IS NOT DISTINCT FROM EXCLUDED.group_id$a$, $b$ $b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
