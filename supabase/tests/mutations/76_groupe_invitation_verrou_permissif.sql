-- mutation: la fonction du verrou laisse tout passer (le déclencheur reste en place, group_id modifiable)
DO $$
DECLARE
  d text := pg_get_functiondef('private.verrouiller_groupe_invitation()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NEW.group_id IS NOT DISTINCT FROM OLD.group_id THEN$a$, $b$IF true THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
