-- mutation: le responsable d'une organisation déverrouille un membre de son organisation, administrateur Tenga compris
DO $$
DECLARE
  d text := pg_get_functiondef('private.peut_deverrouiller(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$AND app.suis_admin_tenga(),$a$, $b$AND (app.suis_admin_tenga() OR EXISTS (SELECT 1 FROM app.memberships r JOIN app.memberships c ON c.organization_id = r.organization_id WHERE r.user_id = auth.uid() AND r.role = 'responsable' AND c.user_id = p_utilisateur)),$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
