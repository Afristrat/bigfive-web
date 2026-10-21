-- mutation: le retrait supprime un administrateur Tenga
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$private.tenga_admins a WHERE a.user_id = p_utilisateur$a$, $b$private.tenga_admins a WHERE false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
