-- mutation: le retrait supprime un compte qui a envoyé ou accepté une invitation
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$WHERE i.invitant_id = p_utilisateur OR i.acceptee_par = p_utilisateur$a$, $b$WHERE false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
