-- mutation: ajouter_admin_tenga accepte un compte banni
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$AND u.banned_until > now()$a$, '')) <> length($a$AND u.banned_until > now()$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$AND u.banned_until > now()$a$, $b$AND false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
