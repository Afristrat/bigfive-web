-- mutation: app.relire_bloc accepte une demande de correction sans commentaire (refus laissé à la seule contrainte de table)
DO $$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$OR (p_verdict = 'a_corriger' AND v_com IS NULL)$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
