-- mutation: le rendu du relevé montre de nouveau au consultant le nom et la ligne des personnes opposées (au lieu de leur seul nombre)
DO $m$
DECLARE
  d text := pg_get_functiondef('private.reseau_rendu(uuid, text, boolean)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND (m.oppose_le IS NULL OR p_noms_opposes)$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
