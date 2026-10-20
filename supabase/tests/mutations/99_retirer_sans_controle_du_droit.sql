-- mutation: retirer_role ne contrôle plus le droit de l'appelant avant de lire la cible
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_role(uuid,uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF NOT private.peut_attribuer(p_organisation, 'participant') THEN$a$, $b$IF false THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
