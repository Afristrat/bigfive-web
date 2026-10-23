-- mutation: app.reseau_repondre ne vérifie plus que la personne citée est du groupe du répondant
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_repondre(uuid, jsonb)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE m.participation_id = ANY (v_cites) AND m.group_id = v_groupe$a$, $b$WHERE m.participation_id = ANY (v_cites)$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
