-- mutation: la fenêtre est ignorée : tout l'historique compte
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND e.cree_le > v_depuis$a$, $b$$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
