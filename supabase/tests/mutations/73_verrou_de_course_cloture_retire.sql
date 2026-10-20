-- mutation: le verrou partagé qui attend la fin d'une clôture en cours est retiré du contrôle « campagne ouverte »
DO $$
DECLARE
  d text := pg_get_functiondef('private.exiger_campagne_ouverte()'::regprocedure);
  n text := replace(d, 'FOR SHARE OF c', '');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
