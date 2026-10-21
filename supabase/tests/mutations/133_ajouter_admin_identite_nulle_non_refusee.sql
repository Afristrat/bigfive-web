-- mutation: ajouter_admin_tenga ne refuse plus l'identité nulle sous son propre message
DO $$
DECLARE
  d text := pg_get_functiondef('app.ajouter_admin_tenga(uuid)'::regprocedure);
  n text := d;
BEGIN
  IF length(d) - length(replace(d, $a$IF v_uid IS NULL THEN$a$, '')) <> length($a$IF v_uid IS NULL THEN$a$) THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  n := replace(n, $a$IF v_uid IS NULL THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
