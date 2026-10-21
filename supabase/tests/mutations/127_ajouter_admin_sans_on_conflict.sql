-- mutation: ajouter_admin_tenga n'ignore plus un doublon (ON CONFLICT retiré)
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$ON CONFLICT (user_id) DO NOTHING$a$, '')) <> length($a$ON CONFLICT (user_id) DO NOTHING$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$ON CONFLICT (user_id) DO NOTHING$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
