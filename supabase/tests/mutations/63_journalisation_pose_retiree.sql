-- mutation: la pose de la photographie ne laisse plus de ligne de journal
DO $$
DECLARE
  d text := pg_get_functiondef('private.poser_agregats(uuid)'::regprocedure);
  n text := replace(d, 'PERFORM private.journaliser(auth.uid(), ''agregats.poser'', ''campagne'', p_campagne, v_org, v_lignes);', 'PERFORM 1;');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
