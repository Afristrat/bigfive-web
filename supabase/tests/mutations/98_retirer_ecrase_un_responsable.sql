-- mutation: (les DEUX couches du garde sont retirées : le contrôle en amont et la condition de l'écriture) un responsable peut retirer un autre responsable
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_role(uuid,uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_actuel = 'responsable' AND NOT v_admin THEN$a$, $b$IF false THEN$b$);
  n := replace(n, $a$AND (role <> 'responsable' OR v_admin)$a$, $b$AND true$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
