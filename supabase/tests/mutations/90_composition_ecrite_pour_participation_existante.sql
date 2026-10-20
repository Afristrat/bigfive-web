-- mutation: l'acceptation écrit la composition même pour une participation déjà existante (réinvitation : le groupe bougerait)
DO $$
DECLARE
  d text := pg_get_functiondef('app.accepter_invitation(text, uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$IF v_nouvelle AND v_groupe IS NOT NULL THEN$a$, $b$IF v_groupe IS NOT NULL THEN$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
