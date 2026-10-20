-- mutation: le retrait de rôle n'est plus journalisé sous son nom
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_role(uuid,uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$'role.retirer'$a$, $b$'zz.neutre'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
