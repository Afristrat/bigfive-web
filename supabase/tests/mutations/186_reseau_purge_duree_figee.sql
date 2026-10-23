-- mutation: la purge du relevé ignore conservation_reseau_mois et garde tout 120 mois
DO $$
DECLARE
  d text := pg_get_functiondef('private.purger_quotidien()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$(months => (SELECT s.conservation_reseau_mois FROM private.settings s))$a$, $b$(months => 120)$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
