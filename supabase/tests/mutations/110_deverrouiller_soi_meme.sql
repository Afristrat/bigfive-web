-- mutation: un administrateur peut lever son propre verrouillage
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_deverrouiller(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND p_utilisateur <> auth.uid()$a$, $b$AND true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
