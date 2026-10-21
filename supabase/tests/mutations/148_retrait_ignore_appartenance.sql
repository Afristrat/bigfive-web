-- mutation: le retrait supprime un compte qui a une appartenance
DO $$
DECLARE
  d text := pg_get_functiondef('app.retirer_compte_sans_appartenance(uuid)'::regprocedure);
  n text := d;
BEGIN
  n := replace(n, $a$app.memberships m WHERE m.user_id = p_utilisateur$a$, $b$app.memberships m WHERE false$b$);
  IF n = d THEN
    RAISE EXCEPTION 'mutation sans effet';
  END IF;
  EXECUTE n;
END $$;
