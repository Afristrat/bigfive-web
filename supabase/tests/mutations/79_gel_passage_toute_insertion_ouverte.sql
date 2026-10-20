-- mutation: le gel laisse passer toute insertion de membre en campagne ouverte (affectation libre contournant le gel)
DO $$
DECLARE
  d text := pg_get_functiondef('private.geler_composition()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND i.acceptee_le IS NULL) THEN$a$, $b$AND i.acceptee_le IS NULL) OR true THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
