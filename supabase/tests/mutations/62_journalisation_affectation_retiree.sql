-- mutation: l'affectation d'un membre à un groupe ne laisse plus de ligne de journal
DO $$
DECLARE
  d text := pg_get_functiondef('app.affecter_membre(uuid,uuid)'::regprocedure);
  n text := replace(d, 'PERFORM private.journaliser(auth.uid(), ''groupe.affecter'', ''participation'', p_participation, v_org);', 'PERFORM 1;');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
