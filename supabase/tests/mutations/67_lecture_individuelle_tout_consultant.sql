-- mutation: la lecture individuelle est ouverte à tout consultant de n'importe quelle organisation (non affecté compris)
DO $$
DECLARE
  d text := pg_get_functiondef('app.lire_resultat_individuel(uuid)'::regprocedure);
  n text := replace(d, 'COALESCE(app.mon_role(v_org) = ''consultant'', false)', 'COALESCE(EXISTS (SELECT 1 FROM app.memberships m WHERE m.user_id = auth.uid() AND m.role = ''consultant''), false)');
BEGIN
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
