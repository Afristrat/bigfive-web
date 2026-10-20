-- mutation: l'acceptation ne tient plus à l'effacement du groupe de l'invitation (la contrainte est retirée et la fonction ne l'efface plus : lien identité vers groupe)
ALTER TABLE app.invitations DROP CONSTRAINT invitations_groupe_efface_check;
DO $$
DECLARE
  d text := pg_get_functiondef('app.accepter_invitation(text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$SET email = NULL, prenom = NULL, group_id = NULL, acceptee_le = now()$a$, $b$SET email = NULL, prenom = NULL, acceptee_le = now()$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
