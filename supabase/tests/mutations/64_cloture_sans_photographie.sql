-- mutation: la clôture d'une campagne ne pose plus la photographie des agrégats
DO $$
DECLARE
  d text := pg_get_functiondef('app.clore_campagne(uuid)'::regprocedure);
  n text := replace(d, 'PERFORM private.poser_agregats(p_campagne);', 'PERFORM 1;');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
