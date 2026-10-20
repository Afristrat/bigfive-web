-- mutation: le passage du gel dépend d'un drapeau de session posable par l'appelant au lieu de se lire dans les données
DO $$
DECLARE
  d text := pg_get_functiondef('private.geler_composition()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND v_statut = 'ouverte' THEN$a$, $b$AND v_statut = 'ouverte' AND pg_catalog.current_setting('tenga.composition', true) = 'on' THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
