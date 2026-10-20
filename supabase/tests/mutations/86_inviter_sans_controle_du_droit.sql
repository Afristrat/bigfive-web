-- mutation: inviter ne contrôle plus le droit de l'appelant (consultant, participant et responsable étranger invitent)
DO $$
DECLARE
  d text := pg_get_functiondef('app.inviter(uuid, text, text, text, text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT FOUND OR NOT private.peut_gerer(v_org) THEN$a$, $b$IF NOT FOUND THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
