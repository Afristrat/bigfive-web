-- mutation: (les DEUX couches du garde sont retirées : le contrôle en amont et la condition de l'écriture) un responsable peut rétrograder un autre responsable
DO $$
DECLARE
  d text := pg_get_functiondef('app.attribuer_role(uuid,uuid,text)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$OR (v_actuel = 'responsable' AND NOT v_admin)$a$, $b$OR false$b$);
  n := replace(n, $a$WHERE app.memberships.role <> 'responsable' OR v_admin$a$, $b$WHERE true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
