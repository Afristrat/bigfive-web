-- mutation: app.frequence_facettes rend l'histogramme sous le seuil d'anonymat
DO $$
DECLARE
  d text := pg_get_functiondef('app.frequence_facettes()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_n < v_seuil THEN
    RETURN;
  END IF;$a$, '');
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
