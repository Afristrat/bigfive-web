-- mutation: interrupteur fermé, app.mes_releves_reseau rend toutes mes participations éligibles, même sans ligne de membre
DO $$
DECLARE
  d text := pg_get_functiondef('app.mes_releves_reseau()'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$(v_ouvert OR EXISTS$a$, $b$(true OR EXISTS$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
