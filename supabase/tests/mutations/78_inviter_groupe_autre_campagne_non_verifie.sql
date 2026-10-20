-- mutation: inviter ne vérifie plus que le groupe appartient à la campagne
DO $$
DECLARE
  d text := pg_get_functiondef('app.inviter(uuid, text, text, text, text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF p_groupe IS NOT NULL AND NOT EXISTS ($a$, $b$IF false AND NOT EXISTS ($b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
