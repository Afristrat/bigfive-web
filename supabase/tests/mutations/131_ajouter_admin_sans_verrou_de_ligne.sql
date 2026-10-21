-- mutation: ajouter_admin_tenga ne verrouille plus la ligne de l'appelant
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$FOR SHARE$a$, '')) <> length($a$FOR SHARE$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$FOR SHARE$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
