-- mutation: la fonction du gel laisse tout passer (les deux déclencheurs restent en place)
DO $$
DECLARE
  d text := pg_get_functiondef('private.geler_composition()'::regprocedure);
  n text := replace(d, 'IF v_statut <> ''brouillon'' THEN', 'IF false THEN');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
