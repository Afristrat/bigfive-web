-- mutation: l'interrupteur du relevé est ignoré : le relevé est toujours ouvert, même fermé dans private.settings
DO $$
DECLARE
  d text := pg_get_functiondef('private.reseau_releve_ouvert()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$SELECT COALESCE((SELECT s.reseau_releve_ouvert FROM private.settings s), false)$a$, $b$SELECT true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
