-- mutation: le gel bloque aussi l'effacement en cascade d'un compte (l'exception de la cascade est retirée)
DO $$
DECLARE
  d text := pg_get_functiondef('private.geler_composition()'::regprocedure);
  n text := replace(d, 'IF NOT EXISTS (SELECT 1 FROM app.participations p WHERE p.id = OLD.participation_id) THEN', 'IF false THEN');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
