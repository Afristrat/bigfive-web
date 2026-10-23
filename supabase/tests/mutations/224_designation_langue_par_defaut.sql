-- mutation: app.designer_relecteur rend toujours le français au lieu de la langue du compte
DO $m$
DECLARE
  d text := pg_get_functiondef('app.designer_relecteur(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$COALESCE((SELECT pr.langue FROM app.profiles pr WHERE pr.user_id = p_utilisateur), 'fr')$a$, $b$'fr'$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $m$;
