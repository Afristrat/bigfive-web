-- mutation: interrupteur fermé, app.reseau_releve rend la ligne de membre d'une autre personne
DO $$
DECLARE
  d text := pg_get_functiondef('app.reseau_releve(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE m.participation_id = p_participation AND pa.user_id = v_uid;$a$, $b$WHERE m.participation_id = p_participation;$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
