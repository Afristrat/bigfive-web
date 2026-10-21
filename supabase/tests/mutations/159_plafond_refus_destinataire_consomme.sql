-- mutation: un refus du destinataire consomme quand même l'organisation
DO $$
DECLARE
  d text := pg_get_functiondef('app.consommer_plafond_invitation(uuid, text, integer, integer, integer)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$    RETURN 'refuse_destinataire';$a$, $b$    INSERT INTO private.plafonds_invitations (portee, cle) VALUES ('organisation', v_cle_org);
    RETURN 'refuse_destinataire';$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
