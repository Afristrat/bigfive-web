-- mutation: app.relire_bloc inscrit au journal l'auteur et l'identifiant du verdict (trace nominative hors de la table, au-delà de 30 jours)
DO $m$
DECLARE
  d text := pg_get_functiondef('app.relire_bloc(text, text, text, text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$PERFORM private.journaliser(NULL, 'relecture.' || p_verdict, 'relecture', NULL);$a$, $b$PERFORM private.journaliser(v_uid, 'relecture.' || p_verdict, 'relecture', v_id);$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
