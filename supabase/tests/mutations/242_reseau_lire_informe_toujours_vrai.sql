-- mutation: le rendu du relevé (private.reseau_rendu, servi par app.reseau_lire) dit de nouveau « informe » vrai pour toute ligne de membre, opposée comprise
DO $m$
DECLARE
  d text := pg_get_functiondef('private.reseau_rendu(uuid, text, boolean)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'informe', m.informe_le IS NOT NULL AND m.oppose_le IS NULL,$a$, $b$'informe', m.informe_le IS NOT NULL,$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
