-- mutation: app.relire_bloc ne borne plus la longueur brute du commentaire avant l'expression régulière
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF COALESCE(pg_catalog.char_length(p_commentaire) > 4000, false) THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
