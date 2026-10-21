-- mutation: le plafond du destinataire n'est plus contrôlé
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND e.cree_le > v_depuis) >= p_max_destinataire THEN$a$, $b$AND e.cree_le > v_depuis) >= p_max_destinataire + 1000000 THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
